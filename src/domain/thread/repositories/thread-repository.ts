import { Repository } from '../../common/repositories/repository';
import { Thread } from '../entities/thread';
import { ID } from '../../common/value-objects/id';
import { ThreadStatus } from '../value-objects/thread-status';
import { ThreadPriority } from '../value-objects/thread-priority';
import { QueryOptions, PaginatedResult } from '../../common/repositories/repository';

/**
 * 线程查询选项接口
 */
export interface ThreadQueryOptions extends QueryOptions {
  /**
   * 会话ID过滤
   */
  sessionId?: string;

  /**
   * 工作流ID过滤
   */
  workflowId?: string;

  /**
   * 状态过滤
   */
  status?: string;

  /**
   * 优先级过滤
   */
  priority?: number;

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
   * 开始时间范围过滤
   */
  startedAfter?: Date;
  startedBefore?: Date;

  /**
   * 完成时间范围过滤
   */
  completedAfter?: Date;
  completedBefore?: Date;

  /**
   * 是否包含已删除的线程
   */
  includeDeleted?: boolean;
}

/**
 * 线程仓储接口
 * 
 * 定义线程持久化和查询的契约
 */
export interface ThreadRepository extends Repository<Thread, ID> {
  /**
   * 根据会话ID查找线程
   * @param sessionId 会话ID
   * @param options 查询选项
   * @returns 线程列表
   */
  findBySessionId(sessionId: ID, options?: ThreadQueryOptions): Promise<Thread[]>;

  /**
   * 根据工作流ID查找线程
   * @param workflowId 工作流ID
   * @param options 查询选项
   * @returns 线程列表
   */
  findByWorkflowId(workflowId: ID, options?: ThreadQueryOptions): Promise<Thread[]>;

  /**
   * 根据状态查找线程
   * @param status 线程状态
   * @param options 查询选项
   * @returns 线程列表
   */
  findByStatus(status: ThreadStatus, options?: ThreadQueryOptions): Promise<Thread[]>;

  /**
   * 根据优先级查找线程
   * @param priority 线程优先级
   * @param options 查询选项
   * @returns 线程列表
   */
  findByPriority(priority: ThreadPriority, options?: ThreadQueryOptions): Promise<Thread[]>;

  /**
   * 根据会话ID和状态查找线程
   * @param sessionId 会话ID
   * @param status 线程状态
   * @param options 查询选项
   * @returns 线程列表
   */
  findBySessionIdAndStatus(
    sessionId: ID,
    status: ThreadStatus,
    options?: ThreadQueryOptions
  ): Promise<Thread[]>;

  /**
   * 查找活跃线程
   * @param options 查询选项
   * @returns 活跃线程列表
   */
  findActiveThreads(options?: ThreadQueryOptions): Promise<Thread[]>;

  /**
   * 查找待执行线程
   * @param options 查询选项
   * @returns 待执行线程列表
   */
  findPendingThreads(options?: ThreadQueryOptions): Promise<Thread[]>;

  /**
   * 查找运行中线程
   * @param options 查询选项
   * @returns 运行中线程列表
   */
  findRunningThreads(options?: ThreadQueryOptions): Promise<Thread[]>;

  /**
   * 查找暂停线程
   * @param options 查询选项
   * @returns 暂停线程列表
   */
  findPausedThreads(options?: ThreadQueryOptions): Promise<Thread[]>;

  /**
   * 查找已终止线程
   * @param options 查询选项
   * @returns 已终止线程列表
   */
  findTerminalThreads(options?: ThreadQueryOptions): Promise<Thread[]>;

  /**
   * 查找失败线程
   * @param options 查询选项
   * @returns 失败线程列表
   */
  findFailedThreads(options?: ThreadQueryOptions): Promise<Thread[]>;

  /**
   * 根据标题搜索线程
   * @param title 标题关键词
   * @param options 查询选项
   * @returns 线程列表
   */
  searchByTitle(title: string, options?: ThreadQueryOptions): Promise<Thread[]>;

  /**
   * 分页查询线程
   * @param options 查询选项
   * @returns 分页结果
   */
  findWithPagination(options: ThreadQueryOptions): Promise<PaginatedResult<Thread>>;

  /**
   * 统计会话的线程数量
   * @param sessionId 会话ID
   * @param options 查询选项
   * @returns 线程数量
   */
  countBySessionId(sessionId: ID, options?: ThreadQueryOptions): Promise<number>;

  /**
   * 统计工作流的线程数量
   * @param workflowId 工作流ID
   * @param options 查询选项
   * @returns 线程数量
   */
  countByWorkflowId(workflowId: ID, options?: ThreadQueryOptions): Promise<number>;

  /**
   * 统计指定状态的线程数量
   * @param status 线程状态
   * @param options 查询选项
   * @returns 线程数量
   */
  countByStatus(status: ThreadStatus, options?: ThreadQueryOptions): Promise<number>;

  /**
   * 统计指定优先级的线程数量
   * @param priority 线程优先级
   * @param options 查询选项
   * @returns 线程数量
   */
  countByPriority(priority: ThreadPriority, options?: ThreadQueryOptions): Promise<number>;

  /**
   * 检查会话是否有活跃线程
   * @param sessionId 会话ID
   * @returns 是否有活跃线程
   */
  hasActiveThreads(sessionId: ID): Promise<boolean>;

  /**
   * 获取会话的最后活动线程
   * @param sessionId 会话ID
   * @returns 最后活动线程或null
   */
  getLastActiveThreadBySessionId(sessionId: ID): Promise<Thread | null>;

  /**
   * 获取最高优先级的待执行线程
   * @param options 查询选项
   * @returns 最高优先级的待执行线程或null
   */
  getHighestPriorityPendingThread(options?: ThreadQueryOptions): Promise<Thread | null>;

  /**
   * 批量更新线程状态
   * @param threadIds 线程ID列表
   * @param status 新状态
   * @returns 更新的线程数量
   */
  batchUpdateStatus(threadIds: ID[], status: ThreadStatus): Promise<number>;

  /**
   * 批量删除线程
   * @param threadIds 线程ID列表
   * @returns 删除的线程数量
   */
  batchDelete(threadIds: ID[]): Promise<number>;

  /**
   * 删除会话的所有线程
   * @param sessionId 会话ID
   * @returns 删除的线程数量
   */
  deleteAllBySessionId(sessionId: ID): Promise<number>;

  /**
   * 软删除线程
   * @param threadId 线程ID
   */
  softDelete(threadId: ID): Promise<void>;

  /**
   * 批量软删除线程
   * @param threadIds 线程ID列表
   * @returns 删除的线程数量
   */
  batchSoftDelete(threadIds: ID[]): Promise<number>;

  /**
   * 恢复软删除的线程
   * @param threadId 线程ID
   */
  restoreSoftDeleted(threadId: ID): Promise<void>;

  /**
   * 查找软删除的线程
   * @param options 查询选项
   * @returns 软删除的线程列表
   */
  findSoftDeleted(options?: ThreadQueryOptions): Promise<Thread[]>;

  /**
   * 获取线程执行统计信息
   * @param sessionId 会话ID
   * @returns 执行统计信息
   */
  getThreadExecutionStats(sessionId: ID): Promise<{
    total: number;
    pending: number;
    running: number;
    paused: number;
    completed: number;
    failed: number;
    cancelled: number;
  }>;
}