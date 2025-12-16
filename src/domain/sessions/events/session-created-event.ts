import { DomainEvent } from '../../common/events/domain-event';
import { ID } from '../../common/value-objects/id';

/**
 * 会话创建事件接口
 */
export interface SessionCreatedEventData {
  sessionId: string;
  userId?: string;
  title?: string;
  config: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * 会话创建事件
 * 
 * 当会话被创建时触发此事件
 */
export class SessionCreatedEvent extends DomainEvent {
  private readonly data: SessionCreatedEventData;

  /**
   * 构造函数
   * @param sessionId 会话ID
   * @param userId 用户ID
   * @param title 会话标题
   * @param config 会话配置
   */
  constructor(
    sessionId: ID,
    userId?: ID,
    title?: string,
    config?: Record<string, unknown>
  ) {
    super(sessionId);
    this.data = {
      sessionId: sessionId.toString(),
      userId: userId?.toString(),
      title,
      config: config || {}
    };
  }

  /**
   * 获取事件名称
   * @returns 事件名称
   */
  public get eventName(): string {
    return 'SessionCreated';
  }

  /**
   * 获取事件数据
   * @returns 事件数据
   */
  public getData(): SessionCreatedEventData {
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
   * 获取用户ID
   * @returns 用户ID
   */
  public getUserId(): string | undefined {
    return this.data.userId;
  }

  /**
   * 获取会话标题
   * @returns 会话标题
   */
  public getTitle(): string | undefined {
    return this.data.title;
  }

  /**
   * 获取会话配置
   * @returns 会话配置
   */
  public getConfig(): Record<string, unknown> {
    return { ...this.data.config };
  }
}