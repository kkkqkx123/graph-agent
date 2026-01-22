/**
 * 会话编排服务
 *
 * 负责会话级别的编排和管理，包括：
 * - 会话生命周期管理
 * - 资源配额管理
 * - 会话级别的状态同步
 * - 会话级别的广播
 *
 * 不负责工作流执行逻辑，工作流执行由 WorkflowOrchestration 负责
 * 不负责线程管理逻辑，线程管理由 Thread 模块负责
 */

import { injectable, inject } from 'inversify';
import { ISessionRepository } from '../../domain/sessions';
import { SessionResource } from './session-resource';
import { ID, ILogger } from '../../domain/common';
import { TYPES } from '../../di/service-keys';
import { BaseService } from '../common/base-service';

/**
 * 状态变更接口
 */
export interface StateChange {
  readonly type: 'session' | 'resource';
  readonly id: ID;
  readonly oldState: string;
  readonly newState: string;
  readonly timestamp: Date;
}

/**
 * 会话编排服务
 */
@injectable()
export class SessionOrchestration extends BaseService {
  constructor(
    @inject(TYPES.SessionRepository) private readonly sessionRepository: ISessionRepository,
    @inject(TYPES.SessionResource)
    private readonly sessionResource: SessionResource,
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
   * 同步会话状态
   * @param sessionId 会话ID
   */
  async syncSessionState(sessionId: ID): Promise<void> {
    const session = await this.sessionRepository.findById(sessionId);

    if (session) {
      // 更新会话的最后活动时间
      const updatedSession = session.updateLastActivity();
      await this.sessionRepository.save(updatedSession);
    }
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
        const updatedSession = session.setSharedResource(key, value);

        // 更新会话
        await this.sessionRepository.save(updatedSession);

        // 更新会话的最后活动时间
        const finalSession = updatedSession.updateLastActivity();
        await this.sessionRepository.save(finalSession);
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
        const updatedSession = session.updateParallelStrategy(strategy);

        // 更新会话
        await this.sessionRepository.save(updatedSession);

        // 更新会话的最后活动时间
        const finalSession = updatedSession.updateLastActivity();
        await this.sessionRepository.save(finalSession);
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
          hasActive: session.hasActiveThreads(),
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
    const sessionIdObj =
      typeof sessionId === 'string' ? this.parseId(sessionId, '会话ID') : sessionId;
    const session = await this.sessionRepository.findById(sessionIdObj);
    if (session) {
      const updatedSession = session.updateLastActivity();
      await this.sessionRepository.save(updatedSession);
    }
  }
}