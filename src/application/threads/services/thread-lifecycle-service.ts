/**
 * 线程生命周期服务
 * 
 * 负责线程的创建、启动、暂停、恢复、完成、取消等生命周期管理
 */

import { Thread } from '../../../domain/threads/entities/thread';
import { ThreadRepository } from '../../../domain/threads/repositories/thread-repository';
import { ThreadDomainService } from '../../../domain/threads/services/thread-domain-service';
import { SessionRepository } from '../../../domain/sessions/repositories/session-repository';
import { WorkflowRepository } from '../../../domain/workflow/repositories/workflow-repository';
import { ThreadStatus } from '../../../domain/threads/value-objects/thread-status';
import { ThreadPriority } from '../../../domain/threads/value-objects/thread-priority';
import { BaseApplicationService } from '../../common/base-application-service';
import { CreateThreadRequest, ThreadInfo } from '../dtos';
import { ILogger } from '../../../domain/common/types';

/**
 * 线程生命周期服务
 */
export class ThreadLifecycleService extends BaseApplicationService {
  constructor(
    private readonly threadRepository: ThreadRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly workflowRepository: WorkflowRepository,
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
          throw new Error(`会话不存在: ${request.sessionId}`);
        }

        // 验证工作流存在
        if (!request.workflowId) {
          throw new Error('工作流ID不能为空');
        }
        const workflowId = this.parseId(request.workflowId, '工作流ID');
        const workflow = await this.workflowRepository.findById(workflowId);
        if (!workflow) {
          throw new Error(`工作流不存在: ${request.workflowId}`);
        }

        // 转换请求参数
        const priority = request.priority ? ThreadPriority.fromNumber(request.priority) : undefined;

        // 验证线程创建的业务规则
        await this.threadDomainService.validateThreadCreation(
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

        return savedThread.threadId;
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

        // 验证线程启动的业务规则
        await this.threadDomainService.validateThreadStart(id);

        const thread = await this.threadRepository.findByIdOrFail(id);
        thread.start(user);

        const savedThread = await this.threadRepository.save(thread);
        return this.mapThreadToInfo(savedThread);
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

        // 验证线程暂停的业务规则
        await this.threadDomainService.validateThreadPause(id);

        const thread = await this.threadRepository.findByIdOrFail(id);
        thread.pause(user, reason);

        const savedThread = await this.threadRepository.save(thread);
        return this.mapThreadToInfo(savedThread);
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

        // 验证线程恢复的业务规则
        await this.threadDomainService.validateThreadResume(id);

        const thread = await this.threadRepository.findByIdOrFail(id);
        thread.resume(user, reason);

        const savedThread = await this.threadRepository.save(thread);
        return this.mapThreadToInfo(savedThread);
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

        // 验证线程完成的业务规则
        await this.threadDomainService.validateThreadCompletion(id);

        const thread = await this.threadRepository.findByIdOrFail(id);
        thread.complete(user, reason);

        const savedThread = await this.threadRepository.save(thread);
        return this.mapThreadToInfo(savedThread);
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

        // 验证线程失败的业务规则
        await this.threadDomainService.validateThreadFailure(id);

        const thread = await this.threadRepository.findByIdOrFail(id);
        thread.fail(errorMessage, user, reason);

        const savedThread = await this.threadRepository.save(thread);
        return this.mapThreadToInfo(savedThread);
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

        // 验证线程取消的业务规则
        await this.threadDomainService.validateThreadCancellation(id);

        const thread = await this.threadRepository.findByIdOrFail(id);
        thread.cancel(user, reason);

        const savedThread = await this.threadRepository.save(thread);
        return this.mapThreadToInfo(savedThread);
      },
      { threadId, userId, reason }
    );
  }

  /**
   * 执行线程（串行执行工作流）
   * @param threadId 线程ID
   * @param inputData 输入数据
   * @returns 执行结果
   */
  async executeThread(threadId: string, inputData: unknown): Promise<any> {
    return this.executeBusinessOperation(
      '线程执行',
      async () => {
        const id = this.parseId(threadId, '线程ID');

        const thread = await this.threadRepository.findByIdOrFail(id);
        
        // 验证线程启动的业务规则
        await this.threadDomainService.validateThreadStart(id);

        // 执行线程（这里应该调用工作流执行服务）
        // 暂时返回模拟结果
        const result = {
          success: true,
          data: inputData,
          message: '线程执行完成'
        };

        // 保存线程状态
        await this.threadRepository.save(thread);

        return result;
      },
      { threadId }
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