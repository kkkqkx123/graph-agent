import { Entity } from '../../common/base/entity';
import { ID, Timestamp, Version } from '../../common/value-objects';
import { SessionStatus, SessionConfig, SessionActivity } from '../value-objects';
import { Thread } from '../../threads/entities/thread';
import { ThreadStatus as ThreadStatusVO, ThreadExecution } from '../../threads/value-objects';
import { ForkContext, ForkOptions } from '../value-objects/operations/fork/fork-context';
import { ForkStrategy } from '../value-objects/operations/fork/fork-strategy';
import { NodeId } from '../../workflow/value-objects';
import { ThreadCommunicationChannel, ThreadMessageType } from '../value-objects/thread-communication';

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
  readonly metadata: Record<string, unknown>;
  readonly threads: Map<string, Thread>; // 线程集合
  readonly sharedResources: Map<string, unknown>; // 共享资源
  readonly parallelStrategy: 'sequential' | 'parallel' | 'hybrid'; // 并行策略
  readonly communicationChannel: ThreadCommunicationChannel; // 线程间通信通道
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: Version;
  readonly isDeleted: boolean;
}

/**
 * Session实体
 *
 * 聚合根：表示用户会话，作为多线程管理器
 * 职责：
 * - 会话生命周期管理
 * - 线程生命周期管理（创建、销毁、fork 线程）
 * - 资源协调（管理线程间的资源共享和隔离）
 * - 并行策略（支持多种并行执行策略）
 * - 线程间通信（协调线程间的数据交换）
 * - 基本状态管理
 * - 属性访问和更新
 * - 消息传递（线程间消息发送和接收）
 *
 * 不负责：
 * - 复杂的状态转换验证（由SessionValidationService负责）
 * - 业务规则判断（由SessionValidationService负责）
 * - 超时和过期检查（由SessionValidationService负责）
 * - 具体的工作流执行逻辑（由WorkflowEngine负责）
 * - 单线程内的状态管理（由StateManager负责）
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
    parallelStrategy: 'sequential' | 'parallel' | 'hybrid' = 'sequential'
  ): Session {
    const now = Timestamp.now();
    const sessionId = ID.generate();
    const sessionConfig = config || SessionConfig.default();
    const sessionStatus = SessionStatus.active();
    const sessionActivity = SessionActivity.create(now);

    const communicationChannel = ThreadCommunicationChannel.create(sessionId);
    
    const props: SessionProps = {
      id: sessionId,
      userId,
      title,
      status: sessionStatus,
      config: sessionConfig,
      activity: sessionActivity,
      metadata: metadata || {},
      threads: new Map(),
      sharedResources: new Map(),
      parallelStrategy,
      communicationChannel,
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      isDeleted: false
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
  public get metadata(): Record<string, unknown> {
    return { ...this.props.metadata };
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
  public getThreads(): Map<string, Thread> {
    return new Map(this.props.threads);
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
  public get parallelStrategy(): 'sequential' | 'parallel' | 'hybrid' {
    return this.props.parallelStrategy;
  }

  /**
   * 获取共享资源
   * @returns 共享资源映射
   */
  public getSharedResources(): Map<string, unknown> {
    return new Map(this.props.sharedResources);
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
   */
  public updateTitle(title: string): void {
    if (this.props.isDeleted) {
      throw new Error('无法更新已删除的会话');
    }

    if (!this.props.status.canOperate()) {
      throw new Error('无法更新非活跃状态的会话');
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
   * 更改会话状态
   * @param newStatus 新状态
   * @param changedBy 变更者
   * @param reason 变更原因
   */
  public changeStatus(
    newStatus: SessionStatus,
    changedBy?: ID,
    reason?: string
  ): void {
    if (this.props.isDeleted) {
      throw new Error('无法更改已删除会话的状态');
    }

    const oldStatus = this.props.status;
    if (oldStatus.equals(newStatus)) {
      return; // 状态未变更
    }

    // 注意：完整的状态转换验证应该由 SessionValidationService 负责
    // 这里只做基本的状态变更

    const newProps = {
      ...this.props,
      status: newStatus,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 增加消息数量
   */
  public incrementMessageCount(): void {
    if (this.props.isDeleted) {
      throw new Error('无法在已删除的会话中添加消息');
    }

    if (!this.props.status.canOperate()) {
      throw new Error('无法在非活跃状态的会话中添加消息');
    }

    if (this.props.activity.messageCount >= this.props.config.getMaxMessages()) {
      throw new Error('会话消息数量已达上限');
    }

    const newProps = {
      ...this.props,
      activity: this.props.activity.incrementMessageCount(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 添加线程
   * @param thread 线程实例
   */
  public addThread(thread: Thread): void {
    if (this.props.isDeleted) {
      throw new Error('无法在已删除的会话中添加线程');
    }

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

    const newThreads = new Map(this.props.threads);
    newThreads.set(thread.threadId.toString(), thread);

    const newProps = {
      ...this.props,
      threads: newThreads,
      activity: this.props.activity.incrementThreadCount(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 移除线程
   * @param threadId 线程ID
   */
  public removeThread(threadId: string): void {
    if (this.props.isDeleted) {
      throw new Error('无法在已删除的会话中移除线程');
    }

    if (!this.props.threads.has(threadId)) {
      throw new Error('线程不存在');
    }

    const thread = this.props.threads.get(threadId)!;

    // 检查线程是否可以删除
    if (thread.status.isActive()) {
      throw new Error('无法删除活跃状态的线程');
    }

    const newThreads = new Map(this.props.threads);
    newThreads.delete(threadId);

    const newProps = {
      ...this.props,
      threads: newThreads,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * Fork 线程
   * @param parentThreadId 父线程ID
   * @param forkPoint Fork点节点ID
   * @param forkStrategy Fork策略
   * @param forkOptions Fork选项
   * @returns 新创建的线程
   */
  public forkThread(
    parentThreadId: string,
    forkPoint: NodeId,
    forkStrategy: ForkStrategy,
    forkOptions: ForkOptions
  ): Thread {
    if (this.props.isDeleted) {
      throw new Error('无法在已删除的会话中fork线程');
    }

    if (!this.props.status.canOperate()) {
      throw new Error('无法在非活跃状态的会话中fork线程');
    }

    const parentThread = this.props.threads.get(parentThreadId);
    if (!parentThread) {
      throw new Error('父线程不存在');
    }

    // 检查线程数量限制
    const maxThreads = this.props.config.getMaxThreads?.() || 10;
    if (this.props.threads.size >= maxThreads) {
      throw new Error(`会话线程数量已达上限 (${maxThreads})`);
    }

    // 创建 Fork 上下文
    const execution = parentThread.execution;
    const variableSnapshot = new Map(execution.context.variables);
    const nodeStateSnapshot = new Map();
    
    for (const [nodeId, nodeExecution] of execution.nodeExecutions.entries()) {
      nodeStateSnapshot.set(nodeId, nodeExecution.createSnapshot());
    }

    const forkContext = ForkContext.create(
      parentThread.threadId,
      forkPoint,
      variableSnapshot,
      nodeStateSnapshot,
      execution.context.promptContext,
      forkOptions
    );

    // 计算上下文保留计划
    const retentionPlan = forkStrategy.calculateContextRetention(parentThread, forkPoint);
    
    // 应用节点状态处理策略
    const processedNodeStates = forkStrategy.applyNodeStateHandling(
      forkContext.nodeStateSnapshot
    );

    // 使用 fromProps 创建新线程，避免 PromptContext 问题
    const now = Timestamp.now();
    const newThreadId = ID.generate();
    const newThreadStatus = ThreadStatusVO.pending();
    
    // 创建线程执行值对象（使用父线程的执行上下文）
    const newExecution = ThreadExecution.create(newThreadId, execution.context);
    
    const newThreadProps = {
      id: newThreadId,
      sessionId: this.props.id,
      workflowId: parentThread.workflowId,
      status: newThreadStatus,
      priority: parentThread.priority,
      title: `${parentThread.title || 'Thread'} (Fork)`,
      description: `Forked from ${parentThreadId}`,
      metadata: {
        ...parentThread.metadata,
        forkContext: forkContext.forkId.toString(),
        parentThreadId: parentThreadId
      },
      definition: parentThread.definition,
      execution: newExecution,
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      isDeleted: false
    };
    
    const newThread = Thread.fromProps(newThreadProps);

    // 根据 Fork 策略设置新线程的执行上下文
    // 这里需要根据 retentionPlan 和 processedNodeStates 来设置新线程的状态
    // 具体实现可能需要访问 Thread 的内部方法或通过应用层服务来完成

    // 添加新线程到会话
    this.addThread(newThread);

    return newThread;
  }

  /**
   * 设置共享资源
   * @param key 资源键
   * @param value 资源值
   */
  public setSharedResource(key: string, value: unknown): void {
    if (this.props.isDeleted) {
      throw new Error('无法在已删除的会话中设置共享资源');
    }

    if (!this.props.status.canOperate()) {
      throw new Error('无法在非活跃状态的会话中设置共享资源');
    }

    const newResources = new Map(this.props.sharedResources);
    newResources.set(key, value);

    const newProps = {
      ...this.props,
      sharedResources: newResources,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 移除共享资源
   * @param key 资源键
   */
  public removeSharedResource(key: string): void {
    if (this.props.isDeleted) {
      throw new Error('无法在已删除的会话中移除共享资源');
    }

    if (!this.props.sharedResources.has(key)) {
      throw new Error('共享资源不存在');
    }

    const newResources = new Map(this.props.sharedResources);
    newResources.delete(key);

    const newProps = {
      ...this.props,
      sharedResources: newResources,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新并行策略
   * @param strategy 并行策略
   */
  public updateParallelStrategy(strategy: 'sequential' | 'parallel' | 'hybrid'): void {
    if (this.props.isDeleted) {
      throw new Error('无法更新已删除会话的并行策略');
    }

    if (!this.props.status.canOperate()) {
      throw new Error('无法更新非活跃状态会话的并行策略');
    }

    // 检查是否有活跃线程
    const hasActiveThreads = Array.from(this.props.threads.values()).some(
      thread => thread.status.isActive()
    );

    if (hasActiveThreads) {
      throw new Error('无法在有活跃线程时更改并行策略');
    }

    const newProps = {
      ...this.props,
      parallelStrategy: strategy,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 获取活跃线程数量
   * @returns 活跃线程数量
   */
  public getActiveThreadCount(): number {
    return Array.from(this.props.threads.values()).filter(
      thread => thread.status.isActive()
    ).length;
  }

  /**
   * 获取已完成线程数量
   * @returns 已完成线程数量
   */
  public getCompletedThreadCount(): number {
    return Array.from(this.props.threads.values()).filter(
      thread => thread.status.isCompleted()
    ).length;
  }

  /**
   * 获取失败线程数量
   * @returns 失败线程数量
   */
  public getFailedThreadCount(): number {
    return Array.from(this.props.threads.values()).filter(
      thread => thread.status.isFailed()
    ).length;
  }

  /**
   * 检查是否所有线程都已完成
   * @returns 是否所有线程都已完成
   */
  public areAllThreadsCompleted(): boolean {
    if (this.props.threads.size === 0) {
      return true;
    }

    return Array.from(this.props.threads.values()).every(
      thread => thread.status.isCompleted() || thread.status.isFailed() || thread.status.isCancelled()
    );
  }

  /**
   * 检查是否有活跃线程
   * @returns 是否有活跃线程
   */
  public hasActiveThreads(): boolean {
    return this.getActiveThreadCount() > 0;
  }

  /**
   * 更新最后活动时间
   */
  public updateLastActivity(): void {
    if (this.props.isDeleted) {
      throw new Error('无法更新已删除会话的活动时间');
    }

    const newProps = {
      ...this.props,
      activity: this.props.activity.updateLastActivity(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新会话配置
   * @param newConfig 新配置
   */
  public updateConfig(newConfig: SessionConfig): void {
    if (this.props.isDeleted) {
      throw new Error('无法更新已删除会话的配置');
    }

    if (!this.props.status.canOperate()) {
      throw new Error('无法更新非活跃状态会话的配置');
    }

    // 注意：完整的配置验证应该由 SessionValidationService 负责
    // 这里只做基本的配置更新

    const newProps = {
      ...this.props,
      config: newConfig,
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
      throw new Error('无法更新已删除会话的元数据');
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
   * 检查会话是否已删除
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
    return `session:${this.props.id.toString()}`;
  }

  /**
   * 发送线程间消息
   * @param fromThreadId 发送线程ID
   * @param toThreadId 接收线程ID
   * @param type 消息类型
   * @param payload 消息负载
   * @returns 消息ID
   */
  public sendMessage(
    fromThreadId: ID,
    toThreadId: ID,
    type: ThreadMessageType,
    payload: Record<string, unknown>
  ): string {
    if (this.props.isDeleted) {
      throw new Error('无法在已删除的会话中发送消息');
    }

    if (!this.props.status.canOperate()) {
      throw new Error('无法在非活跃状态的会话中发送消息');
    }

    // 验证线程存在
    if (!this.props.threads.has(fromThreadId.toString())) {
      throw new Error('发送线程不存在');
    }

    if (!this.props.threads.has(toThreadId.toString())) {
      throw new Error('接收线程不存在');
    }

    // 发送消息并获取消息ID
    const messageId = this.props.communicationChannel.sendMessage(
      fromThreadId,
      toThreadId,
      type,
      payload
    );

    // 更新会话状态
    const newProps = {
      ...this.props,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();

    return messageId;
  }

  /**
   * 获取线程的接收消息
   * @param threadId 线程ID
   * @param includeRead 是否包含已读消息
   * @returns 消息数组
   */
  public getMessagesForThread(
    threadId: ID,
    includeRead: boolean = false
  ): any[] {
    return this.props.communicationChannel.getMessagesForThread(threadId, includeRead);
  }

  /**
   * 获取线程的未读消息数量
   * @param threadId 线程ID
   * @returns 未读消息数量
   */
  public getUnreadMessageCount(threadId: ID): number {
    return this.props.communicationChannel.getUnreadMessageCount(threadId);
  }

  /**
   * 标记消息为已读
   * @param messageId 消息ID
   */
  public markMessageAsRead(messageId: string): void {
    if (this.props.isDeleted) {
      throw new Error('无法在已删除的会话中标记消息');
    }

    const newChannel = this.props.communicationChannel.markMessageAsRead(messageId);

    const newProps = {
      ...this.props,
      communicationChannel: newChannel,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 标记线程的所有消息为已读
   * @param threadId 线程ID
   */
  public markAllMessagesAsRead(threadId: ID): void {
    if (this.props.isDeleted) {
      throw new Error('无法在已删除的会话中标记消息');
    }

    const newChannel = this.props.communicationChannel.markAllMessagesAsRead(threadId);

    const newProps = {
      ...this.props,
      communicationChannel: newChannel,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 检查线程是否有未读消息
   * @param threadId 线程ID
   * @returns 是否有未读消息
   */
  public hasUnreadMessages(threadId: ID): boolean {
    return this.props.communicationChannel.hasUnreadMessages(threadId);
  }

  /**
   * 广播消息到所有线程
   * @param fromThreadId 发送线程ID
   * @param type 消息类型
   * @param payload 消息负载
   * @returns 消息ID数组
   */
  public broadcastMessage(
    fromThreadId: ID,
    type: ThreadMessageType,
    payload: Record<string, unknown>
  ): string[] {
    if (this.props.isDeleted) {
      throw new Error('无法在已删除的会话中广播消息');
    }

    if (!this.props.status.canOperate()) {
      throw new Error('无法在非活跃状态的会话中广播消息');
    }

    const messageIds: string[] = [];

    for (const [threadIdStr, thread] of this.props.threads.entries()) {
      const toThreadId = thread.threadId;
      
      // 不发送给自己
      if (toThreadId.equals(fromThreadId)) {
        continue;
      }

      const messageId = this.sendMessage(fromThreadId, toThreadId, type, payload);
      messageIds.push(messageId);
    }

    return messageIds;
  }

  /**
   * 清除线程的所有消息
   * @param threadId 线程ID
   */
  public clearMessagesForThread(threadId: ID): void {
    if (this.props.isDeleted) {
      throw new Error('无法在已删除的会话中清除消息');
    }

    const newChannel = this.props.communicationChannel.clearMessagesForThread(threadId);

    const newProps = {
      ...this.props,
      communicationChannel: newChannel,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }
}