import { ID } from '../../domain/common/value-objects/id';
import { Checkpoint } from '../../domain/threads/checkpoints/entities/checkpoint';
import { CheckpointType } from '../../domain/threads/checkpoints/value-objects/checkpoint-type';
import { ICheckpointRepository } from '../../domain/threads/checkpoints/repositories/checkpoint-repository';
import { ILogger } from '../../domain/common/types/logger-types';
import { Thread } from '../../domain/threads/entities/thread';
import { CheckpointSerializationUtils } from './utils/serialization-utils';
import { FormatConverter, DataFormat } from '../../infrastructure/common/utils/format-converter';
import { StatisticsUtils } from '../../infrastructure/common/utils/statistics-utils';
import { CheckpointCleanup } from './checkpoint-cleanup';
import { EntityNotFoundError, ValidationError } from '../../domain/common/exceptions';

/**
 * 检查点管理服务
 *
 * 负责检查点的管理操作，包括创建、查询、清理和统计
 * Checkpoint 专注于 Thread 的状态记录
 * 
 * 设计原则：
 * - Thread 是唯一的执行引擎，负责实际的 workflow 执行和状态管理
 * - Checkpoint 只记录 Thread 的状态快照
 * - Session 的状态通过聚合其 Thread 的 checkpoint 间接获取
 */
export class CheckpointManagement {
  private readonly cleanupService: CheckpointCleanup;

  constructor(
    private readonly repository: ICheckpointRepository,
    private readonly logger: ILogger
  ) {
    this.cleanupService = new CheckpointCleanup(repository, logger);
  }

  /**
   * 创建 Thread 检查点
   */
  async createThreadCheckpoint(
    thread: Thread,
    type: CheckpointType,
    title?: string,
    description?: string,
    tags?: string[],
    metadata?: Record<string, unknown>,
    expirationHours?: number
  ): Promise<Checkpoint> {
    const stateData = CheckpointSerializationUtils.serializeThreadState(thread);

    const checkpoint = Checkpoint.create(
      thread.id,
      type,
      stateData,
      title || `Thread Checkpoint - ${thread.id.value}`,
      description || `Automatic checkpoint for thread ${thread.id.value}`,
      tags,
      {
        ...metadata,
        threadId: thread.id.value,
        sessionId: thread.sessionId.value,
        workflowId: thread.workflowId.value,
        status: thread.status,
        createdAt: new Date().toISOString(),
      },
      expirationHours
    );

    await this.repository.save(checkpoint);
    this.logger.info('Thread 检查点创建成功', {
      checkpointId: checkpoint.checkpointId.value,
      threadId: thread.id.value,
      type: type.value,
    });

    return checkpoint;
  }

  /**
   * 查询 Thread 的所有检查点
   */
  async getThreadCheckpoints(threadId: ID): Promise<Checkpoint[]> {
    return await this.repository.findByThreadId(threadId);
  }

  /**
   * 获取 Thread 的最新检查点
   */
  async getLatestThreadCheckpoint(threadId: ID): Promise<Checkpoint | null> {
    return await this.repository.getLatest(threadId);
  }

  /**
   * 按类型查询检查点
   */
  async getCheckpointsByType(type: CheckpointType): Promise<Checkpoint[]> {
    return await this.repository.findByType(type);
  }

  /**
   * 按状态查询检查点
   */
  async getCheckpointsByStatus(status: any): Promise<Checkpoint[]> {
    return await this.repository.findByStatus(status);
  }

  /**
   * 标记检查点已恢复
   */
  async markCheckpointRestored(checkpointId: ID): Promise<void> {
    const checkpoint = await this.repository.findById(checkpointId);
    if (!checkpoint) {
      throw new EntityNotFoundError('Checkpoint', checkpointId.value);
    }

    checkpoint.markRestored();
    await this.repository.save(checkpoint);
    this.logger.info('检查点已标记为恢复', {
      checkpointId: checkpointId.value,
      restoreCount: checkpoint.restoreCount,
    });
  }

