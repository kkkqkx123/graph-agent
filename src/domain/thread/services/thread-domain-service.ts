import { Thread } from '../entities/thread';
import { ThreadRepository } from '../repositories/thread-repository';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { ThreadStatus } from '../value-objects/thread-status';
import { ThreadPriority } from '../value-objects/thread-priority';
import { DomainError } from '../../common/errors/domain-error';
import type { ThreadProps } from '../entities/thread';

/**
 * 线程领域服务
 * 
 * 提供线程相关的业务逻辑和规则
 */
export class ThreadDomainService {
  /**
   * 构造函数
   * @param threadRepository 线程仓储
   */
  constructor(private readonly threadRepository: ThreadRepository) {}

  /**
   * 创建新线程
   * @param sessionId 会话ID
   * @param workflowId 工作流ID
   * @param priority 线程优先级
   * @param title 线程标题
   * @param description 线程描述
   * @param metadata 元数据
   * @returns 新线程
   */
  async createThread(
    sessionId: ID,
    workflowId?: ID,
    priority?: ThreadPriority,
    title?: string,
    description?: string,
    metadata?: Record<string, unknown>
  ): Promise<Thread> {
    // 验证会话是否存在活跃线程（根据业务规则）
    const hasActiveThreads = await this.threadRepository.hasActiveThreads(sessionId);
    if (hasActiveThreads) {
      throw new DomainError('会话已有活跃线程，无法创建新线程');
    }

    // 创建线程
    const thread = Thread.create(
      sessionId,
      workflowId,
      priority,
      title,
      description,
      metadata
    );

    // 保存线程
    return await this.threadRepository.save(thread);
  }

  /**
   * 启动线程
   * @param threadId 线程ID
   * @param userId 操作用户ID
   * @returns 启动后的线程
   */
  async startThread(threadId: ID, userId?: ID): Promise<Thread> {
    const thread = await this.threadRepository.findByIdOrFail(threadId);

    if (thread.status.isRunning()) {
      return thread; // 已经是运行中状态
    }

    if (!thread.status.isPending()) {
      throw new DomainError('只能启动待执行状态的线程');
    }

    // 检查会话是否有其他运行中的线程
    const runningThreads = await this.threadRepository.findRunningThreads({
      sessionId: thread.sessionId.toString()
    });

    if (runningThreads.length > 0) {
      throw new DomainError('会话已有运行中的线程，无法启动其他线程');
    }

    // 启动线程
    thread.start(userId);

    return await this.threadRepository.save(thread);
  }

  /**
   * 暂停线程
   * @param threadId 线程ID
   * @param userId 操作用户ID
   * @param reason 暂停原因
   * @returns 暂停后的线程
   */
  async pauseThread(
    threadId: ID,
    userId?: ID,
    reason?: string
  ): Promise<Thread> {
    const thread = await this.threadRepository.findByIdOrFail(threadId);

    if (thread.status.isPaused()) {
      return thread; // 已经是暂停状态
    }

    if (!thread.status.isRunning()) {
      throw new DomainError('只能暂停运行中的线程');
    }

    // 暂停线程
    thread.pause(userId, reason);

    return await this.threadRepository.save(thread);
  }

  /**
   * 恢复线程
   * @param threadId 线程ID
   * @param userId 操作用户ID
   * @param reason 恢复原因
   * @returns 恢复后的线程
   */
  async resumeThread(
    threadId: ID,
    userId?: ID,
    reason?: string
  ): Promise<Thread> {
    const thread = await this.threadRepository.findByIdOrFail(threadId);

    if (thread.status.isRunning()) {
      return thread; // 已经是运行中状态
    }

    if (!thread.status.isPaused()) {
      throw new DomainError('只能恢复暂停状态的线程');
    }

    // 检查会话是否有其他运行中的线程
    const runningThreads = await this.threadRepository.findRunningThreads({
      sessionId: thread.sessionId.toString()
    });

    if (runningThreads.length > 0) {
      throw new DomainError('会话已有运行中的线程，无法恢复其他线程');
    }

    // 恢复线程
    thread.resume(userId, reason);

    return await this.threadRepository.save(thread);
  }

  /**
   * 完成线程
   * @param threadId 线程ID
   * @param userId 操作用户ID
   * @param reason 完成原因
   * @returns 完成后的线程
   */
  async completeThread(
    threadId: ID,
    userId?: ID,
    reason?: string
  ): Promise<Thread> {
    const thread = await this.threadRepository.findByIdOrFail(threadId);

    if (thread.status.isCompleted()) {
      return thread; // 已经是完成状态
    }

    if (!thread.status.isActive()) {
      throw new DomainError('只能完成活跃状态的线程');
    }

    // 完成线程
    thread.complete(userId, reason);

    return await this.threadRepository.save(thread);
  }

  /**
   * 失败线程
   * @param threadId 线程ID
   * @param errorMessage 错误信息
   * @param userId 操作用户ID
   * @param reason 失败原因
   * @returns 失败后的线程
   */
  async failThread(
    threadId: ID,
    errorMessage: string,
    userId?: ID,
    reason?: string
  ): Promise<Thread> {
    const thread = await this.threadRepository.findByIdOrFail(threadId);

    if (thread.status.isFailed()) {
      return thread; // 已经是失败状态
    }

    if (!thread.status.isActive()) {
      throw new DomainError('只能设置活跃状态的线程为失败状态');
    }

    // 失败线程
    thread.fail(errorMessage, userId, reason);

    return await this.threadRepository.save(thread);
  }

