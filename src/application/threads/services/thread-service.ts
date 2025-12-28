/**
 * 线程应用服务
 *
 * 负责线程相关的业务逻辑编排和协调
 * 专注于应用层逻辑，不包含核心业务规则
 */

import { Thread, ThreadStatus, ThreadPriority, ThreadRepository } from '../../../domain/threads';
import { SessionRepository } from '../../../domain/sessions';
import { WorkflowRepository } from '../../../domain/workflow';
import { ID, ILogger } from '../../../domain/common';
import { CreateThreadRequest, ThreadInfo } from '../dtos';

/**
 * 线程应用服务
 */
export class ThreadService {
  constructor(
    private readonly threadRepository: ThreadRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly workflowRepository: WorkflowRepository,
    private readonly logger: ILogger
  ) { }

  /**
   * 验证线程创建的业务规则
   */
  private async validateThreadCreation(
    sessionId: ID,
    workflowId: ID,
    priority?: ThreadPriority
  ): Promise<void> {
    // 验证会话是否有活跃线程（Session负责多线程并行管理）
    const hasActiveThreads = await this.threadRepository.hasActiveThreads(sessionId);
    if (hasActiveThreads) {
      throw new Error('会话已有活跃线程，无法创建新线程');
    }

    // 验证优先级
    if (priority) {
      priority.validate();
    }
  }

  /**
   * 验证线程启动的业务规则
   */
  private async validateThreadStart(threadId: ID): Promise<void> {
    const thread = await this.threadRepository.findByIdOrFail(threadId);

    if (!thread.status.isPending()) {
      throw new Error('只能启动待执行状态的线程');
    }

    // 检查会话是否有其他运行中的线程（Session负责并行管理）
    const hasRunningThreads = await this.threadRepository.hasRunningThreads(thread.sessionId);
    if (hasRunningThreads) {
      throw new Error('会话已有运行中的线程，无法启动其他线程');
    }
  }

  /**
   * 验证线程暂停的业务规则
   */
  private async validateThreadPause(threadId: ID): Promise<void> {
    const thread = await this.threadRepository.findByIdOrFail(threadId);

    if (!thread.status.isRunning()) {
      throw new Error('只能暂停运行中的线程');
    }
  }

  /**
   * 验证线程恢复的业务规则
   */
  private async validateThreadResume(threadId: ID): Promise<void> {
    const thread = await this.threadRepository.findByIdOrFail(threadId);

    if (!thread.status.isPaused()) {
      throw new Error('只能恢复暂停状态的线程');
    }

    // 检查会话是否有其他运行中的线程（Session负责并行管理）
    const hasRunningThreads = await this.threadRepository.hasRunningThreads(thread.sessionId);
    if (hasRunningThreads) {
      throw new Error('会话已有运行中的线程，无法恢复其他线程');
    }
  }

  /**
   * 验证线程完成的业务规则
   */
  private async validateThreadCompletion(threadId: ID): Promise<void> {
    const thread = await this.threadRepository.findByIdOrFail(threadId);

    if (!thread.status.isActive()) {
      throw new Error('只能完成活跃状态的线程');
    }
  }

  /**
   * 验证线程失败的业务规则
   */
  private async validateThreadFailure(threadId: ID): Promise<void> {
    const thread = await this.threadRepository.findByIdOrFail(threadId);

    if (!thread.status.isActive()) {
      throw new Error('只能设置活跃状态的线程为失败状态');
    }
  }

