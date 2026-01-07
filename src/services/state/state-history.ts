import { ID } from '../../../domain/common/value-objects/id';
import { Timestamp } from '../../../domain/common/value-objects/timestamp';
import { Thread } from '../../../domain/threads/entities/thread';
import { ThreadStatus } from '../../../domain/threads/value-objects/thread-status';
import { ThreadCheckpoint } from '../../../domain/threads/checkpoints/entities/thread-checkpoint';
import { History } from '../../../domain/history/entities/history';
import { HistoryType } from '../../../domain/history/value-objects/history-type';
import { IHistoryRepository } from '../../../domain/history/repositories/history-repository';
import { ILogger } from '../../../domain/common/types/logger-types';

/**
 * 状态历史服务
 *
 * 负责管理状态变更的历史记录
 * 职责：
 * - 创建History记录
 * - 查询History记录
 * - 管理History生命周期
 */
export class StateHistoryService {
  constructor(
    private readonly historyRepository: IHistoryRepository,
    private readonly logger: ILogger
  ) {}

  /**
   * 创建状态变更History
   * @param thread Thread实体
   * @param oldStatus 旧状态
   * @param newStatus 新状态
   */
  async createStateChangeHistory(
    thread: Thread,
    oldStatus: ThreadStatus,
    newStatus: ThreadStatus
  ): Promise<void> {
    try {
      const history = History.create(
        HistoryType.stateChanged(),
        {
          entityType: 'thread',
          entityId: thread.threadId.value,
          oldStatus: oldStatus.value,
          newStatus: newStatus.value,
          executionState: this.serializeThreadExecution(thread.execution),
        },
        thread.sessionId,
        thread.threadId,
        undefined,
        `Thread状态变更: ${oldStatus.value} -> ${newStatus.value}`,
        undefined,
        {
          timestamp: Timestamp.now().toISOString(),
        }
      );

      await this.historyRepository.save(history);

      this.logger.info('状态变更History创建成功', {
        historyId: history.historyId.toString(),
        threadId: thread.threadId.toString(),
        oldStatus: oldStatus.value,
        newStatus: newStatus.value,
      });
    } catch (error) {
      this.logger.error('创建状态变更History失败', error as Error);
      throw error;
    }
  }

  /**
   * 创建恢复History
   * @param thread Thread实体
   * @param checkpoint Checkpoint实体
   */
  async createRestoreHistory(thread: Thread, checkpoint: ThreadCheckpoint): Promise<void> {
    try {
      const history = History.create(
        HistoryType.checkpointRestored(),
        {
          entityType: 'thread',
          entityId: thread.threadId.value,
          checkpointId: checkpoint.checkpointId.value,
          checkpointType: checkpoint.type.getValue(),
          checkpointCreatedAt: checkpoint.createdAt.toISOString(),
        },
        thread.sessionId,
        thread.threadId,
        undefined,
        `Thread从Checkpoint恢复`,
        `从检查点 ${checkpoint.checkpointId.toString()} 恢复`,
        {
          timestamp: Timestamp.now().toISOString(),
        }
      );

      await this.historyRepository.save(history);

      this.logger.info('恢复History创建成功', {
        historyId: history.historyId.toString(),
        threadId: thread.threadId.toString(),
        checkpointId: checkpoint.checkpointId.toString(),
      });
    } catch (error) {
      this.logger.error('创建恢复History失败', error as Error);
      throw error;
    }
  }

  /**
   * 创建错误History
   * @param thread Thread实体
   * @param error 错误对象
   */
  async createErrorHistory(thread: Thread, error: Error): Promise<void> {
    try {
      const history = History.create(
        HistoryType.errorOccurred(),
        {
          entityType: 'thread',
          entityId: thread.threadId.value,
          errorMessage: error.message,
          errorStack: error.stack,
          executionState: this.serializeThreadExecution(thread.execution),
        },
        thread.sessionId,
        thread.threadId,
        undefined,
        `Thread发生错误`,
        error.message,
        {
          timestamp: Timestamp.now().toISOString(),
          errorName: error.name,
        }
      );

      await this.historyRepository.save(history);

      this.logger.info('错误History创建成功', {
        historyId: history.historyId.toString(),
        threadId: thread.threadId.toString(),
        errorMessage: error.message,
      });
    } catch (err) {
      this.logger.error('创建错误History失败', err as Error);
      throw err;
    }
  }

  /**
   * 创建操作History
   * @param thread Thread实体
   * @param operation 操作名称
   * @param details 操作详情
   */
  async createOperationHistory(
    thread: Thread,
    operation: string,
    details: Record<string, unknown>
  ): Promise<void> {
    try {
      const history = History.create(
        HistoryType.threadUpdated(),
        {
          entityType: 'thread',
          entityId: thread.threadId.value,
          operation,
          ...details,
          executionState: this.serializeThreadExecution(thread.execution),
        },
        thread.sessionId,
        thread.threadId,
        undefined,
        `Thread操作: ${operation}`,
        undefined,
        {
          timestamp: Timestamp.now().toISOString(),
        }
      );

      await this.historyRepository.save(history);

      this.logger.info('操作History创建成功', {
        historyId: history.historyId.toString(),
        threadId: thread.threadId.toString(),
        operation,
      });
    } catch (error) {
      this.logger.error('创建操作History失败', error as Error);
      throw error;
    }
  }

  /**
   * 查询Thread的History
   * @param threadId Thread ID
   * @param limit 数量限制
   * @returns History记录列表
   */
  async getThreadHistory(threadId: ID, limit?: number): Promise<History[]> {
    try {
      const histories = await this.historyRepository.findByThreadId(threadId);

      if (limit && limit > 0) {
        return histories.slice(0, limit);
      }

      return histories;
    } catch (error) {
      this.logger.error('查询Thread的History失败', error as Error);
      throw error;
    }
  }

  /**
   * 查询Session的History
   * @param sessionId Session ID
   * @param limit 数量限制
   * @returns History记录列表
   */
  async getSessionHistory(sessionId: ID, limit?: number): Promise<History[]> {
    try {
      const histories = await this.historyRepository.findBySessionId(sessionId);

      if (limit && limit > 0) {
        return histories.slice(0, limit);
      }

      return histories;
    } catch (error) {
      this.logger.error('查询Session的History失败', error as Error);
      throw error;
    }
  }

  /**
   * 查询指定类型的History
   * @param type History类型
   * @param limit 数量限制
   * @returns History记录列表
   */
  async getHistoryByType(type: HistoryType, limit?: number): Promise<History[]> {
    try {
      const histories = await this.historyRepository.findByType(type);

      if (limit && limit > 0) {
        return histories.slice(0, limit);
      }

      return histories;
    } catch (error) {
      this.logger.error('查询指定类型的History失败', error as Error);
      throw error;
    }
  }

  /**
   * 清理过期的History
   * @param retentionDays 保留天数
   * @returns 清理的History数量
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
      lastActivityAt: execution.lastActivityAt.toISOString(),
    };
  }

  async cleanupExpiredHistory(retentionDays: number): Promise<number> {
    try {
      const cleanedCount = await this.historyRepository.cleanupExpired(retentionDays);

      this.logger.info('过期History清理完成', {
        retentionDays,
        cleanedCount,
      });

      return cleanedCount;
    } catch (error) {
      this.logger.error('清理过期History失败', error as Error);
      throw error;
    }
  }
}
