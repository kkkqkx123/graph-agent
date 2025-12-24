import { Entity } from '../../common/base/entity';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { DomainError } from '../../common/errors/domain-error';
import { SessionStatus } from '../value-objects/session-status';
import { SessionConfig } from '../value-objects/session-config';
import { SessionCreatedEvent } from '../events/session-created-event';
import { SessionStatusChangedEvent } from '../events/session-status-changed-event';
import { SessionData } from '../interfaces/session-data.interface';

/**
 * Session实体接口
 */
export interface SessionProps extends SessionData { }

/**
 * Session实体
 *
 * 表示用户会话
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
   * @returns 新会话实例
   */
  public static create(
    userId?: ID,
    title?: string,
    config?: SessionConfig
  ): Session {
    const now = Timestamp.now();
    const sessionId = ID.generate();
    const sessionConfig = config || SessionConfig.default();
    const sessionStatus = SessionStatus.active();

    const props: SessionProps = {
      id: sessionId,
      userId,
      title,
      status: sessionStatus,
      config: sessionConfig,
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      lastActivityAt: now,
      messageCount: 0,
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
   * 获取最后活动时间
   * @returns 最后活动时间
   */
  public get lastActivityAt(): Timestamp {
    return this.props.lastActivityAt;
  }

  /**
   * 获取消息数量
   * @returns 消息数量
   */
  public get messageCount(): number {
    return this.props.messageCount;
  }

  /**
   * 更新会话标题
   * @param title 新标题
   */
  public updateTitle(title: string): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除的会话');
    }

    if (!this.props.status.canOperate()) {
      throw new DomainError('无法更新非活跃状态的会话');
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
      throw new DomainError('无法更改已删除会话的状态');
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
      throw new DomainError('无法在已删除的会话中添加消息');
    }

    if (!this.props.status.canOperate()) {
      throw new DomainError('无法在非活跃状态的会话中添加消息');
    }

    if (this.props.messageCount >= this.props.config.getMaxMessages()) {
      throw new DomainError('会话消息数量已达上限');
    }

    const newProps = {
      ...this.props,
      messageCount: this.props.messageCount + 1,
      lastActivityAt: Timestamp.now(),
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
      throw new DomainError('无法更新已删除会话的活动时间');
    }

    const newProps = {
      ...this.props,
      lastActivityAt: Timestamp.now(),
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
      throw new DomainError('无法更新已删除会话的配置');
    }

    if (!this.props.status.canOperate()) {
      throw new DomainError('无法更新非活跃状态会话的配置');
    }

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
   * 检查会话是否超时
   * @returns 是否超时
   */
  public isTimeout(): boolean {
    const now = Timestamp.now();
    const diffMinutes = now.diff(this.props.lastActivityAt) / (1000 * 60);
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
      throw new DomainError('已终止的会话不能变更到其他状态');
    }

    // 暂停的会话只能恢复到活跃状态或终止
    if (oldStatus.isSuspended() &&
      !newStatus.isActive() &&
      !newStatus.isTerminated()) {
      throw new DomainError('暂停的会话只能恢复到活跃状态或终止');
    }
  }

}