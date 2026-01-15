import { Entity } from '../../common/base/entity';
import { ID, Timestamp, Version } from '../../common/value-objects';
import { Metadata, DeletionStatus } from '../../common/value-objects';
import { SessionStatus, SessionConfig, SessionActivity } from '../value-objects';
import { Thread } from '../../threads/entities/thread';
import { ParallelStrategy } from '../value-objects/parallel-strategy';
import { SharedResources } from '../value-objects/shared-resources';
import { ThreadCollection } from '../value-objects/thread-collection';

/**
 * Session实体属性接口
 */
export interface SessionProps {
  readonly id: ID;
  readonly userId?: ID;
  readonly title?: string;
  readonly status: SessionStatus;
  readonly config: SessionConfig;
  readonly activity: SessionActivity;
  readonly metadata: Metadata;
  readonly threads: ThreadCollection; // 线程集合
  readonly sharedResources: SharedResources; // 共享资源
  readonly parallelStrategy: ParallelStrategy; // 并行策略
  readonly deletionStatus: DeletionStatus;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: Version;
}

/**
 * Session实体
 *
 * 聚合根：表示用户会话，作为多线程管理器
 * 职责：
 * - 会话生命周期管理
 * - 线程集合管理（添加、移除线程）
 * - 基本状态管理
 * - 属性访问和更新
 *
 * 不负责：
 * - 复杂的状态转换验证（由SessionValidationService负责）
 * - 业务规则判断（由SessionValidationService负责）
 * - 超时和过期检查（由SessionValidationService负责）
 * - 具体的工作流执行逻辑（由WorkflowEngine负责）
 * - 单线程内的状态管理（由StateManager负责）
 * - 线程间通信（由ThreadCommunicationManager负责）
 * - 复杂业务逻辑（由应用层服务负责）
 * - 统计计算（由值对象负责）
 */
export class Session extends Entity {
  private readonly props: SessionProps;

  /**
   * 构造函数
   * @param props 会话属性
   */
  private constructor(props: SessionProps) {
    super(props.id, props.createdAt, props.updatedAt, props.version);
    this.props = Object.freeze(props);
  }

  /**
   * 创建新会话
   * @param userId 用户ID
   * @param title 会话标题
   * @param config 会话配置
   * @param metadata 元数据
   * @returns 新会话实例
   */
  public static create(
    userId?: ID,
    title?: string,
    config?: SessionConfig,
    metadata?: Record<string, unknown>,
    parallelStrategy: ParallelStrategy = ParallelStrategy.sequential()
  ): Session {
    const now = Timestamp.now();
    const sessionId = ID.generate();
    const sessionConfig = config || SessionConfig.default();
    const sessionStatus = SessionStatus.active();
    const sessionActivity = SessionActivity.create(now);

    const props: SessionProps = {
      id: sessionId,
      userId,
      title,
      status: sessionStatus,
      config: sessionConfig,
      activity: sessionActivity,
      metadata: Metadata.create(metadata || {}),
      threads: ThreadCollection.empty(),
      sharedResources: SharedResources.empty(),
      parallelStrategy,
      deletionStatus: DeletionStatus.active(),
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
    };

    const session = new Session(props);

    return session;
  }

  /**
   * 从已有属性重建会话
   * @param props 会话属性
   * @returns 会话实例
   */
  public static fromProps(props: SessionProps): Session {
    return new Session(props);
  }

  /**
   * 获取会话ID
   * @returns 会话ID
   */
  public get sessionId(): ID {
    return this.props.id;
  }

  /**
   * 获取用户ID
   * @returns 用户ID
   */
  public get userId(): ID | undefined {
    return this.props.userId;
  }

  /**
   * 获取会话标题
   * @returns 会话标题
   */
  public get title(): string | undefined {
    return this.props.title;
  }

  /**
   * 获取会话状态
   * @returns 会话状态
   */
  public get status(): SessionStatus {
    return this.props.status;
  }

  /**
   * 获取会话配置
   * @returns 会话配置
   */
  public get config(): SessionConfig {
    return this.props.config;
  }

  /**
   * 获取会话活动
   * @returns 会话活动
   */
  public get activity(): SessionActivity {
    return this.props.activity;
  }

  /**
   * 获取元数据
   * @returns 元数据
   */
  public get metadata(): Metadata {
    return this.props.metadata;
  }

