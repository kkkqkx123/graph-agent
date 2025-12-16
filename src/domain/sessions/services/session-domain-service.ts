import { Session } from '../entities/session';
import { SessionRepository } from '../repositories/session-repository';
import { ID } from '../../common/value-objects/id';
import { SessionStatus } from '../value-objects/session-status';
import { SessionConfig } from '../value-objects/session-config';
import { DomainError } from '../../common/errors/domain-error';

/**
 * 会话领域服务
 * 
 * 提供会话相关的业务逻辑和规则
 */
export class SessionDomainService {
  /**
   * 构造函数
   * @param sessionRepository 会话仓储
   */
  constructor(private readonly sessionRepository: SessionRepository) {}

  /**
   * 创建新会话
   * @param userId 用户ID
   * @param title 会话标题
   * @param config 会话配置
   * @returns 新会话
   */
  async createSession(
    userId?: ID,
    title?: string,
    config?: SessionConfig
  ): Promise<Session> {
    // 验证用户是否有活跃会话（根据业务规则）
    if (userId) {
      const hasActiveSession = await this.sessionRepository.hasActiveSession(userId);
      if (hasActiveSession) {
        throw new DomainError('用户已有活跃会话，无法创建新会话');
      }
    }

    // 创建会话
    const session = Session.create(userId, title, config);

    // 保存会话
    return await this.sessionRepository.save(session);
  }

  /**
   * 激活会话
   * @param sessionId 会话ID
   * @param userId 操作用户ID
   * @returns 激活后的会话
   */
  async activateSession(sessionId: ID, userId?: ID): Promise<Session> {
    const session = await this.sessionRepository.findByIdOrFail(sessionId);

    if (session.status.isActive()) {
      return session; // 已经是活跃状态
    }

    if (session.status.isTerminated()) {
      throw new DomainError('无法激活已终止的会话');
    }

    // 检查用户是否有其他活跃会话
    if (userId && session.userId && !session.userId.equals(userId)) {
      const hasActiveSession = await this.sessionRepository.hasActiveSession(userId);
      if (hasActiveSession) {
        throw new DomainError('用户已有活跃会话，无法激活其他会话');
      }
    }

    // 激活会话
    session.changeStatus(SessionStatus.active(), userId, '激活会话');
    session.updateLastActivity();

    return await this.sessionRepository.save(session);
  }

  /**
   * 暂停会话
   * @param sessionId 会话ID
   * @param userId 操作用户ID
   * @param reason 暂停原因
   * @returns 暂停后的会话
   */
  async suspendSession(
    sessionId: ID,
    userId?: ID,
    reason?: string
  ): Promise<Session> {
    const session = await this.sessionRepository.findByIdOrFail(sessionId);

    if (session.status.isSuspended()) {
      return session; // 已经是暂停状态
    }

    if (session.status.isTerminated()) {
      throw new DomainError('无法暂停已终止的会话');
    }

    if (!session.status.isActive()) {
      throw new DomainError('只能暂停活跃状态的会话');
    }

    // 暂停会话
    session.changeStatus(SessionStatus.suspended(), userId, reason);

    return await this.sessionRepository.save(session);
  }

  /**
   * 终止会话
   * @param sessionId 会话ID
   * @param userId 操作用户ID
   * @param reason 终止原因
   * @returns 终止后的会话
   */
  async terminateSession(
    sessionId: ID,
    userId?: ID,
    reason?: string
  ): Promise<Session> {
    const session = await this.sessionRepository.findByIdOrFail(sessionId);

    if (session.status.isTerminated()) {
      return session; // 已经是终止状态
    }

    // 终止会话
    session.changeStatus(SessionStatus.terminated(), userId, reason);

    return await this.sessionRepository.save(session);
  }

