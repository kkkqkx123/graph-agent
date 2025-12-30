import { ID } from '../../../domain/common/value-objects/id';
import { Timestamp } from '../../../domain/common/value-objects/timestamp';
import { Thread } from '../../../domain/threads/entities/thread';
import { ThreadCheckpoint } from '../../../domain/threads/checkpoints/entities/thread-checkpoint';
import { CheckpointType } from '../../../domain/checkpoint/value-objects/checkpoint-type';
import { ThreadCheckpointRepository } from '../../../domain/threads/checkpoints/repositories/thread-checkpoint-repository';
import { ILogger } from '../../../domain/common/types/logger-types';

/**
 * 状态检查点服务
 *
 * 负责管理Thread的Checkpoint
 * 职责：
 * - 创建Checkpoint
 * - 查询Checkpoint
 * - 管理Checkpoint生命周期
 * - 清理过期Checkpoint
 */
export class StateCheckpointService {
  constructor(
    private readonly checkpointRepository: ThreadCheckpointRepository,
    private readonly logger: ILogger
  ) {}

  /**
   * 创建自动Checkpoint
   * @param thread Thread实体
   * @returns 创建的Checkpoint
   */
  async createAutoCheckpoint(thread: Thread): Promise<ThreadCheckpoint> {
    try {
      const checkpoint = ThreadCheckpoint.create(
        thread.threadId,
        CheckpointType.auto(),
        {
          status: thread.status.value,
          execution: this.serializeThreadExecution(thread.execution),
          metadata: thread.metadata
        },
        undefined,
        `自动检查点: ${thread.status.value}`,
        ['automatic'],
        {
          createdAt: Timestamp.now().toISOString()
        }
      );

      await this.checkpointRepository.save(checkpoint);

      this.logger.info('自动Checkpoint创建成功', {
        checkpointId: checkpoint.checkpointId.toString(),
        threadId: thread.threadId.toString()
      });

      return checkpoint;

    } catch (error) {
      this.logger.error('创建自动Checkpoint失败', error as Error);
      throw error;
    }
  }

  /**
   * 创建手动Checkpoint
   * @param thread Thread实体
   * @param title 标题
   * @param description 描述
   * @returns 创建的Checkpoint
   */
  async createManualCheckpoint(
    thread: Thread,
    title?: string,
    description?: string
  ): Promise<ThreadCheckpoint> {
    try {
      const checkpoint = ThreadCheckpoint.create(
        thread.threadId,
        CheckpointType.manual(),
        {
          status: thread.status.value,
          execution: this.serializeThreadExecution(thread.execution),
          metadata: thread.metadata
        },
        title || '手动检查点',
        description,
        ['manual'],
        {
          createdAt: Timestamp.now().toISOString(),
          createdBy: 'user'
        }
      );

      await this.checkpointRepository.save(checkpoint);

      this.logger.info('手动Checkpoint创建成功', {
        checkpointId: checkpoint.checkpointId.toString(),
        threadId: thread.threadId.toString()
      });

      return checkpoint;

    } catch (error) {
      this.logger.error('创建手动Checkpoint失败', error as Error);
      throw error;
    }
  }

  /**
   * 创建错误Checkpoint
   * @param thread Thread实体
   * @param error 错误对象
   * @returns 创建的Checkpoint
   */
  async createErrorCheckpoint(thread: Thread, error: Error): Promise<ThreadCheckpoint> {
    try {
      const checkpoint = ThreadCheckpoint.create(
        thread.threadId,
        CheckpointType.error(),
        {
          status: thread.status.value,
          execution: this.serializeThreadExecution(thread.execution),
          metadata: thread.metadata,
          errorMessage: error.message,
          errorStack: error.stack
        },
        undefined,
        `错误检查点: ${error.message}`,
        ['error'],
        {
          createdAt: Timestamp.now().toISOString(),
          errorName: error.name
        }
      );

      await this.checkpointRepository.save(checkpoint);

      this.logger.info('错误Checkpoint创建成功', {
        checkpointId: checkpoint.checkpointId.toString(),
        threadId: thread.threadId.toString(),
        errorMessage: error.message
      });

      return checkpoint;

    } catch (err) {
      this.logger.error('创建错误Checkpoint失败', err as Error);
      throw err;
    }
  }

