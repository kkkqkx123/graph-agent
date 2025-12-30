/**
 * 线程管理服务
 * 
 * 负责线程的查询、列表、存在性检查和优先级更新等管理功能
 */

import { Thread, ThreadRepository, ThreadPriority } from '../../../domain/threads';
import { BaseApplicationService } from '../../common/base-application-service';
import { ILogger, ID } from '../../../domain/common';

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
   * 获取线程
   * @param threadId 线程ID
   * @returns 线程领域对象
   */
  async getThread(threadId: string): Promise<Thread | null> {
    return this.executeGetOperation(
      '线程信息',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        return await this.threadRepository.findById(id);
      },
      { threadId }
    );
  }

  /**
   * 列出会话的线程
   * @param sessionId 会话ID
   * @returns 线程领域对象列表
   */
  async listThreadsForSession(sessionId: string): Promise<Thread[]> {
    return this.executeListOperation(
      '会话线程',
      async () => {
        const id = this.parseId(sessionId, '会话ID');
        return await this.threadRepository.findActiveThreadsForSession(id);
      },
      { sessionId }
    );
  }

  /**
   * 列出所有线程
   * @returns 线程领域对象列表
   */
  async listThreads(): Promise<Thread[]> {
    return this.executeListOperation(
      '线程',
      async () => {
        return await this.threadRepository.findAll();
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
   * @returns 更新后的线程领域对象
   */
  async updateThreadPriority(threadId: string, priority: number): Promise<Thread> {
    return this.executeUpdateOperation(
      '线程优先级',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        const threadPriority = ThreadPriority.fromNumber(priority);

        // 验证线程优先级更新的业务规则
        await this.validateThreadPriorityUpdate(id, threadPriority);

        const thread = await this.threadRepository.findByIdOrFail(id);
        thread.updatePriority(threadPriority);

        return await this.threadRepository.save(thread);
      },
      { threadId, priority }
    );
  }

  /**
   * 获取下一个待执行的线程
   * @param sessionId 会话ID（可选）
   * @returns 下一个待执行的线程领域对象
   */
  async getNextPendingThread(sessionId?: string): Promise<Thread | null> {
    return this.executeGetOperation(
      '下一个待执行线程',
      async () => {
        const id = sessionId ? this.parseId(sessionId, '会话ID') : undefined;
        return await this.threadRepository.getNextPendingThread(id);
      },
      { sessionId }
    );
  }

  /**
   * 获取最高优先级的待执行线程
   * @param sessionId 会话ID（可选）
   * @returns 最高优先级的待执行线程领域对象
   */
  async getHighestPriorityPendingThread(sessionId?: string): Promise<Thread | null> {
    return this.executeGetOperation(
      '最高优先级待执行线程',
      async () => {
        const id = sessionId ? this.parseId(sessionId, '会话ID') : undefined;
        return await this.threadRepository.getHighestPriorityPendingThread(id);
      },
      { sessionId }
    );
  }

  /**
   * 获取会话的最后活动线程
   * @param sessionId 会话ID
   * @returns 最后活动线程领域对象
   */
  async getLastActiveThreadForSession(sessionId: string): Promise<Thread | null> {
    return this.executeGetOperation(
      '最后活动线程',
      async () => {
        const id = this.parseId(sessionId, '会话ID');
        return await this.threadRepository.getLastActiveThreadForSession(id);
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
   * @returns 线程领域对象列表
   */
  async findThreadsForWorkflow(workflowId: string): Promise<Thread[]> {
    return this.executeListOperation(
      '工作流线程',
      async () => {
        const id = this.parseId(workflowId, '工作流ID');
        return await this.threadRepository.findThreadsForWorkflow(id);
      },
      { workflowId }
    );
  }

  /**
   * 查找失败的线程
   * @param sessionId 会话ID（可选）
   * @returns 失败线程领域对象列表
   */
  async findFailedThreads(sessionId?: string): Promise<Thread[]> {
    return this.executeListOperation(
      '失败线程',
      async () => {
        const id = sessionId ? this.parseId(sessionId, '会话ID') : undefined;
        return await this.threadRepository.findFailedThreads(id);
      },
      { sessionId }
    );
  }

  /**
   * 查找超时的线程
   * @param timeoutHours 超时小时数
   * @returns 超时线程领域对象列表
   */
  async findTimedOutThreads(timeoutHours: number): Promise<Thread[]> {
    return this.executeListOperation(
      '超时线程',
      async () => {
        return await this.threadRepository.findTimedOutThreads(timeoutHours);
      },
      { timeoutHours }
    );
  }

  /**
   * 查找可重试的失败线程
   * @param maxRetryCount 最大重试次数
   * @returns 可重试的失败线程领域对象列表
   */
  async findRetryableFailedThreads(maxRetryCount: number): Promise<Thread[]> {
    return this.executeListOperation(
      '可重试失败线程',
      async () => {
        return await this.threadRepository.findRetryableFailedThreads(maxRetryCount);
      },
      { maxRetryCount }
    );
  }
}