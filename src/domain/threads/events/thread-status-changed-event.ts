import { DomainEvent } from '../../common/events/domain-event';
import { ID } from '../../common/value-objects/id';
import { ThreadStatus } from '../value-objects/thread-status';

/**
 * 线程状态变更事件接口
 */
export interface ThreadStatusChangedEventData {
  threadId: string;
  oldStatus: string;
  newStatus: string;
  changedBy?: string;
  reason?: string;
  error?: string;
  [key: string]: unknown;
}

/**
 * 线程状态变更事件
 * 
 * 当线程状态发生变更时触发此事件
 */
export class ThreadStatusChangedEvent extends DomainEvent {
  private readonly data: ThreadStatusChangedEventData;

  /**
   * 构造函数
   * @param threadId 线程ID
   * @param oldStatus 旧状态
   * @param newStatus 新状态
   * @param changedBy 变更者ID
   * @param reason 变更原因
   * @param error 错误信息
   */
  constructor(
    threadId: ID,
    oldStatus: ThreadStatus,
    newStatus: ThreadStatus,
    changedBy?: ID,
    reason?: string,
    error?: string
  ) {
    super(threadId);
    this.data = {
      threadId: threadId.toString(),
      oldStatus: oldStatus.toString(),
      newStatus: newStatus.toString(),
      changedBy: changedBy?.toString(),
      reason,
      error
    };
  }

  /**
   * 获取事件名称
   * @returns 事件名称
   */
  public get eventName(): string {
    return 'ThreadStatusChanged';
  }

  /**
   * 获取事件数据
   * @returns 事件数据
   */
  public getData(): ThreadStatusChangedEventData {
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

  /**
   * 获取错误信息
   * @returns 错误信息
   */
  public getError(): string | undefined {
    return this.data.error;
  }
}