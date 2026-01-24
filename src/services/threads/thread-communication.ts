/**
 * Thread Communication应用服务
 *
 * 负责处理线程间的通信
 */

import { injectable, inject } from 'inversify';
import { ID, ILogger } from '../../domain/common';
import { ISessionRepository } from '../../domain/sessions';
import { ThreadMessageType } from '../../domain/sessions/value-objects/thread-communication';
import { TYPES } from '../../di/service-keys';
import { BaseService } from '../common/base-service';
import { EntityNotFoundError } from '../../common/exceptions';

/**
 * Thread Communication应用服务
 */
@injectable()
export class ThreadCommunication extends BaseService {
  constructor(
    @inject(TYPES.SessionRepository) private readonly sessionRepository: ISessionRepository,
    @inject(TYPES.Logger) logger: ILogger
  ) {
    super(logger);
  }

  /**
   * 获取服务名称
   */
  protected override getServiceName(): string {
    return '线程通信服务';
  }

  /**
   * 发送线程间消息
   * @param sessionId 会话ID
   * @param fromThreadId 发送线程ID
   * @param toThreadId 接收线程ID
   * @param type 消息类型
   * @param payload 消息负载
   * @returns 消息ID
   */
  async sendMessage(
    sessionId: string,
    fromThreadId: string,
    toThreadId: string,
    type: ThreadMessageType,
    payload: Record<string, unknown>
  ): Promise<string> {
    return this.executeBusinessOperation(
      '发送线程间消息',
      async () => {
        const sessionIdObj = this.parseId(sessionId, '会话ID');
        const fromThreadIdObj = this.parseId(fromThreadId, '发送线程ID');
        const toThreadIdObj = this.parseId(toThreadId, '接收线程ID');

        // 检查会话是否存在
        const session = await this.sessionRepository.findByIdOrFail(sessionIdObj);

        // 检查线程是否存在
        if (!session.hasThread(fromThreadId)) {
          throw new EntityNotFoundError('Thread', fromThreadId);
        }

        if (!session.hasThread(toThreadId)) {
          throw new EntityNotFoundError('Thread', toThreadId);
        }

        // 发送消息
        const { session: updatedSession, messageId } = session.sendMessage(
          fromThreadIdObj,
          toThreadIdObj,
          type,
          payload
        );

        // 更新会话
        await this.sessionRepository.save(updatedSession);

        // 更新会话的最后活动时间
        const finalSession = updatedSession.updateLastActivity();
        await this.sessionRepository.save(finalSession);

        return messageId;
      },
      { sessionId, fromThreadId, toThreadId, type }
    );
  }

  /**
   * 广播消息到所有线程
   * @param sessionId 会话ID
   * @param fromThreadId 发送线程ID
   * @param type 消息类型
   * @param payload 消息负载
   * @returns 消息ID数组
   */
  async broadcastMessage(
    sessionId: string,
    fromThreadId: string,
    type: ThreadMessageType,
    payload: Record<string, unknown>
  ): Promise<string[]> {
    return this.executeBusinessOperation(
      '广播消息',
      async () => {
        const sessionIdObj = this.parseId(sessionId, '会话ID');
        const fromThreadIdObj = this.parseId(fromThreadId, '发送线程ID');

        // 检查会话是否存在
        const session = await this.sessionRepository.findByIdOrFail(sessionIdObj);

        // 检查发送线程是否存在
        if (!session.hasThread(fromThreadId)) {
          throw new EntityNotFoundError('Thread', fromThreadId);
        }

        // 广播消息
        const { session: updatedSession, messageIds } = session.broadcastMessage(
          fromThreadIdObj,
          type,
          payload
        );

        // 更新会话
        await this.sessionRepository.save(updatedSession);

        // 更新会话的最后活动时间
        const finalSession = updatedSession.updateLastActivity();
        await this.sessionRepository.save(finalSession);

        return messageIds;
      },
      { sessionId, fromThreadId, type }
    );
  }

  /**
   * 获取线程的未读消息数量
   * @param sessionId 会话ID
   * @param threadId 线程ID
   * @returns 未读消息数量
   */
  async getUnreadMessageCount(sessionId: string, threadId: string): Promise<number> {
    return this.executeQueryOperation(
      '获取未读消息数量',
      async () => {
        const sessionIdObj = this.parseId(sessionId, '会话ID');
        const threadIdObj = this.parseId(threadId, '线程ID');

        // 检查会话是否存在
        const session = await this.sessionRepository.findByIdOrFail(sessionIdObj);

        return session.getUnreadMessageCount(threadIdObj);
      },
      { sessionId, threadId }
    );
  }

  /**
   * 获取线程的消息
   * @param sessionId 会话ID
   * @param threadId 线程ID
   * @param includeRead 是否包含已读消息
   * @returns 消息数组
   */
  async getMessagesForThread(
    sessionId: string,
    threadId: string,
    includeRead: boolean = false
  ): Promise<any[]> {
    return this.executeQueryOperation(
      '获取线程消息',
      async () => {
        const sessionIdObj = this.parseId(sessionId, '会话ID');
        const threadIdObj = this.parseId(threadId, '线程ID');

        // 检查会话是否存在
        const session = await this.sessionRepository.findByIdOrFail(sessionIdObj);

        return session.getMessagesForThread(threadIdObj, includeRead);
      },
      { sessionId, threadId, includeRead }
    );
  }
}