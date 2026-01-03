/**
 * 会话编排服务
 *
 * 负责会话级别的编排和管理，包括：
 * - 会话生命周期管理
 * - 线程创建和管理
 * - 线程 fork 操作
 * - 资源配额管理
 * - 线程间通信
 * - 状态同步
 *
 * 不负责工作流执行逻辑，工作流执行由 WorkflowOrchestrationService 负责
 * 不负责线程执行逻辑，线程执行由 ThreadExecutionService 负责
 */

import { injectable, inject } from 'inversify';
import { ISessionRepository } from '../../../domain/sessions';
import { IThreadRepository } from '../../../domain/threads';
import { SessionResourceService } from './session-resource-service';
import { ThreadLifecycleService } from '../../threads/services/thread-lifecycle-service';
import { ThreadExecutionService } from '../../threads/services/thread-execution-service';
import { ID, ILogger } from '../../../domain/common';
import { TYPES } from '../../../di/service-keys';
import { BaseApplicationService } from '../../common/base-application-service';
import { NodeId } from '../../../domain/workflow';
import { ForkStrategy, ForkOptions } from '../../../domain/sessions';
import { ThreadMessageType } from '../../../domain/sessions/value-objects/thread-communication';

/**
 * 线程动作类型
 */
export type ThreadAction = 'start' | 'pause' | 'resume' | 'complete' | 'fail' | 'cancel';

/**
 * 状态变更接口
 */
export interface StateChange {
  readonly type: 'thread' | 'session' | 'resource';
  readonly id: ID;
  readonly oldState: string;
  readonly newState: string;
  readonly timestamp: Date;
}

/**
 * 会话编排服务
 */
@injectable()
export class SessionOrchestrationService extends BaseApplicationService {
  constructor(
    @inject(TYPES.SessionRepository) private readonly sessionRepository: ISessionRepository,
    @inject(TYPES.ThreadRepository) private readonly threadRepository: IThreadRepository,
    @inject(TYPES.SessionResourceServiceImpl) private readonly sessionResourceService: SessionResourceService,
    @inject(TYPES.ThreadLifecycleService) private readonly threadLifecycleService: ThreadLifecycleService,
    @inject(TYPES.Logger) logger: ILogger
  ) {
    super(logger);
  }

  /**
   * 获取服务名称
   */
  protected override getServiceName(): string {
    return '会话编排服务';
  }


  /**
   * 创建线程
   * @param sessionId 会话ID
   * @param workflowId 工作流ID
   * @param priority 优先级
   * @param title 标题
   * @param description 描述
   * @param metadata 元数据
   * @returns 创建的线程
   */
  async createThread(
    sessionId: string,
    workflowId: string,
    priority?: number,
    title?: string,
    description?: string,
    metadata?: Record<string, unknown>
  ) {
    return this.executeBusinessOperation(
      '创建线程',
      async () => {
        // 使用ThreadLifecycleService创建线程
        const thread = await this.threadLifecycleService.createThread(
          sessionId,
          workflowId,
          priority,
          title,
          description,
          metadata
        );

        // 广播状态变更
        const change: StateChange = {
          type: 'thread',
          id: thread.id,
          oldState: 'none',
          newState: 'created',
          timestamp: new Date()
        };

        await this.broadcastStateChange(thread.id, change);

        return thread;
      },
      { sessionId, workflowId, priority, title, description }
    );
  }

  /**
   * 管理线程生命周期
   * @param sessionId 会话ID
   * @param threadId 线程ID
   * @param action 线程动作
   * @param userId 用户ID
   * @param reason 原因
   */
  async manageThreadLifecycle(
    sessionId: string,
    threadId: string,
    action: ThreadAction,
    userId?: string,
    reason?: string
  ): Promise<void> {
    return this.executeBusinessOperation(
      '管理线程生命周期',
      async () => {
        const sessionIdObj = this.parseId(sessionId, '会话ID');

        // 检查会话是否存在
        await this.sessionRepository.findByIdOrFail(sessionIdObj);

        // 根据动作调用相应的ThreadLifecycleService方法
        switch (action) {
          case 'start':
            await this.threadLifecycleService.startThread(threadId, userId);
            break;
          case 'pause':
            await this.threadLifecycleService.pauseThread(threadId, userId, reason);
            break;
          case 'resume':
            await this.threadLifecycleService.resumeThread(threadId, userId, reason);
            break;
          case 'complete':
            await this.threadLifecycleService.completeThread(threadId, userId, reason);
            break;
          case 'fail':
            await this.threadLifecycleService.failThread(threadId, reason || '线程失败', userId, reason);
            break;
          case 'cancel':
            await this.threadLifecycleService.cancelThread(threadId, userId, reason);
            break;
        }

        // 广播状态变更
        const change: StateChange = {
          type: 'thread',
          id: this.parseId(threadId, '线程ID'),
          oldState: 'unknown',
          newState: action,
          timestamp: new Date()
        };

        await this.broadcastStateChange(sessionIdObj, change);
      },
      { sessionId, threadId, action, userId, reason }
    );
  }

