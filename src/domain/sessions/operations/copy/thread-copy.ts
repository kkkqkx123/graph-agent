import { ID } from '../../../common/value-objects/id';
import { NodeId } from '../../../workflow/value-objects/node-id';
import { Thread } from '../../../threads/entities/thread';
import { ThreadOperation } from '../base/thread-operation';
import { OperationResult } from '../base/operation-result';
import { CopyContext, createCopyContext, DEFAULT_COPY_OPTIONS, CopyOptions } from './copy-context';
import { CopyStrategy } from './copy-strategy';

/**
 * Copy操作输入接口
 */
export interface CopyInput {
  readonly sourceThread: Thread;
  readonly copyStrategy?: CopyStrategy;
  readonly copyOptions?: CopyOptions;
  readonly selectedNodeIds?: NodeId[];
}

/**
 * Copy操作输出接口
 */
export interface CopyOutput {
  readonly copyContext: CopyContext;
  readonly copiedThreadId: ID;
  readonly copyStrategy: CopyStrategy;
}

/**
 * Copy验证结果接口
 */
export interface CopyValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
}

/**
 * Thread Copy操作
 * 
 * 负责复制一个线程，创建一个新的线程副本
 */
export class ThreadCopyOperation extends ThreadOperation<CopyInput, CopyOutput> {
  /**
   * 构造函数
   * @param operatorId 操作者ID
   */
  constructor(operatorId?: ID) {
    super(operatorId);
  }

  /**
   * 执行Copy操作
   * @param input Copy输入
   * @returns Copy结果
   */
  public async execute(input: CopyInput): Promise<OperationResult<CopyOutput>> {
    return this.executeWithValidation(input);
  }

  /**
   * 验证输入
   * @param input Copy输入
   * @returns 验证结果
   */
  protected validateInput(input: CopyInput): { valid: boolean; error?: string } {
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
   * 获取操作类型
   * @returns 操作类型
   */
  protected getOperationType(): string {
    return 'copy';
  }

  /**
   * 创建Copy上下文
   * @param input Copy输入
   * @returns Copy上下文
   */
  public createCopyContext(input: CopyInput): CopyContext {
    const sourceThread = input.sourceThread;
    const copyStrategy = input.copyStrategy || CopyStrategy.createFull();
    const copyOptions = input.copyOptions || DEFAULT_COPY_OPTIONS;

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

    return createCopyContext(
      sourceThread.threadId,
      copyOptions,
      scope,
      relationshipMapping
    );
  }

  /**
   * 验证Copy操作
   * @param input Copy输入
   * @returns Copy验证结果
   */
  public validateCopy(input: CopyInput): CopyValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证Copy策略
    const copyStrategy = input.copyStrategy || CopyStrategy.createFull();
    const strategyValidation = copyStrategy.validate();
    errors.push(...strategyValidation.errors);
    warnings.push(...strategyValidation.warnings);

    // 验证源线程状态
    if (input.sourceThread.status.isRunning()) {
      warnings.push('正在运行的线程可能无法完整复制');
    }

    // 验证Copy选项
    const copyOptions = input.copyOptions || DEFAULT_COPY_OPTIONS;
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
   * 计算Copy范围
   * @param thread 线程
   * @param copyStrategy Copy策略
   * @param selectedNodeIds 选中的节点ID列表
   * @returns Copy范围
   */
  public calculateCopyScope(
    thread: Thread,
    copyStrategy: CopyStrategy,
    selectedNodeIds?: NodeId[]
  ): CopyStrategy {
    return copyStrategy;
  }

  /**
   * 执行Copy操作（内部实现）
   * @param input Copy输入
   * @returns Copy结果
   */
  protected async executeInternal(input: CopyInput): Promise<OperationResult<CopyOutput>> {
    // 验证Copy操作
    const copyValidation = this.validateCopy(input);
    if (!copyValidation.valid) {
      throw new Error(`Copy验证失败: ${copyValidation.errors.join(', ')}`);
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
    const metadata = this.createMetadata({
      sourceThreadId: input.sourceThread.threadId.toString(),
      copiedThreadId: copiedThreadId.toString(),
      copyStrategy: copyStrategy.type,
      copyScope: copyContext.scope.nodeIds.length,
      warnings: copyValidation.warnings
    });

    return {
      success: true,
      result: output,
      metadata
    };
  }

}