/**
 * Thread Join应用服务
 *
 * 负责处理线程Join操作的业务逻辑编排
 */

import { injectable, inject } from 'inversify';
import { ID, ILogger } from '../../domain/common';
import { NodeId } from '../../domain/workflow';
import {
  Thread,
  IThreadRepository,
} from '../../domain/threads';
import {
  ISessionRepository,
  ThreadOperationResult,
  ThreadOperationMetadata,
  ThreadOperationError,
} from '../../domain/sessions';
import { TYPES } from '../../di/service-keys';

/**
 * Join操作输入
 */
export interface JoinInput {
  readonly parentThread: Thread;
  readonly joinPoint: NodeId;
  readonly childThreadIds: ID[];
  /** 等待超时时间（秒）。0 表示不超时，>0 表示最多等待的秒数。默认 0 */
  readonly timeout?: number;
}

/**
 * Join操作输出
 */
export interface JoinOutput {
  readonly joinedThreadIds: ID[];
  readonly branchResults: any[];
  readonly mergedResults: Record<string, unknown>;
}

/**
 * Join验证结果
 */
export interface JoinValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
}

/**
 * Thread Join应用服务
 */
@injectable()
export class ThreadJoin {
  constructor(
    @inject(TYPES.ThreadRepository) private readonly threadRepository: IThreadRepository,
    @inject(TYPES.SessionRepository) private readonly sessionRepository: ISessionRepository,
    @inject(TYPES.Logger) private readonly logger: ILogger
  ) { }

  /**
   * 执行Join操作
   */
  async executeJoin(input: JoinInput, operatorId?: ID): Promise<ThreadOperationResult<JoinOutput>> {
    const startTime = Date.now();
    const operationType = 'join';

    try {
      this.logger.info('开始执行Join操作', {
        parentThreadId: input.parentThread.threadId.toString(),
        joinPoint: input.joinPoint.toString(),
        childThreadCount: input.childThreadIds.length,
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
        return ThreadOperationResult.createFailure<JoinOutput>(error, metadata);
      }

      // 验证Join操作
      const joinValidation = this.validateJoin(input);
      if (!joinValidation.valid) {
        const error = ThreadOperationError.create(
          'JOIN_VALIDATION_FAILED',
          `Join验证失败: ${joinValidation.errors.join(', ')}`,
          { validation: joinValidation }
        );
        const metadata = ThreadOperationMetadata.create(operationType, operatorId, {
          validationErrors: joinValidation.errors,
        });
        return ThreadOperationResult.createFailure<JoinOutput>(error, metadata);
      }

      // 等待所有子线程完成
      const completedThreads = await this.waitForCompletion(input);

      // 收集分支结果
      const branchResults = this.collectBranchResults(completedThreads);

      // 合并结果
      const mergedResults = this.mergeResults(branchResults);

      // 创建Join输出
      const output: JoinOutput = {
        joinedThreadIds: input.childThreadIds,
        branchResults,
        mergedResults,
      };

      // 创建操作元数据
      const duration = Date.now() - startTime;
      const metadata = ThreadOperationMetadata.createWithDuration(
        operationType,
        duration,
        operatorId,
        {
          parentThreadId: input.parentThread.threadId.toString(),
          joinPoint: input.joinPoint.toString(),
          joinedThreadCount: input.childThreadIds.length,
          warnings: joinValidation.warnings,
        }
      );

      this.logger.info('Join操作执行成功', {
        joinedThreadCount: input.childThreadIds.length,
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

      this.logger.error('Join操作执行失败', error as Error);

      return ThreadOperationResult.createFailure<JoinOutput>(operationError, metadata);
    }
  }

  /**
   * 验证输入
   */
  private validateInput(input: JoinInput): { valid: boolean; error?: string } {
    if (!input.parentThread) {
      return { valid: false, error: '父线程不能为空' };
    }

    if (!input.joinPoint) {
      return { valid: false, error: 'Join点不能为空' };
    }

    if (!input.childThreadIds || input.childThreadIds.length === 0) {
      return { valid: false, error: '子线程列表不能为空' };
    }

    // 验证父线程状态
    if (!input.parentThread.isActive()) {
      return { valid: false, error: '只能从活跃状态的线程Join' };
    }

    return { valid: true };
  }

  /**
   * 验证Join操作
   */
  public validateJoin(input: JoinInput): JoinValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证子线程状态
    // 注意：线程执行状态现在由其他服务管理，这里暂时跳过验证
    // TODO: 从线程执行服务获取线程执行状态进行验证

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 等待所有子线程完成
   */
  private async waitForCompletion(input: JoinInput): Promise<Thread[]> {
    const completedThreads: Thread[] = [];

    for (const threadId of input.childThreadIds) {
      const thread = await this.threadRepository.findById(threadId);
      if (thread) {
        completedThreads.push(thread);
      }
    }

    return completedThreads;
  }

  /**
   * 收集分支结果
   */
  private collectBranchResults(threads: Thread[]): any[] {
    return threads.map(thread => ({
      threadId: thread.threadId.toString(),
      status: thread.status.toString(),
      state: thread.state,
    }));
  }

  /**
   * 合并结果
   */
  private mergeResults(branchResults: any[]): Record<string, unknown> {
    const merged: Record<string, unknown> = {
      success: true,
      branchCount: branchResults.length,
      successCount: branchResults.filter(br => br.status === 'completed').length,
      failureCount: branchResults.filter(br => br.status === 'failed').length,
    };

    // 合并所有分支的结果
    const results: Record<string, unknown> = {};
    for (const branchResult of branchResults) {
      results[branchResult.threadId] = branchResult.state;
    }
    merged['results'] = results;

    return merged;
  }
}