  /**
   * 同步会话状态
   * @param sessionId 会话ID
   */
  private async syncSessionState(sessionId: ID): Promise<void> {
    const session = await this.sessionRepository.findById(sessionId);

    if (session) {
      // 更新会话的最后活动时间
      session.updateLastActivity();
      await this.sessionRepository.save(session);
    }
  }

  /**
   * Fork 线程
   * @param sessionId 会话ID
   * @param parentThreadId 父线程ID
   * @param forkPoint Fork点节点ID
   * @param forkStrategy Fork策略
   * @param forkOptions Fork选项
   * @returns Fork操作结果
   */
  async forkThread(
    sessionId: string,
    parentThreadId: string,
    forkPoint: string,
    forkStrategy?: ForkStrategy,
    forkOptions?: ForkOptions
  ): Promise<{
    forkedThread: any;
    forkContext: any;
    forkStrategy: any;
  }> {
    return this.executeBusinessOperation(
      'Fork线程',
      async () => {
        const sessionIdObj = this.parseId(sessionId, '会话ID');
        const parentThreadIdObj = this.parseId(parentThreadId, '父线程ID');
        const forkPointObj = NodeId.fromString(forkPoint);

        // 检查会话是否存在
        const session = await this.sessionRepository.findByIdOrFail(sessionIdObj);

        // 检查是否可以创建线程
        const canCreate = await this.sessionResourceService.canCreateThread(sessionId);
        if (!canCreate) {
          throw new Error('会话线程数量已达上限');
        }

        // 获取父线程
        const parentThread = await this.threadRepository.findByIdOrFail(parentThreadIdObj);

        // 创建新线程
        const newThread = session.forkThread(
          parentThreadId,
          forkPointObj,
          forkStrategy || ForkStrategy.createPartial(),
          forkOptions || ForkOptions.createDefault()
        );

        // 保存新线程
        await this.threadRepository.save(newThread);

        // 更新会话
        await this.sessionRepository.save(session);

        // 广播状态变更
        const change: StateChange = {
          type: 'thread',
          id: newThread.threadId,
          oldState: 'none',
          newState: 'forked',
          timestamp: new Date()
        };

        await this.broadcastStateChange(sessionIdObj, change);

        return {
          forkedThread: newThread,
          forkContext: null,
          forkStrategy: forkStrategy || ForkStrategy.createPartial()
        };
      },
      { sessionId, parentThreadId, forkPoint }
    );
  }

  /**
   * 发送线程间消息
   * @param sessionId 会话ID
   * @param fromThreadId 发送线程ID
   * @param toThreadId 接收线程ID
   * @param type 消息类型
   * @param payload 消息负载
   * @returns 消息ID
   */
  async sendMessage(
    sessionId: string,
    fromThreadId: string,
    toThreadId: string,
    type: ThreadMessageType,
    payload: Record<string, unknown>
  ): Promise<string> {
    return this.executeBusinessOperation(
      '发送线程间消息',
      async () => {
        const sessionIdObj = this.parseId(sessionId, '会话ID');
        const fromThreadIdObj = this.parseId(fromThreadId, '发送线程ID');
        const toThreadIdObj = this.parseId(toThreadId, '接收线程ID');

        // 检查会话是否存在
        const session = await this.sessionRepository.findByIdOrFail(sessionIdObj);

        // 检查线程是否存在
        if (!session.hasThread(fromThreadId)) {
          throw new Error('发送线程不存在');
        }

        if (!session.hasThread(toThreadId)) {
          throw new Error('接收线程不存在');
        }

        // 发送消息
        const messageId = session.sendMessage(fromThreadIdObj, toThreadIdObj, type, payload);

        // 更新会话
        await this.sessionRepository.save(session);

        // 更新会话的最后活动时间
        session.updateLastActivity();
        await this.sessionRepository.save(session);

        return messageId;
      },
      { sessionId, fromThreadId, toThreadId, type }
    );
  }

  /**
   * 广播消息到所有线程
   * @param sessionId 会话ID
   * @param fromThreadId 发送线程ID
   * @param type 消息类型
   * @param payload 消息负载
   * @returns 消息ID数组
   */
  async broadcastMessage(
    sessionId: string,
    fromThreadId: string,
    type: ThreadMessageType,
    payload: Record<string, unknown>
  ): Promise<string[]> {
    return this.executeBusinessOperation(
      '广播消息',
      async () => {
        const sessionIdObj = this.parseId(sessionId, '会话ID');
        const fromThreadIdObj = this.parseId(fromThreadId, '发送线程ID');

        // 检查会话是否存在
        const session = await this.sessionRepository.findByIdOrFail(sessionIdObj);

        // 检查发送线程是否存在
        if (!session.hasThread(fromThreadId)) {
          throw new Error('发送线程不存在');
        }

        // 广播消息
        const messageIds = session.broadcastMessage(fromThreadIdObj, type, payload);

        // 更新会话
        await this.sessionRepository.save(session);

        // 更新会话的最后活动时间
        session.updateLastActivity();
        await this.sessionRepository.save(session);

        return messageIds;
      },
      { sessionId, fromThreadId, type }
    );
  }