  /**
   * 创建里程碑Checkpoint
   * @param thread Thread实体
   * @param milestoneName 里程碑名称
   * @param description 描述
   * @returns 创建的Checkpoint
   */
  async createMilestoneCheckpoint(
    thread: Thread,
    milestoneName: string,
    description?: string
  ): Promise<ThreadCheckpoint> {
    try {
      const checkpoint = ThreadCheckpoint.create(
        thread.threadId,
        CheckpointType.milestone(),
        {
          status: thread.status.value,
          execution: this.serializeThreadExecution(thread.execution),
          metadata: thread.metadata
        },
        milestoneName,
        description,
        ['milestone'],
        {
          createdAt: Timestamp.now().toISOString(),
          milestoneName
        }
      );

      await this.checkpointRepository.save(checkpoint);

      this.logger.info('里程碑Checkpoint创建成功', {
        checkpointId: checkpoint.checkpointId.toString(),
        threadId: thread.threadId.toString(),
        milestoneName
      });

      return checkpoint;

    } catch (error) {
      this.logger.error('创建里程碑Checkpoint失败', error as Error);
      throw error;
    }
  }

  /**
   * 查询Thread的Checkpoint
   * @param threadId Thread ID
   * @returns Checkpoint列表
   */
  async getThreadCheckpoints(threadId: ID): Promise<ThreadCheckpoint[]> {
    try {
      return await this.checkpointRepository.findByThreadId(threadId);
    } catch (error) {
      this.logger.error('查询Thread的Checkpoint失败', error as Error);
      throw error;
    }
  }

  /**
   * 获取最新的Checkpoint
   * @param threadId Thread ID
   * @returns 最新的Checkpoint或null
   */
  async getLatestCheckpoint(threadId: ID): Promise<ThreadCheckpoint | null> {
    try {
      return await this.checkpointRepository.getLatest(threadId);
    } catch (error) {
      this.logger.error('获取最新的Checkpoint失败', error as Error);
      throw error;
    }
  }

  /**
   * 获取指定类型的Checkpoint
   * @param threadId Thread ID
   * @param type Checkpoint类型
   * @returns Checkpoint列表
   */
  async getCheckpointsByType(
    threadId: ID,
    type: CheckpointType
  ): Promise<ThreadCheckpoint[]> {
    try {
      const allCheckpoints = await this.checkpointRepository.findByThreadId(threadId);
      return allCheckpoints.filter(cp => cp.type.equals(type));
    } catch (error) {
      this.logger.error('获取指定类型的Checkpoint失败', error as Error);
      throw error;
    }
  }

  /**
   * 清理过期Checkpoint
   * @param threadId Thread ID（可选，不提供则清理所有）
   * @returns 清理的Checkpoint数量
   */
  async cleanupExpiredCheckpoints(threadId?: ID): Promise<number> {
    try {
      let cleanedCount = 0;

      if (threadId) {
        // 清理指定Thread的过期Checkpoint
        const checkpoints = await this.checkpointRepository.findByThreadId(threadId);
        const expiredCheckpoints = checkpoints.filter(cp => cp.isExpired());

        for (const checkpoint of expiredCheckpoints) {
          checkpoint.markExpired();
          await this.checkpointRepository.save(checkpoint);
          cleanedCount++;
        }
      } else {
        // 清理所有过期Checkpoint
        const expiredCheckpoints = await this.checkpointRepository.findExpired();

        for (const checkpoint of expiredCheckpoints) {
          checkpoint.markExpired();
          await this.checkpointRepository.save(checkpoint);
          cleanedCount++;
        }
      }

      this.logger.info('过期Checkpoint清理完成', {
        threadId: threadId?.toString(),
        cleanedCount
      });

      return cleanedCount;

    } catch (error) {
      this.logger.error('清理过期Checkpoint失败', error as Error);
      throw error;
    }
  }

