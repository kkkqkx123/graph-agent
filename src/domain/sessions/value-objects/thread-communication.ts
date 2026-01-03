import { ID, Timestamp, ValueObject } from '../../common/value-objects';

/**
 * 线程间消息类型
 */
export type ThreadMessageType = 'data' | 'control' | 'event' | 'error';

/**
 * 线程间消息接口
 */
export interface ThreadMessageProps {
  readonly id: ID;
  readonly fromThreadId: ID;
  readonly toThreadId: ID;
  readonly type: ThreadMessageType;
  readonly payload: Record<string, unknown>;
  readonly timestamp: Timestamp;
  readonly isRead: boolean;
}

/**
 * 线程间消息值对象
 */
export class ThreadMessage extends ValueObject<ThreadMessageProps> {
  private constructor(props: ThreadMessageProps) {
    super(props);
  }

  /**
   * 创建线程间消息
   * @param fromThreadId 发送线程ID
   * @param toThreadId 接收线程ID
   * @param type 消息类型
   * @param payload 消息负载
   * @returns 消息实例
   */
  public static create(
    fromThreadId: ID,
    toThreadId: ID,
    type: ThreadMessageType,
    payload: Record<string, unknown>
  ): ThreadMessage {
    return new ThreadMessage({
      id: ID.generate(),
      fromThreadId,
      toThreadId,
      type,
      payload,
      timestamp: Timestamp.now(),
      isRead: false
    });
  }

  /**
   * 获取消息ID
   * @returns 消息ID
   */
  public get messageId(): ID {
    return this.props.id;
  }

  /**
   * 获取发送线程ID
   * @returns 发送线程ID
   */
  public get fromThreadId(): ID {
    return this.props.fromThreadId;
  }

  /**
   * 获取接收线程ID
   * @returns 接收线程ID
   */
  public get toThreadId(): ID {
    return this.props.toThreadId;
  }

  /**
   * 获取消息类型
   * @returns 消息类型
   */
  public get type(): ThreadMessageType {
    return this.props.type;
  }

  /**
   * 获取消息负载
   * @returns 消息负载
   */
  public get payload(): Record<string, unknown> {
    return { ...this.props.payload };
  }

  /**
   * 获取时间戳
   * @returns 时间戳
   */
  public get timestamp(): Timestamp {
    return this.props.timestamp;
  }

  /**
   * 检查是否已读
   * @returns 是否已读
   */
  public get isRead(): boolean {
    return this.props.isRead;
  }

  /**
   * 标记为已读
   * @returns 新的消息实例
   */
  public markAsRead(): ThreadMessage {
    return new ThreadMessage({
      ...this.props,
      isRead: true
    });
  }

  /**
   * 获取负载值
   * @param key 键
   * @returns 值
   */
  public getPayloadValue(key: string): unknown {
    return this.props.payload[key];
  }

  /**
   * 检查负载是否包含指定键
   * @param key 键
   * @returns 是否包含
   */
  public hasPayloadKey(key: string): boolean {
    return key in this.props.payload;
  }

  /**
   * 验证消息
   */
  public validate(): void {
    if (!this.props.fromThreadId) {
      throw new Error('发送线程ID不能为空');
    }

    if (!this.props.toThreadId) {
      throw new Error('接收线程ID不能为空');
    }

    if (this.props.fromThreadId.equals(this.props.toThreadId)) {
      throw new Error('发送线程和接收线程不能相同');
    }

    const validTypes: ThreadMessageType[] = ['data', 'control', 'event', 'error'];
    if (!validTypes.includes(this.props.type)) {
      throw new Error('无效的消息类型');
    }
  }
}

/**
 * 线程间通信通道接口
 */
export interface ThreadCommunicationChannelProps {
  readonly sessionId: ID;
  readonly messages: Map<string, ThreadMessage>;
  readonly maxMessages: number;
}

/**
 * 线程间通信通道值对象
 */
export class ThreadCommunicationChannel extends ValueObject<ThreadCommunicationChannelProps> {
  private constructor(props: ThreadCommunicationChannelProps) {
    super(props);
  }

