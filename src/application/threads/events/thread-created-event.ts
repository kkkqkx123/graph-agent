/**
 * 线程创建事件
 */

/**
 * 线程创建事件
 */
export class ThreadCreatedEvent {
  readonly threadId: string;
  readonly sessionId: string;
  readonly workflowId?: string;
  readonly priority: number;
  readonly title?: string;
  readonly description?: string;
  readonly metadata?: Record<string, unknown>;
  readonly timestamp: Date;

  constructor(
    threadId: string,
    sessionId: string,
    workflowId?: string,
    priority?: number,
    title?: string,
    description?: string,
    metadata?: Record<string, unknown>
  ) {
    this.threadId = threadId;
    this.sessionId = sessionId;
    this.workflowId = workflowId;
    this.priority = priority || 0;
    this.title = title;
    this.description = description;
    this.metadata = metadata;
    this.timestamp = new Date();
  }
}

/**
 * 线程创建事件处理器
 */
export class ThreadCreatedEventHandler {
  async handle(event: ThreadCreatedEvent): Promise<void> {
    // 处理线程创建事件的业务逻辑
    // 例如：发送通知、更新统计信息等
    console.log(`线程创建事件处理: ${event.threadId}`);
  }
}