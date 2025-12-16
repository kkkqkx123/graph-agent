import { Entity } from '../../common/base/entity';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { DomainError } from '../../common/errors/domain-error';

/**
 * 工作流状态属性接口
 */
export interface WorkflowStateProps {
  id: ID;
  workflowId: ID;
  threadId?: string;
  sessionId?: string;
  data: Record<string, unknown>;
  status: WorkflowStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: Version;
  metadata: Record<string, unknown>;
}

/**
 * 工作流状态枚举
 */
export enum WorkflowStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * 工作流状态实体
 * 
 * 表示工作流执行过程中的状态
 */
export class WorkflowState extends Entity {
  private readonly props: WorkflowStateProps;

  constructor(props: WorkflowStateProps) {
    super(props.id, props.createdAt, props.updatedAt, props.version);
    this.props = Object.freeze(props);
  }

  /**
   * 创建新的工作流状态
   */
  public static create(
    workflowId: ID,
    data: Record<string, unknown>,
    options?: {
      threadId?: string;
      sessionId?: string;
      status?: WorkflowStatus;
      metadata?: Record<string, unknown>;
    }
  ): WorkflowState {
    const now = Timestamp.now();
    const stateId = ID.generate();

    const props: WorkflowStateProps = {
      id: stateId,
      workflowId,
      threadId: options?.threadId,
      sessionId: options?.sessionId,
      data: data || {},
      status: options?.status || WorkflowStatus.PENDING,
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      metadata: options?.metadata || {}
    };

    return new WorkflowState(props);
  }

  /**
   * 从已有属性重建工作流状态
   */
  public static fromProps(props: WorkflowStateProps): WorkflowState {
    return new WorkflowState(props);
  }

  /**
   * 获取状态ID
   */
  public get stateId(): ID {
    return this.props.id;
  }

  /**
   * 获取工作流ID
   */
  public get workflowId(): ID {
    return this.props.workflowId;
  }

  /**
   * 获取线程ID
   */
  public get threadId(): string | undefined {
    return this.props.threadId;
  }

  /**
   * 获取会话ID
   */
  public get sessionId(): string | undefined {
    return this.props.sessionId;
  }

  /**
   * 获取状态数据
   */
  public get data(): Record<string, unknown> {
    return { ...this.props.data };
  }

  /**
   * 获取状态
   */
  public get status(): WorkflowStatus {
    return this.props.status;
  }

  /**
   * 获取元数据
   */
  public get metadata(): Record<string, unknown> {
    return { ...this.props.metadata };
  }

  /**
   * 获取数据值
   */
  public getData(key: string): unknown {
    return this.props.data[key];
  }

  /**
   * 设置数据值
   */
  public setData(key: string, value: unknown): WorkflowState {
    const newData = { ...this.props.data };
    newData[key] = value;

    return new WorkflowState({
      ...this.props,
      data: newData,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    });
  }

  /**
   * 移除数据值
   */
  public removeData(key: string): WorkflowState {
    const newData = { ...this.props.data };
    delete newData[key];

    return new WorkflowState({
      ...this.props,
      data: newData,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    });
  }

  /**
   * 检查是否有数据
   */
  public hasData(key: string): boolean {
    return key in this.props.data;
  }

  /**
   * 更新状态数据
   */
  public updateData(data: Record<string, unknown>): WorkflowState {
    return new WorkflowState({
      ...this.props,
      data: { ...this.props.data, ...data },
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    });
  }

  /**
   * 替换状态数据
   */
  public replaceData(data: Record<string, unknown>): WorkflowState {
    return new WorkflowState({
      ...this.props,
      data: { ...data },
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    });
  }

  /**
   * 设置状态
   */
  public setStatus(status: WorkflowStatus): WorkflowState {
    return new WorkflowState({
      ...this.props,
      status,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    });
  }

  /**
   * 更新元数据
   */
  public updateMetadata(metadata: Record<string, unknown>): WorkflowState {
    return new WorkflowState({
      ...this.props,
      metadata: { ...this.props.metadata, ...metadata },
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    });
  }

  /**
   * 设置元数据值
   */
  public setMetadata(key: string, value: unknown): WorkflowState {
    const newMetadata = { ...this.props.metadata };
    newMetadata[key] = value;

    return new WorkflowState({
      ...this.props,
      metadata: newMetadata,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    });
  }

  /**
   * 检查是否为待处理状态
   */
  public isPending(): boolean {
    return this.props.status === WorkflowStatus.PENDING;
  }

  /**
   * 检查是否为运行中状态
   */
  public isRunning(): boolean {
    return this.props.status === WorkflowStatus.RUNNING;
  }

  /**
   * 检查是否为暂停状态
   */
  public isPaused(): boolean {
    return this.props.status === WorkflowStatus.PAUSED;
  }

  /**
   * 检查是否为已完成状态
   */
  public isCompleted(): boolean {
    return this.props.status === WorkflowStatus.COMPLETED;
  }

