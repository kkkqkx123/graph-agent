/**
 * 会话应用服务
 *
 * 负责会话相关的业务逻辑编排和协调
 * 使用新的Zod-based DTO进行运行时验证
 */

import { Session } from '../../../domain/sessions/entities/session';
import { SessionRepository } from '../../../domain/sessions/repositories/session-repository';
import { SessionDomainService } from '../../../domain/sessions/services/session-domain-service';
import { ThreadRepository } from '../../../domain/threads/repositories/thread-repository';
import { ThreadDomainService } from '../../../domain/threads/services/thread-domain-service';
import { ID } from '../../../domain/common/value-objects/id';
import { SessionStatus } from '../../../domain/sessions/value-objects/session-status';
import { ILogger } from '../../../domain/common/types';
import {
  CreateSessionRequest,
  SessionInfo,
  CreateSessionRequestDto,
  SessionInfoDto,
  SessionConverter
} from '../dtos';
import { DtoValidationError } from '../../common/dto';

/**
 * 会话应用服务
 */
export class SessionService {
  private createSessionDto: CreateSessionRequestDto;
  private sessionInfoDto: SessionInfoDto;
  private sessionConverter: SessionConverter;

  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly threadRepository: ThreadRepository,
    private readonly sessionDomainService: SessionDomainService,
    private readonly threadDomainService: ThreadDomainService,
    private readonly logger: ILogger
  ) {
    // 初始化DTO实例
    this.createSessionDto = new CreateSessionRequestDto();
    this.sessionInfoDto = new SessionInfoDto();
    this.sessionConverter = new SessionConverter();
  }

  /**
   * 创建会话
   * @param request 创建会话请求
   * @returns 创建的会话ID
   */
  async createSession(request: unknown): Promise<string> {
    try {
      this.logger.info('正在创建会话', { request });

      // 1. 运行时验证 - 使用新的DTO验证
      const validatedRequest = this.createSessionDto.validate(request);

      this.logger.info('会话请求验证通过', {
        userId: validatedRequest.userId,
        title: validatedRequest.title
      });

      // 2. 转换请求参数
      const { userId, title, config } = SessionConverter.fromCreateRequest(validatedRequest);

      // 3. 验证会话创建的业务规则
      await this.sessionDomainService.validateSessionCreation(userId, config);

      // 4. 创建会话
      const session = Session.create(userId, title, config);

      // 5. 保存会话
      await this.sessionRepository.save(session);

      this.logger.info('会话创建成功', { sessionId: session.sessionId.toString() });

      return session.sessionId.toString();
    } catch (error) {
      if (error instanceof DtoValidationError) {
        this.logger.warn('创建会话请求验证失败', {
          errors: error.getFormattedErrors()
        });
        throw new Error(`无效的请求参数: ${error.message}`);
      }
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
      // 验证ID格式
      const id = ID.fromString(sessionId);
      const session = await this.sessionRepository.findById(id);

      if (!session) {
        return null;
      }

      // 使用转换器自动映射 - 替代手动映射
      return this.sessionConverter.toDto(session);
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
        throw new Error('无法删除有活跃线程的会话');
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

      // 使用转换器批量转换 - 替代手动映射
      return this.sessionConverter.toDtoList(sessions);
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

      const session = await this.sessionRepository.findByIdOrFail(id);

      if (session.status.isActive()) {
        return this.sessionConverter.toDto(session); // 已经是活跃状态
      }

      if (session.status.isTerminated()) {
        throw new Error('无法激活已终止的会话');
      }

      // 验证状态转换
      await this.sessionDomainService.validateStatusTransition(session, SessionStatus.active(), user);

      // 激活会话
      session.changeStatus(SessionStatus.active(), user, '激活会话');
      session.updateLastActivity();

      await this.sessionRepository.save(session);

      return this.sessionConverter.toDto(session);
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

      const session = await this.sessionRepository.findByIdOrFail(id);

      if (session.status.isSuspended()) {
        return this.sessionConverter.toDto(session); // 已经是暂停状态
      }

      if (session.status.isTerminated()) {
        throw new Error('无法暂停已终止的会话');
      }

      if (!session.status.isActive()) {
        throw new Error('只能暂停活跃状态的会话');
      }

      // 暂停会话
      session.changeStatus(SessionStatus.suspended(), user, reason);

      await this.sessionRepository.save(session);

      return this.sessionConverter.toDto(session);
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

      const session = await this.sessionRepository.findByIdOrFail(id);

      if (session.status.isTerminated()) {
        return this.sessionConverter.toDto(session); // 已经是终止状态
      }

      // 终止会话
      session.changeStatus(SessionStatus.terminated(), user, reason);

      await this.sessionRepository.save(session);

      return this.sessionConverter.toDto(session);
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

      // 验证配置格式
      const validatedConfig = this.createSessionDto.validateConfig(config);
      if (!validatedConfig) {
        throw new Error('无效的配置格式');
      }

      const sessionConfig = SessionConverter.createSessionConfig(validatedConfig);
      const session = await this.sessionRepository.findByIdOrFail(id);

      // 验证配置更新
      this.sessionDomainService.validateConfigUpdate(session, sessionConfig);

      // 更新配置
      session.updateConfig(sessionConfig);

      await this.sessionRepository.save(session);

      return this.sessionConverter.toDto(session);
    } catch (error) {
      if (error instanceof DtoValidationError) {
        this.logger.warn('会话配置验证失败', {
          errors: error.getFormattedErrors()
        });
        throw new Error(`无效的配置参数: ${error.message}`);
      }
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

      const session = await this.sessionRepository.findByIdOrFail(id);

      // 验证操作权限
      this.sessionDomainService.validateOperationPermission(session, user);

      // 验证消息添加
      this.sessionDomainService.validateMessageAddition(session);

      // 增加消息数量
      session.incrementMessageCount();

      await this.sessionRepository.save(session);

      return this.sessionConverter.toDto(session);
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
    } catch (error) {
      this.logger.error('获取会话统计信息失败', error as Error);
      throw error;
    }
  }

  /**
   * 将会话领域对象映射为会话信息DTO（已废弃）
   * @deprecated 请使用SessionConverter.toDto()
   */
  private mapSessionToInfo(session: Session): SessionInfo {
    // 使用转换器进行映射，保持向后兼容
    return this.sessionConverter.toDto(session);
  }
}