/**
 * 线程维护服务
 *
 * 负责线程的删除、清理和批量操作等维护功能
 */

import { injectable, inject } from 'inversify';
import { Thread, IThreadRepository, ThreadStatus } from '../../domain/threads';
import { BaseService } from '../common/base-service';
import { ILogger } from '../../domain/common';
import { TYPES } from '../../di/service-keys';

/**
 * 线程维护服务
 */
@injectable()
export class ThreadMaintenance extends BaseService {
  constructor(
    @inject(TYPES.ThreadRepository) private readonly threadRepository: IThreadRepository,
    @inject(TYPES.Logger) logger: ILogger
  ) {
    super(logger);
  }

  /**
   * 获取服务名称
   */
  protected getServiceName(): string {
    return '线程维护';
  }

  /**
   * 删除线程
   * @param threadId 线程ID
   * @returns 删除是否成功
   */
  async deleteThread(threadId: string): Promise<boolean> {
    return this.executeDeleteOperation(
      '线程',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        const thread = await this.threadRepository.findById(id);

        if (!thread) {
          return false;
        }

        // 检查线程状态是否允许删除
        if (thread.isRunning()) {
          throw new Error('无法删除运行中的线程');
        }

        // 标记线程为已删除
        const deletedThread = thread.markAsDeleted();
        await this.threadRepository.save(deletedThread);

        return true;
      },
      { threadId }
    );
  }

  /**
   * 清理长时间运行的线程
   * @param maxRunningHours 最大运行小时数
   * @param userId 用户ID
   * @returns 清理的线程数量
   */
  async cleanupLongRunningThreads(maxRunningHours: number, userId?: string): Promise<number> {
    return this.executeCleanupOperation(
      '长时间运行线程',
      async () => {
        const user = this.parseOptionalId(userId, '用户ID');
        const threads = await this.threadRepository.findThreadsNeedingCleanup(maxRunningHours);
        let cleanedCount = 0;

        for (const thread of threads) {
          try {
            thread.cancel(user, `线程运行时间超过${maxRunningHours}小时，自动取消`);
            await this.threadRepository.save(thread);
            cleanedCount++;
          } catch (error) {
            this.logger.error(`清理长时间运行线程失败: ${thread.threadId}`, error as Error);
          }
        }

        return cleanedCount;
      },
      { maxRunningHours, userId }
    );
  }

  /**
   * 批量更新线程状态
   * @param threadIds 线程ID列表
   * @param status 新状态
   * @returns 更新的线程数量
   */
  async batchUpdateThreadStatus(threadIds: string[], status: string): Promise<number> {
    return this.executeBusinessOperation(
      '批量更新线程状态',
      async () => {
        const ids = threadIds.map(id => this.parseId(id, '线程ID'));
        const threadStatus = ThreadStatus.fromString(status);

        // 验证批量状态更新
        // TODO: 实现批量状态更新验证逻辑
        // await this.threadDomainService.validateBatchStatusUpdate(ids, threadStatus);

        return await this.threadRepository.batchUpdateThreadStatus(ids, threadStatus);
      },
      { threadIds, status }
    );
  }

  /**
   * 批量取消会话的活跃线程
   * @param sessionId 会话ID
   * @param reason 取消原因
   * @param userId 用户ID
   * @returns 取消的线程数量
   */
  async batchCancelActiveThreadsForSession(
    sessionId: string,
    reason?: string,
    userId?: string
  ): Promise<number> {
    return this.executeBusinessOperation(
      '批量取消会话活跃线程',
      async () => {
        const id = this.parseId(sessionId, '会话ID');
        const user = this.parseOptionalId(userId, '用户ID');

        return await this.threadRepository.batchCancelActiveThreadsForSession(id, reason);
      },
      { sessionId, reason, userId }
    );
  }

  /**
   * 删除会话的所有线程
   * @param sessionId 会话ID
   * @returns 删除的线程数量
   */
  async deleteAllThreadsForSession(sessionId: string): Promise<number> {
    const deletedCount = await this.executeBusinessOperation(
      '删除会话所有线程',
      async () => {
        const id = this.parseId(sessionId, '会话ID');

        // 检查是否有运行中的线程
        const hasRunningThreads = await this.threadRepository.hasRunningThreads(id);
        if (hasRunningThreads) {
          throw new Error('无法删除有运行中线程的会话');
        }

        return await this.threadRepository.deleteAllThreadsForSession(id);
      },
      { sessionId }
    );

    return deletedCount;
  }

  /**
   * 重试失败的线程
   * @param threadId 线程ID
   * @param userId 用户ID
   * @returns 重试后的线程领域对象
   */
  async retryFailedThread(threadId: string, userId?: string): Promise<Thread> {
    return this.executeUpdateOperation(
      '失败线程重试',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        const user = this.parseOptionalId(userId, '用户ID');

        const thread = await this.threadRepository.findByIdOrFail(id);

        if (!thread.isFailed()) {
          throw new Error('只能重试失败状态的线程');
        }

        // 验证重试条件
        // TODO: 实现线程重试验证逻辑
        // await this.threadDomainService.validateThreadRetry(id);

        // 重置线程状态为待执行
        const startedThread = thread.start(); // 先启动
        const pausedThread = startedThread.pause(); // 再暂停，表示准备重试

        return await this.threadRepository.save(pausedThread);
      },
      { threadId, userId }
    );
  }

  /**
   * 批量重试失败的线程
   * @param threadIds 线程ID列表
   * @param userId 用户ID
   * @returns 重试成功的线程数量
   */
  async batchRetryFailedThreads(threadIds: string[], userId?: string): Promise<number> {
    return this.executeBusinessOperation(
      '批量重试失败线程',
      async () => {
        const user = this.parseOptionalId(userId, '用户ID');
        let retryCount = 0;

        for (const threadId of threadIds) {
          try {
            await this.retryFailedThread(threadId, user?.toString());
            retryCount++;
          } catch (error) {
            this.logger.error(`重试失败线程出错: ${threadId}`, error as Error);
          }
        }

        return retryCount;
      },
      { threadIds, userId }
    );
  }

  /**
   * 清理已删除的线程
   * @param olderThanDays 清理多少天前的已删除线程
   * @returns 清理的线程数量
   */
  async cleanupDeletedThreads(olderThanDays: number): Promise<number> {
    return this.executeCleanupOperation(
      '已删除线程',
      async () => {
        // 这里需要实现查找已删除线程的逻辑
        // 当前ThreadRepository接口没有提供这个方法，需要扩展
        // 暂时返回0，实际实现需要添加相应的方法
        this.logger.warn('cleanupDeletedThreads方法需要ThreadRepository提供相应支持');
        return 0;
      },
      { olderThanDays }
    );
  }

  /**
   * 获取线程维护统计信息
   * @param sessionId 会话ID（可选）
   * @returns 维护统计信息
   */
  async getThreadMaintenanceStats(sessionId?: string): Promise<{
    total: number;
    active: number;
    running: number;
    failed: number;
    longRunning: number;
    needsCleanup: number;
  }> {
    return this.executeQueryOperation(
      '线程维护统计信息',
      async () => {
        const id = sessionId ? this.parseId(sessionId, '会话ID') : undefined;

        // 获取基础统计信息
        const baseStats = id
          ? await this.threadRepository.getThreadExecutionStats(id)
          : {
              total: 0,
              pending: 0,
              running: 0,
              paused: 0,
              completed: 0,
              failed: 0,
              cancelled: 0,
            };

        // 获取需要清理的线程数量
        const needsCleanupThreads = await this.threadRepository.findThreadsNeedingCleanup(24); // 24小时
        const needsCleanup = id
          ? needsCleanupThreads.filter(t => t.sessionId.equals(id)).length
          : needsCleanupThreads.length;

        // 获取长时间运行的线程数量
        const longRunningThreads = await this.threadRepository.findThreadsNeedingCleanup(12); // 12小时
        const longRunning = id
          ? longRunningThreads.filter(t => t.sessionId.equals(id)).length
          : longRunningThreads.length;

        return {
          total: baseStats.total,
          active: baseStats.pending + baseStats.running + baseStats.paused,
          running: baseStats.running,
          failed: baseStats.failed,
          longRunning,
          needsCleanup,
        };
      },
      { sessionId }
    );
  }
}
