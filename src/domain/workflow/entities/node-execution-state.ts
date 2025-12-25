import { Entity } from '../../common/base/entity';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { NodeStatus } from '../value-objects/node-status';
import { NodeId } from '../value-objects/node-id';

/**
 * 节点执行状态属性接口
 */
export interface NodeExecutionStateProps {
  /** 节点ID */
  nodeId: NodeId;
  /** 执行状态 */
  status: NodeStatus;
  /** 重试次数 */
  retryCount: number;
  /** 执行结果 */
  result?: unknown;
  /** 错误信息 */
  error?: Error;
  /** 开始时间 */
  startTime?: Timestamp;
  /** 结束时间 */
  endTime?: Timestamp;
  /** 执行时长（毫秒） */
  duration?: number;
  /** 元数据 */
  metadata: Record<string, unknown>;
  /** 创建时间 */
  createdAt: Timestamp;
  /** 更新时间 */
  updatedAt: Timestamp;
  /** 版本 */
  version: Version;
}

/**
 * 节点执行状态实体
 *
 * 表示单个节点在工作流执行过程中的状态
 */
export class NodeExecutionState extends Entity {
  private readonly props: NodeExecutionStateProps;

  /**
   * 构造函数
   * @param props 节点执行状态属性
   */
  private constructor(props: NodeExecutionStateProps) {
    super(
      ID.generate(),
      props.createdAt,
      props.updatedAt,
      props.version
    );
    this.props = Object.freeze(props);
  }

  /**
   * 创建节点执行状态
   * @param nodeId 节点ID
   * @returns 节点执行状态实例
   */
  public static create(nodeId: NodeId): NodeExecutionState {
    const now = Timestamp.now();
    const props: NodeExecutionStateProps = {
      nodeId,
      status: NodeStatus.pending(),
      retryCount: 0,
      metadata: {},
      createdAt: now,
      updatedAt: now,
      version: Version.initial()
    };
    return new NodeExecutionState(props);
  }

  /**
   * 从已有属性重建节点执行状态
   * @param props 节点执行状态属性
   * @returns 节点执行状态实例
   */
  public static fromProps(props: NodeExecutionStateProps): NodeExecutionState {
    return new NodeExecutionState(props);
  }

  /**
   * 获取节点ID
   * @returns 节点ID
   */
  public get nodeId(): NodeId {
    return this.props.nodeId;
  }

  /**
   * 获取执行状态
   * @returns 执行状态
   */
  public get status(): NodeStatus {
    return this.props.status;
  }

  /**
   * 获取重试次数
   * @returns 重试次数
   */
  public get retryCount(): number {
    return this.props.retryCount;
  }

  /**
   * 获取执行结果
   * @returns 执行结果
   */
  public get result(): unknown | undefined {
    return this.props.result;
  }

  /**
   * 获取错误信息
   * @returns 错误信息
   */
  public get error(): Error | undefined {
    return this.props.error;
  }

  /**
   * 获取开始时间
   * @returns 开始时间
   */
  public get startTime(): Timestamp | undefined {
    return this.props.startTime;
  }

  /**
   * 获取结束时间
   * @returns 结束时间
   */
  public get endTime(): Timestamp | undefined {
    return this.props.endTime;
  }

  /**
   * 获取执行时长
   * @returns 执行时长（毫秒）
   */
  public get duration(): number | undefined {
    return this.props.duration;
  }

  /**
   * 获取元数据
   * @returns 元数据
   */
  public get metadata(): Record<string, unknown> {
    return { ...this.props.metadata };
  }

  /**
   * 检查是否正在执行
   * @returns 是否正在执行
   */
  public isRunning(): boolean {
    return this.props.status.isRunning();
  }

  /**
   * 检查是否已完成
   * @returns 是否已完成
   */
  public isCompleted(): boolean {
    return this.props.status.isCompleted();
  }

  /**
   * 检查是否失败
   * @returns 是否失败
   */
  public isFailed(): boolean {
    return this.props.status.isFailed();
  }

  /**
   * 检查是否可以重试
   * @returns 是否可以重试
   */
  public canRetry(): boolean {
    return this.props.status.canRetry();
  }

  /**
   * 开始执行
   */
  public start(): void {
    if (!this.props.status.canStart()) {
      throw new Error(`节点状态不允许开始执行: ${this.props.status.toString()}`);
    }

    (this.props as any).status = NodeStatus.running();
    (this.props as any).startTime = Timestamp.now();
    this.update();
  }

  /**
   * 完成执行
   * @param result 执行结果
   */
  public complete(result?: unknown): void {
    if (!this.props.status.isRunning()) {
      throw new Error(`节点状态不允许完成: ${this.props.status.toString()}`);
    }

    const now = Timestamp.now();
    const duration = this.props.startTime ? now.diff(this.props.startTime) : 0;

    (this.props as any).status = NodeStatus.completed();
    (this.props as any).result = result;
    (this.props as any).endTime = now;
    (this.props as any).duration = duration;
    this.update();
  }

  /**
   * 标记失败
   * @param error 错误信息
   */
  public fail(error: Error): void {
    if (!this.props.status.isRunning()) {
      throw new Error(`节点状态不允许标记失败: ${this.props.status.toString()}`);
    }

    const now = Timestamp.now();
    const duration = this.props.startTime ? now.diff(this.props.startTime) : 0;

    (this.props as any).status = NodeStatus.failed();
    (this.props as any).error = error;
    (this.props as any).endTime = now;
    (this.props as any).duration = duration;
    this.update();
  }

  /**
   * 跳过执行
   * @param reason 跳过原因
   */
  public skip(reason?: string): void {
    if (!this.props.status.canStart()) {
      throw new Error(`节点状态不允许跳过: ${this.props.status.toString()}`);
    }

    (this.props as any).status = NodeStatus.skipped();
    (this.props as any).result = { skipped: true, reason };
    (this.props as any).endTime = Timestamp.now();
    this.update();
  }

  /**
   * 取消执行
   */
  public cancel(): void {
    if (!this.props.status.canCancel()) {
      throw new Error(`节点状态不允许取消: ${this.props.status.toString()}`);
    }

    const now = Timestamp.now();
    const duration = this.props.startTime ? now.diff(this.props.startTime) : 0;

    (this.props as any).status = NodeStatus.cancelled();
    (this.props as any).endTime = now;
    (this.props as any).duration = duration;
    this.update();
  }

  /**
   * 重试执行
   */
  public retry(): void {
    if (!this.props.status.canRetry()) {
      throw new Error(`节点状态不允许重试: ${this.props.status.toString()}`);
    }

    (this.props as any).status = NodeStatus.pending();
    (this.props as any).retryCount = this.props.retryCount + 1;
    (this.props as any).startTime = undefined;
    (this.props as any).endTime = undefined;
    (this.props as any).duration = undefined;
    (this.props as any).error = undefined;
    this.update();
  }

  /**
   * 更新元数据
   * @param metadata 新元数据
   */
  public updateMetadata(metadata: Record<string, unknown>): void {
    (this.props as any).metadata = { ...this.props.metadata, ...metadata };
    this.update();
  }

  /**
   * 更新实体
   */
  protected override update(): void {
    (this.props as any).updatedAt = Timestamp.now();
    (this.props as any).version = this.props.version.nextPatch();
    super.update();
  }

  /**
   * 获取节点执行状态的字符串表示
   * @returns 字符串表示
   */
  public override toString(): string {
    return `NodeExecutionState(nodeId=${this.props.nodeId.toString()}, status=${this.props.status.toString()}, retryCount=${this.props.retryCount})`;
  }
}