/**
 * 线程应用服务
 * 
 * 负责线程相关的业务逻辑编排和协调
 */

import { Thread } from '../../../domain/thread/entities/thread';
import { ThreadRepository } from '../../../domain/thread/repositories/thread-repository';
import { ThreadDomainService } from '../../../domain/thread/services/thread-domain-service';
import { SessionRepository } from '../../../domain/session/repositories/session-repository';
import { ID } from '../../../domain/common/value-objects/id';
import { ThreadId } from '../../../domain/common/value-objects/thread-id';
import { ThreadStatus } from '../../../domain/thread/value-objects/thread-status';
import { ThreadPriority } from '../../../domain/thread/value-objects/thread-priority';
import { DomainError } from '../../../domain/common/errors/domain-error';
import { ILogger } from '@shared/types/logger';

/**
 * 创建线程请求DTO
 */
export interface CreateThreadRequest {
  sessionId: string;
  workflowId?: string;
  priority?: number;
  title?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 线程信息DTO
 */
export interface ThreadInfo {
  threadId: string;
  sessionId: string;
  workflowId?: string;
  status: string;
  priority: number;
  title?: string;
  description?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
}

/**
 * 线程应用服务
 */
export class ThreadService {
  constructor(
    private readonly threadRepository: ThreadRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly threadDomainService: ThreadDomainService,
    private readonly logger: ILogger
  ) {}

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
        throw new DomainError(`会话不存在: ${request.sessionId}`);
      }

      // 转换请求参数
      const workflowId = request.workflowId ? ID.fromString(request.workflowId) : undefined;
      const priority = request.priority ? ThreadPriority.fromNumericValue(request.priority) : undefined;

      // 调用领域服务创建线程
      const thread = await this.threadDomainService.createThread(
        sessionId,
        workflowId,
        priority,
        request.title,
        request.description,
        request.metadata
      );

      this.logger.info('线程创建成功', { threadId: thread.threadId.toString() });

      return thread.threadId.toString();
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

