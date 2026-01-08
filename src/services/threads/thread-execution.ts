/**
 * 线程执行服务
 *
 * 负责线程执行编排，包括：
 * - 线程执行协调
 * - 工作流执行调用
 * - 线程状态管理
 * - 执行结果处理
 * - 检查点恢复
 * - 子工作流执行
 *
 * 属于应用层，负责业务流程编排
 * 使用领域层的 WorkflowEngine 执行工作流
 */

import { injectable, inject } from 'inversify';
import { Thread, IThreadRepository } from '../../domain/threads';
import { Workflow, IWorkflowRepository } from '../../domain/workflow';
import { ID, ILogger, Timestamp } from '../../domain/common';
import { BaseApplicationService } from '../common/base-application-service';
import { WorkflowExecutionEngine } from './workflow-execution-engine';
import { ThreadStateManager } from './thread-state-manager';
import { ThreadHistoryManager } from './thread-history-manager';
import { CheckpointManager } from '../../domain/checkpoint/services/checkpoint-manager';
import { ThreadConditionalRouter } from './thread-conditional-router';
import { INodeExecutor } from '../workflow/nodes/node-executor';
import { FunctionRegistry } from '../workflow/functions/function-registry';
import { TYPES } from '../../di/service-keys';
import { SubgraphConfig, VariableMapping } from '../workflow/nodes/subgraph/subgraph-node';
import { ExpressionEvaluator } from '../workflow/expression-evaluator';

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
 * 子工作流执行结果接口
 */
export interface SubWorkflowExecutionResult {
  /** 子线程ID */
  threadId: ID;
  /** 执行状态 */
  status: 'completed' | 'failed' | 'cancelled';
  /** 输出数据 */
  output: any;
  /** 执行耗时（毫秒） */
  executionTime: number;
}

/**
 * 线程执行服务
 */
@injectable()
export class ThreadExecution extends BaseApplicationService {
  private readonly workflowEngine: WorkflowExecutionEngine;
  private readonly stateManager: ThreadStateManager;
  private readonly historyManager: ThreadHistoryManager;
  private readonly checkpointManager: CheckpointManager;
  private readonly router: ThreadConditionalRouter;
  private readonly evaluator: ExpressionEvaluator;

