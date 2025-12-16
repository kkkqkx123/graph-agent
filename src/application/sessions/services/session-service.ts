/**
 * 会话应用服务
 * 
 * 负责会话相关的业务逻辑编排和协调
 */

import { Session } from '../../../domain/session/entities/session';
import { SessionRepository } from '../../../domain/session/repositories/session-repository';
import { SessionDomainService } from '../../../domain/session/services/session-domain-service';
import { ThreadRepository } from '../../../domain/thread/repositories/thread-repository';
import { ThreadDomainService } from '../../../domain/thread/services/thread-domain-service';
import { ID } from '../../../domain/common/value-objects/id';
import { SessionId } from '../../../domain/common/value-objects/session-id';
import { SessionStatus } from '../../../domain/session/value-objects/session-status';
import { SessionConfig } from '../../../domain/session/value-objects/session-config';
import { DomainError } from '../../../domain/common/errors/domain-error';
import { ILogger } from '@shared/types/logger';

/**
 * 创建会话请求DTO
 */
export interface CreateSessionRequest {
  userId?: string;
  title?: string;
  config?: Record<string, unknown>;
}

/**
 * 会话信息DTO
 */
export interface SessionInfo {
  sessionId: string;
  userId?: string;
  title?: string;
  status: string;
  messageCount: number;
  createdAt: string;
  lastActivityAt: string;
}

/**
 * 会话应用服务
 */
