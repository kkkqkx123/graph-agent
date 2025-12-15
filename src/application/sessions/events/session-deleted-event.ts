/**
 * 会话删除事件
 */

/**
 * 会话删除事件
 */
export class SessionDeletedEvent {
  readonly sessionId: string;
  readonly userId?: string;
  readonly timestamp: Date;

  constructor(sessionId: string, userId?: string) {
    this.sessionId = sessionId;
    this.userId = userId;
    this.timestamp = new Date();
  }
}

/**
 * 会话删除事件处理器
 */
export class SessionDeletedEventHandler {
  async handle(event: SessionDeletedEvent): Promise<void> {
    // 处理会话删除事件的业务逻辑
    // 例如：清理相关资源、更新统计信息等
    console.log(`会话删除事件处理: ${event.sessionId}`);
  }
}