  /**
   * 获取线程的未读消息
   * @param sessionId 会话ID
   * @param threadId 线程ID
   * @returns 未读消息数量
   */
  async getUnreadMessageCount(sessionId: string, threadId: string): Promise<number> {
    return this.executeQueryOperation(
      '获取未读消息数量',
      async () => {
        const sessionIdObj = this.parseId(sessionId, '会话ID');
        const threadIdObj = this.parseId(threadId, '线程ID');

        // 检查会话是否存在
        const session = await this.sessionRepository.findByIdOrFail(sessionIdObj);

        return session.getUnreadMessageCount(threadIdObj);
      },
      { sessionId, threadId }
    );
  }

  /**
   * 获取线程的消息
   * @param sessionId 会话ID
   * @param threadId 线程ID
   * @param includeRead 是否包含已读消息
   * @returns 消息数组
   */
  async getMessagesForThread(
    sessionId: string,
    threadId: string,
    includeRead: boolean = false
  ): Promise<any[]> {
    return this.executeQueryOperation(
      '获取线程消息',
      async () => {
        const sessionIdObj = this.parseId(sessionId, '会话ID');
        const threadIdObj = this.parseId(threadId, '线程ID');

        // 检查会话是否存在
        const session = await this.sessionRepository.findByIdOrFail(sessionIdObj);

        return session.getMessagesForThread(threadIdObj, includeRead);
      },
      { sessionId, threadId, includeRead }
    );
  }

  /**
   * 设置共享资源
   * @param sessionId 会话ID
   * @param key 资源键
   * @param value 资源值
   */
  async setSharedResource(sessionId: string, key: string, value: unknown): Promise<void> {
    return this.executeBusinessOperation(
      '设置共享资源',
      async () => {
        const sessionIdObj = this.parseId(sessionId, '会话ID');

        // 检查会话是否存在
        const session = await this.sessionRepository.findByIdOrFail(sessionIdObj);

        // 设置共享资源
        session.setSharedResource(key, value);

        // 更新会话
        await this.sessionRepository.save(session);

        // 更新会话的最后活动时间
        session.updateLastActivity();
        await this.sessionRepository.save(session);
      },
      { sessionId, key }
    );
  }

  /**
   * 获取共享资源
   * @param sessionId 会话ID
   * @param key 资源键
   * @returns 资源值
   */
  async getSharedResource(sessionId: string, key: string): Promise<unknown> {
    return this.executeQueryOperation(
      '获取共享资源',
      async () => {
        const sessionIdObj = this.parseId(sessionId, '会话ID');

        // 检查会话是否存在
        const session = await this.sessionRepository.findByIdOrFail(sessionIdObj);

        return session.getSharedResource(key);
      },
      { sessionId, key }
    );
  }

  /**
   * 更新并行策略
   * @param sessionId 会话ID
   * @param strategy 并行策略
   */
  async updateParallelStrategy(
    sessionId: string,
    strategy: 'sequential' | 'parallel' | 'hybrid'
  ): Promise<void> {
    return this.executeBusinessOperation(
      '更新并行策略',
      async () => {
        const sessionIdObj = this.parseId(sessionId, '会话ID');

        // 检查会话是否存在
        const session = await this.sessionRepository.findByIdOrFail(sessionIdObj);

        // 更新并行策略
        session.updateParallelStrategy(strategy);

        // 更新会话
        await this.sessionRepository.save(session);

        // 更新会话的最后活动时间
        session.updateLastActivity();
        await this.sessionRepository.save(session);
      },
      { sessionId, strategy }
    );
  }

  /**
   * 获取会话的线程统计信息
   * @param sessionId 会话ID
   * @returns 线程统计信息
   */
  async getSessionThreadStats(sessionId: string): Promise<{
    total: number;
    active: number;
    completed: number;
    failed: number;
    allCompleted: boolean;
    hasActive: boolean;
  }> {
    return this.executeQueryOperation(
      '获取会话线程统计信息',
      async () => {
        const sessionIdObj = this.parseId(sessionId, '会话ID');

        // 检查会话是否存在
        const session = await this.sessionRepository.findByIdOrFail(sessionIdObj);

        return {
          total: session.threadCount,
          active: session.getActiveThreadCount(),
          completed: session.getCompletedThreadCount(),
          failed: session.getFailedThreadCount(),
          allCompleted: session.areAllThreadsCompleted(),
          hasActive: session.hasActiveThreads()
        };
      },
      { sessionId }
    );
  }

  /**
   * 广播状态变更
   * @param sessionId 会话ID
   * @param change 状态变更
   */
  private async broadcastStateChange(sessionId: ID | string, change: StateChange): Promise<void> {
    // 这里可以实现事件发布机制
    // 目前只是记录日志
    this.logger.info(`Session ${sessionId.toString()} state change:`, change);

    // 更新会话的最后活动时间
    const sessionIdObj = typeof sessionId === 'string' ? this.parseId(sessionId, '会话ID') : sessionId;
    const session = await this.sessionRepository.findById(sessionIdObj);
    if (session) {
      session.updateLastActivity();
      await this.sessionRepository.save(session);
    }
  }
}