  /**
   * 更新会话配置
   * @param sessionId 会话ID
   * @param newConfig 新配置
   * @param userId 操作用户ID
   * @returns 更新后的会话
   */
  async updateSessionConfig(
    sessionId: ID,
    newConfig: SessionConfig,
    userId?: ID
  ): Promise<Session> {
    const session = await this.sessionRepository.findByIdOrFail(sessionId);

    if (!session.status.canOperate()) {
      throw new DomainError('无法更新非活跃状态会话的配置');
    }

    // 验证配置的合理性
    this.validateConfigUpdate(session.config, newConfig);

    // 更新配置
    session.updateConfig(newConfig);

    return await this.sessionRepository.save(session);
  }

  /**
   * 添加消息到会话
   * @param sessionId 会话ID
   * @param userId 操作用户ID
   * @returns 更新后的会话
   */
  async addMessageToSession(sessionId: ID, userId?: ID): Promise<Session> {
    const session = await this.sessionRepository.findByIdOrFail(sessionId);

    if (!session.status.canOperate()) {
      throw new DomainError('无法在非活跃状态的会话中添加消息');
    }

    // 检查会话是否超时或过期
    if (session.isTimeout()) {
      throw new DomainError('会话已超时，无法添加消息');
    }

    if (session.isExpired()) {
      throw new DomainError('会话已过期，无法添加消息');
    }

    // 增加消息数量
    session.incrementMessageCount();

    return await this.sessionRepository.save(session);
  }

  /**
   * 清理超时会话
   * @param userId 操作用户ID
   * @returns 清理的会话数量
   */
  async cleanupTimeoutSessions(userId?: ID): Promise<number> {
    const timeoutSessions = await this.sessionRepository.findTimeoutSessions();
    let cleanedCount = 0;

    for (const session of timeoutSessions) {
      try {
        // 暂停超时的会话
        if (session.status.isActive()) {
          session.changeStatus(SessionStatus.suspended(), userId, '会话超时自动暂停');
          await this.sessionRepository.save(session);
          cleanedCount++;
        }
      } catch (error) {
        console.error(`清理超时会话失败: ${session.sessionId}`, error);
      }
    }

    return cleanedCount;
  }

  /**
   * 清理过期会话
   * @param userId 操作用户ID
   * @returns 清理的会话数量
   */
  async cleanupExpiredSessions(userId?: ID): Promise<number> {
    const expiredSessions = await this.sessionRepository.findExpiredSessions();
    let cleanedCount = 0;

    for (const session of expiredSessions) {
      try {
        // 终止过期的会话
        if (!session.status.isTerminated()) {
          session.changeStatus(SessionStatus.terminated(), userId, '会话过期自动终止');
          await this.sessionRepository.save(session);
          cleanedCount++;
        }
      } catch (error) {
        console.error(`清理过期会话失败: ${session.sessionId}`, error);
      }
    }

    return cleanedCount;
  }

  /**
   * 获取用户的会话统计信息
   * @param userId 用户ID
   * @returns 会话统计信息
   */
  async getUserSessionStats(userId: ID): Promise<{
    total: number;
    active: number;
    suspended: number;
    terminated: number;
  }> {
    const total = await this.sessionRepository.countByUserId(userId);
    const active = await this.sessionRepository.countByUserId(
      userId,
      { status: SessionStatus.active().toString() }
    );
    const suspended = await this.sessionRepository.countByUserId(
      userId,
      { status: SessionStatus.suspended().toString() }
    );
    const terminated = await this.sessionRepository.countByUserId(
      userId,
      { status: SessionStatus.terminated().toString() }
    );

    return {
      total,
      active,
      suspended,
      terminated
    };
  }

  /**
   * 验证配置更新的合理性
   * @param oldConfig 旧配置
   * @param newConfig 新配置
   */
  private validateConfigUpdate(
    oldConfig: SessionConfig,
    newConfig: SessionConfig
  ): void {
    // 检查最大消息数量是否减少到当前消息数量以下
    // 这里需要访问当前会话的消息数量，但在领域服务中无法直接访问
    // 这个验证应该在实体层面进行

    // 检查其他业务规则
    if (newConfig.getMaxDuration() < oldConfig.getMaxDuration()) {
      // 可以添加警告日志，但不阻止更新
      console.warn('最大持续时间被减少，可能会影响现有会话');
    }
  }
}