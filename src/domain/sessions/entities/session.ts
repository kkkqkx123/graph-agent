import { Entity } from '../../common/base/entity';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { SessionStatus } from '../value-objects/session-status';
import { SessionConfig } from '../value-objects/session-config';
import { SessionActivity } from '../value-objects/session-activity';
import { SessionCreatedEvent } from '../events/session-created-event';
import { SessionStatusChangedEvent } from '../events/session-status-changed-event';

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
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: Version;
  readonly isDeleted: boolean;
}

/**
 * Session实体
 * 
 * 聚合根：表示用户会话
 * 职责：
 * - 会话生命周期管理
 * - 状态转换验证
 * - 业务不变性保证
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
    metadata?: Record<string, unknown>
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
      metadata: metadata || {},
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      isDeleted: false
    };

    const session = new Session(props);

    // 添加会话创建事件
    session.addDomainEvent(new SessionCreatedEvent(
      sessionId,
      userId,
      title,
      sessionConfig.value
    ));

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
    return this.props.activity.getLastActivityAt();
  }

  /**
   * 获取消息数量
   * @returns 消息数量
   */
  public get messageCount(): number {
    return this.props.activity.getMessageCount();
  }

  /**
   * 获取线程数量
   * @returns 线程数量
   */
  public get threadCount(): number {
    return this.props.activity.getThreadCount();
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

    // 验证状态转换的有效性
    this.validateStatusTransition(oldStatus, newStatus);

    const newProps = {
      ...this.props,
      status: newStatus,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();

    // 添加状态变更事件
    this.addDomainEvent(new SessionStatusChangedEvent(
      this.props.id,
      oldStatus,
      newStatus,
      changedBy,
      reason
    ));
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

    if (this.props.activity.getMessageCount() >= this.props.config.getMaxMessages()) {
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
   * 增加线程数量
   */
  public incrementThreadCount(): void {
    if (this.props.isDeleted) {
      throw new Error('无法在已删除的会话中添加线程');
    }

    if (!this.props.status.canOperate()) {
      throw new Error('无法在非活跃状态的会话中添加线程');
    }

    const newProps = {
      ...this.props,
      activity: this.props.activity.incrementThreadCount(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
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

    // 验证配置的合理性
    this.validateConfigUpdate(newConfig);

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
    const diffMinutes = now.diff(this.props.activity.getLastActivityAt()) / (1000 * 60);
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
   * 验证状态转换的有效性
   * @param oldStatus 旧状态
   * @param newStatus 新状态
   */
  private validateStatusTransition(
    oldStatus: SessionStatus,
    newStatus: SessionStatus
  ): void {
    // 已终止的会话不能变更到其他状态
    if (oldStatus.isTerminated() && !newStatus.isTerminated()) {
      throw new Error('已终止的会话不能变更到其他状态');
    }

    // 暂停的会话只能恢复到活跃状态或终止
    if (oldStatus.isSuspended() &&
      !newStatus.isActive() &&
      !newStatus.isTerminated()) {
      throw new Error('暂停的会话只能恢复到活跃状态或终止');
    }
  }

  /**
   * 验证配置更新的合理性
   * @param newConfig 新配置
   */
  private validateConfigUpdate(newConfig: SessionConfig): void {
    // 检查最大消息数量是否减少到当前消息数量以下
    if (newConfig.getMaxMessages() < this.props.activity.getMessageCount()) {
      throw new Error('新的最大消息数量不能小于当前消息数量');
    }

    // 检查其他业务规则
    if (newConfig.getMaxDuration() < this.props.config.getMaxDuration()) {
      // 可以添加警告日志，但不阻止更新
      console.warn('最大持续时间被减少，可能会影响现有会话');
    }
  }
}