import { ValueObject } from '../../../common/value-objects';
import { NodeStatusValue } from '../node/node-status';
import { ValidationError } from '../../../common/exceptions';

/**
 * 节点执行状态属性接口
 */
export interface NodeExecutionStateProps {
  /** 节点ID */
  nodeId: string;
  /** 执行状态 */
  status: NodeStatusValue;
  /** 开始时间 */
  startTime?: Date;
  /** 结束时间 */
  endTime?: Date;
  /** 执行耗时（毫秒） */
  executionTime?: number;
  /** 错误信息 */
  error?: string;
  /** 执行结果 */
  result?: unknown;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 节点执行状态值对象
 *
 * 用于表示单个节点的执行状态，包含状态、时间、结果等信息
 */
export class NodeExecutionState extends ValueObject<NodeExecutionStateProps> {
  private constructor(props: NodeExecutionStateProps) {
    super(props);
    this.validate();
  }

  /**
   * 创建节点执行状态
   * @param nodeId 节点ID
   * @param status 执行状态
   * @returns 节点执行状态实例
   */
  public static create(nodeId: string, status: NodeStatusValue = NodeStatusValue.PENDING): NodeExecutionState {
    return new NodeExecutionState({
      nodeId,
      status,
    });
  }

  /**
   * 从已有属性重建节点执行状态
   * @param props 节点执行状态属性
   * @returns 节点执行状态实例
   */
  public static fromProps(props: NodeExecutionStateProps): NodeExecutionState {
    return new NodeExecutionState({
      nodeId: props.nodeId,
      status: props.status,
      startTime: props.startTime ? new Date(props.startTime) : undefined,
      endTime: props.endTime ? new Date(props.endTime) : undefined,
      executionTime: props.executionTime,
      error: props.error,
      result: props.result,
      metadata: props.metadata ? { ...props.metadata } : undefined,
    });
  }

  /**
   * 获取节点ID
   * @returns 节点ID
   */
  public get nodeId(): string {
    return this.props.nodeId;
  }

  /**
   * 获取执行状态
   * @returns 执行状态
   */
  public get status(): NodeStatusValue {
    return this.props.status;
  }

  /**
   * 获取开始时间
   * @returns 开始时间
   */
  public get startTime(): Date | undefined {
    return this.props.startTime ? new Date(this.props.startTime) : undefined;
  }

  /**
   * 获取结束时间
   * @returns 结束时间
   */
  public get endTime(): Date | undefined {
    return this.props.endTime ? new Date(this.props.endTime) : undefined;
  }

  /**
   * 获取执行耗时
   * @returns 执行耗时（毫秒）
   */
  public get executionTime(): number | undefined {
    return this.props.executionTime;
  }

  /**
   * 获取错误信息
   * @returns 错误信息
   */
  public get error(): string | undefined {
    return this.props.error;
  }

  /**
   * 获取执行结果
   * @returns 执行结果
   */
  public get result(): unknown {
    return this.props.result;
  }

  /**
   * 获取元数据
   * @returns 元数据
   */
  public get metadata(): Record<string, unknown> | undefined {
    return this.props.metadata ? { ...this.props.metadata } : undefined;
  }

  /**
   * 标记节点开始执行
   * @returns 新的节点执行状态实例
   */
  public start(): NodeExecutionState {
    return new NodeExecutionState({
      ...this.props,
      status: NodeStatusValue.RUNNING,
      startTime: new Date(),
    });
  }

  /**
   * 标记节点完成
   * @param result 执行结果
   * @returns 新的节点执行状态实例
   */
  public complete(result?: unknown): NodeExecutionState {
    const endTime = new Date();
    const executionTime = this.props.startTime
      ? endTime.getTime() - this.props.startTime.getTime()
      : undefined;

    return new NodeExecutionState({
      ...this.props,
      status: NodeStatusValue.COMPLETED,
      endTime,
      executionTime,
      result,
    });
  }

  /**
   * 标记节点失败
   * @param error 错误信息
   * @returns 新的节点执行状态实例
   */
  public fail(error: string): NodeExecutionState {
    const endTime = new Date();
    const executionTime = this.props.startTime
      ? endTime.getTime() - this.props.startTime.getTime()
      : undefined;

    return new NodeExecutionState({
      ...this.props,
      status: NodeStatusValue.FAILED,
      endTime,
      executionTime,
      error,
    });
  }

  /**
   * 标记节点跳过
   * @returns 新的节点执行状态实例
   */
  public skip(): NodeExecutionState {
    const endTime = new Date();
    const executionTime = this.props.startTime
      ? endTime.getTime() - this.props.startTime.getTime()
      : undefined;

    return new NodeExecutionState({
      ...this.props,
      status: NodeStatusValue.SKIPPED,
      endTime,
      executionTime,
    });
  }

