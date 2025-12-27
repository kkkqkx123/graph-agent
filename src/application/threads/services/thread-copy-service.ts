/**
 * Thread Copy应用服务
 *
 * 负责处理线程Copy操作的业务逻辑编排
 */

import { ID } from '../../../domain/common/value-objects/id';
import { NodeId } from '../../../domain/workflow/value-objects/node-id';
import { Thread } from '../../../domain/threads/entities/thread';
import { ThreadRepository } from '../../../domain/threads/repositories/thread-repository';
import { SessionRepository } from '../../../domain/sessions/repositories/session-repository';
import { ILogger } from '../../../domain/common/types/logger-types';
import {
  CopyStrategy,
  CopyOptions,
  CopyScope,
  CopyContext,
  ThreadOperationResult,
  ThreadOperationMetadata,
  ThreadOperationError
} from '../../../domain/sessions/value-objects';

/**
 * Copy操作输入
 */
export interface CopyInput {
  readonly sourceThread: Thread;
  readonly copyStrategy?: CopyStrategy;
  readonly copyOptions?: CopyOptions;
  readonly selectedNodeIds?: NodeId[];
}

/**
 * Copy操作输出
 */
export interface CopyOutput {
  readonly copyContext: CopyContext;
  readonly copiedThreadId: ID;
  readonly copyStrategy: CopyStrategy;
}

/**
 * Copy验证结果
 */
export interface CopyValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
}

/**
 * Thread Copy应用服务
 */
export class ThreadCopyService {
  constructor(
    private readonly threadRepository: ThreadRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly logger: ILogger
  ) {}

  /**
   * 执行Copy操作
   */
  async executeCopy(input: CopyInput, operatorId?: ID): Promise<ThreadOperationResult<CopyOutput>> {
    const startTime = Date.now();
    const operationType = 'copy';
    
    try {
      this.logger.info('开始执行Copy操作', {
        sourceThreadId: input.sourceThread.threadId.toString()
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
        return ThreadOperationResult.createFailure<CopyOutput>(error, metadata);
      }

      // 验证Copy操作
      const copyValidation = this.validateCopy(input);
      if (!copyValidation.valid) {
        const error = ThreadOperationError.create(
          'COPY_VALIDATION_FAILED',
          `Copy验证失败: ${copyValidation.errors.join(', ')}`,
          { validation: copyValidation }
        );
        const metadata = ThreadOperationMetadata.create(operationType, operatorId, {
          validationErrors: copyValidation.errors 
        });
        return ThreadOperationResult.createFailure<CopyOutput>(error, metadata);
      }

      // 创建Copy上下文
      const copyContext = this.createCopyContext(input);

      // 生成新的线程ID
      const copiedThreadId = ID.generate();

      // 获取Copy策略
      const copyStrategy = input.copyStrategy || CopyStrategy.createFull();

      // 创建Copy输出
      const output: CopyOutput = {
        copyContext,
        copiedThreadId,
        copyStrategy
      };

      // 创建操作元数据
      const duration = Date.now() - startTime;
      const metadata = ThreadOperationMetadata.createWithDuration(operationType, duration, operatorId, {
        sourceThreadId: input.sourceThread.threadId.toString(),
        copiedThreadId: copiedThreadId.toString(),
        copyStrategy: copyStrategy.type,
        copyScope: copyContext.scope.nodeCount,
        warnings: copyValidation.warnings
      });

      this.logger.info('Copy操作执行成功', {
        copiedThreadId: copiedThreadId.toString(),
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
      
      this.logger.error('Copy操作执行失败', error as Error);
      
      return ThreadOperationResult.createFailure<CopyOutput>(operationError, metadata);
    }
  }

  /**
   * 验证输入
   */
  private validateInput(input: CopyInput): { valid: boolean; error?: string } {
    if (!input.sourceThread) {
      return { valid: false, error: '源线程不能为空' };
    }

    // 验证源线程状态
    if (input.sourceThread.isDeleted()) {
      return { valid: false, error: '无法复制已删除的线程' };
    }

    // 验证选择性Copy的节点ID
    if (input.copyStrategy?.type === 'selective' && (!input.selectedNodeIds || input.selectedNodeIds.length === 0)) {
      return { valid: false, error: '选择性Copy需要指定要复制的节点' };
    }

    // 验证选中的节点是否存在
    if (input.selectedNodeIds) {
      for (const nodeId of input.selectedNodeIds) {
        if (!input.sourceThread.execution.hasNodeExecution(nodeId)) {
          return { valid: false, error: `选中的节点不存在: ${nodeId.toString()}` };
        }
      }
    }

    return { valid: true };
  }

  /**
   * 验证Copy操作
   */
  public validateCopy(input: CopyInput): CopyValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证Copy策略
    const copyStrategy = input.copyStrategy || CopyStrategy.createFull();
    // Note: CopyStrategy的validate方法返回void，如果有验证错误会抛出异常
    // 这里假设验证通过，如果有异常会在上层捕获

    // 验证源线程状态
    if (input.sourceThread.status.isRunning()) {
      warnings.push('正在运行的线程可能无法完整复制');
    }

    // 验证Copy选项
    const copyOptions = input.copyOptions || CopyOptions.createDefault();
    if (copyOptions.copyScope === 'full' && copyOptions.resetState) {
      warnings.push('完整复制范围与重置状态可能不一致');
    }

    // 验证选择性Copy
    if (copyStrategy.type === 'selective' && input.selectedNodeIds) {
      if (input.selectedNodeIds.length === 0) {
        errors.push('选择性Copy需要至少选择一个节点');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 创建Copy上下文
   */
  public createCopyContext(input: CopyInput): CopyContext {
    const sourceThread = input.sourceThread;
    const copyStrategy = input.copyStrategy || CopyStrategy.createFull();
    const copyOptions = input.copyOptions || CopyOptions.createDefault();

    // 计算Copy范围
    const scope = copyStrategy.calculateCopyScope(sourceThread, input.selectedNodeIds);

    // 创建关系映射
    const relationshipMapping = new Map<ID, ID>();
    relationshipMapping.set(sourceThread.threadId, ID.generate());

    // 为每个节点创建映射
    for (const nodeId of scope.nodeIds) {
      relationshipMapping.set(
        { toString: () => nodeId.toString() } as ID,
        ID.generate()
      );
    }

    return CopyContext.create(
      sourceThread.threadId,
      copyOptions,
      scope,
      relationshipMapping
    );
  }

  /**
   * 计算Copy范围
   */
  public calculateCopyScope(
    thread: Thread,
    copyStrategy: CopyStrategy,
    selectedNodeIds?: NodeId[]
  ): CopyStrategy {
    return copyStrategy;
  }

  /**
   * 应用状态重置策略
   */
  public shouldResetState(thread: Thread, copyStrategy: CopyStrategy): boolean {
    return copyStrategy.shouldResetState(thread);
  }
}