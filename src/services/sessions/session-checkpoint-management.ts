/**
 * Session Checkpoint 管理服务
 *
 * 负责 Session 级别的 checkpoint 管理，包括：
 * - 聚合查询 Session 中所有 Thread 的 checkpoint
 * - Session 级别的 checkpoint 统计和分析
 * - 按 Thread 分组管理 checkpoint
 *
 * 设计原则：
 * - Thread 是唯一的执行引擎，负责实际的 workflow 执行和状态管理
 * - Checkpoint 只记录 Thread 的状态快照
 * - Session 通过聚合查询间接管理 checkpoint，不直接拥有 checkpoint 数据
 */

import { injectable, inject } from 'inversify';
import { ISessionRepository } from '../../domain/sessions';
import { CheckpointManagement } from '../checkpoints/checkpoint-management';
import { Checkpoint } from '../../domain/threads/checkpoints/entities/checkpoint';
import { ID, ILogger } from '../../domain/common';
import { TYPES } from '../../di/service-keys';
import { BaseService } from '../common/base-service';

/**
 * Session Checkpoint 管理服务
 */
@injectable()
export class SessionCheckpointManagement extends BaseService {
  constructor(
    @inject(TYPES.SessionRepository) private readonly sessionRepository: ISessionRepository,
    @inject(TYPES.CheckpointManagement) private readonly checkpointManagement: CheckpointManagement,
    @inject(TYPES.Logger) logger: ILogger
  ) {
    super(logger);
  }

  /**
   * 获取服务名称
   */
  protected override getServiceName(): string {
    return 'Session Checkpoint 管理';
  }

  /**
   * 获取 Session 的所有 checkpoint（聚合所有 Thread 的 checkpoint）
   * @param sessionId 会话ID
   * @returns Session checkpoint 信息
   */
  async getSessionCheckpoints(sessionId: string): Promise<{
    sessionId: string;
    checkpoints: Checkpoint[];
    totalCount: number;
    threadCount: number;
  }> {
    return this.executeQueryOperation(
      '获取会话检查点',
      async () => {
        const sessionIdObj = this.parseId(sessionId, '会话ID');

        // 检查会话是否存在
        const session = await this.sessionRepository.findByIdOrFail(sessionIdObj);

        // 获取会话的所有线程
        const threads = session.getThreads().getAll();

        if (threads.length === 0) {
          return {
            sessionId,
            checkpoints: [],
            totalCount: 0,
            threadCount: 0,
          };
        }

        // 并行查询每个线程的 checkpoint
        const checkpointPromises = threads.map(thread =>
          this.checkpointManagement.getThreadCheckpoints(thread.threadId)
        );

        const threadCheckpoints = await Promise.all(checkpointPromises);

        // 聚合所有 checkpoint
        const allCheckpoints = threadCheckpoints.flat();

        return {
          sessionId,
          checkpoints: allCheckpoints,
          totalCount: allCheckpoints.length,
          threadCount: threads.length,
        };
      },
      { sessionId }
    );
  }

  /**
   * 获取 Session 的最新 checkpoint（所有 Thread 中最新的）
   * @param sessionId 会话ID
   * @returns 最新的 checkpoint 或 null
   */
  async getLatestSessionCheckpoint(sessionId: string): Promise<Checkpoint | null> {
    const result = await this.executeQueryOperation(
      '获取会话最新检查点',
      async () => {
        const sessionIdObj = this.parseId(sessionId, '会话ID');

        // 检查会话是否存在
        const session = await this.sessionRepository.findByIdOrFail(sessionIdObj);

        // 获取会话的所有线程
        const threads = session.getThreads().getAll();

        if (threads.length === 0) {
          return null;
        }

        // 并行查询每个线程的最新 checkpoint
        const latestCheckpointPromises = threads.map(async thread => {
          const cp = await this.checkpointManagement.getLatestThreadCheckpoint(thread.threadId);
          return cp || null;
        });

        const latestCheckpoints = await Promise.all(latestCheckpointPromises);

        // 过滤掉 null 值
        const validCheckpoints = latestCheckpoints.filter(
          (cp): cp is Checkpoint => cp !== null
        );

        if (validCheckpoints.length === 0) {
          return null;
        }

        // 按创建时间排序，返回最新的
        validCheckpoints.sort(
          (a, b) => b.createdAt.getDate().getTime() - a.createdAt.getDate().getTime()
        );

        return validCheckpoints[0];
      },
      { sessionId }
    );
    
    return result ?? null;
  }

