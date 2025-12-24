/**
 * 线程管理服务
 * 
 * 负责线程的查询、列表、存在性检查、优先级更新和获取下一个待执行线程等管理功能
 */

import { Thread } from '../../../domain/threads/entities/thread';
import { ThreadRepository } from '../../../domain/threads/repositories/thread-repository';
import { ThreadDomainService } from '../../../domain/threads/services/thread-domain-service';
import { ThreadPriority } from '../../../domain/threads/value-objects/thread-priority';
import { BaseApplicationService } from '../../common/base-application-service';
import { ThreadInfo } from '../dtos';
import { ILogger } from '../../../domain/common/types/logger-types';

/**
 * 线程管理服务
 */
export class ThreadManagementService extends BaseApplicationService {
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
    return '线程管理';
  }

  /**
   * 获取线程信息
   * @param threadId 线程ID
   * @returns 线程信息
   */
  async getThreadInfo(threadId: string): Promise<ThreadInfo | null> {
    return this.executeGetOperation(
      '线程信息',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        const thread = await this.threadRepository.findById(id);

        if (!thread) {
          return null;
        }

        return this.mapThreadToInfo(thread);
      },
      { threadId }
    );
  }

  /**
  * 列出所有线程
  * @param filters 过滤条件
  * @param limit 数量限制
  * @returns 线程信息列表
  */
  async listThreads(filters?: Record<string, unknown>, limit?: number): Promise<ThreadInfo[]> {
    return this.executeListOperation(
      '线程',
      async () => {
        const options: any = {};
        if (filters) {
          options.filters = filters;
        }
        if (limit) {
          options.limit = limit;
        }

        const threads = await this.threadRepository.find(options);
        return threads.map(thread => this.mapThreadToInfo(thread));
      },
      { filters, limit }
    );
  }

  /**
   * 检查线程是否存在
   * @param threadId 线程ID
   * @returns 是否存在
   */
  async threadExists(threadId: string): Promise<boolean> {
    return this.executeCheckOperation(
      '线程',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        return await this.threadRepository.exists(id);
      },
      { threadId }
    );
  }

  /**
   * 更新线程优先级
   * @param threadId 线程ID
   * @param priority 新优先级
   * @returns 更新后的线程信息
   */
  async updateThreadPriority(threadId: string, priority: number): Promise<ThreadInfo> {
    return this.executeUpdateOperation(
      '线程优先级',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        const threadPriority = ThreadPriority.fromNumber(priority);

        const thread = await this.threadDomainService.updateThreadPriority(id, threadPriority);
        return this.mapThreadToInfo(thread);
      },
      { threadId, priority }
    );
  }

  /**
   * 获取下一个待执行的线程
   * @param sessionId 会话ID
   * @returns 下一个待执行的线程信息
   */
  async getNextPendingThread(sessionId?: string): Promise<ThreadInfo | null> {
    return this.executeGetOperation(
      '下一个待执行线程',
      async () => {
        const id = sessionId ? this.parseId(sessionId, '会话ID') : undefined;
        const thread = await this.threadDomainService.getNextPendingThread(id);

        if (!thread) {
          return null;
        }

        return this.mapThreadToInfo(thread);
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