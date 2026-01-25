import { ValueObject, ID } from '../../../../common/value-objects';
import { NodeId } from '../../../../workflow/value-objects';
import { Thread } from '../../../../threads/entities/thread';
import { CopyScope } from './copy-context';

/**
 * Copy策略类型
 */
export type CopyStrategyType = 'full' | 'partial' | 'selective';

/**
 * Copy策略验证结果接口
 */
export interface CopyStrategyValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
}

/**
 * Copy策略值对象
 *
 * 定义Copy操作的策略，包括复制范围和状态处理
 */
export class CopyStrategy extends ValueObject<{
  readonly type: CopyStrategyType;
  readonly includeExecutionHistory: boolean;
  readonly includeMetadata: boolean;
  readonly resetState: boolean;
}> {
  private constructor(props: {
    readonly type: CopyStrategyType;
    readonly includeExecutionHistory: boolean;
    readonly includeMetadata: boolean;
    readonly resetState: boolean;
  }) {
    super(props);
  }

  /**
   * 创建Copy策略
   * @param type Copy策略类型
   * @param includeExecutionHistory 是否包含执行历史
   * @param includeMetadata 是否包含元数据
   * @param resetState 是否重置状态
   * @returns Copy策略实例
   */
  public static create(
    type: CopyStrategyType,
    includeExecutionHistory: boolean = true,
    includeMetadata: boolean = true,
    resetState: boolean = false
  ): CopyStrategy {
    return new CopyStrategy({
      type,
      includeExecutionHistory,
      includeMetadata,
      resetState,
    });
  }

  /**
   * 创建完整Copy策略
   * @returns Copy策略实例
   */
  public static createFull(): CopyStrategy {
    return new CopyStrategy({
      type: 'full',
      includeExecutionHistory: true,
      includeMetadata: true,
      resetState: false,
    });
  }

  /**
   * 创建部分Copy策略
   * @returns Copy策略实例
   */
  public static createPartial(): CopyStrategy {
    return new CopyStrategy({
      type: 'partial',
      includeExecutionHistory: false,
      includeMetadata: false,
      resetState: true,
    });
  }

  /**
   * 创建选择性Copy策略
   * @returns Copy策略实例
   */
  public static createSelective(): CopyStrategy {
    return new CopyStrategy({
      type: 'selective',
      includeExecutionHistory: true,
      includeMetadata: true,
      resetState: false,
    });
  }

  /**
   * 获取Copy策略类型
   * @returns Copy策略类型
   */
  public get type(): CopyStrategyType {
    return this.props.type;
  }

  /**
   * 获取是否包含执行历史
   * @returns 是否包含执行历史
   */
  public get includeExecutionHistory(): boolean {
    return this.props.includeExecutionHistory;
  }

  /**
   * 获取是否包含元数据
   * @returns 是否包含元数据
   */
  public get includeMetadata(): boolean {
    return this.props.includeMetadata;
  }

  /**
   * 获取是否重置状态
   * @returns 是否重置状态
   */
  public get resetState(): boolean {
    return this.props.resetState;
  }

  /**
   * 验证Copy策略
   * @returns 验证结果
   */
  public validate(): CopyStrategyValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证策略组合的合理性
    if (this.props.type === 'full' && this.props.resetState) {
      warnings.push('完整Copy策略通常不需要重置状态');
    }

    if (this.props.type === 'partial' && !this.props.resetState) {
      warnings.push('部分Copy策略建议重置状态以避免状态不一致');
    }

    if (this.props.type === 'selective' && !this.props.includeExecutionHistory) {
      warnings.push('选择性Copy策略建议包含执行历史以便追踪');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 计算Copy范围
   * @param thread 线程
   * @param selectedNodeIds 选中的节点ID列表（可选）
   * @returns Copy范围
   */
  public calculateCopyScope(thread: Thread, selectedNodeIds?: NodeId[]): CopyScope {
    let nodeIds: NodeId[];
    let includeVariables: boolean;
    let includeNodeStates: boolean;
    let includeContext: boolean;

    switch (this.props.type) {
      case 'full':
        // 复制所有节点
        nodeIds = [];
        includeVariables = true;
        includeNodeStates = !this.props.resetState;
        includeContext = true;
        break;

      case 'partial':
        // 复制部分节点（已完成或跳过的节点）
        nodeIds = [];
        includeVariables = false;
        includeNodeStates = false;
        includeContext = false;
        break;

      case 'selective':
        // 复制选中的节点
        nodeIds = selectedNodeIds || [];
        includeVariables = true;
        includeNodeStates = !this.props.resetState;
        includeContext = true;
        break;

      default:
        nodeIds = [];
        includeVariables = false;
        includeNodeStates = false;
        includeContext = false;
    }

    return CopyScope.create(nodeIds, includeVariables, includeNodeStates, includeContext);
  }

  /**
   * 应用状态重置策略
   * @param thread 线程
   * @returns 是否需要重置状态
   */
  public shouldResetState(thread: Thread): boolean {
    if (!this.props.resetState) {
      return false;
    }

    // 如果线程已完成，建议重置状态
    if (thread.isCompleted()) {
      return true;
    }

    // 如果线程失败，建议重置状态
    if (thread.isFailed()) {
      return true;
    }

    return this.props.resetState;
  }
}