  /**
   * 取消线程
   * @param threadId 线程ID
   * @param userId 操作用户ID
   * @param reason 取消原因
   * @returns 取消后的线程
   */
  async cancelThread(
    threadId: ID,
    userId?: ID,
    reason?: string
  ): Promise<Thread> {
    const thread = await this.threadRepository.findByIdOrFail(threadId);

    if (thread.status.isCancelled()) {
      return thread; // 已经是取消状态
    }

    if (thread.status.isTerminal()) {
      throw new DomainError('无法取消已终止状态的线程');
    }

    // 取消线程
    thread.cancel(userId, reason);

    return await this.threadRepository.save(thread);
  }

  /**
   * 更新线程优先级
   * @param threadId 线程ID
   * @param newPriority 新优先级
   * @param userId 操作用户ID
   * @returns 更新后的线程
   */
  async updateThreadPriority(
    threadId: ID,
    newPriority: ThreadPriority,
    userId?: ID
  ): Promise<Thread> {
    const thread = await this.threadRepository.findByIdOrFail(threadId);

    if (!thread.status.canOperate()) {
      throw new DomainError('无法更新非活跃状态线程的优先级');
    }

    // 更新优先级
    thread.updatePriority(newPriority);

    return await this.threadRepository.save(thread);
  }

  /**
   * 获取下一个待执行的线程
   * @param sessionId 会话ID
   * @returns 下一个待执行的线程或null
   */
  async getNextPendingThread(sessionId?: ID): Promise<Thread | null> {
    const options: any = {};
    if (sessionId) {
      options.sessionId = sessionId.toString();
    }

    return await this.threadRepository.getHighestPriorityPendingThread(options);
  }

  /**
   * 获取会话的线程执行统计信息
   * @param sessionId 会话ID
   * @returns 线程执行统计信息
   */
  async getSessionThreadStats(sessionId: ID): Promise<{
    total: number;
    pending: number;
    running: number;
    paused: number;
    completed: number;
    failed: number;
    cancelled: number;
  }> {
    return await this.threadRepository.getThreadExecutionStats(sessionId);
  }

  /**
   * 清理长时间运行的线程
   * @param maxRunningHours 最大运行时间（小时）
   * @param userId 操作用户ID
   * @returns 清理的线程数量
   */
  async cleanupLongRunningThreads(
    maxRunningHours: number,
    userId?: ID
  ): Promise<number> {
    const runningThreads = await this.threadRepository.findRunningThreads();
    let cleanedCount = 0;

    for (const thread of runningThreads) {
      if (thread.startedAt) {
        const now = new Date();
        const runningHours = (now.getTime() - thread.startedAt.getMilliseconds()) / (1000 * 60 * 60);
        
        if (runningHours > maxRunningHours) {
          try {
            // 取消长时间运行的线程
            thread.cancel(userId, `线程运行时间超过${maxRunningHours}小时，自动取消`);
            await this.threadRepository.save(thread);
            cleanedCount++;
          } catch (error) {
            console.error(`清理长时间运行线程失败: ${thread.threadId}`, error);
          }
        }
      }
    }

    return cleanedCount;
  }

  /**
   * 重试失败的线程
   * @param threadId 线程ID
   * @param userId 操作用户ID
   * @returns 重试后的线程
   */
  async retryFailedThread(threadId: ID, userId?: ID): Promise<Thread> {
    const thread = await this.threadRepository.findByIdOrFail(threadId);

    if (!thread.status.isFailed()) {
      throw new DomainError('只能重试失败状态的线程');
    }

    // 检查会话是否有其他运行中的线程
    const runningThreads = await this.threadRepository.findRunningThreads({
      sessionId: thread.sessionId.toString()
    });

    if (runningThreads.length > 0) {
      throw new DomainError('会话已有运行中的线程，无法重试其他线程');
    }

    // 重置线程状态为待执行
    const newProps: ThreadProps = {
      id: thread.threadId,
      sessionId: thread.sessionId,
      workflowId: thread.workflowId,
      status: ThreadStatus.pending(),
      priority: thread.priority,
      title: thread.title,
      description: thread.description,
      metadata: { ...thread.metadata },
      createdAt: thread.createdAt,
      updatedAt: Timestamp.now(),
      version: thread.version.nextPatch(),
      startedAt: undefined,
      completedAt: undefined,
      errorMessage: undefined,
      isDeleted: false
    };

    const retriedThread = Thread.fromProps(newProps);

    return await this.threadRepository.save(retriedThread);
  }

  /**
   * 批量取消会话的所有活跃线程
   * @param sessionId 会话ID
   * @param userId 操作用户ID
   * @param reason 取消原因
   * @returns 取消的线程数量
   */
  async cancelAllActiveThreads(
    sessionId: ID,
    userId?: ID,
    reason?: string
  ): Promise<number> {
    const activeThreads = await this.threadRepository.findActiveThreads({
      sessionId: sessionId.toString()
    });
    let cancelledCount = 0;

    for (const thread of activeThreads) {
      try {
        if (!thread.status.isTerminal()) {
          thread.cancel(userId, reason || '批量取消所有活跃线程');
          await this.threadRepository.save(thread);
          cancelledCount++;
        }
      } catch (error) {
        console.error(`取消线程失败: ${thread.threadId}`, error);
      }
    }

    return cancelledCount;
  }
}