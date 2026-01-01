/**
 * Thread Fork应用服务
 *
 * 负责处理线程Fork操作的业务逻辑编排
 */

import { ID, ILogger } from '../../../domain/common';
import { NodeId, PromptContext } from '../../../domain/workflow';
import { Thread, IThreadRepository, ExecutionContext, NodeExecutionSnapshot } from '../../../domain/threads';
import { ISessionRepository, ForkStrategy, ForkOptions, ForkContext, ThreadOperationResult, ThreadOperationMetadata, ThreadOperationError } from '../../../domain/sessions';

/**
 * Fork操作输入
 */
export interface ForkInput {
  readonly parentThread: Thread;
  readonly forkPoint: NodeId;
  readonly forkStrategy?: ForkStrategy;
  readonly forkOptions?: ForkOptions;
}

/**
 * Fork操作输出
 */
export interface ForkOutput {
  readonly forkContext: ForkContext;
  readonly forkedThreadId: ID;
  readonly forkStrategy: ForkStrategy;
}

/**
 * Fork验证结果
 */
export interface ForkValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
}

/**
 * Thread Fork应用服务
 */
export class ThreadForkService {
  constructor(
    private readonly threadRepository: IThreadRepository,
    private readonly sessionRepository: ISessionRepository,
    private readonly logger: ILogger
  ) { }

  /**
   * 执行Fork操作
   */
  async executeFork(input: ForkInput, operatorId?: ID): Promise<ThreadOperationResult<ForkOutput>> {
    const startTime = Date.now();
    const operationType = 'fork';

    try {
      this.logger.info('开始执行Fork操作', {
        parentThreadId: input.parentThread.threadId.toString(),
        forkPoint: input.forkPoint.toString()
      });

      // 验证输入
      const validation = this.validateInput(input);
      if (!validation.valid) {
        const error = ThreadOperationError.create(
          'INVALID_INPUT',
          validation.error || '输入验证失败',
          { input }
        );
        const metadata = ThreadOperationMetadata.create(operationType, operatorId, {
          validationError: validation.error
        });
        return ThreadOperationResult.createFailure<ForkOutput>(error, metadata);
      }

      // 验证Fork操作
      const forkValidation = this.validateFork(input);
      if (!forkValidation.valid) {
        const error = ThreadOperationError.create(
          'FORK_VALIDATION_FAILED',
          `Fork验证失败: ${forkValidation.errors.join(', ')}`,
          { validation: forkValidation }
        );
        const metadata = ThreadOperationMetadata.create(operationType, operatorId, {
          validationErrors: forkValidation.errors
        });
        return ThreadOperationResult.createFailure<ForkOutput>(error, metadata);
      }

      // 创建Fork上下文
      const forkContext = this.createForkContext(input);

      // 生成新的线程ID
      const forkedThreadId = ID.generate();

      // 获取Fork策略
      const forkStrategy = input.forkStrategy || ForkStrategy.createPartial();

      // 创建Fork输出
      const output: ForkOutput = {
        forkContext,
        forkedThreadId,
        forkStrategy
      };

      // 创建操作元数据
      const duration = Date.now() - startTime;
      const metadata = ThreadOperationMetadata.createWithDuration(operationType, duration, operatorId, {
        parentThreadId: input.parentThread.threadId.toString(),
        forkPoint: input.forkPoint.toString(),
        forkedThreadId: forkedThreadId.toString(),
        forkStrategy: forkStrategy.type,
        warnings: forkValidation.warnings
      });

      this.logger.info('Fork操作执行成功', {
        forkedThreadId: forkedThreadId.toString(),
        duration
      });

      return ThreadOperationResult.createSuccess(output, metadata);

    } catch (error) {
      const operationError = ThreadOperationError.create(
        'EXECUTION_ERROR',
        error instanceof Error ? error.message : String(error),
        { error }
      );
      const metadata = ThreadOperationMetadata.create(operationType, operatorId, {
        executionError: true
      });

      this.logger.error('Fork操作执行失败', error as Error);

      return ThreadOperationResult.createFailure<ForkOutput>(operationError, metadata);
    }
  }

  /**
   * 验证输入
   */
  private validateInput(input: ForkInput): { valid: boolean; error?: string } {
    if (!input.parentThread) {
      return { valid: false, error: '父线程不能为空' };
    }

    if (!input.forkPoint) {
      return { valid: false, error: 'Fork点不能为空' };
    }

    // 验证Fork点是否存在
    if (!input.parentThread.execution.hasNodeExecution(input.forkPoint)) {
      return { valid: false, error: `Fork点不存在: ${input.forkPoint.toString()}` };
    }

    // 验证父线程状态
    if (!input.parentThread.status.isActive()) {
      return { valid: false, error: '只能从活跃状态的线程Fork' };
    }

    return { valid: true };
  }

  /**
   * 验证Fork操作
   */
  public validateFork(input: ForkInput): ForkValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证Fork策略
    const forkStrategy = input.forkStrategy || ForkStrategy.createPartial();
    const strategyValidation = forkStrategy.validate();
    // Note: ForkStrategy的validate方法返回void，如果有验证错误会抛出异常
    // 这里假设验证通过，如果有异常会在上层捕获

    // 验证Fork点状态
    const forkPointExecution = input.parentThread.execution.getNodeExecution(input.forkPoint);
    if (forkPointExecution) {
      if (forkPointExecution.status.isPending()) {
        warnings.push('Fork点尚未执行，可能无法获得完整的上下文');
      }
    }

    // 验证上下文保留策略
    const forkOptions = input.forkOptions || ForkOptions.createDefault();
    if (forkOptions.contextRetention === 'full' && !forkOptions.includeHistory) {
      warnings.push('完整上下文保留建议包含历史记录');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 创建Fork上下文
   */
  public createForkContext(input: ForkInput): ForkContext {
    const parentThread = input.parentThread;
    const forkPoint = input.forkPoint;
    const forkStrategy = input.forkStrategy || ForkStrategy.createPartial();
    const forkOptions = input.forkOptions || ForkOptions.createDefault();

    // 计算上下文保留计划
    const retentionPlan = forkStrategy.calculateContextRetention(parentThread, forkPoint);

    // 构建变量快照
    const variableSnapshot = new Map<string, unknown>();
    for (const key of retentionPlan.variablesToRetain) {
      const value = parentThread.execution.context.getVariable(key);
      if (value !== undefined) {
        variableSnapshot.set(key, value);
      }
    }

    // 构建节点状态快照
    const nodeStateSnapshot = new Map<string, NodeExecutionSnapshot>();
    for (const [nodeId, snapshot] of retentionPlan.nodeStatesToRetain.entries()) {
      nodeStateSnapshot.set(nodeId, snapshot);
    }

    // 获取提示词上下文快照
    const promptContextSnapshot = retentionPlan.includePromptContext
      ? parentThread.execution.context.promptContext
      : PromptContext.create('');

    return ForkContext.create(
      parentThread.threadId,
      forkPoint,
      variableSnapshot,
      nodeStateSnapshot,
      promptContextSnapshot,
      forkOptions
    );
  }

  /**
   * 计算上下文保留策略
   */
  public calculateContextRetention(
    thread: Thread,
    forkPoint: NodeId,
    forkStrategy: ForkStrategy
  ): ForkStrategy {
    return forkStrategy;
  }
}