  constructor(
    @inject(TYPES.ThreadRepository) private readonly threadRepository: IThreadRepository,
    @inject(TYPES.WorkflowRepository) private readonly workflowRepository: IWorkflowRepository,
    @inject(TYPES.NodeExecutor) private readonly nodeExecutor: INodeExecutor,
    @inject(TYPES.Logger) logger: ILogger,
    @inject(TYPES.FunctionRegistry) private readonly functionRegistry: FunctionRegistry,
    @inject(TYPES.ExpressionEvaluator) evaluator: ExpressionEvaluator,
    @inject(TYPES.ThreadStateManager) stateManager: ThreadStateManager,
    @inject(TYPES.ThreadHistoryManager) historyManager: ThreadHistoryManager,
    @inject(TYPES.CheckpointManager) checkpointManager: CheckpointManager,
    @inject(TYPES.ThreadConditionalRouter) router: ThreadConditionalRouter,
    @inject(TYPES.WorkflowExecutionEngine) workflowEngine: WorkflowExecutionEngine
  ) {
    super(logger);

    // 通过依赖注入获取所有依赖
    this.evaluator = evaluator;
    this.stateManager = stateManager;
    this.historyManager = historyManager;
    this.checkpointManager = checkpointManager;
    this.router = router;
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
        if (!thread.status.isPending()) {
          throw new Error(`只能执行待执行状态的线程，当前状态: ${thread.status.toString()}`);
        }

        // 获取工作流
        const workflow = await this.workflowRepository.findById(thread.workflowId);
        if (!workflow) {
          throw new Error(`工作流不存在: ${thread.workflowId.toString()}`);
        }

        // 验证工作流状态
        if (!workflow.status.isActive()) {
          throw new Error(`工作流不是活跃状态，当前状态: ${workflow.status.toString()}`);
        }

        // 启动线程
        thread.start();
        await this.threadRepository.save(thread);

        this.logger.info('线程开始执行', {
          threadId: thread.id.toString(),
          workflowId: thread.workflowId.toString(),
        });

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
        if (!thread.status.isPaused() && !thread.status.isFailed()) {
          throw new Error(`只能恢复暂停或失败状态的线程，当前状态: ${thread.status.toString()}`);
        }

        // 获取工作流
        const workflow = await this.workflowRepository.findById(thread.workflowId);
        if (!workflow) {
          throw new Error(`工作流不存在: ${thread.workflowId.toString()}`);
        }

        // 验证工作流状态
        if (!workflow.status.isActive()) {
          throw new Error(`工作流不是活跃状态，当前状态: ${workflow.status.toString()}`);
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
        const checkpoints = this.checkpointManager.getThreadCheckpoints(threadId);
        return checkpoints.map((cp: any) => ({
          id: cp.checkpointId.toString(),
          workflowId: cp.threadId.toString(),
          currentNodeId: cp.threadId.toString(),
          timestamp: cp.createdAt.getDate().getTime(),
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
        const checkpoint = this.checkpointManager.getLatestCheckpoint(threadId);
        if (!checkpoint) {
          return null;
        }
        return {
          id: checkpoint.checkpointId.toString(),
          workflowId: checkpoint.threadId.toString(),
          currentNodeId: checkpoint.threadId.toString(),
          timestamp: checkpoint.createdAt.getDate().getTime(),
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
        if (thread.status.isTerminal()) {
          throw new Error(`无法取消已终止状态的线程，当前状态: ${thread.status.toString()}`);
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
          status: thread.status.toString(),
          progress: thread.execution.progress,
          startedAt: thread.execution.startedAt?.toISOString(),
          completedAt: thread.execution.completedAt?.toISOString(),
          errorMessage: thread.execution.errorMessage,
          currentStep: thread.execution.currentStep,
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

  /**
   * 执行子工作流
   *
   * @param parentThread 父线程
   * @param referenceId 子工作流引用ID
   * @param config 子工作流配置
   * @param parentContext 父上下文
   * @returns 子工作流执行结果
   */
  async executeSubWorkflow(
    parentThread: Thread,
    referenceId: string,
    config: SubgraphConfig,
    parentContext: any
  ): Promise<SubWorkflowExecutionResult> {
    const startTime = Date.now();

    try {
      // 1. 获取父线程的工作流定义
      const parentWorkflow = await this.workflowRepository.findById(parentThread.workflowId);
      if (!parentWorkflow) {
        throw new Error(`父工作流不存在: ${parentThread.workflowId.toString()}`);
      }

      // 2. 查找子工作流引用
      const subWorkflowRef = parentWorkflow.getSubWorkflowReference(referenceId);
      if (!subWorkflowRef) {
        throw new Error(`未找到子工作流引用: ${referenceId}`);
      }

      // 3. 加载子工作流定义
      const subWorkflow = await this.workflowRepository.findById(subWorkflowRef.workflowId);
      if (!subWorkflow) {
        throw new Error(`子工作流不存在: ${subWorkflowRef.workflowId.toString()}`);
      }

      this.logger.info('加载子工作流定义', {
        referenceId,
        workflowId: subWorkflowRef.workflowId.toString(),
      });

      // 4. 创建子线程
      const subThread = await this.createSubWorkflowThread(
        parentThread,
        subWorkflowRef.workflowId,
        config
      );

      // 5. 映射输入变量
      const subWorkflowInput = this.mapInputVariables(
        parentContext,
        subWorkflowRef.inputMapping,
        config.inputMappings
      );

      // 6. 执行子工作流
      const subWorkflowResult = await this.executeWorkflowInThread(
        subThread,
        subWorkflow,
        subWorkflowInput,
        config
      );

      // 7. 映射输出变量
      const outputVariables = this.mapOutputVariables(
        subWorkflowResult,
        subWorkflowRef.outputMapping,
        config.outputMappings
      );

      // 8. 更新父线程上下文
      this.updateParentContext(parentContext, outputVariables);

      return {
        threadId: subThread.id,
        status: subWorkflowResult.status,
        output: subWorkflowResult.output,
        executionTime: Date.now() - startTime,
      };

    } catch (error) {
      this.logger.error('子工作流执行失败', error as Error, { referenceId });
      throw error;
    }
  }

  /**
   * 创建子工作流线程
   */
  private async createSubWorkflowThread(
    parentThread: Thread,
    workflowId: ID,
    config: SubgraphConfig
  ): Promise<Thread> {
    // 创建子线程，关联父线程
    const subThread = Thread.create(
      parentThread.sessionId,
      workflowId,
      parentThread.priority,
      `子工作流: ${workflowId.toString()}`,
      undefined,
      {
        parentThreadId: parentThread.id.toString(),
        isSubWorkflow: true,
        timeout: config.timeout,
      }
    );

    // 保存子线程
    await this.threadRepository.save(subThread);

    this.logger.info('创建子工作流线程', {
      parentThreadId: parentThread.id.toString(),
      subThreadId: subThread.id.toString(),
      workflowId: workflowId.toString(),
    });

    return subThread;
  }

  /**
   * 在线程中执行工作流
   */
  private async executeWorkflowInThread(
    thread: Thread,
    workflow: Workflow,
    inputVariables: Map<string, any>,
    config: SubgraphConfig
  ): Promise<SubWorkflowExecutionResult> {
    const startTime = Date.now();

    // 1. 启动线程
    const runningThread = thread.start();
    await this.threadRepository.save(runningThread);

    // 2. 设置输入变量到上下文
    const inputData: Record<string, any> = {};
    for (const [key, value] of inputVariables) {
      inputData[key] = value;
    }

    // 3. 执行工作流
    const workflowResult = await this.workflowEngine.execute(
      workflow,
      thread.id.value,
      inputData,
      {
        enableCheckpoints: false, // 子工作流默认不启用检查点
        checkpointInterval: 0,
        timeout: config.timeout || 300000, // 默认5分钟
        maxSteps: 1000,
        recordRoutingHistory: false,
      }
    );

    // 4. 更新线程状态
    const completedThread = workflowResult.success
      ? runningThread.complete()
      : runningThread.fail(workflowResult.error || '执行失败');

    await this.threadRepository.save(completedThread);

    return {
      threadId: thread.id,
      status: workflowResult.success ? 'completed' : 'failed',
      output: workflowResult.finalState.data,
      executionTime: Date.now() - startTime,
    };
  }

  /**
   * 映射输入变量
   */
  private mapInputVariables(
    parentContext: any,
    workflowMapping: Map<string, string>,
    configMappings: VariableMapping[] = []
  ): Map<string, any> {
    const result = new Map<string, any>();

    // 1. 应用 Workflow 级别的映射
    for (const [target, source] of workflowMapping) {
      const value = this.extractValue(parentContext, source);
      result.set(target, value);
    }

    // 2. 应用节点配置的映射（可以覆盖 Workflow 映射）
    for (const mapping of configMappings) {
      const value = this.extractValue(parentContext, mapping.source);
      const transformedValue = this.applyTransform(value, mapping.transform);
      result.set(mapping.target, transformedValue);
    }

    return result;
  }

  /**
   * 映射输出变量
   */
  private mapOutputVariables(
    subWorkflowResult: SubWorkflowExecutionResult,
    workflowMapping: Map<string, string>,
    configMappings: VariableMapping[] = []
  ): Map<string, any> {
    const result = new Map<string, any>();
    const subOutputs = subWorkflowResult.output || {};

    // 1. 应用 Workflow 级别的映射
    for (const [target, source] of workflowMapping) {
      const value = this.extractValue(subOutputs, source);
      result.set(target, value);
    }

    // 2. 应用节点配置的映射（可以覆盖 Workflow 映射）
    for (const mapping of configMappings) {
      const value = this.extractValue(subOutputs, mapping.source);
      const transformedValue = this.applyTransform(value, mapping.transform);
      result.set(mapping.target, transformedValue);
    }

    return result;
  }

  /**
   * 应用转换函数
   */
  private applyTransform(value: any, transform?: string): any {
    if (!transform) return value;

    try {
      return this.evaluator.evaluate(transform, { value });
    } catch (error) {
      this.logger.error('转换函数执行失败', error as Error, { transform, value });
      return value;  // 转换失败返回原值
    }
  }

  /**
   * 提取值（支持路径表达式）
   */
  private extractValue(obj: any, path: string): any {
    if (!path.includes('.')) {
      return obj?.[path];
    }

    // 支持简单的路径表达式，如: "result.data.items"
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current == null) return undefined;
      current = current[key];
    }

    return current;
  }

  /**
   * 更新父线程上下文
   */
  private updateParentContext(
    parentContext: any,
    outputVariables: Map<string, any>
  ): void {
    for (const [key, value] of outputVariables) {
      parentContext.setVariable(key, value);
    }
  }
}