  /**
   * 创建通信通道
   * @param sessionId 会话ID
   * @param maxMessages 最大消息数量
   * @returns 通信通道实例
   */
  public static create(
    sessionId: ID,
    maxMessages: number = 1000
  ): ThreadCommunicationChannel {
    return new ThreadCommunicationChannel({
      sessionId,
      messages: new Map(),
      maxMessages
    });
  }

  /**
   * 获取会话ID
   * @returns 会话ID
   */
  public get sessionId(): ID {
    return this.props.sessionId;
  }

  /**
   * 获取所有消息
   * @returns 消息映射
   */
  public getMessages(): Map<string, ThreadMessage> {
    return new Map(this.props.messages);
  }

  /**
   * 获取最大消息数量
   * @returns 最大消息数量
   */
  public get maxMessages(): number {
    return this.props.maxMessages;
  }

  /**
   * 发送消息
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
    message.validate();

    const newMessages = new Map(this.props.messages);
    newMessages.set(message.messageId.toString(), message);

    // 清理过期消息
    if (newMessages.size > this.props.maxMessages) {
      const sortedMessages = Array.from(newMessages.entries())
        .sort(([, a], [, b]) => a.timestamp.differenceInSeconds(b.timestamp));
      
      const toDelete = sortedMessages.slice(0, newMessages.size - this.props.maxMessages);
      for (const [messageId] of toDelete) {
        newMessages.delete(messageId);
      }
    }

    // 更新内部状态
    (this as any).props = Object.freeze({
      ...this.props,
      messages: newMessages
    });

    return message.messageId.toString();
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
    const messages = Array.from(this.props.messages.values())
      .filter(message => message.toThreadId.equals(threadId));

    if (!includeRead) {
      return messages.filter(message => !message.isRead);
    }

    return messages;
  }

  /**
   * 获取线程的未读消息数量
   * @param threadId 线程ID
   * @returns 未读消息数量
   */
  public getUnreadMessageCount(threadId: ID): number {
    return Array.from(this.props.messages.values())
      .filter(message => message.toThreadId.equals(threadId) && !message.isRead)
      .length;
  }

  /**
   * 标记消息为已读
   * @param messageId 消息ID
   * @returns 新的通信通道实例
   */
  public markMessageAsRead(messageId: string): ThreadCommunicationChannel {
    const message = this.props.messages.get(messageId);
    if (!message) {
      throw new Error('消息不存在');
    }

    const newMessages = new Map(this.props.messages);
    newMessages.set(messageId, message.markAsRead());

    return new ThreadCommunicationChannel({
      ...this.props,
      messages: newMessages
    });
  }

  /**
   * 标记线程的所有消息为已读
   * @param threadId 线程ID
   * @returns 新的通信通道实例
   */
  public markAllMessagesAsRead(threadId: ID): ThreadCommunicationChannel {
    const newMessages = new Map(this.props.messages);

    for (const [messageId, message] of newMessages.entries()) {
      if (message.toThreadId.equals(threadId) && !message.isRead) {
        newMessages.set(messageId, message.markAsRead());
      }
    }

    return new ThreadCommunicationChannel({
      ...this.props,
      messages: newMessages
    });
  }

  /**
   * 清除线程的所有消息
   * @param threadId 线程ID
   * @returns 新的通信通道实例
   */
  public clearMessagesForThread(threadId: ID): ThreadCommunicationChannel {
    const newMessages = new Map(this.props.messages);

    for (const [messageId, message] of newMessages.entries()) {
      if (message.fromThreadId.equals(threadId) || message.toThreadId.equals(threadId)) {
        newMessages.delete(messageId);
      }
    }

    return new ThreadCommunicationChannel({
      ...this.props,
      messages: newMessages
    });
  }

  /**
   * 获取消息数量
   * @returns 消息数量
   */
  public getMessageCount(): number {
    return this.props.messages.size;
  }

  /**
   * 检查是否有未读消息
   * @param threadId 线程ID
   * @returns 是否有未读消息
   */
  public hasUnreadMessages(threadId: ID): boolean {
    return this.getUnreadMessageCount(threadId) > 0;
  }

  /**
   * 验证通信通道
   */
  public validate(): void {
    if (!this.props.sessionId) {
      throw new Error('会话ID不能为空');
    }

    if (this.props.maxMessages <= 0) {
      throw new Error('最大消息数量必须大于0');
    }
  }
}