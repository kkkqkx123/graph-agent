import { Repository } from '../../common/repositories/repository';
import { Session } from '../entities/session';
import { ID } from '../../common/value-objects/id';
import { SessionStatus } from '../value-objects/session-status';
import { Timestamp } from '../../common/value-objects/timestamp';

/**
 * 会话仓储接口
 *
 * 定义会话持久化和查询的契约
 * 使用业务语言而不是技术术语
 */
export interface ISessionRepository extends Repository<Session, ID> {
  /**
   * 查找用户的活跃会话
   * @param userId 用户ID
   * @returns 活跃会话列表
   */
  findActiveSessionsForUser(userId: ID): Promise<Session[]>;

  /**
   * 查找即将过期的会话
   * @param beforeDate 过期时间点
   * @returns 即将过期的会话列表
   */
  findSessionsExpiringBefore(beforeDate: Timestamp): Promise<Session[]>;

  /**
   * 查找需要清理的会话（超时或过期）
   * @returns 需要清理的会话列表
   */
  findSessionsNeedingCleanup(): Promise<Session[]>;

  /**
   * 查找高活动度的会话
   * @param minMessageCount 最小消息数量
   * @returns 高活动度会话列表
   */
  findSessionsWithHighActivity(minMessageCount: number): Promise<Session[]>;

  /**
   * 查找用户的最近会话
   * @param userId 用户ID
   * @param limit 限制数量
   * @returns 最近会话列表
   */
  findRecentSessionsForUser(userId: ID, limit: number): Promise<Session[]>;

  /**
   * 检查用户是否有活跃会话
   * @param userId 用户ID
   * @returns 是否有活跃会话
   */
  hasActiveSession(userId: ID): Promise<boolean>;

  /**
   * 获取用户的最后活动会话
   * @param userId 用户ID
   * @returns 最后活动会话或null
   */
  getLastActiveSessionForUser(userId: ID): Promise<Session | null>;

  /**
   * 查找指定状态的会话
   * @param status 会话状态
   * @returns 指定状态的会话列表
   */
  findSessionsByStatus(status: SessionStatus): Promise<Session[]>;

  /**
   * 查找用户的会话
   * @param userId 用户ID
   * @returns 用户的会话列表
   */
  findSessionsForUser(userId: ID): Promise<Session[]>;

  /**
   * 批量更新会话状态
   * @param sessionIds 会话ID列表
   * @param status 新状态
   * @returns 更新的会话数量
   */
  batchUpdateSessionStatus(sessionIds: ID[], status: SessionStatus): Promise<number>;

  /**
   * 批量删除会话
   * @param sessionIds 会话ID列表
   * @returns 删除的会话数量
   */
  batchDeleteSessions(sessionIds: ID[]): Promise<number>;

  /**
   * 删除用户的所有会话
   * @param userId 用户ID
   * @returns 删除的会话数量
   */
  deleteAllSessionsForUser(userId: ID): Promise<number>;

  /**
   * 软删除会话
   * @param sessionId 会话ID
   */
  softDeleteSession(sessionId: ID): Promise<void>;

  /**
   * 批量软删除会话
   * @param sessionIds 会话ID列表
   * @returns 删除的会话数量
   */
  batchSoftDeleteSessions(sessionIds: ID[]): Promise<number>;

  /**
   * 恢复软删除的会话
   * @param sessionId 会话ID
   */
  restoreSoftDeletedSession(sessionId: ID): Promise<void>;

  /**
   * 查找软删除的会话
   * @returns 软删除的会话列表
   */
  findSoftDeletedSessions(): Promise<Session[]>;
}
