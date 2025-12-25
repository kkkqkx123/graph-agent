/**
 * 会话维护服务
 * 
 * 负责会话的删除、消息添加、清理和统计等维护功能
 */

import { Session } from '../../../domain/sessions/entities/session';
import { SessionRepository } from '../../../domain/sessions/repositories/session-repository';
import { ThreadRepository } from '../../../domain/threads/repositories/thread-repository';
import { SessionDomainService } from '../../../domain/sessions/services/session-domain-service';
import { BaseApplicationService } from '../../common/base-application-service';
import { SessionInfo, SessionStatistics } from '../dtos';
import { ILogger } from '../../../domain/common/types';

/**
 * 会话维护服务
 */
export class SessionMaintenanceService extends BaseApplicationService {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly threadRepository: ThreadRepository,
    private readonly sessionDomainService: SessionDomainService,
    logger: ILogger
  ) {
    super(logger);
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
  async addMessageToSession(sessionId: string, userId?: string): Promise<SessionInfo> {
    return this.executeUpdateOperation(
      '会话消息',
      async () => {
        const id = this.parseId(sessionId, '会话ID');
        const user = this.parseOptionalId(userId, '用户ID');

        const session = await this.sessionRepository.findByIdOrFail(id);

        // 验证操作权限
        this.sessionDomainService.validateOperationPermission(session, user);

        // 验证消息添加
        this.sessionDomainService.validateMessageAddition(session);

        // 增加消息数量
        session.incrementMessageCount();

        await this.sessionRepository.save(session);
        return this.mapSessionToInfo(session);
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
              const updatedSession = await this.sessionDomainService.handleSessionTimeout(session, user);
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
              const updatedSession = await this.sessionDomainService.handleSessionExpiration(session, user);
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
  async getSessionStatistics(userId?: string): Promise<SessionStatistics> {
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

  /**
   * 将会话领域对象映射为会话信息DTO
   */
  private mapSessionToInfo(session: Session): SessionInfo {
    return {
      sessionId: session.sessionId.toString(),
      userId: session.userId?.toString(),
      title: session.title,
      status: session.status.getValue(),
      messageCount: session.messageCount,
      createdAt: session.createdAt.toISOString(),
      lastActivityAt: session.lastActivityAt.toISOString()
    };
  }
}