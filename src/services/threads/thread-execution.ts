/**
 * 线程执行服务
 *
 * 负责线程执行编排，包括：
 * - 线程执行协调
 * - 工作流执行调用
 * - 线程状态管理
 * - 执行结果处理
 * - 检查点恢复
 *
 * 属于应用层，负责业务流程编排
 */

import { injectable, inject } from 'inversify';
import { Thread, IThreadRepository } from '../../domain/threads';
import { ILogger } from '../../domain/common';
import { BaseService } from '../common/base-service';
import { ThreadWorkflowExecutor } from './thread-workflow-executor';
import { CheckpointCreation } from '../checkpoints/checkpoint-creation';
import { CheckpointManagement } from '../checkpoints/checkpoint-management';
import { WorkflowManagement } from '../workflow/workflow-management';
import { TYPES } from '../../di/service-keys';
import { InvalidStatusError, ValidationError, ExecutionError } from '../../common/exceptions';

/**
 * 线程执行结果接口
 */
export interface ThreadExecutionResult {
  /** 是否成功 */
  success: boolean;
  /** 线程ID */
  threadId: string;
  /** 执行结果 */
  result?: Record<string, unknown>;
  /** 错误信息 */
  error?: string;
  /** 执行耗时（毫秒） */
  duration: number;
  /** 执行状态 */
  status: 'completed' | 'failed' | 'cancelled';
}

/**
 * 线程执行服务
 */
@injectable()
export class ThreadExecution extends BaseService {
  private readonly workflowEngine: ThreadWorkflowExecutor;
  private readonly checkpointCreation: CheckpointCreation;
  private readonly checkpointManagement: CheckpointManagement;

  constructor(
    @inject(TYPES.ThreadRepository) private readonly threadRepository: IThreadRepository,
    @inject(TYPES.WorkflowManagement) private readonly workflowManagement: WorkflowManagement,
    @inject(TYPES.Logger) logger: ILogger,
    @inject(TYPES.CheckpointCreation) checkpointCreation: CheckpointCreation,
    @inject(TYPES.CheckpointManagement) checkpointManagement: CheckpointManagement,
    @inject(TYPES.ThreadWorkflowExecutor) workflowEngine: ThreadWorkflowExecutor
  ) {
    super(logger);

    this.checkpointCreation = checkpointCreation;
    this.checkpointManagement = checkpointManagement;
    this.workflowEngine = workflowEngine;
  }

  /**
   * 获取服务名称
   */
  protected override getServiceName(): string {
    return '线程执行服务';
  }

