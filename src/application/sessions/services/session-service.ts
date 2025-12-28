/**
 * 会话应用服务
 *
 * 负责会话相关的业务逻辑编排和协调
 * 使用新的Zod-based DTO进行运行时验证
 */

import { Session, SessionRepository, SessionStatus, SessionConfig } from '../../../domain/sessions';
import { ThreadRepository } from '../../../domain/threads';
import { ID, ILogger } from '../../../domain/common';
import {
  CreateSessionRequest,
  CreateSessionRequestDto
} from '../index';
import { SessionConverter } from '../../../interfaces/http/sessions/dtos';
import { DtoValidationError } from '../../common/dto';

/**
 * 会话应用服务
 */
export class SessionService {
  private createSessionDto: CreateSessionRequestDto;

  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly threadRepository: ThreadRepository,
    private readonly logger: ILogger
  ) {
    // 初始化DTO实例
    this.createSessionDto = new CreateSessionRequestDto();
  }

  /**
   * 验证会话创建的业务规则
   */
  private async validateSessionCreation(userId?: ID, config?: SessionConfig): Promise<void> {
    // 验证配置有效性
    if (config) {
      config.validate();
    }
  }

  /**
   * 验证状态转换的业务规则
   */
  private validateStatusTransition(session: Session, newStatus: SessionStatus, userId?: ID): void {
    // 验证状态转换是否合法
    if (session.status.isTerminated()) {
      throw new Error('已终止的会话无法转换状态');
    }
  }

  /**
   * 验证配置更新的业务规则
   */
  private validateConfigUpdate(session: Session, newConfig: SessionConfig): void {
    // 验证配置更新是否合法
    if (session.status.isTerminated()) {
      throw new Error('已终止的会话无法更新配置');
    }
    newConfig.validate();
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
      await this.validateSessionCreation(userId, config);

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
  async getSessionInfo(sessionId: string): Promise<Session | null> {
    try {
      // 验证ID格式
      const id = ID.fromString(sessionId);
      const session = await this.sessionRepository.findById(id);

      if (!session) {
        return null;
      }

      // 直接返回领域对象
      return session;
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
  async listSessions(): Promise<Session[]> {
    try {
      const sessions = await this.sessionRepository.findAll();

      // 直接返回领域对象列表
      return sessions;
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
  async activateSession(sessionId: string, userId?: string): Promise<Session> {
    try {
      const id = ID.fromString(sessionId);
      const user = userId ? ID.fromString(userId) : undefined;

      const session = await this.sessionRepository.findByIdOrFail(id);

      if (session.status.isActive()) {
        return session; // 已经是活跃状态
      }

      if (session.status.isTerminated()) {
        throw new Error('无法激活已终止的会话');
      }

      // 验证状态转换
      this.validateStatusTransition(session, SessionStatus.active(), user);

      // 激活会话
      session.changeStatus(SessionStatus.active(), user, '激活会话');
      session.updateLastActivity();

      await this.sessionRepository.save(session);

      return session;
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
  async suspendSession(sessionId: string, userId?: string, reason?: string): Promise<Session> {
    try {
      const id = ID.fromString(sessionId);
      const user = userId ? ID.fromString(userId) : undefined;

      const session = await this.sessionRepository.findByIdOrFail(id);

      if (session.status.isSuspended()) {
        return session; // 已经是暂停状态
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

      return session;
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
  async terminateSession(sessionId: string, userId?: string, reason?: string): Promise<Session> {
    try {
      const id = ID.fromString(sessionId);
      const user = userId ? ID.fromString(userId) : undefined;

      const session = await this.sessionRepository.findByIdOrFail(id);

      if (session.status.isTerminated()) {
        return session; // 已经是终止状态
      }

      // 终止会话
      session.changeStatus(SessionStatus.terminated(), user, reason);

      await this.sessionRepository.save(session);

      return session;
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
  async updateSessionConfig(sessionId: string, config: Record<string, unknown>): Promise<Session> {
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
      this.validateConfigUpdate(session, sessionConfig);

      // 更新配置
      session.updateConfig(sessionConfig);

      await this.sessionRepository.save(session);

      return session;
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
  async addMessageToSession(sessionId: string, userId?: string): Promise<Session> {
    try {
      const id = ID.fromString(sessionId);
      const user = userId ? ID.fromString(userId) : undefined;

      const session = await this.sessionRepository.findByIdOrFail(id);

      // 验证操作权限
      this.validateOperationPermission(session, user);

      // 验证消息添加
      this.validateMessageAddition(session);

      // 增加消息数量
      session.incrementMessageCount();

      await this.sessionRepository.save(session);

      return session;
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

}