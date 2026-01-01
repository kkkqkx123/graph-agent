/**
 * 会话维护服务
 * 
 * 负责会话的删除、消息添加、清理和统计等维护功能
 */

import { Session, ISessionRepository, SessionStatus } from '../../../domain/sessions';
import { IThreadRepository } from '../../../domain/threads';
import { BaseApplicationService } from '../../common/base-application-service';
import { ILogger, ID } from '../../../domain/common';

/**
 * 会话维护服务
 */
export class SessionMaintenanceService extends BaseApplicationService {
  constructor(
    private readonly sessionRepository: ISessionRepository,
    private readonly threadRepository: IThreadRepository,
    logger: ILogger
  ) {
    super(logger);
  }

  /**
   * 验证操作权限的业务规则
   */
  private validateOperationPermission(session: Session, userId?: ID): void {
    // 验证用户是否有权限操作此会话
    if (userId && session.userId && !session.userId.equals(userId)) {
      throw new Error('无权限操作此会话');
    }
  }

  /**
   * 验证消息添加的业务规则
   */
  private validateMessageAddition(session: Session): void {
    // 验证是否可以添加消息
    if (!session.status.isActive()) {
      throw new Error('只能在活跃状态的会话中添加消息');
    }
  }

  /**
   * 处理会话超时的业务规则
   */
  private async handleSessionTimeout(session: Session, userId?: ID): Promise<Session> {
    // 处理超时的会话
    session.changeStatus(SessionStatus.suspended(), userId, '会话超时');
    return session;
  }

  /**
   * 处理会话过期的业务规则
   */
  private async handleSessionExpiration(session: Session, userId?: ID): Promise<Session> {
    // 处理过期的会话
    session.changeStatus(SessionStatus.terminated(), userId, '会话已过期');
    return session;
  }

  /**
   * 获取服务名称
   */
  protected getServiceName(): string {
    return '会话维护';
  }

  /**
   * 删除会话
   * @param sessionId 会话ID
   * @returns 删除是否成功
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    return this.executeDeleteOperation(
      '会话',
      async () => {
        const id = this.parseId(sessionId, '会话ID');
        const session = await this.sessionRepository.findById(id);

        if (!session) {
          return false;
        }

        // 检查会话是否有活跃线程
        const hasActiveThreads = await this.threadRepository.hasActiveThreads(id);
        if (hasActiveThreads) {
          throw new Error('无法删除有活跃线程的会话');
        }

        // 标记会话为已删除
        session.markAsDeleted();
        await this.sessionRepository.save(session);

        return true;
      },
      { sessionId }
    );
  }

  /**
   * 添加消息到会话
   * @param sessionId 会话ID
   * @param userId 用户ID
   * @returns 更新后的会话信息
   */
  async addMessageToSession(sessionId: string, userId?: string): Promise<Session> {
    return this.executeUpdateOperation(
      '会话消息',
      async () => {
        const id = this.parseId(sessionId, '会话ID');
        const user = this.parseOptionalId(userId, '用户ID');

        const session = await this.sessionRepository.findByIdOrFail(id);

        // 验证操作权限
        this.validateOperationPermission(session, user);

        // 验证消息添加
        this.validateMessageAddition(session);

        // 增加消息数量
        session.incrementMessageCount();

        await this.sessionRepository.save(session);
        return session;
      },
      { sessionId, userId }
    );
  }

  /**
   * 清理超时会话
   * @param userId 用户ID
   * @returns 清理的会话数量
   */
  async cleanupTimeoutSessions(userId?: string): Promise<number> {
    return this.executeCleanupOperation(
      '超时会话',
      async () => {
        const user = this.parseOptionalId(userId, '用户ID');
        const timeoutSessions = await this.sessionRepository.findSessionsNeedingCleanup();
        let cleanedCount = 0;

        for (const session of timeoutSessions) {
          try {
            if (session.isTimeout()) {
              const updatedSession = await this.handleSessionTimeout(session, user);
              if (updatedSession.status.isSuspended()) {
                cleanedCount++;
              }
            }
          } catch (error) {
            console.error(`清理超时会话失败: ${session.sessionId}`, error);
          }
        }

        return cleanedCount;
      },
      { userId }
    );
  }

  /**
   * 清理过期会话
   * @param userId 用户ID
   * @returns 清理的会话数量
   */
  async cleanupExpiredSessions(userId?: string): Promise<number> {
    return this.executeCleanupOperation(
      '过期会话',
      async () => {
        const user = this.parseOptionalId(userId, '用户ID');
        const expiredSessions = await this.sessionRepository.findSessionsNeedingCleanup();
        let cleanedCount = 0;

        for (const session of expiredSessions) {
          try {
            if (session.isExpired()) {
              const updatedSession = await this.handleSessionExpiration(session, user);
              if (updatedSession.status.isTerminated()) {
                cleanedCount++;
              }
            }
          } catch (error) {
            console.error(`清理过期会话失败: ${session.sessionId}`, error);
          }
        }

        return cleanedCount;
      },
      { userId }
    );
  }

  /**
   * 获取会话统计信息
   * @param userId 用户ID
   * @returns 会话统计信息
   */
  async getSessionStatistics(userId?: string): Promise<{
    total: number;
    active: number;
    suspended: number;
    terminated: number;
  }> {
    return this.executeQueryOperation(
      '会话统计信息',
      async () => {
        const user = this.parseOptionalId(userId, '用户ID');
        if (!user) {
          throw new Error('获取会话统计信息需要提供用户ID');
        }

        // 获取用户的所有会话
        const sessions = await this.sessionRepository.findSessionsForUser(user);

        // 计算统计信息
        const total = sessions.length;
        const active = sessions.filter(s => s.status.isActive()).length;
        const suspended = sessions.filter(s => s.status.isSuspended()).length;
        const terminated = sessions.filter(s => s.status.isTerminated()).length;

        return {
          total,
          active,
          suspended,
          terminated
        };
      },
      { userId }
    );
  }

}