  /**
   * 执行线程
   * @param threadId 线程ID
   * @param inputData 输入数据
   * @param options 执行选项
   * @returns 执行结果
   */
  async executeThread(
    threadId: string,
    inputData: unknown,
    options?: {
      enableCheckpoints?: boolean;
      checkpointInterval?: number;
      timeout?: number;
      maxSteps?: number;
    }
  ): Promise<ThreadExecutionResult> {
    return this.executeBusinessOperation(
      '线程执行',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        const thread = await this.threadRepository.findByIdOrFail(id);

        // 验证线程状态
        if (!thread.isPending()) {
          throw new InvalidStatusError(thread.status.toString(), 'pending');
        }

        // 通过 WorkflowManagement 获取已合并的可执行 workflow
        const workflow = await this.workflowManagement.getExecutableWorkflow(
          thread.workflowId.toString()
        );

        // 验证工作流状态
        if (!workflow.status.isActive()) {
          throw new InvalidStatusError(workflow.status.toString(), 'active');
        }

        // 启动线程
        thread.start();
        await this.threadRepository.save(thread);

        this.logger.info('线程开始执行', {
          threadId: thread.id.toString(),
          workflowId: thread.workflowId.toString(),
        });

        // 创建线程启动里程碑检查点
        await this.checkpointCreation.createMilestoneCheckpoint(
          thread,
          `Thread Started: ${thread.id.value}`,
          `Thread execution started for workflow ${thread.workflowId.value}`
        );

        try {
          // 使用新的 WorkflowEngine 执行工作流
          const workflowResult = await this.workflowEngine.execute(
            workflow,
            thread.id.value,
            inputData as Record<string, any>,
            {
              enableCheckpoints: options?.enableCheckpoints ?? true,
              checkpointInterval: options?.checkpointInterval ?? 5,
              timeout: options?.timeout ?? 300000, // 5分钟
              maxSteps: options?.maxSteps ?? 1000,
              recordRoutingHistory: true,
            }
          );

          // 根据工作流执行结果更新线程状态
          if (workflowResult.success) {
            thread.complete();
            await this.threadRepository.save(thread);

            // 创建线程完成里程碑检查点
            await this.checkpointCreation.createMilestoneCheckpoint(
              thread,
              `Thread Completed: ${thread.id.value}`,
              `Thread execution completed successfully`
            );

            this.logger.info('线程执行完成', {
              threadId: thread.id.toString(),
              duration: workflowResult.executionTime,
              executedNodes: workflowResult.executedNodes,
              checkpointCount: workflowResult.checkpointCount,
            });

            return {
              success: true,
              threadId: thread.id.toString(),
              result: workflowResult.finalState.data,
              duration: workflowResult.executionTime,
              status: 'completed',
            };
          } else {
            const errorMessage = workflowResult.error || '工作流执行失败';

            thread.fail(errorMessage);
            await this.threadRepository.save(thread);

            // 创建错误检查点
            await this.checkpointCreation.createErrorCheckpoint(
              thread,
              new Error(errorMessage),
              {
                phase: 'workflow_execution',
                executedNodes: workflowResult.executedNodes,
              }
            );

            this.logger.error('线程执行失败', new Error(errorMessage), {
              threadId: thread.id.toString(),
              duration: workflowResult.executionTime,
              executedNodes: workflowResult.executedNodes,
            });

            return {
              success: false,
              threadId: thread.id.toString(),
              error: errorMessage,
              duration: workflowResult.executionTime,
              status: 'failed',
            };
          }
        } catch (error) {
          // 捕获执行过程中的异常
          const errorMessage = error instanceof Error ? error.message : String(error);

          thread.fail(errorMessage);
          await this.threadRepository.save(thread);

          // 创建错误检查点
          await this.checkpointCreation.createErrorCheckpoint(
            thread,
            error instanceof Error ? error : new Error(errorMessage),
            {
              phase: 'thread_execution_exception',
            }
          );

          this.logger.error('线程执行异常', error as Error, {
            threadId: thread.id.toString(),
          });

          throw error;
        }
      },
      { threadId }
    );
  }

  /**
   * 从检查点恢复线程执行
   * @param threadId 线程ID
   * @param checkpointId 检查点ID
   * @param options 执行选项
   * @returns 执行结果
   */
  async resumeThreadFromCheckpoint(
    threadId: string,
    checkpointId: string,
    options?: {
      timeout?: number;
      maxSteps?: number;
    }
  ): Promise<ThreadExecutionResult> {
    return this.executeBusinessOperation(
      '从检查点恢复线程执行',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        const thread = await this.threadRepository.findByIdOrFail(id);

        // 验证线程状态
        if (!thread.isPaused() && !thread.isFailed()) {
          throw new InvalidStatusError(thread.status.toString(), 'paused or failed');
        }

        // 通过 WorkflowManagement 获取已合并的可执行 workflow
        const workflow = await this.workflowManagement.getExecutableWorkflow(
          thread.workflowId.toString()
        );

        // 验证工作流状态
        if (!workflow.status.isActive()) {
          throw new InvalidStatusError(workflow.status.toString(), 'active');
        }

        // 恢复线程
        thread.resume();
        await this.threadRepository.save(thread);

        this.logger.info('线程从检查点恢复执行', {
          threadId: thread.id.toString(),
          workflowId: thread.workflowId.toString(),
          checkpointId,
        });

        try {
          // 使用 WorkflowEngine 从检查点恢复执行
          const workflowResult = await this.workflowEngine.resumeFromCheckpoint(
            workflow,
            thread.id.value,
            checkpointId,
            {
              timeout: options?.timeout ?? 300000, // 5分钟
              maxSteps: options?.maxSteps ?? 1000,
              recordRoutingHistory: true,
            }
          );

          // 根据工作流执行结果更新线程状态
          if (workflowResult.success) {
            thread.complete();
            await this.threadRepository.save(thread);

            this.logger.info('线程恢复执行完成', {
              threadId: thread.id.toString(),
              duration: workflowResult.executionTime,
              executedNodes: workflowResult.executedNodes,
            });

            return {
              success: true,
              threadId: thread.id.toString(),
              result: workflowResult.finalState.data,
              duration: workflowResult.executionTime,
              status: 'completed',
            };
          } else {
            const errorMessage = workflowResult.error || '工作流执行失败';

            thread.fail(errorMessage);
            await this.threadRepository.save(thread);

            this.logger.error('线程恢复执行失败', new Error(errorMessage), {
              threadId: thread.id.toString(),
              duration: workflowResult.executionTime,
            });

            return {
              success: false,
              threadId: thread.id.toString(),
              error: errorMessage,
              duration: workflowResult.executionTime,
              status: 'failed',
            };
          }
        } catch (error) {
          // 捕获执行过程中的异常
          const errorMessage = error instanceof Error ? error.message : String(error);

          thread.fail(errorMessage);
          await this.threadRepository.save(thread);

          // 创建错误检查点
          await this.checkpointCreation.createErrorCheckpoint(
            thread,
            error instanceof Error ? error : new Error(errorMessage),
            {
              phase: 'thread_resume_exception',
              checkpointId,
            }
          );

          this.logger.error('线程恢复执行异常', error as Error, {
            threadId: thread.id.toString(),
            checkpointId,
          });

          throw error;
        }
      },
      { threadId, checkpointId }
    );
  }

  /**
   * 获取线程的检查点列表
   * @param threadId 线程ID
   * @returns 检查点列表
   */
  async getThreadCheckpoints(threadId: string): Promise<
    Array<{
      id: string;
      workflowId: string;
      currentNodeId: string;
      timestamp: number;
      metadata?: Record<string, any>;
    }>
  > {
    const result = await this.executeGetOperation(
      '获取线程检查点',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        const checkpoints = await this.checkpointManagement.getThreadCheckpoints(id);
        return checkpoints.map((cp: any) => ({
          id: cp.checkpointId.toString(),
          workflowId: cp.threadId.toString(),
          currentNodeId: cp.threadId.toString(),
          timestamp: cp.createdAt.toDate().getTime(),
          metadata: cp.metadata,
        }));
      },
      { threadId }
    );
    return result ?? [];
  }

  /**
   * 获取线程的最新检查点
   * @param threadId 线程ID
   * @returns 最新检查点，如果不存在则返回 null
   */
  async getLatestCheckpoint(threadId: string): Promise<{
    id: string;
    workflowId: string;
    currentNodeId: string;
    timestamp: number;
    metadata?: Record<string, any>;
  } | null> {
    return this.executeGetOperation(
      '获取最新检查点',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        const checkpoint = await this.checkpointManagement.getLatestThreadCheckpoint(id);
        if (!checkpoint) {
          return null;
        }
        return {
          id: checkpoint.checkpointId.toString(),
          workflowId: checkpoint.threadId.toString(),
          currentNodeId: checkpoint.threadId.toString(),
          timestamp: checkpoint.createdAt.toDate().getTime(),
          metadata: checkpoint.metadata,
        };
      },
      { threadId }
    );
  }

  /**
   * 取消线程执行
   * @param threadId 线程ID
   * @param userId 用户ID
   * @param reason 取消原因
   * @returns 取消后的线程
   */
  async cancelThreadExecution(threadId: string, userId?: string, reason?: string): Promise<Thread> {
    return this.executeUpdateOperation(
      '取消线程执行',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        const user = this.parseOptionalId(userId, '用户ID');

        const thread = await this.threadRepository.findByIdOrFail(id);

        // 验证线程状态
        if (thread.isTerminal()) {
          throw new InvalidStatusError(thread.status.toString(), 'non-terminal');
        }

        // 取消线程
        thread.cancel(user, reason);
        await this.threadRepository.save(thread);

        this.logger.info('线程执行已取消', {
          threadId: thread.id.toString(),
          reason,
        });

        return thread;
      },
      { threadId, userId, reason }
    );
  }

  /**
   * 获取线程执行状态
   * @param threadId 线程ID
   * @returns 执行状态信息
   */
  async getThreadExecutionStatus(threadId: string): Promise<{
    threadId: string;
    status: string;
    progress: number;
    startedAt?: string;
    completedAt?: string;
    errorMessage?: string;
    currentStep?: string;
  } | null> {
    return this.executeGetOperation(
      '线程执行状态',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        const thread = await this.threadRepository.findByIdOrFail(id);

        return {
          threadId: thread.id.toString(),
          status: thread.status,
          progress: thread.execution['progress'] as number,
          startedAt: thread.execution['startedAt'] as string | undefined,
          completedAt: thread.execution['completedAt'] as string | undefined,
          errorMessage: thread.execution['errorMessage'] as string | undefined,
          currentStep: thread.execution['currentStep'] as string | undefined,
        };
      },
      { threadId }
    );
  }

  /**
   * 更新线程执行进度
   * @param threadId 线程ID
   * @param progress 进度（0-100）
   * @param currentStep 当前步骤
   * @returns 更新后的线程
   */
  async updateThreadProgress(
    threadId: string,
    progress: number,
    currentStep?: string
  ): Promise<Thread> {
    return this.executeUpdateOperation(
      '更新线程执行进度',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        const thread = await this.threadRepository.findByIdOrFail(id);

        // 验证线程状态
        if (!thread.isActive()) {
          throw new InvalidStatusError(thread.status.toString(), 'active');
        }

        // 验证进度值
        if (progress < 0 || progress > 100) {
          throw new ValidationError(`进度值必须在0-100之间，当前值: ${progress}`);
        }

        // 更新进度
        thread.updateProgress(progress, currentStep);
        await this.threadRepository.save(thread);

        return thread;
      },
      { threadId, progress, currentStep }
    );
  }

}