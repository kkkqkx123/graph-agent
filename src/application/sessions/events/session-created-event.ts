/**
 * 会话创建事件
 */

/**
 * 会话创建事件
 */
export class SessionCreatedEvent {
  readonly sessionId: string;
  readonly userId?: string;
  readonly title?: string;
  readonly config: Record<string, unknown>;
  readonly timestamp: Date;

  constructor(sessionId: string, userId?: string, title?: string, config?: Record<string, unknown>) {
    this.sessionId = sessionId;
    this.userId = userId;
    this.title = title;
    this.config = config || {};
    this.timestamp = new Date();
  }
}

/**
 * 会话创建事件处理器
 */
export class SessionCreatedEventHandler {
  async handle(event: SessionCreatedEvent): Promise<void> {
    // 处理会话创建事件的业务逻辑
    // 例如：发送通知、更新统计信息等
    console.log(`会话创建事件处理: ${event.sessionId}`);
  }
}