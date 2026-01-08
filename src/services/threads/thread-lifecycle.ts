/**
 * 线程生命周期服务
 *
 * 负责线程的创建、启动、暂停、恢复、完成、取消等生命周期管理
 */

import { injectable, inject } from 'inversify';
import { Thread, IThreadRepository, ThreadStatus, ThreadPriority } from '../../domain/threads';
import { ISessionRepository } from '../../domain/sessions';
import { IWorkflowRepository } from '../../domain/workflow';
import { BaseApplicationService } from '../common/base-application-service';
import { ILogger, ID } from '../../domain/common';
import { TYPES } from '../../di/service-keys';

/**
 * 线程生命周期服务
 */
@injectable()
export class ThreadLifecycle extends BaseApplicationService {
  constructor(
    @inject(TYPES.ThreadRepository) private readonly threadRepository: IThreadRepository,
    @inject(TYPES.SessionRepository) private readonly sessionRepository: ISessionRepository,
    @inject(TYPES.WorkflowRepository) private readonly workflowRepository: IWorkflowRepository,
    @inject(TYPES.Logger) logger: ILogger
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
   * 创建线程
   * @param sessionId 会话ID
   * @param workflowId 工作流ID
   * @param priority 优先级
   * @param title 标题
   * @param description 描述
   * @param metadata 元数据
   * @returns 创建的线程领域对象
   */
  async createThread(
    sessionId: string,
    workflowId: string,
    priority?: number,
    title?: string,
    description?: string,
    metadata?: Record<string, unknown>
  ): Promise<Thread> {
    return this.executeBusinessOperation(
      '线程',
      async () => {
        // 验证会话存在
        const sessionObjId = this.parseId(sessionId, '会话ID');
        const session = await this.sessionRepository.findById(sessionObjId);
        if (!session) {
          throw new Error(`会话不存在: ${sessionId}`);
        }

        // 验证工作流存在
        const workflowObjId = this.parseId(workflowId, '工作流ID');
        const workflow = await this.workflowRepository.findById(workflowObjId);
        if (!workflow) {
          throw new Error(`工作流不存在: ${workflowId}`);
        }

        // 转换请求参数
        const threadPriority = priority ? ThreadPriority.fromNumber(priority) : undefined;

        // 验证线程创建的业务规则
        await this.validateThreadCreation(sessionObjId, workflowObjId, threadPriority);

        // 创建线程
        const thread = Thread.create(
          sessionObjId,
          workflowObjId,
          threadPriority,
          title,
          description,
          metadata
        );

        // 保存线程
        return await this.threadRepository.save(thread);
      },
      { sessionId, workflowId }
    );
  }

  /**
   * 启动线程
   * @param threadId 线程ID
   * @param userId 用户ID
   * @returns 启动后的线程领域对象
   */
  async startThread(threadId: string, userId?: string): Promise<Thread> {
    return this.executeUpdateOperation(
      '线程',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        const user = this.parseOptionalId(userId, '用户ID');

        // 验证线程启动的业务规则
        await this.validateThreadStart(id);

        const thread = await this.threadRepository.findByIdOrFail(id);
        thread.start(user);

        return await this.threadRepository.save(thread);
      },
      { threadId, userId }
    );
  }

  /**
   * 暂停线程
   * @param threadId 线程ID
   * @param userId 用户ID
   * @param reason 暂停原因
   * @returns 暂停后的线程领域对象
   */
  async pauseThread(threadId: string, userId?: string, reason?: string): Promise<Thread> {
    return this.executeUpdateOperation(
      '线程',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        const user = this.parseOptionalId(userId, '用户ID');

        // 验证线程暂停的业务规则
        await this.validateThreadPause(id);

        const thread = await this.threadRepository.findByIdOrFail(id);
        thread.pause(user, reason);

        return await this.threadRepository.save(thread);
      },
      { threadId, userId, reason }
    );
  }

  /**
   * 恢复线程
   * @param threadId 线程ID
   * @param userId 用户ID
   * @param reason 恢复原因
   * @returns 恢复后的线程领域对象
   */
  async resumeThread(threadId: string, userId?: string, reason?: string): Promise<Thread> {
    return this.executeUpdateOperation(
      '线程',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        const user = this.parseOptionalId(userId, '用户ID');

        // 验证线程恢复的业务规则
        await this.validateThreadResume(id);

        const thread = await this.threadRepository.findByIdOrFail(id);
        thread.resume(user, reason);

        return await this.threadRepository.save(thread);
      },
      { threadId, userId, reason }
    );
  }

  /**
   * 完成线程
   * @param threadId 线程ID
   * @param userId 用户ID
   * @param reason 完成原因
   * @returns 完成后的线程领域对象
   */
  async completeThread(threadId: string, userId?: string, reason?: string): Promise<Thread> {
    return this.executeUpdateOperation(
      '线程',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        const user = this.parseOptionalId(userId, '用户ID');

        // 验证线程完成的业务规则
        await this.validateThreadCompletion(id);

        const thread = await this.threadRepository.findByIdOrFail(id);
        thread.complete(user, reason);

        return await this.threadRepository.save(thread);
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
   * @returns 失败后的线程领域对象
   */
  async failThread(
    threadId: string,
    errorMessage: string,
    userId?: string,
    reason?: string
  ): Promise<Thread> {
    return this.executeUpdateOperation(
      '线程',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        const user = this.parseOptionalId(userId, '用户ID');

        // 验证线程失败的业务规则
        await this.validateThreadFailure(id);

        const thread = await this.threadRepository.findByIdOrFail(id);
        thread.fail(errorMessage, user, reason);

        return await this.threadRepository.save(thread);
      },
      { threadId, errorMessage, userId, reason }
    );
  }

  /**
   * 取消线程
   * @param threadId 线程ID
   * @param userId 用户ID
   * @param reason 取消原因
   * @returns 取消后的线程领域对象
   */
  async cancelThread(threadId: string, userId?: string, reason?: string): Promise<Thread> {
    return this.executeUpdateOperation(
      '线程',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        const user = this.parseOptionalId(userId, '用户ID');

        // 验证线程取消的业务规则
        await this.validateThreadCancellation(id);

        const thread = await this.threadRepository.findByIdOrFail(id);
        thread.cancel(user, reason);

        return await this.threadRepository.save(thread);
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
        await this.validateThreadStart(id);

        // 执行线程（这里应该调用工作流执行服务）
        // 暂时返回模拟结果
        const result = {
          success: true,
          data: inputData,
          message: '线程执行完成',
        };

        // 保存线程状态
        await this.threadRepository.save(thread);

        return result;
      },
      { threadId }
    );
  }
}
