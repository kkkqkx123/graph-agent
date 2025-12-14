import { AggregateRoot } from '../../common/base/aggregate-root';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { DomainError } from '../../common/errors/domain-error';
import { ThreadStatus } from '../value-objects/thread-status';
import { ThreadPriority } from '../value-objects/thread-priority';
import { ThreadCreatedEvent } from '../events/thread-created-event';
import { ThreadStatusChangedEvent } from '../events/thread-status-changed-event';

/**
 * Thread实体接口
 */
export interface ThreadProps {
  id: ID;
  sessionId: ID;
  workflowId?: ID;
  status: ThreadStatus;
  priority: ThreadPriority;
  title?: string;
  description?: string;
  metadata: Record<string, unknown>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: Version;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  errorMessage?: string;
  isDeleted: boolean;
}

/**
 * Thread实体
 * 
 * 表示执行线程的聚合根
 */
export class Thread extends AggregateRoot {
  private readonly props: ThreadProps;

  /**
   * 构造函数
   * @param props 线程属性
   */
  private constructor(props: ThreadProps) {
    super(props.id, props.createdAt, props.updatedAt, props.version);
    this.props = Object.freeze(props);
  }

  /**
   * 创建新线程
   * @param sessionId 会话ID
   * @param workflowId 工作流ID
   * @param priority 线程优先级
   * @param title 线程标题
   * @param description 线程描述
   * @param metadata 元数据
   * @returns 新线程实例
   */
  public static create(
    sessionId: ID,
    workflowId?: ID,
    priority?: ThreadPriority,
    title?: string,
    description?: string,
    metadata?: Record<string, unknown>
  ): Thread {
    const now = Timestamp.now();
    const threadId = ID.generate();
    const threadPriority = priority || ThreadPriority.normal();
    const threadStatus = ThreadStatus.pending();

    const props: ThreadProps = {
      id: threadId,
      sessionId,
      workflowId,
      status: threadStatus,
      priority: threadPriority,
      title,
      description,
      metadata: metadata || {},
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      isDeleted: false
    };

    const thread = new Thread(props);
    
    // 添加线程创建事件
    thread.addDomainEvent(new ThreadCreatedEvent(
      threadId,
      sessionId,
      workflowId,
      threadPriority.getNumericValue(),
      title,
      description,
      metadata
    ));

    return thread;
  }

  /**
   * 从已有属性重建线程
   * @param props 线程属性
   * @returns 线程实例
   */
  public static fromProps(props: ThreadProps): Thread {
    return new Thread(props);
  }

  /**
   * 获取线程ID
   * @returns 线程ID
   */
  public get threadId(): ID {
    return this.props.id;
  }

  /**
   * 获取会话ID
   * @returns 会话ID
   */
  public get sessionId(): ID {
    return this.props.sessionId;
  }

  /**
   * 获取工作流ID
   * @returns 工作流ID
   */
  public get workflowId(): ID | undefined {
    return this.props.workflowId;
  }

  /**
   * 获取线程状态
   * @returns 线程状态
   */
  public get status(): ThreadStatus {
    return this.props.status;
  }

  /**
   * 获取线程优先级
   * @returns 线程优先级
   */
  public get priority(): ThreadPriority {
    return this.props.priority;
  }

  /**
   * 获取线程标题
   * @returns 线程标题
   */
  public get title(): string | undefined {
    return this.props.title;
  }

  /**
   * 获取线程描述
   * @returns 线程描述
   */
  public get description(): string | undefined {
    return this.props.description;
  }

  /**
   * 获取元数据
   * @returns 元数据
   */
  public get metadata(): Record<string, unknown> {
    return { ...this.props.metadata };
  }

  /**
   * 获取开始时间
   * @returns 开始时间
   */
  public get startedAt(): Timestamp | undefined {
    return this.props.startedAt;
  }

  /**
   * 获取完成时间
   * @returns 完成时间
   */
  public get completedAt(): Timestamp | undefined {
    return this.props.completedAt;
  }

  /**
   * 获取错误信息
   * @returns 错误信息
   */
  public get errorMessage(): string | undefined {
    return this.props.errorMessage;
  }

