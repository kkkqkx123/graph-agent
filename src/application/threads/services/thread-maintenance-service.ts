/**
 * 线程维护服务
 * 
 * 负责线程的删除、清理、重试和批量操作等维护功能
 */

import { Thread } from '../../../domain/threads/entities/thread';
import { ThreadRepository } from '../../../domain/threads/repositories/thread-repository';
import { ThreadDomainService } from '../../../domain/threads/services/thread-domain-service';
import { DomainError } from '../../../domain/common/errors/domain-error';
import { BaseApplicationService } from '../../common/base-application-service';
import { ThreadInfo, ThreadStatistics } from '../dtos';
import { ILogger } from '@shared/types/logger';

/**
 * 线程维护服务
 */
export class ThreadMaintenanceService extends BaseApplicationService {
  constructor(
    private readonly threadRepository: ThreadRepository,
    private readonly threadDomainService: ThreadDomainService,
    logger: ILogger
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
        if (thread.status.isRunning()) {
          throw new DomainError('无法删除运行中的线程');
        }

        // 标记线程为已删除
        thread.markAsDeleted();
        await this.threadRepository.save(thread);

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
        return await this.threadDomainService.cleanupLongRunningThreads(maxRunningHours, user);
      },
      { maxRunningHours, userId }
    );
  }

  /**
   * 重试失败的线程
   * @param threadId 线程ID
   * @param userId 用户ID
   * @returns 重试后的线程信息
   */
  async retryFailedThread(threadId: string, userId?: string): Promise<ThreadInfo> {
    return this.executeUpdateOperation(
      '线程',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        const user = this.parseOptionalId(userId, '用户ID');

        const thread = await this.threadDomainService.retryFailedThread(id, user);
        return this.mapThreadToInfo(thread);
      },
      { threadId, userId }
    );
  }

  /**
   * 批量取消会话的所有活跃线程
   * @param sessionId 会话ID
   * @param userId 用户ID
   * @param reason 取消原因
   * @returns 取消的线程数量
   */
  async cancelAllActiveThreads(sessionId: string, userId?: string, reason?: string): Promise<number> {
    return this.executeBusinessOperation(
      '批量取消活跃线程',
      async () => {
        const id = this.parseId(sessionId, '会话ID');
        const user = this.parseOptionalId(userId, '用户ID');

        return await this.threadDomainService.cancelAllActiveThreads(id, user, reason);
      },
      { sessionId, userId, reason }
    );
  }

  /**
   * 获取会话的线程统计信息
   * @param sessionId 会话ID
   * @returns 线程统计信息
   */
  async getSessionThreadStats(sessionId: string): Promise<ThreadStatistics> {
    return this.executeQueryOperation(
      '会话线程统计信息',
      async () => {
        const id = this.parseId(sessionId, '会话ID');
        return await this.threadDomainService.getSessionThreadStats(id);
      },
      { sessionId }
    );
  }

  /**
   * 将线程领域对象映射为线程信息DTO
   */
  private mapThreadToInfo(thread: Thread): ThreadInfo {
    return {
      threadId: thread.threadId.toString(),
      sessionId: thread.sessionId.toString(),
      workflowId: thread.workflowId?.toString(),
      status: thread.status.getValue(),
      priority: thread.priority.getNumericValue(),
      title: thread.title,
      description: thread.description,
      createdAt: thread.createdAt.getDate().toISOString(),
      startedAt: thread.startedAt?.getDate().toISOString(),
      completedAt: thread.completedAt?.getDate().toISOString(),
      errorMessage: thread.errorMessage
    };
  }
}