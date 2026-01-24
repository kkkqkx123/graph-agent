/**
 * Message Manager
 *
 * 负责管理交互消息历史
 */

import { injectable, inject } from 'inversify';
import { Message } from '../../../domain/interaction/value-objects/message';
import { ILogger } from '../../../domain/common/types/logger-types';

/**
 * Message Manager 接口
 */
export interface IMessageManager {
  /**
   * 添加消息
   */
  addMessage(message: Message): void;

  /**
   * 批量添加消息
   */
  addMessages(messages: Message[]): void;

  /**
   * 获取所有消息
   */
  getMessages(): Message[];

  /**
   * 获取指定索引的消息
   */
  getMessage(index: number): Message | undefined;

  /**
   * 清空消息历史
   */
  clearMessages(): void;

  /**
   * 获取消息数量
   */
  getMessageCount(): number;
}

/**
 * Message Manager 实现
 */
@injectable()
export class MessageManager implements IMessageManager {
  private messages: Message[] = [];

  constructor(@inject('Logger') private readonly logger: ILogger) {}

  addMessage(message: Message): void {
    this.messages.push(message);
    this.logger.debug('添加消息', {
      role: message.role,
      contentLength: message.content.length,
    });
  }

  addMessages(messages: Message[]): void {
    this.messages.push(...messages);
    this.logger.debug('批量添加消息', { count: messages.length });
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  getMessage(index: number): Message | undefined {
    return this.messages[index];
  }

  clearMessages(): void {
    this.messages = [];
    this.logger.debug('清空消息历史');
  }

  getMessageCount(): number {
    return this.messages.length;
  }
}