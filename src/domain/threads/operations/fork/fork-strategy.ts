import { ValueObject } from '../../../common/value-objects/value-object';
import { ID } from '../../../common/value-objects/id';
import { NodeId } from '../../../workflow/value-objects/node-id';
import { Thread } from '../../entities/thread';
import { ExecutionContext } from '../../value-objects/execution-context';
import { NodeExecutionSnapshot } from '../../value-objects/node-execution';

/**
 * Fork策略类型
 */
export type ForkStrategyType = 'full' | 'partial' | 'minimal';

/**
 * 上下文保留类型
 */
export type ContextRetentionType = 'full' | 'partial' | 'minimal';

/**
 * 节点状态处理类型
 */
export type NodeStateHandlingType = 'copy' | 'reset' | 'inherit';

/**
 * Fork策略验证结果接口
 */
export interface ForkStrategyValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
}

/**
 * 上下文保留计划接口
 */
export interface ContextRetentionPlan {
  readonly variablesToRetain: Set<string>;
  readonly nodeStatesToRetain: Map<string, NodeExecutionSnapshot>;
  readonly includePromptContext: boolean;
  readonly includeHistory: boolean;
  readonly includeMetadata: boolean;
}

/**
 * Fork策略值对象
 * 
 * 定义Fork操作的策略，包括上下文保留和节点状态处理
 */
export class ForkStrategy extends ValueObject<{
  readonly type: ForkStrategyType;
  readonly contextRetention: ContextRetentionType;
  readonly nodeStateHandling: NodeStateHandlingType;
}> {
  private constructor(props: {
    readonly type: ForkStrategyType;
    readonly contextRetention: ContextRetentionType;
    readonly nodeStateHandling: NodeStateHandlingType;
  }) {
    super(props);
  }

  /**
   * 创建Fork策略
   * @param type Fork策略类型
   * @param contextRetention 上下文保留类型
   * @param nodeStateHandling 节点状态处理类型
   * @returns Fork策略实例
   */
  public static create(
    type: ForkStrategyType,
    contextRetention: ContextRetentionType,
    nodeStateHandling: NodeStateHandlingType
  ): ForkStrategy {
    return new ForkStrategy({ type, contextRetention, nodeStateHandling });
  }

  /**
   * 创建完整Fork策略
   * @returns Fork策略实例
   */
  public static createFull(): ForkStrategy {
    return new ForkStrategy({
      type: 'full',
      contextRetention: 'full',
      nodeStateHandling: 'copy'
    });
  }

  /**
   * 创建部分Fork策略
   * @returns Fork策略实例
   */
  public static createPartial(): ForkStrategy {
    return new ForkStrategy({
      type: 'partial',
      contextRetention: 'partial',
      nodeStateHandling: 'inherit'
    });
  }

  /**
   * 创建最小Fork策略
   * @returns Fork策略实例
   */
  public static createMinimal(): ForkStrategy {
    return new ForkStrategy({
      type: 'minimal',
      contextRetention: 'minimal',
      nodeStateHandling: 'reset'
    });
  }

  /**
   * 获取Fork策略类型
   * @returns Fork策略类型
   */
  public get type(): ForkStrategyType {
    return this.props.type;
  }

  /**
   * 获取上下文保留类型
   * @returns 上下文保留类型
   */
  public get contextRetention(): ContextRetentionType {
    return this.props.contextRetention;
  }

  /**
   * 获取节点状态处理类型
   * @returns 节点状态处理类型
   */
  public get nodeStateHandling(): NodeStateHandlingType {
    return this.props.nodeStateHandling;
  }

  /**
   * 验证Fork策略
   * @returns 验证结果
   */
  public validate(): ForkStrategyValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证策略组合的合理性
    if (this.props.type === 'full' && this.props.contextRetention !== 'full') {
      warnings.push('完整Fork策略建议使用完整上下文保留');
    }

    if (this.props.type === 'minimal' && this.props.contextRetention !== 'minimal') {
      warnings.push('最小Fork策略建议使用最小上下文保留');
    }

    if (this.props.contextRetention === 'full' && this.props.nodeStateHandling === 'reset') {
      warnings.push('完整上下文保留与重置节点状态可能不一致');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 计算上下文保留计划
   * @param thread 线程
   * @param forkPoint Fork点
   * @returns 上下文保留计划
   */
  public calculateContextRetention(
    thread: Thread,
    forkPoint: NodeId
  ): ContextRetentionPlan {
    const execution = thread.execution;
    const context = execution.context;

    let variablesToRetain = new Set<string>();
    let nodeStatesToRetain = new Map<string, NodeExecutionSnapshot>();
    let includePromptContext = false;
    let includeHistory = false;
    let includeMetadata = false;

    switch (this.props.contextRetention) {
      case 'full':
        // 保留所有变量
        variablesToRetain = new Set(context.variables.keys());
        // 保留所有节点状态
        for (const [nodeId, nodeExecution] of execution.nodeExecutions.entries()) {
          nodeStatesToRetain.set(nodeId, nodeExecution.createSnapshot());
        }
        includePromptContext = true;
        includeHistory = true;
        includeMetadata = true;
        break;

      case 'partial':
        // 保留部分变量（Fork点之前的变量）
        const forkPointExecution = execution.getNodeExecution(forkPoint);
        if (forkPointExecution) {
          // 保留Fork点之前的所有变量
          for (const [key] of context.variables.entries()) {
            variablesToRetain.add(key);
          }
        }
        // 保留Fork点之前的节点状态
        for (const [nodeId, nodeExecution] of execution.nodeExecutions.entries()) {
          if (nodeExecution.status.isCompleted() || nodeExecution.status.isSkipped()) {
            nodeStatesToRetain.set(nodeId, nodeExecution.createSnapshot());
          }
        }
        includePromptContext = true;
        includeHistory = true;
        includeMetadata = false;
        break;

      case 'minimal':
        // 只保留必要的变量
        variablesToRetain = new Set(['sessionId', 'workflowId']);
        // 不保留节点状态
        nodeStatesToRetain = new Map();
        includePromptContext = false;
        includeHistory = false;
        includeMetadata = false;
        break;
    }

    return {
      variablesToRetain,
      nodeStatesToRetain,
      includePromptContext,
      includeHistory,
      includeMetadata
    };
  }

  /**
   * 应用节点状态处理策略
   * @param nodeStates 节点状态快照
   * @returns 处理后的节点状态快照
   */
  public applyNodeStateHandling(
    nodeStates: Map<string, NodeExecutionSnapshot>
  ): Map<string, NodeExecutionSnapshot> {
    const result = new Map<string, NodeExecutionSnapshot>();

    switch (this.props.nodeStateHandling) {
      case 'copy':
        // 完整复制所有节点状态
        for (const [nodeId, snapshot] of nodeStates.entries()) {
          result.set(nodeId, snapshot);
        }
        break;

      case 'reset':
        // 重置所有节点状态（不保留）
        // 返回空Map
        break;

      case 'inherit':
        // 继承已完成的节点状态
        for (const [nodeId, snapshot] of nodeStates.entries()) {
          if (snapshot.status.isCompleted() || snapshot.status.isSkipped()) {
            result.set(nodeId, snapshot);
          }
        }
        break;
    }

    return result;
  }
}