  /**
   * 更新线程标题
   * @param title 新标题
   */
  public updateTitle(title: string): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除的线程');
    }

    if (!this.props.status.canOperate()) {
      throw new DomainError('无法更新非活跃状态的线程');
    }

    const newProps = {
      ...this.props,
      title,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新线程描述
   * @param description 新描述
   */
  public updateDescription(description: string): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除的线程');
    }

    if (!this.props.status.canOperate()) {
      throw new DomainError('无法更新非活跃状态的线程');
    }

    const newProps = {
      ...this.props,
      description,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新线程优先级
   * @param priority 新优先级
   */
  public updatePriority(priority: ThreadPriority): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除线程的优先级');
    }

    if (!this.props.status.canOperate()) {
      throw new DomainError('无法更新非活跃状态线程的优先级');
    }

    const newProps = {
      ...this.props,
      priority,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新元数据
   * @param metadata 新元数据
   */
  public updateMetadata(metadata: Record<string, unknown>): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除线程的元数据');
    }

    const newProps = {
      ...this.props,
      metadata: { ...metadata },
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 启动线程
   * @param startedBy 启动者ID
   */
  public start(startedBy?: ID): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法启动已删除的线程');
    }

    if (!this.props.status.isPending()) {
      throw new DomainError('只能启动待执行状态的线程');
    }

    const oldStatus = this.props.status;
    const newStatus = ThreadStatus.running();

    const newProps = {
      ...this.props,
      status: newStatus,
      startedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();

    // 添加状态变更事件
    this.addDomainEvent(new ThreadStatusChangedEvent(
      this.props.id,
      oldStatus,
      newStatus,
      startedBy,
      '线程启动'
    ));
  }

  /**
   * 暂停线程
   * @param pausedBy 暂停者ID
   * @param reason 暂停原因
   */
  public pause(pausedBy?: ID, reason?: string): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法暂停已删除的线程');
    }

    if (!this.props.status.isRunning()) {
      throw new DomainError('只能暂停运行中的线程');
    }

    const oldStatus = this.props.status;
    const newStatus = ThreadStatus.paused();

    const newProps = {
      ...this.props,
      status: newStatus,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();

    // 添加状态变更事件
    this.addDomainEvent(new ThreadStatusChangedEvent(
      this.props.id,
      oldStatus,
      newStatus,
      pausedBy,
      reason
    ));
  }

  /**
   * 恢复线程
   * @param resumedBy 恢复者ID
   * @param reason 恢复原因
   */
  public resume(resumedBy?: ID, reason?: string): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法恢复已删除的线程');
    }

    if (!this.props.status.isPaused()) {
      throw new DomainError('只能恢复暂停状态的线程');
    }

    const oldStatus = this.props.status;
    const newStatus = ThreadStatus.running();

    const newProps = {
      ...this.props,
      status: newStatus,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();

    // 添加状态变更事件
    this.addDomainEvent(new ThreadStatusChangedEvent(
      this.props.id,
      oldStatus,
      newStatus,
      resumedBy,
      reason
    ));
  }

  /**
   * 完成线程
   * @param completedBy 完成者ID
   * @param reason 完成原因
   */
  public complete(completedBy?: ID, reason?: string): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法完成已删除的线程');
    }

    if (!this.props.status.isActive()) {
      throw new DomainError('只能完成活跃状态的线程');
    }

    const oldStatus = this.props.status;
    const newStatus = ThreadStatus.completed();

    const newProps = {
      ...this.props,
      status: newStatus,
      completedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();

    // 添加状态变更事件
    this.addDomainEvent(new ThreadStatusChangedEvent(
      this.props.id,
      oldStatus,
      newStatus,
      completedBy,
      reason
    ));
  }

  /**
   * 失败线程
   * @param errorMessage 错误信息
   * @param failedBy 失败者ID
   * @param reason 失败原因
   */
  public fail(errorMessage: string, failedBy?: ID, reason?: string): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法设置已删除线程为失败状态');
    }

    if (!this.props.status.isActive()) {
      throw new DomainError('只能设置活跃状态的线程为失败状态');
    }

    const oldStatus = this.props.status;
    const newStatus = ThreadStatus.failed();

    const newProps = {
      ...this.props,
      status: newStatus,
      errorMessage,
      completedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();

    // 添加状态变更事件
    this.addDomainEvent(new ThreadStatusChangedEvent(
      this.props.id,
      oldStatus,
      newStatus,
      failedBy,
      reason,
      errorMessage
    ));
  }

  /**
   * 取消线程
   * @param cancelledBy 取消者ID
   * @param reason 取消原因
   */
  public cancel(cancelledBy?: ID, reason?: string): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法取消已删除的线程');
    }

    if (this.props.status.isTerminal()) {
      throw new DomainError('无法取消已终止状态的线程');
    }

    const oldStatus = this.props.status;
    const newStatus = ThreadStatus.cancelled();

    const newProps = {
      ...this.props,
      status: newStatus,
      completedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();

    // 添加状态变更事件
    this.addDomainEvent(new ThreadStatusChangedEvent(
      this.props.id,
      oldStatus,
      newStatus,
      cancelledBy,
      reason
    ));
  }

  /**
   * 标记线程为已删除
   */
  public markAsDeleted(): void {
    if (this.props.isDeleted) {
      return;
    }

    const newProps = {
      ...this.props,
      isDeleted: true,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 检查线程是否已删除
   * @returns 是否已删除
   */
  public isDeleted(): boolean {
    return this.props.isDeleted;
  }

  /**
   * 获取业务标识
   * @returns 业务标识
   */
  public getBusinessIdentifier(): string {
    return `thread:${this.props.id.toString()}`;
  }

  /**
   * 验证聚合的不变性
   */
  public validateInvariants(): void {
    if (!this.props.id) {
      throw new DomainError('线程ID不能为空');
    }

    if (!this.props.sessionId) {
      throw new DomainError('会话ID不能为空');
    }

    if (!this.props.status) {
      throw new DomainError('线程状态不能为空');
    }

    if (!this.props.priority) {
      throw new DomainError('线程优先级不能为空');
    }

    // 验证时间逻辑
    if (this.props.startedAt && this.props.completedAt) {
      if (this.props.startedAt.isAfter(this.props.completedAt)) {
        throw new DomainError('开始时间不能晚于完成时间');
      }
    }

    // 验证状态与时间的一致性
    if (this.props.status.isRunning() && !this.props.startedAt) {
      throw new DomainError('运行中的线程必须有开始时间');
    }

    if (this.props.status.isTerminal() && !this.props.completedAt) {
      throw new DomainError('已终止的线程必须有完成时间');
    }
  }

  /**
   * 验证实体的有效性
   */
  public override validate(): void {
    this.validateInvariants();
    this.props.status.validate();
    this.props.priority.validate();
  }
}