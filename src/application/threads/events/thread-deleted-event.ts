/**
 * 线程删除事件
 */

/**
 * 线程删除事件
 */
export class ThreadDeletedEvent {
  readonly threadId: string;
  readonly sessionId: string;
  readonly userId?: string;
  readonly timestamp: Date;

  constructor(threadId: string, sessionId: string, userId?: string) {
    this.threadId = threadId;
    this.sessionId = sessionId;
    this.userId = userId;
    this.timestamp = new Date();
  }
}

/**
 * 线程删除事件处理器
 */
export class ThreadDeletedEventHandler {
  async handle(event: ThreadDeletedEvent): Promise<void> {
    // 处理线程删除事件的业务逻辑
    // 例如：清理相关资源、更新统计信息等
    console.log(`线程删除事件处理: ${event.threadId}`);
  }
}