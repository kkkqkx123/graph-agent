/**
 * 线程生命周期服务
 * 
 * 负责线程的创建、启动、暂停、恢复、完成、失败和取消等生命周期管理
 */

import { Thread } from '../../../domain/threads/entities/thread';
import { ThreadRepository } from '../../../domain/threads/repositories/thread-repository';
import { SessionRepository } from '../../../domain/sessions/repositories/session-repository';
import { ThreadDomainService } from '../../../domain/threads/services/thread-domain-service';
import { ThreadPriority } from '../../../domain/threads/value-objects/thread-priority';
import { DomainError } from '../../../domain/common/errors/domain-error';
import { BaseApplicationService } from '../../common/base-application-service';
import { CreateThreadRequest, ThreadInfo } from '../dtos';
import { ILogger } from '../../../domain/common/types/logger-types';

/**
 * 线程生命周期服务
 */
export class ThreadLifecycleService extends BaseApplicationService {
  constructor(
    private readonly threadRepository: ThreadRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly threadDomainService: ThreadDomainService,
    logger: ILogger
  ) {
    super(logger);
  }

  /**
   * 获取服务名称
   */
  protected getServiceName(): string {
    return '线程生命周期';
  }

  /**
   * 创建线程
   * @param request 创建线程请求
   * @returns 创建的线程ID
   */
  async createThread(request: CreateThreadRequest): Promise<string> {
    return this.executeCreateOperation(
      '线程',
      async () => {
        // 验证会话存在
        const sessionId = this.parseId(request.sessionId, '会话ID');
        const session = await this.sessionRepository.findById(sessionId);
        if (!session) {
          throw new DomainError(`会话不存在: ${request.sessionId}`);
        }

        // 转换请求参数
        const workflowId = this.parseOptionalId(request.workflowId, '工作流ID');
        const priority = request.priority ? ThreadPriority.fromNumber(request.priority) : undefined;

        // 调用领域服务创建线程
        const thread = await this.threadDomainService.createThread(
          sessionId,
          workflowId,
          priority,
          request.title,
          request.description,
          request.metadata
        );

        return thread.threadId;
      },
      { sessionId: request.sessionId, workflowId: request.workflowId }
    );
  }

  /**
   * 启动线程
   * @param threadId 线程ID
   * @param userId 用户ID
   * @returns 启动后的线程信息
   */
  async startThread(threadId: string, userId?: string): Promise<ThreadInfo> {
    return this.executeUpdateOperation(
      '线程',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        const user = this.parseOptionalId(userId, '用户ID');

        const thread = await this.threadDomainService.startThread(id, user);
        return this.mapThreadToInfo(thread);
      },
      { threadId, userId }
    );
  }

  /**
   * 暂停线程
   * @param threadId 线程ID
   * @param userId 用户ID
   * @param reason 暂停原因
   * @returns 暂停后的线程信息
   */
  async pauseThread(threadId: string, userId?: string, reason?: string): Promise<ThreadInfo> {
    return this.executeUpdateOperation(
      '线程',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        const user = this.parseOptionalId(userId, '用户ID');

        const thread = await this.threadDomainService.pauseThread(id, user, reason);
        return this.mapThreadToInfo(thread);
      },
      { threadId, userId, reason }
    );
  }

  /**
   * 恢复线程
   * @param threadId 线程ID
   * @param userId 用户ID
   * @param reason 恢复原因
   * @returns 恢复后的线程信息
   */
  async resumeThread(threadId: string, userId?: string, reason?: string): Promise<ThreadInfo> {
    return this.executeUpdateOperation(
      '线程',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        const user = this.parseOptionalId(userId, '用户ID');

        const thread = await this.threadDomainService.resumeThread(id, user, reason);
        return this.mapThreadToInfo(thread);
      },
      { threadId, userId, reason }
    );
  }

  /**
   * 完成线程
   * @param threadId 线程ID
   * @param userId 用户ID
   * @param reason 完成原因
   * @returns 完成后的线程信息
   */
  async completeThread(threadId: string, userId?: string, reason?: string): Promise<ThreadInfo> {
    return this.executeUpdateOperation(
      '线程',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        const user = this.parseOptionalId(userId, '用户ID');

        const thread = await this.threadDomainService.completeThread(id, user, reason);
        return this.mapThreadToInfo(thread);
      },
      { threadId, userId, reason }
    );
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
    return this.executeUpdateOperation(
      '线程',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        const user = this.parseOptionalId(userId, '用户ID');

        const thread = await this.threadDomainService.failThread(id, errorMessage, user, reason);
        return this.mapThreadToInfo(thread);
      },
      { threadId, errorMessage, userId, reason }
    );
  }

  /**
   * 取消线程
   * @param threadId 线程ID
   * @param userId 用户ID
   * @param reason 取消原因
   * @returns 取消后的线程信息
   */
  async cancelThread(threadId: string, userId?: string, reason?: string): Promise<ThreadInfo> {
    return this.executeUpdateOperation(
      '线程',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        const user = this.parseOptionalId(userId, '用户ID');

        const thread = await this.threadDomainService.cancelThread(id, user, reason);
        return this.mapThreadToInfo(thread);
      },
      { threadId, userId, reason }
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