  /**
   * 清理多余Checkpoint
   * @param threadId Thread ID
   * @param maxCount 最大保留数量
   * @returns 清理的Checkpoint数量
   */
  async cleanupExcessCheckpoints(threadId: ID, maxCount: number): Promise<number> {
    try {
      const checkpoints = await this.checkpointRepository.findByThreadId(threadId);

      if (checkpoints.length <= maxCount) {
        return 0;
      }

      // 按创建时间排序，保留最新的maxCount个
      const sortedCheckpoints = checkpoints.sort((a, b) =>
        b.createdAt.getMilliseconds() - a.createdAt.getMilliseconds()
      );

      const checkpointsToRemove = sortedCheckpoints.slice(maxCount);
      let cleanedCount = 0;

      for (const checkpoint of checkpointsToRemove) {
        checkpoint.markArchived();
        await this.checkpointRepository.save(checkpoint);
        cleanedCount++;
      }

      this.logger.info('多余Checkpoint清理完成', {
        threadId: threadId.toString(),
        maxCount,
        cleanedCount
      });

      return cleanedCount;

    } catch (error) {
      this.logger.error('清理多余Checkpoint失败', error as Error);
      throw error;
    }
  }

  /**
   * 归档旧Checkpoint
   * @param threadId Thread ID
   * @param days 天数
   * @returns 归档的Checkpoint数量
   */
  async archiveOldCheckpoints(threadId: ID, days: number): Promise<number> {
    try {
      const checkpoints = await this.checkpointRepository.findByThreadId(threadId);
      const cutoffTime = Timestamp.now().addDays(-days);

      const oldCheckpoints = checkpoints.filter(cp =>
        cp.createdAt.isBefore(cutoffTime)
      );

      let archivedCount = 0;

      for (const checkpoint of oldCheckpoints) {
        checkpoint.markArchived();
        await this.checkpointRepository.save(checkpoint);
        archivedCount++;
      }

      this.logger.info('旧Checkpoint归档完成', {
        threadId: threadId.toString(),
        days,
        archivedCount
      });

      return archivedCount;

    } catch (error) {
      this.logger.error('归档旧Checkpoint失败', error as Error);
      throw error;
    }
  }

  /**
   * 延长Checkpoint过期时间
   * @param checkpointId Checkpoint ID
   * @param hours 延长的小时数
   * @returns 是否成功
   */
  /**
   * 序列化ThreadExecution
   * @param execution ThreadExecution值对象
   * @returns 序列化后的对象
   */
  private serializeThreadExecution(execution: any): Record<string, unknown> {
    return {
      threadId: execution.threadId.toString(),
      status: execution.status.value,
      progress: execution.progress,
      currentStep: execution.currentStep,
      startedAt: execution.startedAt?.toISOString(),
      completedAt: execution.completedAt?.toISOString(),
      errorMessage: execution.errorMessage,
      retryCount: execution.retryCount,
      lastActivityAt: execution.lastActivityAt.toISOString()
    };
  }

  async extendCheckpointExpiration(checkpointId: ID, hours: number): Promise<boolean> {
    try {
      const checkpoint = await this.checkpointRepository.findByIdOrFail(checkpointId);

      if (checkpoint.isExpired()) {
        this.logger.warn('Checkpoint已过期，无法延长过期时间', {
          checkpointId: checkpointId.toString()
        });
        return false;
      }

      checkpoint.extendExpiration(hours);
      await this.checkpointRepository.save(checkpoint);

      this.logger.info('Checkpoint过期时间延长成功', {
        checkpointId: checkpointId.toString(),
        hours
      });

      return true;

    } catch (error) {
      this.logger.error('延长Checkpoint过期时间失败', error as Error);
      throw error;
    }
  }
}