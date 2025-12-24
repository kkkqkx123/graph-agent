import { Session } from '../entities/session';
import { SessionRepository } from '../repositories/session-repository';
import { ID } from '../../common/value-objects/id';
import { SessionStatus } from '../value-objects/session-status';
import { SessionConfig } from '../value-objects/session-config';
import { Timestamp } from '../../common/value-objects/timestamp';
import { DomainError } from '../../common/errors/domain-error';

/**
 * 会话领域服务
 * 
 * 提供跨聚合的业务逻辑和规则
 * 只包含核心业务逻辑，不包含应用服务逻辑
 */
export class SessionDomainService {
  /**
   * 构造函数
   * @param sessionRepository 会话仓储
   */
  constructor(private readonly sessionRepository: SessionRepository) {}

  /**
   * 验证会话创建的业务规则
   * @param userId 用户ID
   * @param config 会话配置
   */
  async validateSessionCreation(userId?: ID, config?: SessionConfig): Promise<void> {
    // 验证用户是否有活跃会话（根据业务规则）
    if (userId) {
      const hasActiveSession = await this.sessionRepository.hasActiveSession(userId);
      if (hasActiveSession) {
        throw new DomainError('用户已有活跃会话，无法创建新会话');
      }
    }

    // 验证配置
    if (config) {
      config.validate();
    }
  }

  /**
   * 计算会话超时时间
   * @param session 会话
   * @returns 超时时间
   */
  calculateSessionTimeout(session: Session): Timestamp {
    const timeoutMinutes = session.config.getTimeoutMinutes();
    const timeoutHours = timeoutMinutes / 60;
    return session.lastActivityAt.addHours(timeoutHours);
  }

  /**
   * 计算会话过期时间
   * @param session 会话
   * @returns 过期时间
   */
  calculateSessionExpiration(session: Session): Timestamp {
    const maxDuration = session.config.getMaxDuration();
    const maxDurationHours = maxDuration / 60;
    return session.createdAt.addHours(maxDurationHours);
  }

  /**
   * 处理会话超时
   * @param session 会话
   * @param changedBy 操作者ID
   * @returns 处理后的会话
   */
  async handleSessionTimeout(session: Session, changedBy?: ID): Promise<Session> {
    if (!session.isTimeout()) {
      return session;
    }

    if (session.status.isActive()) {
      session.changeStatus(SessionStatus.suspended(), changedBy, '会话超时自动暂停');
      return await this.sessionRepository.save(session);
    }

    return session;
  }

  /**
   * 处理会话过期
   * @param session 会话
   * @param changedBy 操作者ID
   * @returns 处理后的会话
   */
  async handleSessionExpiration(session: Session, changedBy?: ID): Promise<Session> {
    if (!session.isExpired()) {
      return session;
    }

    if (!session.status.isTerminated()) {
      session.changeStatus(SessionStatus.terminated(), changedBy, '会话过期自动终止');
      return await this.sessionRepository.save(session);
    }

    return session;
  }

  /**
   * 验证会话状态转换
   * @param session 会话
   * @param newStatus 新状态
   * @param userId 操作用户ID
   */
  async validateStatusTransition(
    session: Session,
    newStatus: SessionStatus,
    userId?: ID
  ): Promise<void> {
    // 检查用户是否有其他活跃会话（当激活会话时）
    if (newStatus.isActive() && userId && session.userId && !session.userId.equals(userId)) {
      const hasActiveSession = await this.sessionRepository.hasActiveSession(userId);
      if (hasActiveSession) {
        throw new DomainError('用户已有活跃会话，无法激活其他会话');
      }
    }

    // 其他状态转换验证已在实体内部处理
  }

  /**
   * 验证会话操作权限
   * @param session 会话
   * @param userId 用户ID
   */
  validateOperationPermission(session: Session, userId?: ID): void {
    if (session.isDeleted()) {
      throw new DomainError('无法操作已删除的会话');
    }

    if (!session.status.canOperate()) {
      throw new DomainError('无法在非活跃状态的会话中进行操作');
    }

    // 检查用户权限（如果有用户ID）
    if (userId && session.userId && !session.userId.equals(userId)) {
      throw new DomainError('用户无权操作此会话');
    }
  }

  /**
   * 验证会话消息添加
   * @param session 会话
   */
  validateMessageAddition(session: Session): void {
    if (session.isTimeout()) {
      throw new DomainError('会话已超时，无法添加消息');
    }

    if (session.isExpired()) {
      throw new DomainError('会话已过期，无法添加消息');
    }

    if (session.messageCount >= session.config.getMaxMessages()) {
      throw new DomainError('会话消息数量已达上限');
    }
  }

  /**
   * 验证配置更新
   * @param session 会话
   * @param newConfig 新配置
   */
  validateConfigUpdate(session: Session, newConfig: SessionConfig): void {
    // 验证配置本身
    newConfig.validate();

    // 检查最大消息数量是否减少到当前消息数量以下
    if (newConfig.getMaxMessages() < session.messageCount) {
      throw new DomainError('新的最大消息数量不能小于当前消息数量');
    }
  }

  /**
   * 检查会话是否需要清理
   * @param session 会话
   * @returns 是否需要清理
   */
  needsCleanup(session: Session): boolean {
    return session.isTimeout() || session.isExpired();
  }

  /**
   * 获取会话健康状态
   * @param session 会话
   * @returns 健康状态
   */
  getSessionHealthStatus(session: Session): {
    isHealthy: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    if (session.isTimeout()) {
      issues.push('会话已超时');
    }

    if (session.isExpired()) {
      issues.push('会话已过期');
    }

    if (session.messageCount >= session.config.getMaxMessages() * 0.9) {
      issues.push('消息数量接近上限');
    }

    return {
      isHealthy: issues.length === 0,
      issues
    };
  }
}