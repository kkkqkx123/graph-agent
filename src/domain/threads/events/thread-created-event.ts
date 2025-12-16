import { DomainEvent } from '../../common/events/domain-event';
import { ID } from '../../common/value-objects/id';

/**
 * 线程创建事件接口
 */
export interface ThreadCreatedEventData {
  threadId: string;
  sessionId: string;
  workflowId?: string;
  priority: number;
  title?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * 线程创建事件
 * 
 * 当线程被创建时触发此事件
 */
export class ThreadCreatedEvent extends DomainEvent {
  private readonly data: ThreadCreatedEventData;

  /**
   * 构造函数
   * @param threadId 线程ID
   * @param sessionId 会话ID
   * @param workflowId 工作流ID
   * @param priority 线程优先级
   * @param title 线程标题
   * @param description 线程描述
   * @param metadata 元数据
   */
  constructor(
    threadId: ID,
    sessionId: ID,
    workflowId?: ID,
    priority?: number,
    title?: string,
    description?: string,
    metadata?: Record<string, unknown>
  ) {
    super(threadId);
    this.data = {
      threadId: threadId.toString(),
      sessionId: sessionId.toString(),
      workflowId: workflowId?.toString(),
      priority: priority || 5, // 默认普通优先级
      title,
      description,
      metadata: metadata || {}
    };
  }

  /**
   * 获取事件名称
   * @returns 事件名称
   */
  public get eventName(): string {
    return 'ThreadCreated';
  }

  /**
   * 获取事件数据
   * @returns 事件数据
   */
  public getData(): ThreadCreatedEventData {
    return { ...this.data };
  }

  /**
   * 获取线程ID
   * @returns 线程ID
   */
  public getThreadId(): string {
    return this.data.threadId;
  }

  /**
   * 获取会话ID
   * @returns 会话ID
   */
  public getSessionId(): string {
    return this.data.sessionId;
  }

  /**
   * 获取工作流ID
   * @returns 工作流ID
   */
  public getWorkflowId(): string | undefined {
    return this.data.workflowId;
  }

  /**
   * 获取优先级
   * @returns 优先级
   */
  public getPriority(): number {
    return this.data.priority;
  }

  /**
   * 获取线程标题
   * @returns 线程标题
   */
  public getTitle(): string | undefined {
    return this.data.title;
  }

  /**
   * 获取线程描述
   * @returns 线程描述
   */
  public getDescription(): string | undefined {
    return this.data.description;
  }

  /**
   * 获取元数据
   * @returns 元数据
   */
  public getMetadata(): Record<string, unknown> {
    return { ...this.data.metadata };
  }
}