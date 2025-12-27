import { ID } from '../../../common/value-objects/id';
import { NodeId } from '../../../workflow/value-objects/node-id';
import { Thread } from '../../../threads/entities/thread';
import { ThreadOperation } from '../base/thread-operation';
import { OperationResult } from '../base/operation-result';
import { ForkContext, createForkContext, DEFAULT_FORK_OPTIONS, ForkOptions } from './fork-context';
import { ForkStrategy } from './fork-strategy';
import { ExecutionContext } from '../../../threads/value-objects/execution-context';
import { NodeExecution, NodeExecutionSnapshot } from '../../../threads/value-objects/node-execution';
import { PromptContext } from '../../../workflow/value-objects/prompt-context';

/**
 * Fork操作输入接口
 */
export interface ForkInput {
  readonly parentThread: Thread;
  readonly forkPoint: NodeId;
  readonly forkStrategy?: ForkStrategy;
  readonly forkOptions?: ForkOptions;
}

/**
 * Fork操作输出接口
 */
export interface ForkOutput {
  readonly forkContext: ForkContext;
  readonly forkedThreadId: ID;
  readonly forkStrategy: ForkStrategy;
}

/**
 * Fork验证结果接口
 */
export interface ForkValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
}

/**
 * Thread Fork操作
 * 
 * 负责从指定节点Fork出一个新的线程
 */
export class ThreadForkOperation extends ThreadOperation<ForkInput, ForkOutput> {
  /**
   * 构造函数
   * @param operatorId 操作者ID
   */
  constructor(operatorId?: ID) {
    super(operatorId);
  }

  /**
   * 执行Fork操作
   * @param input Fork输入
   * @returns Fork结果
   */
  public async execute(input: ForkInput): Promise<OperationResult<ForkOutput>> {
    return this.executeWithValidation(input);
  }

  /**
   * 验证输入
   * @param input Fork输入
   * @returns 验证结果
   */
  protected validateInput(input: ForkInput): { valid: boolean; error?: string } {
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
   * 获取操作类型
   * @returns 操作类型
   */
  protected getOperationType(): string {
    return 'fork';
  }

  /**
   * 创建Fork上下文
   * @param input Fork输入
   * @returns Fork上下文
   */
  public createForkContext(input: ForkInput): ForkContext {
    const parentThread = input.parentThread;
    const forkPoint = input.forkPoint;
    const forkStrategy = input.forkStrategy || ForkStrategy.createPartial();
    const forkOptions = input.forkOptions || DEFAULT_FORK_OPTIONS;

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

    return createForkContext(
      parentThread.threadId,
      forkPoint,
      variableSnapshot,
      nodeStateSnapshot,
      promptContextSnapshot,
      forkOptions
    );
  }

  /**
   * 验证Fork操作
   * @param input Fork输入
   * @returns Fork验证结果
   */
  public validateFork(input: ForkInput): ForkValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证Fork策略
    const forkStrategy = input.forkStrategy || ForkStrategy.createPartial();
    const strategyValidation = forkStrategy.validate();
    errors.push(...strategyValidation.errors);
    warnings.push(...strategyValidation.warnings);

    // 验证Fork点状态
    const forkPointExecution = input.parentThread.execution.getNodeExecution(input.forkPoint);
    if (forkPointExecution) {
      if (forkPointExecution.status.isPending()) {
        warnings.push('Fork点尚未执行，可能无法获得完整的上下文');
      }
    }

    // 验证上下文保留策略
    const forkOptions = input.forkOptions || DEFAULT_FORK_OPTIONS;
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
   * 计算上下文保留策略
   * @param thread 线程
   * @param forkPoint Fork点
   * @param forkStrategy Fork策略
   * @returns 上下文保留策略
   */
  public calculateContextRetention(
    thread: Thread,
    forkPoint: NodeId,
    forkStrategy: ForkStrategy
  ): ForkStrategy {
    return forkStrategy;
  }

  /**
   * 执行Fork操作（内部实现）
   * @param input Fork输入
   * @returns Fork结果
   */
  protected async executeInternal(input: ForkInput): Promise<OperationResult<ForkOutput>> {
    // 验证Fork操作
    const forkValidation = this.validateFork(input);
    if (!forkValidation.valid) {
      throw new Error(`Fork验证失败: ${forkValidation.errors.join(', ')}`);
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
    const metadata = this.createMetadata({
      parentThreadId: input.parentThread.threadId.toString(),
      forkPoint: input.forkPoint.toString(),
      forkedThreadId: forkedThreadId.toString(),
      forkStrategy: forkStrategy.type,
      warnings: forkValidation.warnings
    });

    return {
      success: true,
      result: output,
      metadata
    };
  }

}