export class SessionService {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly threadRepository: ThreadRepository,
    private readonly sessionDomainService: SessionDomainService,
    private readonly threadDomainService: ThreadDomainService,
    private readonly logger: ILogger
  ) {}

  /**
   * 创建会话
   * @param request 创建会话请求
   * @returns 创建的会话ID
   */
  async createSession(request: CreateSessionRequest): Promise<string> {
    try {
      this.logger.info('正在创建会话', { userId: request.userId, title: request.title });

      // 转换请求参数
      const userId = request.userId ? ID.fromString(request.userId) : undefined;
      const config = request.config ? SessionConfig.create(request.config) : undefined;

      // 调用领域服务创建会话
      const session = await this.sessionDomainService.createSession(
        userId,
        request.title,
        config
      );

      this.logger.info('会话创建成功', { sessionId: session.sessionId.toString() });

      return session.sessionId.toString();
    } catch (error) {
      this.logger.error('创建会话失败', error as Error);
      throw error;
    }
  }

  /**
   * 获取会话信息
   * @param sessionId 会话ID
   * @returns 会话信息
   */
  async getSessionInfo(sessionId: string): Promise<SessionInfo | null> {
    try {
      const id = ID.fromString(sessionId);
      const session = await this.sessionRepository.findById(id);

      if (!session) {
        return null;
      }

      return {
        sessionId: session.sessionId.toString(),
        userId: session.userId?.toString(),
        title: session.title,
        status: session.status.toString(),
        messageCount: session.messageCount,
        createdAt: session.createdAt.toISOString(),
        lastActivityAt: session.lastActivityAt.toISOString()
      };
    } catch (error) {
      this.logger.error('获取会话信息失败', error as Error);
      throw error;
    }
  }

  /**
   * 删除会话
   * @param sessionId 会话ID
   * @returns 删除是否成功
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const id = ID.fromString(sessionId);
      const session = await this.sessionRepository.findById(id);

      if (!session) {
        return false;
      }

      // 检查会话是否有活跃线程
      const hasActiveThreads = await this.threadRepository.hasActiveThreads(id);
      if (hasActiveThreads) {
        throw new DomainError('无法删除有活跃线程的会话');
      }

      // 标记会话为已删除
      session.markAsDeleted();
      await this.sessionRepository.save(session);

      this.logger.info('会话删除成功', { sessionId });

      return true;
    } catch (error) {
      this.logger.error('删除会话失败', error as Error);
      throw error;
    }
  }

  /**
   * 列出所有会话
   * @returns 会话信息列表
   */
  async listSessions(): Promise<SessionInfo[]> {
    try {
      const sessions = await this.sessionRepository.findAll();

      return sessions.map(session => ({
        sessionId: session.sessionId.toString(),
        userId: session.userId?.toString(),
        title: session.title,
        status: session.status.toString(),
        messageCount: session.messageCount,
        createdAt: session.createdAt.toISOString(),
        lastActivityAt: session.lastActivityAt.toISOString()
      }));
    } catch (error) {
      this.logger.error('列出会话失败', error as Error);
      throw error;
    }
  }

  /**
   * 检查会话是否存在
   * @param sessionId 会话ID
   * @returns 是否存在
   */
  async sessionExists(sessionId: string): Promise<boolean> {
    try {
      const id = ID.fromString(sessionId);
      return await this.sessionRepository.exists(id);
    } catch (error) {
      this.logger.error('检查会话存在性失败', error as Error);
      throw error;
    }
  }

  /**
   * 激活会话
   * @param sessionId 会话ID
   * @param userId 用户ID
   * @returns 激活后的会话信息
   */
  async activateSession(sessionId: string, userId?: string): Promise<SessionInfo> {
    try {
      const id = ID.fromString(sessionId);
      const user = userId ? ID.fromString(userId) : undefined;

      const session = await this.sessionDomainService.activateSession(id, user);

      return {
        sessionId: session.sessionId.toString(),
        userId: session.userId?.toString(),
        title: session.title,
        status: session.status.toString(),
        messageCount: session.messageCount,
        createdAt: session.createdAt.toISOString(),
        lastActivityAt: session.lastActivityAt.toISOString()
      };
    } catch (error) {
      this.logger.error('激活会话失败', error as Error);
      throw error;
    }
  }

  /**
   * 暂停会话
   * @param sessionId 会话ID
   * @param userId 用户ID
   * @param reason 暂停原因
   * @returns 暂停后的会话信息
   */
  async suspendSession(sessionId: string, userId?: string, reason?: string): Promise<SessionInfo> {
    try {
      const id = ID.fromString(sessionId);
      const user = userId ? ID.fromString(userId) : undefined;

      const session = await this.sessionDomainService.suspendSession(id, user, reason);

      return {
        sessionId: session.sessionId.toString(),
        userId: session.userId?.toString(),
        title: session.title,
        status: session.status.toString(),
        messageCount: session.messageCount,
        createdAt: session.createdAt.toISOString(),
        lastActivityAt: session.lastActivityAt.toISOString()
      };
    } catch (error) {
      this.logger.error('暂停会话失败', error as Error);
      throw error;
    }
  }

  /**
   * 终止会话
   * @param sessionId 会话ID
   * @param userId 用户ID
   * @param reason 终止原因
   * @returns 终止后的会话信息
   */
  async terminateSession(sessionId: string, userId?: string, reason?: string): Promise<SessionInfo> {
    try {
      const id = ID.fromString(sessionId);
      const user = userId ? ID.fromString(userId) : undefined;

      const session = await this.sessionDomainService.terminateSession(id, user, reason);

      return {
        sessionId: session.sessionId.toString(),
        userId: session.userId?.toString(),
        title: session.title,
        status: session.status.toString(),
        messageCount: session.messageCount,
        createdAt: session.createdAt.toISOString(),
        lastActivityAt: session.lastActivityAt.toISOString()
      };
    } catch (error) {
      this.logger.error('终止会话失败', error as Error);
      throw error;
    }
  }

  /**
   * 更新会话配置
   * @param sessionId 会话ID
   * @param config 新配置
   * @returns 更新后的会话信息
   */
  async updateSessionConfig(sessionId: string, config: Record<string, unknown>): Promise<SessionInfo> {
    try {
      const id = ID.fromString(sessionId);
      const sessionConfig = SessionConfig.create(config);

      const session = await this.sessionDomainService.updateSessionConfig(id, sessionConfig);

      return {
        sessionId: session.sessionId.toString(),
        userId: session.userId?.toString(),
        title: session.title,
        status: session.status.toString(),
        messageCount: session.messageCount,
        createdAt: session.createdAt.toISOString(),
        lastActivityAt: session.lastActivityAt.toISOString()
      };
    } catch (error) {
      this.logger.error('更新会话配置失败', error as Error);
      throw error;
    }
  }

  /**
   * 添加消息到会话
   * @param sessionId 会话ID
   * @param userId 用户ID
   * @returns 更新后的会话信息
   */
  async addMessageToSession(sessionId: string, userId?: string): Promise<SessionInfo> {
    try {
      const id = ID.fromString(sessionId);
      const user = userId ? ID.fromString(userId) : undefined;

      const session = await this.sessionDomainService.addMessageToSession(id, user);

      return {
        sessionId: session.sessionId.toString(),
        userId: session.userId?.toString(),
        title: session.title,
        status: session.status.toString(),
        messageCount: session.messageCount,
        createdAt: session.createdAt.toISOString(),
        lastActivityAt: session.lastActivityAt.toISOString()
      };
    } catch (error) {
      this.logger.error('添加消息到会话失败', error as Error);
      throw error;
    }
  }

  /**
   * 清理超时会话
   * @param userId 用户ID
   * @returns 清理的会话数量
   */
  async cleanupTimeoutSessions(userId?: string): Promise<number> {
    try {
      const user = userId ? ID.fromString(userId) : undefined;
      return await this.sessionDomainService.cleanupTimeoutSessions(user);
    } catch (error) {
      this.logger.error('清理超时会话失败', error as Error);
      throw error;
    }
  }

  /**
   * 清理过期会话
   * @param userId 用户ID
   * @returns 清理的会话数量
   */
  async cleanupExpiredSessions(userId?: string): Promise<number> {
    try {
      const user = userId ? ID.fromString(userId) : undefined;
      return await this.sessionDomainService.cleanupExpiredSessions(user);
    } catch (error) {
      this.logger.error('清理过期会话失败', error as Error);
      throw error;
    }
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
     try {
       const user = userId ? ID.fromString(userId) : undefined;
       if (!user) {
         throw new DomainError('获取会话统计信息需要提供用户ID');
       }
       return await this.sessionDomainService.getUserSessionStats(user);
    } catch (error) {
      this.logger.error('获取会话统计信息失败', error as Error);
      throw error;
    }
  }
}