  /**
   * 获取最后活动时间
   * @returns 最后活动时间
   */
  public get lastActivityAt(): Timestamp {
    return this.props.activity.lastActivityAt;
  }

  /**
   * 获取消息数量
   * @returns 消息数量
   */
  public get messageCount(): number {
    return this.props.activity.messageCount;
  }

  /**
   * 获取线程数量
   * @returns 线程数量
   */
  public get threadCount(): number {
    return this.props.threads.size;
  }

  /**
   * 获取所有线程
   * @returns 线程映射
   */
  public getThreads(): ThreadCollection {
    return this.props.threads;
  }

  /**
   * 根据ID获取线程
   * @param threadId 线程ID
   * @returns 线程或null
   */
  public getThread(threadId: string): Thread | null {
    return this.props.threads.get(threadId) || null;
  }

  /**
   * 检查线程是否存在
   * @param threadId 线程ID
   * @returns 是否存在
   */
  public hasThread(threadId: string): boolean {
    return this.props.threads.has(threadId);
  }

  /**
   * 获取并行策略
   * @returns 并行策略
   */
  public get parallelStrategy(): ParallelStrategy {
    return this.props.parallelStrategy;
  }

  /**
   * 获取共享资源
   * @returns 共享资源映射
   */
  public getSharedResources(): SharedResources {
    return this.props.sharedResources;
  }

  /**
   * 获取共享资源值
   * @param key 资源键
   * @returns 资源值
   */
  public getSharedResource(key: string): unknown {
    return this.props.sharedResources.get(key);
  }

  /**
   * 检查共享资源是否存在
   * @param key 资源键
   * @returns 是否存在
   */
  public hasSharedResource(key: string): boolean {
    return this.props.sharedResources.has(key);
  }

