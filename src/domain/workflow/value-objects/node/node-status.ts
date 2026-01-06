import { ValueObject } from '../../../common/value-objects';

/**
 * 节点状态枚举
 */
export enum NodeStatusValue {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  CANCELLED = 'cancelled',
}

/**
 * 节点状态值对象接口
 */
export interface NodeStatusProps {
  value: NodeStatusValue;
}

/**
 * 节点状态值对象
 *
 * 用于表示单个节点的执行状态
 */
export class NodeStatus extends ValueObject<NodeStatusProps> {
  private constructor(props: NodeStatusProps) {
    super(props);
    if (!props.value) {
      throw new Error('节点状态不能为空');
    }
    if (!Object.values(NodeStatusValue).includes(props.value)) {
      throw new Error(`无效的节点状态: ${props.value}`);
    }
  }

  /**
   * 创建待执行状态
   * @returns 待执行状态实例
   */
  public static pending(): NodeStatus {
    return new NodeStatus({ value: NodeStatusValue.PENDING });
  }

  /**
   * 创建运行中状态
   * @returns 运行中状态实例
   */
  public static running(): NodeStatus {
    return new NodeStatus({ value: NodeStatusValue.RUNNING });
  }

  /**
   * 创建已完成状态
   * @returns 已完成状态实例
   */
  public static completed(): NodeStatus {
    return new NodeStatus({ value: NodeStatusValue.COMPLETED });
  }

  /**
   * 创建失败状态
   * @returns 失败状态实例
   */
  public static failed(): NodeStatus {
    return new NodeStatus({ value: NodeStatusValue.FAILED });
  }

  /**
   * 创建跳过状态
   * @returns 跳过状态实例
   */
  public static skipped(): NodeStatus {
    return new NodeStatus({ value: NodeStatusValue.SKIPPED });
  }

  /**
   * 创建已取消状态
   * @returns 已取消状态实例
   */
  public static cancelled(): NodeStatus {
    return new NodeStatus({ value: NodeStatusValue.CANCELLED });
  }

  /**
   * 从字符串创建节点状态
   * @param status 状态字符串
   * @returns 节点状态实例
   */
  public static fromString(status: string): NodeStatus {
    if (!Object.values(NodeStatusValue).includes(status as NodeStatusValue)) {
      throw new Error(`无效的节点状态: ${status}`);
    }
    return new NodeStatus({ value: status as NodeStatusValue });
  }

  /**
   * 获取状态值
   * @returns 状态值
   */
  public getValue(): NodeStatusValue {
    return this.props.value;
  }

  /**
   * 检查是否为待执行状态
   * @returns 是否为待执行状态
   */
  public isPending(): boolean {
    return this.props.value === NodeStatusValue.PENDING;
  }

  /**
   * 检查是否为运行中状态
   * @returns 是否为运行中状态
   */
  public isRunning(): boolean {
    return this.props.value === NodeStatusValue.RUNNING;
  }

  /**
   * 检查是否为已完成状态
   * @returns 是否为已完成状态
   */
  public isCompleted(): boolean {
    return this.props.value === NodeStatusValue.COMPLETED;
  }

  /**
   * 检查是否为失败状态
   * @returns 是否为失败状态
   */
  public isFailed(): boolean {
    return this.props.value === NodeStatusValue.FAILED;
  }

  /**
   * 检查是否为跳过状态
   * @returns 是否为跳过状态
   */
  public isSkipped(): boolean {
    return this.props.value === NodeStatusValue.SKIPPED;
  }

  /**
   * 检查是否为已取消状态
   * @returns 是否为已取消状态
   */
  public isCancelled(): boolean {
    return this.props.value === NodeStatusValue.CANCELLED;
  }

  /**
   * 检查是否为终止状态（已完成、失败、跳过、已取消）
   * @returns 是否为终止状态
   */
  public isTerminal(): boolean {
    return (
      this.props.value === NodeStatusValue.COMPLETED ||
      this.props.value === NodeStatusValue.FAILED ||
      this.props.value === NodeStatusValue.SKIPPED ||
      this.props.value === NodeStatusValue.CANCELLED
    );
  }

  /**
   * 检查是否为成功状态（已完成、跳过）
   * @returns 是否为成功状态
   */
  public isSuccess(): boolean {
    return (
      this.props.value === NodeStatusValue.COMPLETED || this.props.value === NodeStatusValue.SKIPPED
    );
  }

  /**
   * 检查是否为活跃状态（运行中）
   * @returns 是否为活跃状态
   */
  public isActive(): boolean {
    return this.props.value === NodeStatusValue.RUNNING;
  }

  /**
   * 检查是否准备好执行
   * @returns 是否准备好执行
   */
  public isReady(): boolean {
    return this.props.value === NodeStatusValue.PENDING;
  }

  /**
   * 检查是否可以开始执行
   * @returns 是否可以开始执行
   */
  public canStart(): boolean {
    return this.props.value === NodeStatusValue.PENDING;
  }

  /**
   * 检查是否可以取消
   * @returns 是否可以取消
   */
  public canCancel(): boolean {
    return (
      this.props.value === NodeStatusValue.PENDING || this.props.value === NodeStatusValue.RUNNING
    );
  }

  /**
   * 检查是否可以重试
   * @returns 是否可以重试
   */
  public canRetry(): boolean {
    return this.props.value === NodeStatusValue.FAILED;
  }

  /**
   * 比较两个节点状态是否相等
   * @param status 另一个节点状态
   * @returns 是否相等
   */
  public override equals(status?: NodeStatus): boolean {
    if (status === null || status === undefined) {
      return false;
    }
    return this.props.value === status.getValue();
  }

  /**
   * 获取节点状态的字符串表示
   * @returns 字符串表示
   */
  public override toString(): string {
    return this.props.value;
  }

  /**
   * 验证值对象的有效性
   */
  public validate(): void {
    // 验证在构造时已完成
  }
}