      return {
        threadId: thread.threadId.toString(),
        sessionId: thread.sessionId.toString(),
        workflowId: thread.workflowId?.toString(),
        status: thread.status.toString(),
        priority: thread.priority.getNumericValue(),
        title: thread.title,
        description: thread.description,
        createdAt: thread.createdAt.toISOString(),
        startedAt: thread.startedAt?.toISOString(),
        completedAt: thread.completedAt?.toISOString(),
        errorMessage: thread.errorMessage
      };
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
        throw new DomainError('无法删除运行中的线程');
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
   * 列出所有线程
   * @param filters 过滤条件
   * @param limit 数量限制
   * @returns 线程信息列表
   */
  async listThreads(filters?: Record<string, unknown>, limit?: number): Promise<ThreadInfo[]> {
    try {
      const options: any = {};
      if (filters) {
        options.filters = filters;
      }
      if (limit) {
        options.limit = limit;
      }

      const threads = await this.threadRepository.find(options);

      return threads.map(thread => ({
        threadId: thread.threadId.toString(),
        sessionId: thread.sessionId.toString(),
        workflowId: thread.workflowId?.toString(),
        status: thread.status.toString(),
        priority: thread.priority.getNumericValue(),
        title: thread.title,
        description: thread.description,
        createdAt: thread.createdAt.toISOString(),
        startedAt: thread.startedAt?.toISOString(),
        completedAt: thread.completedAt?.toISOString(),
        errorMessage: thread.errorMessage
      }));
    } catch (error) {
      this.logger.error('列出线程失败', error as Error);
      throw error;
    }
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

      const thread = await this.threadDomainService.startThread(id, user);

      return {
        threadId: thread.threadId.toString(),
        sessionId: thread.sessionId.toString(),
        workflowId: thread.workflowId?.toString(),
        status: thread.status.toString(),
        priority: thread.priority.getNumericValue(),
        title: thread.title,
        description: thread.description,
        createdAt: thread.createdAt.toISOString(),
        startedAt: thread.startedAt?.toISOString(),
        completedAt: thread.completedAt?.toISOString(),
        errorMessage: thread.errorMessage
      };
    } catch (error) {
      this.logger.error('启动线程失败', error as Error);
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

      const thread = await this.threadDomainService.pauseThread(id, user, reason);

      return {
        threadId: thread.threadId.toString(),
        sessionId: thread.sessionId.toString(),
        workflowId: thread.workflowId?.toString(),
        status: thread.status.toString(),
        priority: thread.priority.getNumericValue(),
        title: thread.title,
        description: thread.description,
        createdAt: thread.createdAt.toISOString(),
        startedAt: thread.startedAt?.toISOString(),
        completedAt: thread.completedAt?.toISOString(),
        errorMessage: thread.errorMessage
      };
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

      const thread = await this.threadDomainService.resumeThread(id, user, reason);

      return {
        threadId: thread.threadId.toString(),
        sessionId: thread.sessionId.toString(),
        workflowId: thread.workflowId?.toString(),
        status: thread.status.toString(),
        priority: thread.priority.getNumericValue(),
        title: thread.title,
        description: thread.description,
        createdAt: thread.createdAt.toISOString(),
        startedAt: thread.startedAt?.toISOString(),
        completedAt: thread.completedAt?.toISOString(),
        errorMessage: thread.errorMessage
      };
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

      const thread = await this.threadDomainService.completeThread(id, user, reason);

      return {
        threadId: thread.threadId.toString(),
        sessionId: thread.sessionId.toString(),
        workflowId: thread.workflowId?.toString(),
        status: thread.status.toString(),
        priority: thread.priority.getNumericValue(),
        title: thread.title,
        description: thread.description,
        createdAt: thread.createdAt.toISOString(),
        startedAt: thread.startedAt?.toISOString(),
        completedAt: thread.completedAt?.toISOString(),
        errorMessage: thread.errorMessage
      };
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

      const thread = await this.threadDomainService.failThread(id, errorMessage, user, reason);

      return {
        threadId: thread.threadId.toString(),
        sessionId: thread.sessionId.toString(),
        workflowId: thread.workflowId?.toString(),
        status: thread.status.toString(),
        priority: thread.priority.getNumericValue(),
        title: thread.title,
        description: thread.description,
        createdAt: thread.createdAt.toISOString(),
        startedAt: thread.startedAt?.toISOString(),
        completedAt: thread.completedAt?.toISOString(),
        errorMessage: thread.errorMessage
      };
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

      const thread = await this.threadDomainService.cancelThread(id, user, reason);

      return {
        threadId: thread.threadId.toString(),
        sessionId: thread.sessionId.toString(),
        workflowId: thread.workflowId?.toString(),
        status: thread.status.toString(),
        priority: thread.priority.getNumericValue(),
        title: thread.title,
        description: thread.description,
        createdAt: thread.createdAt.toISOString(),
        startedAt: thread.startedAt?.toISOString(),
        completedAt: thread.completedAt?.toISOString(),
        errorMessage: thread.errorMessage
      };
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
      const threadPriority = ThreadPriority.fromNumericValue(priority);

      const thread = await this.threadDomainService.updateThreadPriority(id, threadPriority);

      return {
        threadId: thread.threadId.toString(),
        sessionId: thread.sessionId.toString(),
        workflowId: thread.workflowId?.toString(),
        status: thread.status.toString(),
        priority: thread.priority.getNumericValue(),
        title: thread.title,
        description: thread.description,
        createdAt: thread.createdAt.toISOString(),
        startedAt: thread.startedAt?.toISOString(),
        completedAt: thread.completedAt?.toISOString(),
        errorMessage: thread.errorMessage
      };
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
      const thread = await this.threadDomainService.getNextPendingThread(id);

      if (!thread) {
        return null;
      }

      return {
        threadId: thread.threadId.toString(),
        sessionId: thread.sessionId.toString(),
        workflowId: thread.workflowId?.toString(),
        status: thread.status.toString(),
        priority: thread.priority.getNumericValue(),
        title: thread.title,
        description: thread.description,
        createdAt: thread.createdAt.toISOString(),
        startedAt: thread.startedAt?.toISOString(),
        completedAt: thread.completedAt?.toISOString(),
        errorMessage: thread.errorMessage
      };
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
      return await this.threadDomainService.getSessionThreadStats(id);
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
      return await this.threadDomainService.cleanupLongRunningThreads(maxRunningHours, user);
    } catch (error) {
      this.logger.error('清理长时间运行线程失败', error as Error);
      throw error;
    }
  }

  /**
   * 重试失败的线程
   * @param threadId 线程ID
   * @param userId 用户ID
   * @returns 重试后的线程信息
   */
  async retryFailedThread(threadId: string, userId?: string): Promise<ThreadInfo> {
    try {
      const id = ID.fromString(threadId);
      const user = userId ? ID.fromString(userId) : undefined;

      const thread = await this.threadDomainService.retryFailedThread(id, user);

      return {
        threadId: thread.threadId.toString(),
        sessionId: thread.sessionId.toString(),
        workflowId: thread.workflowId?.toString(),
        status: thread.status.toString(),
        priority: thread.priority.getNumericValue(),
        title: thread.title,
        description: thread.description,
        createdAt: thread.createdAt.toISOString(),
        startedAt: thread.startedAt?.toISOString(),
        completedAt: thread.completedAt?.toISOString(),
        errorMessage: thread.errorMessage
      };
    } catch (error) {
      this.logger.error('重试失败线程失败', error as Error);
      throw error;
    }
  }

  /**
   * 批量取消会话的所有活跃线程
   * @param sessionId 会话ID
   * @param userId 用户ID
   * @param reason 取消原因
   * @returns 取消的线程数量
   */
  async cancelAllActiveThreads(sessionId: string, userId?: string, reason?: string): Promise<number> {
    try {
      const id = ID.fromString(sessionId);
      const user = userId ? ID.fromString(userId) : undefined;

      return await this.threadDomainService.cancelAllActiveThreads(id, user, reason);
    } catch (error) {
      this.logger.error('批量取消活跃线程失败', error as Error);
      throw error;
    }
  }
}