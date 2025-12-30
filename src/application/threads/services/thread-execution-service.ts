/**
 * 线程执行服务
 *
 * 负责线程执行编排，包括：
 * - 线程执行协调
 * - 工作流执行调用
 * - 线程状态管理
 * - 执行结果处理
 *
 * 属于应用层，负责业务流程编排
 */

import { injectable, inject } from 'inversify';
import { Thread, ThreadRepository } from '../../../domain/threads';
import { ID, ILogger } from '../../../domain/common';
import { BaseApplicationService } from '../../common/base-application-service';
import { WorkflowOrchestrationService } from '../../workflow/services/workflow-orchestration-service';
import { TYPES } from '../../../di/service-keys';

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
export class ThreadExecutionService extends BaseApplicationService {
  constructor(
    @inject(TYPES.ThreadRepository) private readonly threadRepository: ThreadRepository,
    @inject(TYPES.WorkflowOrchestrationService) private readonly workflowOrchestrationService: WorkflowOrchestrationService,
    @inject(TYPES.Logger) logger: ILogger
  ) {
    super(logger);
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
   * @returns 执行结果
   */
  async executeThread(threadId: string, inputData: unknown): Promise<ThreadExecutionResult> {
    return this.executeBusinessOperation(
      '线程执行',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        const thread = await this.threadRepository.findByIdOrFail(id);

        // 验证线程状态
        if (!thread.status.isPending()) {
          throw new Error(`只能执行待执行状态的线程，当前状态: ${thread.status.toString()}`);
        }

        // 启动线程
        thread.start();
        await this.threadRepository.save(thread);

        this.logger.info('线程开始执行', {
          threadId: thread.id.toString(),
          workflowId: thread.workflowId.toString()
        });

        try {
          // 执行工作流
          const workflowResult = await this.workflowOrchestrationService.executeWorkflow(
            thread.sessionId,
            thread.workflowId,
            inputData
          );

          // 根据工作流执行结果更新线程状态
          if (workflowResult.status === 'completed') {
            thread.complete();
            await this.threadRepository.save(thread);

            this.logger.info('线程执行完成', {
              threadId: thread.id.toString(),
              duration: workflowResult.duration
            });

            return {
              success: true,
              threadId: thread.id.toString(),
              result: workflowResult.output,
              duration: workflowResult.duration,
              status: 'completed'
            };
          } else if (workflowResult.status === 'failed') {
            const errorMessage = workflowResult.logs
              .filter(log => log.level === 'error')
              .map(log => log.message)
              .join('; ') || '工作流执行失败';

            thread.fail(errorMessage);
            await this.threadRepository.save(thread);

            this.logger.error('线程执行失败', new Error(errorMessage), {
              threadId: thread.id.toString(),
              duration: workflowResult.duration
            });

            return {
              success: false,
              threadId: thread.id.toString(),
              error: errorMessage,
              duration: workflowResult.duration,
              status: 'failed'
            };
          } else {
            // 其他状态（cancelled等）
            thread.cancel();
            await this.threadRepository.save(thread);

            this.logger.warn('线程执行被取消', {
              threadId: thread.id.toString(),
              status: workflowResult.status
            });

            return {
              success: false,
              threadId: thread.id.toString(),
              error: `工作流执行状态: ${workflowResult.status}`,
              duration: workflowResult.duration,
              status: 'cancelled'
            };
          }
        } catch (error) {
          // 捕获执行过程中的异常
          const errorMessage = error instanceof Error ? error.message : String(error);

          thread.fail(errorMessage);
          await this.threadRepository.save(thread);

          this.logger.error('线程执行异常', error as Error, {
            threadId: thread.id.toString()
          });

          throw error;
        }
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
        if (thread.status.isTerminal()) {
          throw new Error(`无法取消已终止状态的线程，当前状态: ${thread.status.toString()}`);
        }

        // 取消线程
        thread.cancel(user, reason);
        await this.threadRepository.save(thread);

        this.logger.info('线程执行已取消', {
          threadId: thread.id.toString(),
          reason
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
  }> {
    return this.executeGetOperation(
      '线程执行状态',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        const thread = await this.threadRepository.findByIdOrFail(id);

        return {
          threadId: thread.id.toString(),
          status: thread.status.toString(),
          progress: thread.execution.progress,
          startedAt: thread.execution.startedAt?.toISOString(),
          completedAt: thread.execution.completedAt?.toISOString(),
          errorMessage: thread.execution.errorMessage,
          currentStep: thread.execution.currentStep
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
        if (!thread.status.isActive()) {
          throw new Error(`只能更新活跃状态的线程进度，当前状态: ${thread.status.toString()}`);
        }

        // 验证进度值
        if (progress < 0 || progress > 100) {
          throw new Error(`进度值必须在0-100之间，当前值: ${progress}`);
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