  /**
   * 按 Thread 分组获取 Session 的 checkpoint
   * @param sessionId 会话ID
   * @returns 按线程分组的 checkpoint 映射
   */
  async getSessionCheckpointsByThread(sessionId: string): Promise<Map<string, Checkpoint[]>> {
    return this.executeQueryOperation(
      '获取会话检查点按线程分组',
      async () => {
        const sessionIdObj = this.parseId(sessionId, '会话ID');

        // 检查会话是否存在
        const session = await this.sessionRepository.findByIdOrFail(sessionIdObj);

        // 获取会话的所有线程
        const threads = session.getThreads().getAll();

        const result = new Map<string, Checkpoint[]>();

        if (threads.length === 0) {
          return result;
        }

        // 并行查询每个线程的 checkpoint
        const checkpointPromises = threads.map(async thread => {
          const checkpoints = await this.checkpointManagement.getThreadCheckpoints(
            thread.threadId
          );
          return { threadId: thread.threadId.value, checkpoints };
        });

        const threadCheckpointResults = await Promise.all(checkpointPromises);

        // 构建结果映射
        for (const { threadId, checkpoints } of threadCheckpointResults) {
          result.set(threadId, checkpoints);
        }

        return result;
      },
      { sessionId }
    );
  }

  /**
   * 获取 Session 的 checkpoint 统计信息
   * @param sessionId 会话ID
   * @returns checkpoint 统计信息
   */
  async getSessionCheckpointStats(sessionId: string): Promise<{
    totalCheckpoints: number;
    checkpointsByType: Map<string, number>;
    latestCheckpointAt?: Date;
    threadCheckpointCounts: Map<string, number>;
  }> {
    return this.executeQueryOperation(
      '获取会话检查点统计',
      async () => {
        const sessionIdObj = this.parseId(sessionId, '会话ID');

        // 检查会话是否存在
        const session = await this.sessionRepository.findByIdOrFail(sessionIdObj);

        // 获取会话的所有线程
        const threads = session.getThreads().getAll();

        const threadCheckpointCounts = new Map<string, number>();
        const checkpointsByType = new Map<string, number>();
        let totalCheckpoints = 0;
        let latestCheckpointAt: Date | undefined;

        if (threads.length === 0) {
          return {
            totalCheckpoints: 0,
            checkpointsByType,
            threadCheckpointCounts,
          };
        }

        // 并行查询每个线程的 checkpoint
        const checkpointPromises = threads.map(async thread => {
          const checkpoints = await this.checkpointManagement.getThreadCheckpoints(
            thread.threadId
          );
          return { threadId: thread.threadId.value, checkpoints };
        });

        const threadCheckpointResults = await Promise.all(checkpointPromises);

        // 统计信息
        for (const { threadId, checkpoints } of threadCheckpointResults) {
          threadCheckpointCounts.set(threadId, checkpoints.length);
          totalCheckpoints += checkpoints.length;

          // 按类型统计
          for (const checkpoint of checkpoints) {
            const typeValue = checkpoint.type.getValue();
            checkpointsByType.set(typeValue, (checkpointsByType.get(typeValue) || 0) + 1);

            // 更新最新 checkpoint 时间
            const checkpointDate = checkpoint.createdAt.getDate();
            if (!latestCheckpointAt || checkpointDate > latestCheckpointAt) {
              latestCheckpointAt = checkpointDate;
            }
          }
        }

        return {
          totalCheckpoints,
          checkpointsByType,
          latestCheckpointAt,
          threadCheckpointCounts,
        };
      },
      { sessionId }
    );
  }
}
