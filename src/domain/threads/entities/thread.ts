import { Entity } from '../../common/base/entity';
import { ID, Timestamp, Version } from '../../common/value-objects';
import {
  ThreadStatus,
  ThreadPriority,
  ThreadDefinition,
  ThreadExecution,
  ExecutionContext,
} from '../value-objects';
import { PromptContext } from '../../workflow/value-objects/context';
import { Metadata } from '../../checkpoint/value-objects';
import { DeletionStatus } from '../../checkpoint/value-objects';
/**
 * Thread实体属性接口
 */
export interface ThreadProps {
  readonly id: ID;
  readonly sessionId: ID;
  readonly workflowId: ID;
  readonly status: ThreadStatus;
  readonly priority: ThreadPriority;
  readonly title?: string;
  readonly description?: string;
  readonly metadata: Metadata;
  readonly definition: ThreadDefinition;
  readonly execution: ThreadExecution;
  readonly deletionStatus: DeletionStatus;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: Version;
}

/**
 * Thread聚合根
 *
 * 线程聚合根，专注于串行执行流程协调
 * 职责：
 * - 串行执行流程协调
 * - 单线程内的状态管理
 * - 执行步骤的顺序控制
 * - 错误处理和恢复
 */
export class Thread extends Entity {
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
    workflowId: ID,
    priority?: ThreadPriority,
    title?: string,
    description?: string,
    metadata?: Record<string, unknown>
  ): Thread {
    const now = Timestamp.now();
    const threadId = ID.generate();
    const threadPriority = priority || ThreadPriority.normal();
    const threadStatus = ThreadStatus.pending();

    // 创建线程定义值对象
    const definition = ThreadDefinition.create(
      threadId,
      sessionId,
      workflowId,
      threadPriority,
      title,
      description,
      metadata
    );

    // 创建执行上下文
    const promptContext = PromptContext.create('');
    const context = ExecutionContext.create(promptContext);

    // 创建线程执行值对象
    const execution = ThreadExecution.create(threadId, context);

    const props: ThreadProps = {
      id: threadId,
      sessionId,
      workflowId,
      status: threadStatus,
      priority: threadPriority,
      title,
      description,
      metadata: Metadata.create(metadata || {}),
      definition,
      execution,
      deletionStatus: DeletionStatus.active(),
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
    };

    const thread = new Thread(props);

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

  // 状态管理方法

  /**
   * 启动线程
   * @param startedBy 启动者ID
   * @returns 新线程实例
   */
  public start(startedBy?: ID): Thread {
    this.props.deletionStatus.ensureActive();

    if (!this.props.status.isPending()) {
      throw new Error('只能启动待执行状态的线程');
    }

    const oldStatus = this.props.status;
    const newStatus = ThreadStatus.running();
    const newExecution = this.props.execution.start();

    return new Thread({
      ...this.props,
      status: newStatus,
      execution: newExecution,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 暂停线程
   * @param pausedBy 暂停者ID
   * @param reason 暂停原因
   * @returns 新线程实例
   */
  public pause(pausedBy?: ID, reason?: string): Thread {
    this.props.deletionStatus.ensureActive();

    if (!this.props.status.isRunning()) {
      throw new Error('只能暂停运行中的线程');
    }

    const oldStatus = this.props.status;
    const newStatus = ThreadStatus.paused();
    const newExecution = this.props.execution.pause();

    return new Thread({
      ...this.props,
      status: newStatus,
      execution: newExecution,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 恢复线程
   * @param resumedBy 恢复者ID
   * @param reason 恢复原因
   * @returns 新线程实例
   */
  public resume(resumedBy?: ID, reason?: string): Thread {
    this.props.deletionStatus.ensureActive();

    if (!this.props.status.isPaused()) {
      throw new Error('只能恢复暂停状态的线程');
    }

    const oldStatus = this.props.status;
    const newStatus = ThreadStatus.running();
    const newExecution = this.props.execution.resume();

    return new Thread({
      ...this.props,
      status: newStatus,
      execution: newExecution,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 完成线程
   * @param completedBy 完成者ID
   * @param reason 完成原因
   * @returns 新线程实例
   */
  public complete(completedBy?: ID, reason?: string): Thread {
    this.props.deletionStatus.ensureActive();

    if (!this.props.status.isActive()) {
      throw new Error('只能完成活跃状态的线程');
    }

    const oldStatus = this.props.status;
    const newStatus = ThreadStatus.completed();
    const newExecution = this.props.execution.complete();

    return new Thread({
      ...this.props,
      status: newStatus,
      execution: newExecution,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 失败线程
   * @param errorMessage 错误信息
   * @param failedBy 失败者ID
   * @param reason 失败原因
   * @returns 新线程实例
   */
  public fail(errorMessage: string, failedBy?: ID, reason?: string): Thread {
    this.props.deletionStatus.ensureActive();

    if (!this.props.status.isActive()) {
      throw new Error('只能设置活跃状态的线程为失败状态');
    }

    const oldStatus = this.props.status;
    const newStatus = ThreadStatus.failed();
    const newExecution = this.props.execution.fail(errorMessage);

    return new Thread({
      ...this.props,
      status: newStatus,
      execution: newExecution,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 取消线程
   * @param cancelledBy 取消者ID
   * @param reason 取消原因
   * @returns 新线程实例
   */
  public cancel(cancelledBy?: ID, reason?: string): Thread {
    this.props.deletionStatus.ensureActive();

    if (this.props.status.isTerminal()) {
      throw new Error('无法取消已终止状态的线程');
    }

    const oldStatus = this.props.status;
    const newStatus = ThreadStatus.cancelled();
    const newExecution = this.props.execution.cancel();

    return new Thread({
      ...this.props,
      status: newStatus,
      execution: newExecution,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 更新线程标题
   * @param title 新标题
   * @returns 新线程实例
   */
  public updateTitle(title: string): Thread {
    this.props.deletionStatus.ensureActive();

    if (!this.props.status.canOperate()) {
      throw new Error('无法更新非活跃状态的线程');
    }

    const newDefinition = this.props.definition.updateTitle(title);

    return new Thread({
      ...this.props,
      title,
      definition: newDefinition,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 更新线程描述
   * @param description 新描述
   * @returns 新线程实例
   */
  public updateDescription(description: string): Thread {
    this.props.deletionStatus.ensureActive();

    if (!this.props.status.canOperate()) {
      throw new Error('无法更新非活跃状态的线程');
    }

    const newDefinition = this.props.definition.updateDescription(description);

    return new Thread({
      ...this.props,
      description,
      definition: newDefinition,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 更新线程优先级
   * @param priority 新优先级
   * @returns 新线程实例
   */
  public updatePriority(priority: ThreadPriority): Thread {
    this.props.deletionStatus.ensureActive();

    if (!this.props.status.canOperate()) {
      throw new Error('无法更新非活跃状态线程的优先级');
    }

    const newDefinition = this.props.definition.updatePriority(priority);

    return new Thread({
      ...this.props,
      priority,
      definition: newDefinition,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 更新元数据
   * @param metadata 新元数据
   * @returns 新线程实例
   */
  public updateMetadata(metadata: Record<string, unknown>): Thread {
    this.props.deletionStatus.ensureActive();

    const newDefinition = this.props.definition.updateMetadata(metadata);

    return new Thread({
      ...this.props,
      metadata: Metadata.create(metadata),
      definition: newDefinition,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 更新执行进度
   * @param progress 进度（0-100）
   * @param currentStep 当前步骤
   * @returns 新线程实例
   */
  public updateProgress(progress: number, currentStep?: string): Thread {
    this.props.deletionStatus.ensureActive();

    if (!this.props.status.isActive()) {
      throw new Error('只能更新活跃状态的线程进度');
    }

    const newExecution = this.props.execution.updateProgress(progress, currentStep);

    return new Thread({
      ...this.props,
      execution: newExecution,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 标记线程为已删除
   * @returns 新线程实例
   */
  public markAsDeleted(): Thread {
    if (this.props.deletionStatus.isDeleted()) {
      return this;
    }

    return new Thread({
      ...this.props,
      deletionStatus: this.props.deletionStatus.markAsDeleted(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  // 属性访问器

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
  public get workflowId(): ID {
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
  public get metadata(): Metadata {
    return this.props.metadata;
  }

  /**
   * 获取线程定义
   * @returns 线程定义
   */
  public get definition(): ThreadDefinition {
    return this.props.definition;
  }

  /**
   * 获取线程执行
   * @returns 线程执行
   */
  public get execution(): ThreadExecution {
    return this.props.execution;
  }

  /**
   * 获取开始时间
   * @returns 开始时间
   */
  public get startedAt(): Timestamp | undefined {
    return this.props.execution.startedAt;
  }

  /**
   * 获取完成时间
   * @returns 完成时间
   */
  public get completedAt(): Timestamp | undefined {
    return this.props.execution.completedAt;
  }

  /**
   * 获取错误信息
   * @returns 错误信息
   */
  public get errorMessage(): string | undefined {
    return this.props.execution.errorMessage;
  }

  /**
   * 检查线程是否已删除
   * @returns 是否已删除
   */
  public isDeleted(): boolean {
    return this.props.deletionStatus.isDeleted();
  }

  /**
   * 检查线程是否活跃
   * @returns 是否活跃
   */
  public isActive(): boolean {
    return this.props.deletionStatus.isActive();
  }

  /**
   * 获取业务标识
   * @returns 业务标识
   */
  public getBusinessIdentifier(): string {
    return `thread:${this.props.id.toString()}`;
  }
}
