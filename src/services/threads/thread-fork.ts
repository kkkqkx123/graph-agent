/**
 * Thread Fork应用服务
 *
 * 负责处理线程Fork操作的业务逻辑编排
 */

import { injectable, inject } from 'inversify';
import { ID, ILogger } from '../../domain/common';
import { NodeId } from '../../domain/workflow';
import { PromptState } from '../../domain/workflow/value-objects/context';
import {
  Thread,
  IThreadRepository,
  ThreadExecutionContext,
  NodeExecutionSnapshot,
} from '../../domain/threads';
import {
  ISessionRepository,
  ForkStrategy,
  ForkOptions,
  ForkContext,
  ThreadOperationResult,
  ThreadOperationMetadata,
  ThreadOperationError,
} from '../../domain/sessions';
import { TYPES } from '../../di/service-keys';

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
@injectable()
export class ThreadFork {
  constructor(
    @inject(TYPES.ThreadRepository) private readonly threadRepository: IThreadRepository,
    @inject(TYPES.SessionRepository) private readonly sessionRepository: ISessionRepository,
    @inject(TYPES.Logger) private readonly logger: ILogger
  ) {}

  /**
   * 执行Fork操作
   */
  async executeFork(input: ForkInput, operatorId?: ID): Promise<ThreadOperationResult<ForkOutput>> {
    const startTime = Date.now();
    const operationType = 'fork';

    try {
      this.logger.info('开始执行Fork操作', {
        parentThreadId: input.parentThread.threadId.toString(),
        forkPoint: input.forkPoint.toString(),
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
          validationError: validation.error,
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
          validationErrors: forkValidation.errors,
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
        forkStrategy,
      };

      // 创建操作元数据
      const duration = Date.now() - startTime;
      const metadata = ThreadOperationMetadata.createWithDuration(
        operationType,
        duration,
        operatorId,
        {
          parentThreadId: input.parentThread.threadId.toString(),
          forkPoint: input.forkPoint.toString(),
          forkedThreadId: forkedThreadId.toString(),
          forkStrategy: forkStrategy.type,
          warnings: forkValidation.warnings,
        }
      );

      this.logger.info('Fork操作执行成功', {
        forkedThreadId: forkedThreadId.toString(),
        duration,
      });

      return ThreadOperationResult.createSuccess(output, metadata);
    } catch (error) {
      const operationError = ThreadOperationError.create(
        'EXECUTION_ERROR',
        error instanceof Error ? error.message : String(error),
        { error }
      );
      const metadata = ThreadOperationMetadata.create(operationType, operatorId, {
        executionError: true,
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
    // 注意：节点执行状态现在由其他服务管理，这里暂时跳过验证
    // TODO: 从节点执行服务获取节点执行状态进行验证

    // 验证父线程状态
    if (!input.parentThread.isActive()) {
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
    // 注意：节点执行状态现在由其他服务管理，这里暂时跳过验证
    // TODO: 从节点执行服务获取节点执行状态进行验证

    // 验证上下文保留策略
    const forkOptions = input.forkOptions || ForkOptions.createDefault();
    if (forkOptions.contextRetention === 'full' && !forkOptions.includeHistory) {
      warnings.push('完整上下文保留建议包含历史记录');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
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
    // 注意：上下文现在由其他服务管理，这里暂时创建空快照
    // TODO: 从上下文服务获取变量快照
    const variableSnapshot = new Map<string, unknown>();

    // 构建节点状态快照
    // 注意：节点执行状态现在由其他服务管理，这里暂时创建空快照
    // TODO: 从节点执行服务获取节点状态快照
    const nodeStateSnapshot = new Map<string, NodeExecutionSnapshot>();

    // 获取提示词状态快照
    // 注意：提示词状态现在由其他服务管理，这里暂时创建空状态
    // TODO: 从上下文服务获取提示词状态快照
    const promptStateSnapshot = PromptState.create();

    return ForkContext.create(
      parentThread.threadId,
      forkPoint,
      variableSnapshot,
      nodeStateSnapshot,
      promptStateSnapshot,
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
