import { Entity } from '../../common/base/entity';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { ExecutionStatus } from '../value-objects/execution-status';
import { NodeId } from '../value-objects/node-id';

/**
 * 工作流状态属性接口
 */
export interface WorkflowStateProps {
  /** 工作流ID */
  workflowId: ID;
  /** 执行状态 */
  status: ExecutionStatus;
  /** 进度（0-100） */
  progress: number;
  /** 当前节点ID */
  currentNodeId?: NodeId;
  /** 开始时间 */
  startTime?: Timestamp;
  /** 结束时间 */
  endTime?: Timestamp;
  /** 执行时长（毫秒） */
  duration?: number;
  /** 已完成节点数 */
  completedNodes: number;
  /** 总节点数 */
  totalNodes: number;
  /** 失败节点数 */
  failedNodes: number;
  /** 跳过节点数 */
  skippedNodes: number;
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
 * 工作流状态实体
 *
 * 表示工作流执行过程中的整体状态
 */
export class WorkflowState extends Entity {
  private readonly props: WorkflowStateProps;

  /**
   * 构造函数
   * @param props 工作流状态属性
   */
  private constructor(props: WorkflowStateProps) {
    super(
      ID.generate(),
      props.createdAt,
      props.updatedAt,
      props.version
    );
    this.props = Object.freeze(props);
  }

  /**
   * 创建工作流状态
   * @param workflowId 工作流ID
   * @param totalNodes 总节点数
   * @returns 工作流状态实例
   */
  public static create(workflowId: ID, totalNodes: number = 0): WorkflowState {
    const now = Timestamp.now();
    const props: WorkflowStateProps = {
      workflowId,
      status: ExecutionStatus.pending(),
      progress: 0,
      completedNodes: 0,
      totalNodes,
      failedNodes: 0,
      skippedNodes: 0,
      metadata: {},
      createdAt: now,
      updatedAt: now,
      version: Version.initial()
    };
    return new WorkflowState(props);
  }

  /**
   * 从已有属性重建工作流状态
   * @param props 工作流状态属性
   * @returns 工作流状态实例
   */
  public static fromProps(props: WorkflowStateProps): WorkflowState {
    return new WorkflowState(props);
  }

  /**
   * 获取工作流ID
   * @returns 工作流ID
   */
  public get workflowId(): ID {
    return this.props.workflowId;
  }

  /**
   * 获取执行状态
   * @returns 执行状态
   */
  public get status(): ExecutionStatus {
    return this.props.status;
  }

  /**
   * 获取进度
   * @returns 进度（0-100）
   */
  public get progress(): number {
    return this.props.progress;
  }

