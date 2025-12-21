import { Repository } from '../../common/repositories/repository';
import { Session } from '../entities/session';
import { ID } from '../../common/value-objects/id';
import { SessionStatus } from '../value-objects/session-status';
import { IQueryOptions, PaginatedResult } from '../../common/repositories/repository';

/**
 * 会话查询选项接口
 */
export interface SessionQueryOptions extends IQueryOptions {
  /**
   * 用户ID过滤
   */
  userId?: string;

  /**
   * 状态过滤
   */
  status?: string;

  /**
   * 标题过滤
   */
  title?: string;

  /**
   * 创建时间范围过滤
   */
  createdAfter?: Date;
  createdBefore?: Date;

  /**
   * 最后活动时间范围过滤
   */
  lastActivityAfter?: Date;
  lastActivityBefore?: Date;

  /**
   * 是否包含已删除的会话
   */
  includeDeleted?: boolean;
}

/**
 * 会话仓储接口
 * 
 * 定义会话持久化和查询的契约
 */
export interface SessionRepository extends Repository<Session, ID> {
  /**
   * 根据用户ID查找会话
   * @param userId 用户ID
   * @param options 查询选项
   * @returns 会话列表
   */
  findByUserId(userId: ID, options?: SessionQueryOptions): Promise<Session[]>;

  /**
   * 根据状态查找会话
   * @param status 会话状态
   * @param options 查询选项
   * @returns 会话列表
   */
  findByStatus(status: SessionStatus, options?: SessionQueryOptions): Promise<Session[]>;

  /**
   * 根据用户ID和状态查找会话
   * @param userId 用户ID
   * @param status 会话状态
   * @param options 查询选项
   * @returns 会话列表
   */
  findByUserIdAndStatus(
    userId: ID,
    status: SessionStatus,
    options?: SessionQueryOptions
  ): Promise<Session[]>;

  /**
   * 查找用户的活跃会话
   * @param userId 用户ID
   * @param options 查询选项
   * @returns 活跃会话列表
   */
  findActiveSessionsByUserId(userId: ID, options?: SessionQueryOptions): Promise<Session[]>;

  /**
   * 查找超时的会话
   * @param options 查询选项
   * @returns 超时会话列表
   */
  findTimeoutSessions(options?: SessionQueryOptions): Promise<Session[]>;

  /**
   * 查找过期的会话
   * @param options 查询选项
   * @returns 过期会话列表
   */
  findExpiredSessions(options?: SessionQueryOptions): Promise<Session[]>;

  /**
   * 根据标题搜索会话
   * @param title 标题关键词
   * @param options 查询选项
   * @returns 会话列表
   */
  searchByTitle(title: string, options?: SessionQueryOptions): Promise<Session[]>;

  /**
   * 分页查询会话
   * @param options 查询选项
   * @returns 分页结果
   */
  findWithPagination(options: SessionQueryOptions): Promise<PaginatedResult<Session>>;

  /**
   * 统计用户的会话数量
   * @param userId 用户ID
   * @param options 查询选项
   * @returns 会话数量
   */
  countByUserId(userId: ID, options?: SessionQueryOptions): Promise<number>;

  /**
   * 统计指定状态的会话数量
   * @param status 会话状态
   * @param options 查询选项
   * @returns 会话数量
   */
  countByStatus(status: SessionStatus, options?: SessionQueryOptions): Promise<number>;

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
  getLastActiveSessionByUserId(userId: ID): Promise<Session | null>;

  /**
   * 批量更新会话状态
   * @param sessionIds 会话ID列表
   * @param status 新状态
   * @returns 更新的会话数量
   */
  batchUpdateStatus(sessionIds: ID[], status: SessionStatus): Promise<number>;

  /**
   * 批量删除会话
   * @param sessionIds 会话ID列表
   * @returns 删除的会话数量
   */
  batchDelete(sessionIds: ID[]): Promise<number>;

  /**
   * 删除用户的所有会话
   * @param userId 用户ID
   * @returns 删除的会话数量
   */
  deleteAllByUserId(userId: ID): Promise<number>;

  /**
   * 软删除会话
   * @param sessionId 会话ID
   */
  softDelete(sessionId: ID): Promise<void>;

  /**
   * 批量软删除会话
   * @param sessionIds 会话ID列表
   * @returns 删除的会话数量
   */
  batchSoftDelete(sessionIds: ID[]): Promise<number>;

  /**
   * 恢复软删除的会话
   * @param sessionId 会话ID
   */
  restoreSoftDeleted(sessionId: ID): Promise<void>;

  /**
   * 查找软删除的会话
   * @param options 查询选项
   * @returns 软删除的会话列表
   */
  findSoftDeleted(options?: SessionQueryOptions): Promise<Session[]>;
}