  /**
   * 验证线程取消的业务规则
   */
  private async validateThreadCancellation(threadId: ID): Promise<void> {
    const thread = await this.threadRepository.findByIdOrFail(threadId);

    if (thread.status.isTerminal()) {
      throw new Error('无法取消已终止状态的线程');
    }
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
   * 创建线程
   * @param request 创建线程请求
   * @returns 创建的线程ID
   */
  async createThread(request: CreateThreadRequest): Promise<string> {
    try {
      this.logger.info('正在创建线程', {
        sessionId: request.sessionId,
        workflowId: request.workflowId
      });

      // 验证会话存在
      const sessionId = ID.fromString(request.sessionId);
      const session = await this.sessionRepository.findById(sessionId);
      if (!session) {
        throw new Error(`会话不存在: ${request.sessionId}`);
      }

      // 验证工作流存在
      const workflowId = ID.fromString(request.workflowId);
      const workflow = await this.workflowRepository.findById(workflowId);
      if (!workflow) {
        throw new Error(`工作流不存在: ${request.workflowId}`);
      }

      // 转换请求参数
      const priority = request.priority ? ThreadPriority.fromNumber(request.priority) : undefined;

      // 验证线程创建的业务规则
      await this.validateThreadCreation(
        sessionId,
        workflowId,
        priority
      );

      // 创建线程
      const thread = Thread.create(
        sessionId,
        workflowId,
        priority,
        request.title,
        request.description,
        request.metadata
      );

      // 保存线程
      const savedThread = await this.threadRepository.save(thread);

      this.logger.info('线程创建成功', { threadId: savedThread.threadId.toString() });

      return savedThread.threadId.toString();
    } catch (error) {
      this.logger.error('创建线程失败', error as Error);
      throw error;
    }
  }

  /**
   * 获取线程信息
   * @param threadId 线程ID
   * @returns 线程信息
   */
  async getThreadInfo(threadId: string): Promise<ThreadInfo | null> {
    try {
      const id = ID.fromString(threadId);
      const thread = await this.threadRepository.findById(id);

      if (!thread) {
        return null;
      }

      return this.mapThreadToInfo(thread);
    } catch (error) {
      this.logger.error('获取线程信息失败', error as Error);
      throw error;
    }
  }

  /**
   * 删除线程
   * @param threadId 线程ID
   * @returns 删除是否成功
   */
  async deleteThread(threadId: string): Promise<boolean> {
    try {
      const id = ID.fromString(threadId);
      const thread = await this.threadRepository.findById(id);

      if (!thread) {
        return false;
      }

      // 检查线程状态是否允许删除
      if (thread.status.isRunning()) {
        throw new Error('无法删除运行中的线程');
      }

      // 标记线程为已删除
      thread.markAsDeleted();
      await this.threadRepository.save(thread);

      this.logger.info('线程删除成功', { threadId });

      return true;
    } catch (error) {
      this.logger.error('删除线程失败', error as Error);
      throw error;
    }
  }

  /**
   * 列出会话的线程
   * @param sessionId 会话ID
   * @returns 线程信息列表
   */
  async listThreadsForSession(sessionId: string): Promise<ThreadInfo[]> {
    try {
      const id = ID.fromString(sessionId);
      const threads = await this.threadRepository.findActiveThreadsForSession(id);

      return threads.map(thread => this.mapThreadToInfo(thread));
    } catch (error) {
      this.logger.error('列出会话线程失败', error as Error);
      throw error;
    }
  }

  /**
   * 列出线程
   * @param filters 过滤条件
   * @param limit 限制数量
   * @returns 线程信息列表
   */
  async listThreads(filters?: Record<string, unknown>, limit?: number): Promise<ThreadInfo[]> {
    try {
      // 如果有会话ID过滤条件，使用专门的方法
      if (filters?.['sessionId']) {
        return await this.listThreadsForSession(filters['sessionId'] as string);
      }

      // 否则获取所有线程
      const threads = await this.threadRepository.findAll();
      let result = threads.map(thread => this.mapThreadToInfo(thread));

      // 应用其他过滤条件
      if (filters) {
        result = this.applyFilters(result, filters);
      }

      // 应用限制
      if (limit && limit > 0) {
        result = result.slice(0, limit);
      }

      return result;
    } catch (error) {
      this.logger.error('列出线程失败', error as Error);
      throw error;
    }
  }

  /**
   * 应用过滤条件
   * @param threads 线程列表
   * @param filters 过滤条件
   * @returns 过滤后的线程列表
   */
  private applyFilters(
    threads: ThreadInfo[],
    filters: Record<string, unknown>
  ): ThreadInfo[] {
    return threads.filter(thread => {
      for (const [key, value] of Object.entries(filters)) {
        switch (key) {
          case 'sessionId':
            if (thread.sessionId !== value) return false;
            break;
          case 'status':
            if (thread.status !== value) return false;
            break;
          case 'workflowId':
            if (thread.workflowId !== value) return false;
            break;
          case 'title':
            if (thread.title !== value) return false;
            break;
          case 'priority':
            if (thread.priority !== value) return false;
            break;
          default:
            // 忽略未知的过滤条件
            break;
        }
      }
      return true;
    });
  }

  /**
   * 检查线程是否存在
   * @param threadId 线程ID
   * @returns 是否存在
   */
  async threadExists(threadId: string): Promise<boolean> {
    try {
      const id = ID.fromString(threadId);
      return await this.threadRepository.exists(id);
    } catch (error) {
      this.logger.error('检查线程存在性失败', error as Error);
      throw error;
    }
  }

  /**
   * 启动线程
   * @param threadId 线程ID
   * @param userId 用户ID
   * @returns 启动后的线程信息
   */
  async startThread(threadId: string, userId?: string): Promise<ThreadInfo> {
    try {
      const id = ID.fromString(threadId);
      const user = userId ? ID.fromString(userId) : undefined;

      // 验证线程启动的业务规则
      await this.validateThreadStart(id);

      const thread = await this.threadRepository.findByIdOrFail(id);
      thread.start(user);

      const savedThread = await this.threadRepository.save(thread);
      return this.mapThreadToInfo(savedThread);
    } catch (error) {
      this.logger.error('启动线程失败', error as Error);
      throw error;
    }
  }

  /**
   * 执行线程（串行执行工作流）
   * @param threadId 线程ID
   * @param inputData 输入数据
   * @returns 执行结果
   */
  async executeThread(threadId: string, inputData: unknown): Promise<any> {
    try {
      const id = ID.fromString(threadId);

       const thread = await this.threadRepository.findByIdOrFail(id);
       
       // 验证线程启动的业务规则
       await this.validateThreadStart(id);

       // TODO: 集成执行服务执行线程
       // 使用执行服务执行线程的逻辑应该由基础设施层提供
       const result = {
         success: true,
         data: inputData,
         message: '线程执行完成'
       };

       this.logger.info('线程执行完成', { threadId, status: thread.status.toString() });

       return result;
     } catch (error) {
       this.logger.error('执行线程失败', error as Error);
       throw error;
     }
   }

  /**
   * 暂停线程
   * @param threadId 线程ID
   * @param userId 用户ID
   * @param reason 暂停原因
   * @returns 暂停后的线程信息
   */
  async pauseThread(threadId: string, userId?: string, reason?: string): Promise<ThreadInfo> {
    try {
      const id = ID.fromString(threadId);
      const user = userId ? ID.fromString(userId) : undefined;

       // 验证线程暂停的业务规则
       await this.validateThreadPause(id);

       const thread = await this.threadRepository.findByIdOrFail(id);
       thread.pause(user, reason);

       const savedThread = await this.threadRepository.save(thread);
       return this.mapThreadToInfo(savedThread);
     } catch (error) {
       this.logger.error('暂停线程失败', error as Error);
       throw error;
     }
   }

  /**
   * 恢复线程
   * @param threadId 线程ID
   * @param userId 用户ID
   * @param reason 恢复原因
   * @returns 恢复后的线程信息
   */
  async resumeThread(threadId: string, userId?: string, reason?: string): Promise<ThreadInfo> {
    try {
      const id = ID.fromString(threadId);
      const user = userId ? ID.fromString(userId) : undefined;

       // 验证线程恢复的业务规则
       await this.validateThreadResume(id);

       const thread = await this.threadRepository.findByIdOrFail(id);
       thread.resume(user, reason);

       const savedThread = await this.threadRepository.save(thread);
       return this.mapThreadToInfo(savedThread);
     } catch (error) {
       this.logger.error('恢复线程失败', error as Error);
       throw error;
     }
   }

  /**
   * 完成线程
   * @param threadId 线程ID
   * @param userId 用户ID
   * @param reason 完成原因
   * @returns 完成后的线程信息
   */
  async completeThread(threadId: string, userId?: string, reason?: string): Promise<ThreadInfo> {
    try {
      const id = ID.fromString(threadId);
      const user = userId ? ID.fromString(userId) : undefined;

      // 验证线程完成的业务规则
      await this.validateThreadCompletion(id);

      const thread = await this.threadRepository.findByIdOrFail(id);
      thread.complete(user, reason);

      const savedThread = await this.threadRepository.save(thread);
      return this.mapThreadToInfo(savedThread);
    } catch (error) {
      this.logger.error('完成线程失败', error as Error);
      throw error;
    }
  }

  /**
   * 失败线程
   * @param threadId 线程ID
   * @param errorMessage 错误信息
   * @param userId 用户ID
   * @param reason 失败原因
   * @returns 失败后的线程信息
   */
  async failThread(
    threadId: string,
    errorMessage: string,
    userId?: string,
    reason?: string
  ): Promise<ThreadInfo> {
    try {
      const id = ID.fromString(threadId);
      const user = userId ? ID.fromString(userId) : undefined;

      // 验证线程失败的业务规则
      await this.validateThreadFailure(id);

      const thread = await this.threadRepository.findByIdOrFail(id);
      thread.fail(errorMessage, user, reason);

      const savedThread = await this.threadRepository.save(thread);
      return this.mapThreadToInfo(savedThread);
    } catch (error) {
      this.logger.error('设置线程失败状态失败', error as Error);
      throw error;
    }
  }

  /**
   * 取消线程
   * @param threadId 线程ID
   * @param userId 用户ID
   * @param reason 取消原因
   * @returns 取消后的线程信息
   */
  async cancelThread(threadId: string, userId?: string, reason?: string): Promise<ThreadInfo> {
    try {
      const id = ID.fromString(threadId);
      const user = userId ? ID.fromString(userId) : undefined;

       // 验证线程取消的业务规则
       await this.validateThreadCancellation(id);

       const thread = await this.threadRepository.findByIdOrFail(id);
       thread.cancel(user, reason);

       const savedThread = await this.threadRepository.save(thread);
       return this.mapThreadToInfo(savedThread);
     } catch (error) {
       this.logger.error('取消线程失败', error as Error);
       throw error;
     }
   }

  /**
   * 更新线程优先级
   * @param threadId 线程ID
   * @param priority 新优先级
   * @returns 更新后的线程信息
   */
  async updateThreadPriority(threadId: string, priority: number): Promise<ThreadInfo> {
    try {
      const id = ID.fromString(threadId);
      const threadPriority = ThreadPriority.fromNumber(priority);

      // 验证线程优先级更新的业务规则
      await this.validateThreadPriorityUpdate(id, threadPriority);

      const thread = await this.threadRepository.findByIdOrFail(id);
      thread.updatePriority(threadPriority);

      const savedThread = await this.threadRepository.save(thread);
      return this.mapThreadToInfo(savedThread);
    } catch (error) {
      this.logger.error('更新线程优先级失败', error as Error);
      throw error;
    }
  }

  /**
   * 获取下一个待执行的线程
   * @param sessionId 会话ID
   * @returns 下一个待执行的线程信息
   */
  async getNextPendingThread(sessionId?: string): Promise<ThreadInfo | null> {
    try {
      const id = sessionId ? ID.fromString(sessionId) : undefined;
      const thread = await this.threadRepository.getNextPendingThread(id);

      if (!thread) {
        return null;
      }

      return this.mapThreadToInfo(thread);
    } catch (error) {
      this.logger.error('获取下一个待执行线程失败', error as Error);
      throw error;
    }
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
    try {
      const id = ID.fromString(sessionId);
      
      // 获取会话的所有线程
      const threads = await this.threadRepository.findActiveThreadsForSession(id);
      
      // 统计各种状态的线程数量
      const stats = {
        total: threads.length,
        pending: 0,
        running: 0,
        paused: 0,
        completed: 0,
        failed: 0,
        cancelled: 0
      };

      for (const thread of threads) {
        if (thread.status.isPending()) {
          stats.pending++;
        } else if (thread.status.isRunning()) {
          stats.running++;
        } else if (thread.status.isPaused()) {
          stats.paused++;
        } else if (thread.status.isCompleted()) {
          stats.completed++;
        } else if (thread.status.isFailed()) {
          stats.failed++;
        } else if (thread.status.isCancelled()) {
          stats.cancelled++;
        }
      }

      return stats;
    } catch (error) {
      this.logger.error('获取会话线程统计信息失败', error as Error);
      throw error;
    }
  }

  /**
   * 清理长时间运行的线程
   * @param maxRunningHours 最大运行小时数
   * @param userId 用户ID
   * @returns 清理的线程数量
   */
  async cleanupLongRunningThreads(maxRunningHours: number, userId?: string): Promise<number> {
    try {
      const user = userId ? ID.fromString(userId) : undefined;
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
    } catch (error) {
      this.logger.error('清理长时间运行线程失败', error as Error);
      throw error;
    }
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