  /**
   * 标记节点取消
   * @returns 新的节点执行状态实例
   */
  public cancel(): NodeExecutionState {
    const endTime = new Date();
    const executionTime = this.props.startTime
      ? endTime.getTime() - this.props.startTime.getTime()
      : undefined;

    return new NodeExecutionState({
      ...this.props,
      status: NodeStatusValue.CANCELLED,
      endTime,
      executionTime,
    });
  }

  /**
   * 更新元数据
   * @param metadata 元数据
   * @returns 新的节点执行状态实例
   */
  public updateMetadata(metadata: Record<string, unknown>): NodeExecutionState {
    return new NodeExecutionState({
      ...this.props,
      metadata: { ...this.props.metadata, ...metadata },
    });
  }

  /**
   * 检查是否为待执行状态
   * @returns 是否为待执行状态
   */
  public isPending(): boolean {
    return this.props.status === NodeStatusValue.PENDING;
  }

  /**
   * 检查是否为运行中状态
   * @returns 是否为运行中状态
   */
  public isRunning(): boolean {
    return this.props.status === NodeStatusValue.RUNNING;
  }

  /**
   * 检查是否为已完成状态
   * @returns 是否为已完成状态
   */
  public isCompleted(): boolean {
    return this.props.status === NodeStatusValue.COMPLETED;
  }

  /**
   * 检查是否为失败状态
   * @returns 是否为失败状态
   */
  public isFailed(): boolean {
    return this.props.status === NodeStatusValue.FAILED;
  }

  /**
   * 检查是否为跳过状态
   * @returns 是否为跳过状态
   */
  public isSkipped(): boolean {
    return this.props.status === NodeStatusValue.SKIPPED;
  }

  /**
   * 检查是否为已取消状态
   * @returns 是否为已取消状态
   */
  public isCancelled(): boolean {
    return this.props.status === NodeStatusValue.CANCELLED;
  }

  /**
   * 检查是否为终止状态（已完成、失败、跳过、已取消）
   * @returns 是否为终止状态
   */
  public isTerminal(): boolean {
    return (
      this.props.status === NodeStatusValue.COMPLETED ||
      this.props.status === NodeStatusValue.FAILED ||
      this.props.status === NodeStatusValue.SKIPPED ||
      this.props.status === NodeStatusValue.CANCELLED
    );
  }

  /**
   * 检查是否为成功状态（已完成、跳过）
   * @returns 是否为成功状态
   */
  public isSuccess(): boolean {
    return this.props.status === NodeStatusValue.COMPLETED || this.props.status === NodeStatusValue.SKIPPED;
  }

  /**
   * 比较两个节点执行状态是否相等
   * @param state 另一个节点执行状态
   * @returns 是否相等
   */
  public override equals(state?: NodeExecutionState): boolean {
    if (state === null || state === undefined) {
      return false;
    }
    return (
      this.props.nodeId === state.nodeId &&
      this.props.status === state.status &&
      this.props.startTime?.getTime() === state.startTime?.getTime() &&
      this.props.endTime?.getTime() === state.endTime?.getTime()
    );
  }

  /**
   * 获取节点执行状态的字符串表示
   * @returns 字符串表示
   */
  public override toString(): string {
    return `NodeExecutionState(nodeId="${this.props.nodeId}", status="${this.props.status}", executionTime=${this.props.executionTime}ms)`;
  }

  /**
   * 验证值对象的有效性
   */
  public validate(): void {
    if (!this.props.nodeId || typeof this.props.nodeId !== 'string') {
      throw new ValidationError('节点ID必须是非空字符串');
    }
    if (!Object.values(NodeStatusValue).includes(this.props.status)) {
      throw new ValidationError(`无效的节点状态: ${this.props.status}`);
    }
    if (this.props.startTime && !(this.props.startTime instanceof Date)) {
      throw new ValidationError('开始时间必须是Date对象');
    }
    if (this.props.endTime && !(this.props.endTime instanceof Date)) {
      throw new ValidationError('结束时间必须是Date对象');
    }
    if (this.props.executionTime !== undefined && (typeof this.props.executionTime !== 'number' || this.props.executionTime < 0)) {
      throw new ValidationError('执行耗时必须是非负数');
    }
    if (this.props.startTime && this.props.endTime && this.props.startTime > this.props.endTime) {
      throw new ValidationError('开始时间不能晚于结束时间');
    }
  }
}