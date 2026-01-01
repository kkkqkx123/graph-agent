/**
 * 会话编排服务
 *
 * 负责会话级别的编排和管理，包括：
 * - 会话生命周期管理
 * - 线程创建和管理
 * - 资源配额管理
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
   * 广播状态变更
   * @param sessionId 会话ID
   * @param change 状态变更
   */
  private async broadcastStateChange(sessionId: ID, change: StateChange): Promise<void> {
    // 这里可以实现事件发布机制
    // 目前只是记录日志
    this.logger.info(`Session ${sessionId.toString()} state change:`, change);

    // 更新会话的最后活动时间
    const session = await this.sessionRepository.findById(sessionId);
    if (session) {
      session.updateLastActivity();
      await this.sessionRepository.save(session);
    }
  }
}