  /**
   * 检查是否为失败状态
   */
  public isFailed(): boolean {
    return this.props.status === WorkflowStatus.FAILED;
  }

  /**
   * 检查是否为已取消状态
   */
  public isCancelled(): boolean {
    return this.props.status === WorkflowStatus.CANCELLED;
  }

  /**
   * 检查是否为终止状态
   */
  public isTerminal(): boolean {
    return [
      WorkflowStatus.COMPLETED,
      WorkflowStatus.FAILED,
      WorkflowStatus.CANCELLED
    ].includes(this.props.status);
  }

  /**
   * 检查是否为活跃状态
   */
  public isActive(): boolean {
    return [
      WorkflowStatus.PENDING,
      WorkflowStatus.RUNNING,
      WorkflowStatus.PAUSED
    ].includes(this.props.status);
  }

  /**
   * 开始执行
   */
  public start(): WorkflowState {
    if (!this.isPending()) {
      throw new DomainError('只有待处理状态可以开始执行');
    }
    return this.setStatus(WorkflowStatus.RUNNING);
  }

  /**
   * 暂停执行
   */
  public pause(): WorkflowState {
    if (!this.isRunning()) {
      throw new DomainError('只有运行中状态可以暂停');
    }
    return this.setStatus(WorkflowStatus.PAUSED);
  }

  /**
   * 恢复执行
   */
  public resume(): WorkflowState {
    if (!this.isPaused()) {
      throw new DomainError('只有暂停状态可以恢复');
    }
    return this.setStatus(WorkflowStatus.RUNNING);
  }

  /**
   * 完成执行
   */
  public complete(): WorkflowState {
    if (!this.isActive()) {
      throw new DomainError('只有活跃状态可以完成');
    }
    return this.setStatus(WorkflowStatus.COMPLETED);
  }

  /**
   * 标记为失败
   */
  public fail(): WorkflowState {
    if (!this.isActive()) {
      throw new DomainError('只有活跃状态可以标记为失败');
    }
    return this.setStatus(WorkflowStatus.FAILED);
  }

  /**
   * 取消执行
   */
  public cancel(): WorkflowState {
    if (this.isTerminal()) {
      throw new DomainError('终止状态无法取消');
    }
    return this.setStatus(WorkflowStatus.CANCELLED);
  }

  /**
   * 创建检查点
   */
  public createCheckpoint(): WorkflowState {
    return this.setMetadata('checkpoint', {
      timestamp: Timestamp.now(),
      data: this.props.data,
      status: this.props.status
    });
  }

  /**
   * 恢复到检查点
   */
  public restoreFromCheckpoint(): WorkflowState {
    const checkpoint = this.props.metadata['checkpoint'] as any;
    if (!checkpoint) {
      throw new DomainError('没有可用的检查点');
    }

    return new WorkflowState({
      ...this.props,
      data: checkpoint.data,
      status: checkpoint.status,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    });
  }

  /**
   * 克隆状态
   */
  public clone(): WorkflowState {
    return new WorkflowState({
      ...this.props,
      id: ID.generate(),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      version: Version.initial()
    });
  }

  /**
   * 转换为字典
   */
  public toDict(): Record<string, unknown> {
    return {
      id: this.props.id.toString(),
      workflowId: this.props.workflowId.toString(),
      threadId: this.props.threadId,
      sessionId: this.props.sessionId,
      data: this.props.data,
      status: this.props.status,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
      version: this.props.version.toString(),
      metadata: this.props.metadata
    };
  }

  /**
   * 从字典创建状态
   */
  public static fromDict(dict: Record<string, unknown>): WorkflowState {
    try {
      return new WorkflowState({
        id: ID.fromString(dict['id'] as string),
        workflowId: ID.fromString(dict['workflowId'] as string),
        threadId: dict['threadId'] as string,
        sessionId: dict['sessionId'] as string,
        data: dict['data'] as Record<string, unknown>,
        status: dict['status'] as WorkflowStatus,
        createdAt: Timestamp.fromString(dict['createdAt'] as string),
        updatedAt: Timestamp.fromString(dict['updatedAt'] as string),
        version: Version.fromString(dict['version'] as string),
        metadata: dict['metadata'] as Record<string, unknown>
      });
    } catch (error) {
      throw new DomainError(`无法从字典创建工作流状态: ${error}`);
    }
  }

  /**
   * 验证状态的不变性
   */
  public validateInvariants(): void {
    if (!this.props.id) {
      throw new DomainError('状态ID不能为空');
    }
    if (!this.props.workflowId) {
      throw new DomainError('工作流ID不能为空');
    }
    if (!this.props.data) {
      throw new DomainError('状态数据不能为空');
    }
    if (!Object.values(WorkflowStatus).includes(this.props.status)) {
      throw new DomainError('无效的工作流状态');
    }
  }

  /**
   * 验证实体的有效性
   */
  public override validate(): void {
    this.validateInvariants();
  }
}