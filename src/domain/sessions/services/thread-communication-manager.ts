import { ID, Timestamp } from '../../common/value-objects';
import { ThreadMessage, ThreadMessageType } from '../value-objects/thread-communication';

/**
 * 线程通信管理器
 * 
 * 职责：管理会话中线程间的通信
 */
export class ThreadCommunicationManager {
  private readonly messages: Map<string, ThreadMessage>;
  private readonly threadMessages: Map<string, Set<string>>;

  /**
   * 构造函数
   */
  constructor() {
    this.messages = new Map();
    this.threadMessages = new Map();
  }

  /**
   * 发送线程间消息
   * @param fromThreadId 发送线程ID
   * @param toThreadId 接收线程ID
   * @param type 消息类型
   * @param payload 消息负载
   * @returns 消息ID
   */
  public sendMessage(
    fromThreadId: ID,
    toThreadId: ID,
    type: ThreadMessageType,
    payload: Record<string, unknown>
  ): string {
    const message = ThreadMessage.create(fromThreadId, toThreadId, type, payload);
    
    this.messages.set(message.id.toString(), message);
    
    // 添加到接收线程的消息集合
    const toThreadIdStr = toThreadId.toString();
    if (!this.threadMessages.has(toThreadIdStr)) {
      this.threadMessages.set(toThreadIdStr, new Set());
    }
    this.threadMessages.get(toThreadIdStr)!.add(message.id.toString());
    
    return message.id.toString();
  }

  /**
   * 获取线程的接收消息
   * @param threadId 线程ID
   * @param includeRead 是否包含已读消息
   * @returns 消息数组
   */
  public getMessagesForThread(
    threadId: ID,
    includeRead: boolean = false
  ): ThreadMessage[] {
    const threadIdStr = threadId.toString();
    const messageIds = this.threadMessages.get(threadIdStr) || new Set();
    
    const messages: ThreadMessage[] = [];
    for (const messageId of messageIds) {
      const message = this.messages.get(messageId);
      if (message && (includeRead || !message.isRead)) {
        messages.push(message);
      }
    }
    
    return messages.sort((a, b) => a.timestamp.compare(b.timestamp));
  }

  /**
   * 获取线程的未读消息数量
   * @param threadId 线程ID
   * @returns 未读消息数量
   */
  public getUnreadMessageCount(threadId: ID): number {
    const messages = this.getMessagesForThread(threadId, false);
    return messages.length;
  }

  /**
   * 标记消息为已读
   * @param messageId 消息ID
   */
  public markMessageAsRead(messageId: string): void {
    const message = this.messages.get(messageId);
    if (message && !message.isRead) {
      const updatedMessage = message.markAsRead();
      this.messages.set(messageId, updatedMessage);
    }
  }

  /**
   * 标记线程的所有消息为已读
   * @param threadId 线程ID
   */
  public markAllMessagesAsRead(threadId: ID): void {
    const messages = this.getMessagesForThread(threadId, true);
    for (const message of messages) {
      this.markMessageAsRead(message.id.toString());
    }
  }

  /**
   * 检查线程是否有未读消息
   * @param threadId 线程ID
   * @returns 是否有未读消息
   */
  public hasUnreadMessages(threadId: ID): boolean {
    return this.getUnreadMessageCount(threadId) > 0;
  }

  /**
   * 清除线程的所有消息
   * @param threadId 线程ID
   */
  public clearMessagesForThread(threadId: ID): void {
    const threadIdStr = threadId.toString();
    const messageIds = this.threadMessages.get(threadIdStr) || new Set();
    
    // 从主消息映射中移除
    for (const messageId of messageIds) {
      this.messages.delete(messageId);
    }
    
    // 清空线程的消息集合
    this.threadMessages.delete(threadIdStr);
  }

  /**
   * 获取所有消息
   * @returns 所有消息数组
   */
  public getAllMessages(): ThreadMessage[] {
    return Array.from(this.messages.values());
  }

  /**
   * 获取消息总数
   * @returns 消息总数
   */
  public getTotalMessageCount(): number {
    return this.messages.size;
  }

  /**
   * 清空所有消息
   */
  public clearAllMessages(): void {
    this.messages.clear();
    this.threadMessages.clear();
  }

  /**
   * 获取活跃线程的消息统计
   * @returns 线程消息统计映射
   */
  public getThreadMessageStats(): Map<string, { total: number; unread: number }> {
    const stats = new Map<string, { total: number; unread: number }>();
    
    for (const [threadIdStr, messageIds] of this.threadMessages.entries()) {
      const total = messageIds.size;
      let unread = 0;
      
      for (const messageId of messageIds) {
        const message = this.messages.get(messageId);
        if (message && !message.isRead) {
          unread++;
        }
      }
      
      stats.set(threadIdStr, { total, unread });
    }
    
    return stats;
  }
}