  /**
   * 更新会话标题
   * @param title 新标题
   * @returns 新会话实例
   */
  public updateTitle(title: string): Session {
    this.props.deletionStatus.ensureActive();

    if (!this.props.status.canOperate()) {
      throw new Error('无法更新非活跃状态的会话');
    }

    return new Session({
      ...this.props,
      title,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 更改会话状态
   * @param newStatus 新状态
   * @param changedBy 变更者
   * @param reason 变更原因
   * @returns 新会话实例
   */
  public changeStatus(newStatus: SessionStatus, changedBy?: ID, reason?: string): Session {
    this.props.deletionStatus.ensureActive();

    const oldStatus = this.props.status;
    if (oldStatus.equals(newStatus)) {
      return this; // 状态未变更
    }

    // 注意：完整的状态转换验证应该由 SessionValidationService 负责
    // 这里只做基本的状态变更

    return new Session({
      ...this.props,
      status: newStatus,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 增加消息数量
   * @returns 新会话实例
   */
  public incrementMessageCount(): Session {
    this.props.deletionStatus.ensureActive();

    if (!this.props.status.canOperate()) {
      throw new Error('无法在非活跃状态的会话中添加消息');
    }

    if (this.props.activity.messageCount >= this.props.config.getMaxMessages()) {
      throw new Error('会话消息数量已达上限');
    }

    return new Session({
      ...this.props,
      activity: this.props.activity.incrementMessageCount(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 添加线程
   * @param thread 线程实例
   * @returns 新会话实例
   */
  public addThread(thread: Thread): Session {
    this.props.deletionStatus.ensureActive();

    if (!this.props.status.canOperate()) {
      throw new Error('无法在非活跃状态的会话中添加线程');
    }

    if (this.props.threads.has(thread.threadId.toString())) {
      throw new Error('线程已存在');
    }

    // 检查线程数量限制
    const maxThreads = this.props.config.getMaxThreads?.() || 10;
    if (this.props.threads.size >= maxThreads) {
      throw new Error(`会话线程数量已达上限 (${maxThreads})`);
    }

    const newThreads = this.props.threads.add(thread);

    return new Session({
      ...this.props,
      threads: newThreads,
      activity: this.props.activity.incrementThreadCount(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 移除线程
   * @param threadId 线程ID
   * @returns 新会话实例
   */
  public removeThread(threadId: string): Session {
    this.props.deletionStatus.ensureActive();

    if (!this.props.threads.has(threadId)) {
      throw new Error('线程不存在');
    }

    const thread = this.props.threads.get(threadId)!;

    // 检查线程是否可以删除
    if (thread.isActive()) {
      throw new Error('无法删除活跃状态的线程');
    }

    const newThreads = this.props.threads.remove(threadId);

    return new Session({
      ...this.props,
      threads: newThreads,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 更新最后活动时间
   * @returns 新会话实例
   */
  public updateLastActivity(): Session {
    this.props.deletionStatus.ensureActive();

    return new Session({
      ...this.props,
      activity: this.props.activity.updateLastActivity(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 更新会话配置
   * @param newConfig 新配置
   * @returns 新会话实例
   */
  public updateConfig(newConfig: SessionConfig): Session {
    this.props.deletionStatus.ensureActive();

    if (!this.props.status.canOperate()) {
      throw new Error('无法更新非活跃状态会话的配置');
    }

    // 注意：完整的配置验证应该由 SessionValidationService 负责
    // 这里只做基本的配置更新

    return new Session({
      ...this.props,
      config: newConfig,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 更新元数据
   * @param metadata 新元数据
   * @returns 新会话实例
   */
  public updateMetadata(metadata: Record<string, unknown>): Session {
    this.props.deletionStatus.ensureActive();

    return new Session({
      ...this.props,
      metadata: Metadata.create(metadata),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 检查会话是否超时
   * @returns 是否超时
   */
  public isTimeout(): boolean {
    const now = Timestamp.now();
    const diffMinutes = now.diff(this.props.activity.lastActivityAt) / (1000 * 60);
    return diffMinutes > this.props.config.getTimeoutMinutes();
  }

  /**
   * 检查会话是否过期
   * @returns 是否过期
   */
  public isExpired(): boolean {
    const now = Timestamp.now();
    const diffMinutes = now.diff(this.props.createdAt) / (1000 * 60);
    return diffMinutes > this.props.config.getMaxDuration();
  }

  /**
   * 标记会话为已删除
   * @returns 新会话实例
   */
  public markAsDeleted(): Session {
    if (this.props.deletionStatus.isDeleted()) {
      return this;
    }

    return new Session({
      ...this.props,
      deletionStatus: this.props.deletionStatus.markAsDeleted(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 检查会话是否已删除
   * @returns 是否已删除
   */
  public isDeleted(): boolean {
    return this.props.deletionStatus.isDeleted();
  }

  /**
   * 检查会话是否活跃
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
    return `session:${this.props.id.toString()}`;
  }

  /**
   * 分支线程
   * @param sourceThreadId 源线程ID
   * @param workflowId 工作流ID
   * @param forkStrategy Fork策略
   * @param forkOptions Fork选项
   * @returns 新会话实例和新线程
   */
  public forkThread(
    sourceThreadId: string,
    workflowId: ID,
    forkStrategy?: unknown,
    forkOptions?: unknown
  ): { session: Session; thread: Thread } {
    this.props.deletionStatus.ensureActive();

    if (!this.props.status.canOperate()) {
      throw new Error('无法在非活跃状态的会话中分支线程');
    }

    const sourceThread = this.props.threads.get(sourceThreadId);
    if (!sourceThread) {
      throw new Error('源线程不存在');
    }

    // 创建新线程（这里简化处理，实际应该复制源线程的状态）
    const newThread = Thread.create(
      this.props.id,
      workflowId,
      undefined,
      undefined,
      undefined,
      forkOptions as Record<string, unknown> | undefined
    );

    const newSession = this.addThread(newThread);
    return { session: newSession, thread: newThread };
  }

  /**
   * 发送消息到线程
   * @param fromThreadId 发送线程ID
   * @param toThreadId 接收线程ID
   * @param type 消息类型
   * @param payload 消息负载
   * @returns 新会话实例和消息ID
   */
  public sendMessage(
    fromThreadId: ID,
    toThreadId: ID,
    type: string,
    payload: Record<string, unknown>
  ): { session: Session; messageId: string } {
    this.props.deletionStatus.ensureActive();

    if (!this.props.status.canOperate()) {
      throw new Error('无法在非活跃状态的会话中发送消息');
    }

    const fromThread = this.props.threads.get(fromThreadId.toString());
    if (!fromThread) {
      throw new Error('发送线程不存在');
    }

    const toThread = this.props.threads.get(toThreadId.toString());
    if (!toThread) {
      throw new Error('接收线程不存在');
    }

    // 更新消息计数
    const newSession = this.incrementMessageCount();

    // 返回一个模拟的消息ID
    return { session: newSession, messageId: ID.generate().toString() };
  }

  /**
   * 广播消息到所有线程
   * @param fromThreadId 发送线程ID
   * @param type 消息类型
   * @param payload 消息负载
   * @returns 新会话实例和消息ID数组
   */
  public broadcastMessage(
    fromThreadId: ID,
    type: string,
    payload: Record<string, unknown>
  ): { session: Session; messageIds: string[] } {
    this.props.deletionStatus.ensureActive();

    if (!this.props.status.canOperate()) {
      throw new Error('无法在非活跃状态的会话中广播消息');
    }

    const fromThread = this.props.threads.get(fromThreadId.toString());
    if (!fromThread) {
      throw new Error('发送线程不存在');
    }

    // 更新消息计数
    const newSession = this.incrementMessageCount();

    // 返回模拟的消息ID数组
    const messageIds: string[] = [];
    for (const thread of this.props.threads.getAll()) {
      if (!thread.threadId.equals(fromThreadId)) {
        messageIds.push(ID.generate().toString());
      }
    }
    return { session: newSession, messageIds };
  }

  /**
   * 获取线程的未读消息数量
   * @param threadId 线程ID
   * @returns 未读消息数量
   */
  public getUnreadMessageCount(threadId: ID | string): number {
    const threadIdStr = threadId instanceof ID ? threadId.toString() : threadId;
    const thread = this.props.threads.get(threadIdStr);
    if (!thread) {
      throw new Error('线程不存在');
    }

    // 这里简化处理，实际应该从通信通道获取
    return 0;
  }

  /**
   * 获取线程的消息
   * @param threadId 线程ID
   * @param includeRead 是否包含已读消息
   * @returns 消息数组
   */
  public getMessagesForThread(threadId: ID | string, includeRead: boolean = false): unknown[] {
    const threadIdStr = threadId instanceof ID ? threadId.toString() : threadId;
    const thread = this.props.threads.get(threadIdStr);
    if (!thread) {
      throw new Error('线程不存在');
    }

    // 这里简化处理，实际应该从通信通道获取
    return [];
  }

  /**
   * 设置共享资源
   * @param key 资源键
   * @param value 资源值
   * @returns 新会话实例
   */
  public setSharedResource(key: string, value: unknown): Session {
    this.props.deletionStatus.ensureActive();

    const newResources = this.props.sharedResources.set(key, value);

    return new Session({
      ...this.props,
      sharedResources: newResources,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 更新并行策略
   * @param newStrategy 新的并行策略（可以是 ParallelStrategy 实例或字符串）
   * @returns 新会话实例
   */
  public updateParallelStrategy(newStrategy: ParallelStrategy | string): Session {
    this.props.deletionStatus.ensureActive();

    if (!this.props.status.canOperate()) {
      throw new Error('无法在非活跃状态的会话中更新并行策略');
    }

    // 如果传入的是字符串，转换为 ParallelStrategy 实例
    let strategy: ParallelStrategy;
    if (typeof newStrategy === 'string') {
      switch (newStrategy) {
        case 'parallel':
          strategy = ParallelStrategy.parallel();
          break;
        case 'hybrid':
          strategy = ParallelStrategy.hybrid();
          break;
        default:
          strategy = ParallelStrategy.sequential();
      }
    } else {
      strategy = newStrategy;
    }

    return new Session({
      ...this.props,
      parallelStrategy: strategy,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 获取活跃线程数量（委托给 ThreadCollection）
   * @returns 活跃线程数量
   */
  public getActiveThreadCount(): number {
    return this.props.threads.getActiveThreadCount();
  }

  /**
   * 获取已完成线程数量（委托给 ThreadCollection）
   * @returns 已完成线程数量
   */
  public getCompletedThreadCount(): number {
    return this.props.threads.getCompletedThreadCount();
  }

  /**
   * 获取失败线程数量（委托给 ThreadCollection）
   * @returns 失败线程数量
   */
  public getFailedThreadCount(): number {
    return this.props.threads.getFailedThreadCount();
  }

  /**
   * 检查所有线程是否已完成（委托给 ThreadCollection）
   * @returns 是否所有线程都已完成
   */
  public areAllThreadsCompleted(): boolean {
    return this.props.threads.areAllThreadsCompleted();
  }

  /**
   * 检查是否有活跃线程（委托给 ThreadCollection）
   * @returns 是否有活跃线程
   */
  public hasActiveThreads(): boolean {
    return this.props.threads.hasActiveThreads();
  }
}
