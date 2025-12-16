import { DomainEvent } from '../../common/events/domain-event';
import { ID } from '../../common/value-objects/id';
import { SessionStatus } from '../value-objects/session-status';

/**
 * 会话状态变更事件接口
 */
export interface SessionStatusChangedEventData {
  sessionId: string;
  oldStatus: string;
  newStatus: string;
  changedBy?: string;
  reason?: string;
  [key: string]: unknown;
}

/**
 * 会话状态变更事件
 * 
 * 当会话状态发生变更时触发此事件
 */
export class SessionStatusChangedEvent extends DomainEvent {
  private readonly data: SessionStatusChangedEventData;

  /**
   * 构造函数
   * @param sessionId 会话ID
   * @param oldStatus 旧状态
   * @param newStatus 新状态
   * @param changedBy 变更者ID
   * @param reason 变更原因
   */
  constructor(
    sessionId: ID,
    oldStatus: SessionStatus,
    newStatus: SessionStatus,
    changedBy?: ID,
    reason?: string
  ) {
    super(sessionId);
    this.data = {
      sessionId: sessionId.toString(),
      oldStatus: oldStatus.toString(),
      newStatus: newStatus.toString(),
      changedBy: changedBy?.toString(),
      reason
    };
  }

  /**
   * 获取事件名称
   * @returns 事件名称
   */
  public get eventName(): string {
    return 'SessionStatusChanged';
  }

  /**
   * 获取事件数据
   * @returns 事件数据
   */
  public getData(): SessionStatusChangedEventData {
    return { ...this.data };
  }

  /**
   * 获取会话ID
   * @returns 会话ID
   */
  public getSessionId(): string {
    return this.data.sessionId;
  }

  /**
   * 获取旧状态
   * @returns 旧状态
   */
  public getOldStatus(): string {
    return this.data.oldStatus;
  }

  /**
   * 获取新状态
   * @returns 新状态
   */
  public getNewStatus(): string {
    return this.data.newStatus;
  }

  /**
   * 获取变更者ID
   * @returns 变更者ID
   */
  public getChangedBy(): string | undefined {
    return this.data.changedBy;
  }

  /**
   * 获取变更原因
   * @returns 变更原因
   */
  public getReason(): string | undefined {
    return this.data.reason;
  }
}