  /**
   * 获取当前节点ID
   * @returns 当前节点ID
   */
  public get currentNodeId(): NodeId | undefined {
    return this.props.currentNodeId;
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
   * 获取已完成节点数
   * @returns 已完成节点数
   */
  public get completedNodes(): number {
    return this.props.completedNodes;
  }

  /**
   * 获取总节点数
   * @returns 总节点数
   */
  public get totalNodes(): number {
    return this.props.totalNodes;
  }

  /**
   * 获取失败节点数
   * @returns 失败节点数
   */
  public get failedNodes(): number {
    return this.props.failedNodes;
  }

  /**
   * 获取跳过节点数
   * @returns 跳过节点数
   */
  public get skippedNodes(): number {
    return this.props.skippedNodes;
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
   * 检查是否可以开始执行
   * @returns 是否可以开始执行
   */
  public canStart(): boolean {
    return this.props.status.canStart();
  }

  /**
   * 检查是否可以暂停
   * @returns 是否可以暂停
   */
  public canPause(): boolean {
    return this.props.status.canPause();
  }

  /**
   * 检查是否可以恢复
   * @returns 是否可以恢复
   */
  public canResume(): boolean {
    return this.props.status.canResume();
  }

  /**
   * 检查是否可以取消
   * @returns 是否可以取消
   */
  public canCancel(): boolean {
    return this.props.status.canCancel();
  }

  /**
   * 开始执行
   */
  public start(): void {
    if (!this.props.status.canStart()) {
      throw new Error(`工作流状态不允许开始执行: ${this.props.status.toString()}`);
    }

    (this.props as any).status = ExecutionStatus.running();
    (this.props as any).startTime = Timestamp.now();
    this.update();
  }

  /**
   * 完成执行
   */
  public complete(): void {
    if (!this.props.status.isRunning()) {
      throw new Error(`工作流状态不允许完成: ${this.props.status.toString()}`);
    }

    const now = Timestamp.now();
    const duration = this.props.startTime ? now.diff(this.props.startTime) : 0;

    (this.props as any).status = ExecutionStatus.completed();
    (this.props as any).progress = 100;
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
      throw new Error(`工作流状态不允许标记失败: ${this.props.status.toString()}`);
    }

    const now = Timestamp.now();
    const duration = this.props.startTime ? now.diff(this.props.startTime) : 0;

    (this.props as any).status = ExecutionStatus.failed();
    (this.props as any).endTime = now;
    (this.props as any).duration = duration;
    (this.props as any).metadata = { ...this.props.metadata, error: error.message };
    this.update();
  }

  /**
   * 暂停执行
   */
  public pause(): void {
    if (!this.props.status.canPause()) {
      throw new Error(`工作流状态不允许暂停: ${this.props.status.toString()}`);
    }

    (this.props as any).status = ExecutionStatus.paused();
    this.update();
  }

  /**
   * 恢复执行
   */
  public resume(): void {
    if (!this.props.status.canResume()) {
      throw new Error(`工作流状态不允许恢复: ${this.props.status.toString()}`);
    }

    (this.props as any).status = ExecutionStatus.running();
    this.update();
  }

  /**
   * 取消执行
   */
  public cancel(): void {
    if (!this.props.status.canCancel()) {
      throw new Error(`工作流状态不允许取消: ${this.props.status.toString()}`);
    }

    const now = Timestamp.now();
    const duration = this.props.startTime ? now.diff(this.props.startTime) : 0;

    (this.props as any).status = ExecutionStatus.cancelled();
    (this.props as any).endTime = now;
    (this.props as any).duration = duration;
    this.update();
  }

  /**
   * 设置当前节点
   * @param nodeId 节点ID
   */
  public setCurrentNode(nodeId: NodeId): void {
    (this.props as any).currentNodeId = nodeId;
    this.update();
  }

  /**
   * 更新进度
   * @param progress 进度值（0-100）
   */
  public updateProgress(progress: number): void {
    if (progress < 0 || progress > 100) {
      throw new Error('进度值必须在0-100之间');
    }
    (this.props as any).progress = progress;
    this.update();
  }

  /**
   * 增加已完成节点数
   */
  public incrementCompletedNodes(): void {
    (this.props as any).completedNodes = this.props.completedNodes + 1;
    this.recalculateProgress();
    this.update();
  }

  /**
   * 增加失败节点数
   */
  public incrementFailedNodes(): void {
    (this.props as any).failedNodes = this.props.failedNodes + 1;
    this.update();
  }

  /**
   * 增加跳过节点数
   */
  public incrementSkippedNodes(): void {
    (this.props as any).skippedNodes = this.props.skippedNodes + 1;
    this.recalculateProgress();
    this.update();
  }

  /**
   * 设置总节点数
   * @param total 总节点数
   */
  public setTotalNodes(total: number): void {
    (this.props as any).totalNodes = total;
    this.recalculateProgress();
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
   * 重新计算进度
   */
  private recalculateProgress(): void {
    if (this.props.totalNodes > 0) {
      const processedNodes = this.props.completedNodes + this.props.skippedNodes;
      (this.props as any).progress = Math.floor((processedNodes / this.props.totalNodes) * 100);
    }
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
   * 获取工作流状态的字符串表示
   * @returns 字符串表示
   */
  public override toString(): string {
    return `WorkflowState(workflowId=${this.props.workflowId.toString()}, status=${this.props.status.toString()}, progress=${this.props.progress}%)`;
  }
}