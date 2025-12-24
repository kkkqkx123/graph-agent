import { Repository } from '../../common/repositories/repository';
import { Thread } from '../entities/thread';
import { ID } from '../../common/value-objects/id';
import { ThreadStatus } from '../value-objects/thread-status';
import { ThreadPriority } from '../value-objects/thread-priority';

/**
 * 线程仓储接口
 * 
 * 定义线程持久化和查询的契约
 * 使用业务导向的方法，避免技术细节泄露
 */
export interface ThreadRepository extends Repository<Thread, ID> {
  /**
   * 查找会话的活跃线程
   * @param sessionId 会话ID
   * @returns 活跃线程列表
   */
  findActiveThreadsForSession(sessionId: ID): Promise<Thread[]>;

  /**
   * 查找需要清理的线程
   * @param maxRunningHours 最大运行小时数
   * @returns 需要清理的线程列表
   */
  findThreadsNeedingCleanup(maxRunningHours: number): Promise<Thread[]>;

  /**
   * 查找高优先级的待执行线程
   * @param minPriority 最小优先级
   * @returns 高优先级待执行线程列表
   */
  findHighPriorityPendingThreads(minPriority: number): Promise<Thread[]>;

  /**
   * 查找会话的运行中线程
   * @param sessionId 会话ID
   * @returns 运行中线程列表
   */
  findRunningThreadsForSession(sessionId: ID): Promise<Thread[]>;

  /**
   * 查找失败的线程
   * @param sessionId 会话ID（可选）
   * @returns 失败线程列表
   */
  findFailedThreads(sessionId?: ID): Promise<Thread[]>;

  /**
   * 获取下一个待执行的线程
   * @param sessionId 会话ID（可选）
   * @returns 下一个待执行的线程或null
   */
  getNextPendingThread(sessionId?: ID): Promise<Thread | null>;

  /**
   * 获取最高优先级的待执行线程
   * @param sessionId 会话ID（可选）
   * @returns 最高优先级的待执行线程或null
   */
  getHighestPriorityPendingThread(sessionId?: ID): Promise<Thread | null>;

  /**
   * 检查会话是否有活跃线程
   * @param sessionId 会话ID
   * @returns 是否有活跃线程
   */
  hasActiveThreads(sessionId: ID): Promise<boolean>;

  /**
   * 检查会话是否有运行中线程
   * @param sessionId 会话ID
   * @returns 是否有运行中线程
   */
  hasRunningThreads(sessionId: ID): Promise<boolean>;

  /**
   * 获取会话的最后活动线程
   * @param sessionId 会话ID
   * @returns 最后活动线程或null
   */
  getLastActiveThreadForSession(sessionId: ID): Promise<Thread | null>;

  /**
   * 批量更新线程状态
   * @param threadIds 线程ID列表
   * @param status 新状态
   * @returns 更新的线程数量
   */
  batchUpdateThreadStatus(threadIds: ID[], status: ThreadStatus): Promise<number>;

  /**
   * 批量取消会话的活跃线程
   * @param sessionId 会话ID
   * @param reason 取消原因
   * @returns 取消的线程数量
   */
  batchCancelActiveThreadsForSession(sessionId: ID, reason?: string): Promise<number>;

  /**
   * 删除会话的所有线程
   * @param sessionId 会话ID
   * @returns 删除的线程数量
   */
  deleteAllThreadsForSession(sessionId: ID): Promise<number>;

  /**
   * 查找工作流的线程
   * @param workflowId 工作流ID
   * @returns 线程列表
   */
  findThreadsForWorkflow(workflowId: ID): Promise<Thread[]>;

  /**
   * 查找超时的线程
   * @param timeoutHours 超时小时数
   * @returns 超时线程列表
   */
  findTimedOutThreads(timeoutHours: number): Promise<Thread[]>;

  /**
   * 查找可重试的失败线程
   * @param maxRetryCount 最大重试次数
   * @returns 可重试的失败线程列表
   */
  findRetryableFailedThreads(maxRetryCount: number): Promise<Thread[]>;

  /**
   * 获取线程执行统计
   * @param threadId 线程ID
   * @returns 执行统计信息
   */
  getThreadExecutionStats(threadId: ID): Promise<any>;
}