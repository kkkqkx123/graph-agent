/**
 * 线程管理服务
 * 
 * 负责线程的查询、列表、存在性检查和优先级更新等管理功能
 */

import { Thread } from '../../../domain/threads/entities/thread';
import { ThreadRepository } from '../../../domain/threads/repositories/thread-repository';
import { ThreadPriority } from '../../../domain/threads/value-objects/thread-priority';
import { BaseApplicationService } from '../../common/base-application-service';
import { ThreadInfo } from '../dtos';
import { ILogger } from '../../../domain/common/types';
import { ID } from '../../../domain/common/value-objects/id';

/**
 * 线程管理服务
 */
export class ThreadManagementService extends BaseApplicationService {
  constructor(
    private readonly threadRepository: ThreadRepository,
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
   * 验证线程优先级更新的业务规则
   */
  private async validateThreadPriorityUpdate(threadId: ID, newPriority: ThreadPriority): Promise<void> {
    const thread = await this.threadRepository.findByIdOrFail(threadId);

    if (!thread.status.canOperate()) {
      throw new Error('无法更新非活跃状态线程的优先级');
    }

    newPriority.validate();
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
   * 列出会话的线程
   * @param sessionId 会话ID
   * @returns 线程信息列表
   */
  async listThreadsForSession(sessionId: string): Promise<ThreadInfo[]> {
    return this.executeListOperation(
      '会话线程',
      async () => {
        const id = this.parseId(sessionId, '会话ID');
        const threads = await this.threadRepository.findActiveThreadsForSession(id);

        return threads.map(thread => this.mapThreadToInfo(thread));
      },
      { sessionId }
    );
  }

  /**
   * 列出所有线程
   * @returns 线程信息列表
   */
  async listThreads(): Promise<ThreadInfo[]> {
    return this.executeListOperation(
      '线程',
      async () => {
        const threads = await this.threadRepository.findAll();
        return threads.map(thread => this.mapThreadToInfo(thread));
      }
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

        // 验证线程优先级更新的业务规则
        await this.validateThreadPriorityUpdate(id, threadPriority);

        const thread = await this.threadRepository.findByIdOrFail(id);
        thread.updatePriority(threadPriority);

        const savedThread = await this.threadRepository.save(thread);
        return this.mapThreadToInfo(savedThread);
      },
      { threadId, priority }
    );
  }

  /**
   * 获取下一个待执行的线程
   * @param sessionId 会话ID（可选）
   * @returns 下一个待执行的线程信息
   */
  async getNextPendingThread(sessionId?: string): Promise<ThreadInfo | null> {
    return this.executeGetOperation(
      '下一个待执行线程',
      async () => {
        const id = sessionId ? this.parseId(sessionId, '会话ID') : undefined;
        const thread = await this.threadRepository.getNextPendingThread(id);

        if (!thread) {
          return null;
        }

        return this.mapThreadToInfo(thread);
      },
      { sessionId }
    );
  }

  /**
   * 获取最高优先级的待执行线程
   * @param sessionId 会话ID（可选）
   * @returns 最高优先级的待执行线程信息
   */
  async getHighestPriorityPendingThread(sessionId?: string): Promise<ThreadInfo | null> {
    return this.executeGetOperation(
      '最高优先级待执行线程',
      async () => {
        const id = sessionId ? this.parseId(sessionId, '会话ID') : undefined;
        const thread = await this.threadRepository.getHighestPriorityPendingThread(id);

        if (!thread) {
          return null;
        }

        return this.mapThreadToInfo(thread);
      },
      { sessionId }
    );
  }

  /**
   * 获取会话的最后活动线程
   * @param sessionId 会话ID
   * @returns 最后活动线程信息
   */
  async getLastActiveThreadForSession(sessionId: string): Promise<ThreadInfo | null> {
    return this.executeGetOperation(
      '最后活动线程',
      async () => {
        const id = this.parseId(sessionId, '会话ID');
        const thread = await this.threadRepository.getLastActiveThreadForSession(id);

        if (!thread) {
          return null;
        }

        return this.mapThreadToInfo(thread);
      },
      { sessionId }
    );
  }

  /**
   * 获取会话的线程统计信息
   * @param sessionId 会话ID
   * @returns 线程统计信息
   */
  async getSessionThreadStats(sessionId: string): Promise<{
    total: number;
    pending: number;
    running: number;
    paused: number;
    completed: number;
    failed: number;
    cancelled: number;
  }> {
    return this.executeQueryOperation(
      '会话线程统计信息',
      async () => {
        const id = this.parseId(sessionId, '会话ID');
        return await this.threadRepository.getThreadExecutionStats(id);
      },
      { sessionId }
    );
  }

  /**
   * 查找工作流的线程
   * @param workflowId 工作流ID
   * @returns 线程信息列表
   */
  async findThreadsForWorkflow(workflowId: string): Promise<ThreadInfo[]> {
    return this.executeListOperation(
      '工作流线程',
      async () => {
        const id = this.parseId(workflowId, '工作流ID');
        const threads = await this.threadRepository.findThreadsForWorkflow(id);

        return threads.map(thread => this.mapThreadToInfo(thread));
      },
      { workflowId }
    );
  }

  /**
   * 查找失败的线程
   * @param sessionId 会话ID（可选）
   * @returns 失败线程信息列表
   */
  async findFailedThreads(sessionId?: string): Promise<ThreadInfo[]> {
    return this.executeListOperation(
      '失败线程',
      async () => {
        const id = sessionId ? this.parseId(sessionId, '会话ID') : undefined;
        const threads = await this.threadRepository.findFailedThreads(id);

        return threads.map(thread => this.mapThreadToInfo(thread));
      },
      { sessionId }
    );
  }

  /**
   * 查找超时的线程
   * @param timeoutHours 超时小时数
   * @returns 超时线程信息列表
   */
  async findTimedOutThreads(timeoutHours: number): Promise<ThreadInfo[]> {
    return this.executeListOperation(
      '超时线程',
      async () => {
        const threads = await this.threadRepository.findTimedOutThreads(timeoutHours);

        return threads.map(thread => this.mapThreadToInfo(thread));
      },
      { timeoutHours }
    );
  }

  /**
   * 查找可重试的失败线程
   * @param maxRetryCount 最大重试次数
   * @returns 可重试的失败线程信息列表
   */
  async findRetryableFailedThreads(maxRetryCount: number): Promise<ThreadInfo[]> {
    return this.executeListOperation(
      '可重试失败线程',
      async () => {
        const threads = await this.threadRepository.findRetryableFailedThreads(maxRetryCount);

        return threads.map(thread => this.mapThreadToInfo(thread));
      },
      { maxRetryCount }
    );
  }

  /**
   * 将线程领域对象映射为线程信息DTO
   */
  private mapThreadToInfo(thread: Thread): ThreadInfo {
    return {
      threadId: thread.threadId.toString(),
      sessionId: thread.sessionId.toString(),
      workflowId: thread.workflowId.toString(),
      status: thread.status.getValue(),
      priority: thread.priority.getNumericValue(),
      title: thread.title,
      description: thread.description,
      createdAt: thread.createdAt.toISOString(),
      startedAt: thread.startedAt?.toISOString(),
      completedAt: thread.completedAt?.toISOString(),
      errorMessage: thread.errorMessage,
      progress: thread.execution.progress,
      currentStep: thread.execution.currentStep
    };
  }
}