  /**
   * 清理过期检查点
   * 委托给 CheckpointCleanup 服务
   */
  async cleanupExpiredCheckpoints(): Promise<number> {
    return await this.cleanupService.cleanupExpiredCheckpoints();
  }

  /**
   * 清理多余检查点（保留最新的N个）
   * 委托给 CheckpointCleanup 服务
   */
  async cleanupExcessCheckpoints(threadId: ID, maxCount: number): Promise<number> {
    return await this.cleanupService.cleanupExcessCheckpoints(threadId, maxCount);
  }

  /**
   * 归档旧检查点
   * 委托给 CheckpointCleanup 服务
   */
  async archiveOldCheckpoints(threadId: ID, days: number): Promise<number> {
    return await this.cleanupService.archiveOldCheckpoints(threadId, days);
  }

  /**
   * 获取检查点统计信息
   */
  async getCheckpointStatistics(): Promise<{
    total: number;
    byType: Record<string, number>;
    totalSizeBytes: number;
    averageSizeBytes: number;
  }> {
    const allCheckpoints = await this.repository.findAll();
    return StatisticsUtils.calculateSizeStatistics(allCheckpoints);
  }

  /**
   * 获取恢复统计信息
   */
  async getRestoreStatistics(): Promise<{
    totalRestores: number;
    byType: Record<string, number>;
    mostRestoredCheckpointId: string | null;
  }> {
    const allCheckpoints = await this.repository.findAll();
    const stats = StatisticsUtils.calculateRestoreStatistics(allCheckpoints);
    return {
      ...stats,
      mostRestoredCheckpointId: stats.mostRestoredId,
    };
  }

  /**
   * 延长检查点过期时间
   */
  async extendCheckpointExpiration(checkpointId: ID, hours: number): Promise<boolean> {
    const checkpoint = await this.repository.findById(checkpointId);
    if (!checkpoint) {
      return false;
    }

    checkpoint.extendExpiration(hours);
    await this.repository.save(checkpoint);
    return true;
  }

  /**
   * 合并检查点
   */
  async mergeCheckpoints(
    checkpointIds: ID[],
    title?: string,
    description?: string
  ): Promise<Checkpoint> {
    const checkpoints = await Promise.all(checkpointIds.map(id => this.repository.findById(id)));

    const validCheckpoints = checkpoints.filter(cp => cp !== null) as Checkpoint[];
    if (validCheckpoints.length === 0) {
      throw new ValidationError('没有找到有效的检查点');
    }

    // 使用最新的检查点作为基础
    const latest = validCheckpoints.reduce((prev, current) =>
      prev.createdAt.toISOString() > current.createdAt.toISOString() ? prev : current
    );

    const mergedStateData = { ...latest.stateData };
    const mergedMetadata = {
      ...latest.metadata,
      mergedFrom: checkpointIds.map(id => id.toString()),
      mergedAt: new Date().toISOString(),
    };

    const merged = Checkpoint.create(
      latest.threadId,
      CheckpointType.manual(),
      mergedStateData,
      title || `合并检查点 (${checkpointIds.length}个)`,
      description,
      ['merged'],
      mergedMetadata,
      undefined
    );

    await this.repository.save(merged);
    return merged;
  }

  /**
   * 导出检查点
   */
  async exportCheckpoint(checkpointId: ID, format: DataFormat): Promise<string> {
    const checkpoint = await this.repository.findById(checkpointId);
    if (!checkpoint) {
      throw new EntityNotFoundError('Checkpoint', checkpointId.toString());
    }

    const data = checkpoint.toDict();
    return FormatConverter.convertToFormat(data, format);
  }

  /**
   * 导入检查点
   */
  async importCheckpoint(
    threadId: ID,
    data: string,
    format: DataFormat
  ): Promise<Checkpoint> {
    const parsedData = FormatConverter.parseFromFormat(data, format);
    const checkpoint = Checkpoint.fromDict(parsedData);
    await this.repository.save(checkpoint);
    return checkpoint;
  }
}