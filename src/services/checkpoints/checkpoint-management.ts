import { ID } from '../../domain/common/value-objects/id';
import { Checkpoint } from '../../domain/threads/checkpoints/entities/checkpoint';
import { CheckpointType } from '../../domain/threads/checkpoints/value-objects/checkpoint-type';
import { ICheckpointRepository } from '../../domain/threads/checkpoints/repositories/checkpoint-repository';
import { ILogger } from '../../domain/common/types/logger-types';
import { Thread, ThreadProps } from '../../domain/threads/entities/thread';
import { State } from '../../domain/state/entities/state';
import { StateId } from '../../domain/state/value-objects/state-id';
import { StateEntityType } from '../../domain/state/value-objects/state-entity-type';
import { ThreadPriority } from '../../domain/threads/value-objects/thread-priority';
import { DeletionStatus } from '../../domain/common/value-objects/deletion-status';
import { Metadata } from '../../domain/common/value-objects/metadata';
import { Version } from '../../domain/common/value-objects/version';
import { Timestamp } from '../../domain/common/value-objects/timestamp';
import { ExecutionContext, ExecutionConfig } from '../../domain/threads/value-objects/execution-context';

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
  constructor(
    private readonly repository: ICheckpointRepository,
    private readonly logger: ILogger
  ) {}

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
    const stateData = this.serializeThreadState(thread);

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
      throw new Error(`Checkpoint not found: ${checkpointId.value}`);
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
   */
  async cleanupExpiredCheckpoints(): Promise<number> {
    const allCheckpoints = await this.repository.findAll();
    const expiredCheckpoints = allCheckpoints.filter(cp => cp.isExpired());
    let deletedCount = 0;

    for (const checkpoint of expiredCheckpoints) {
      await this.repository.deleteById(checkpoint.checkpointId);
      deletedCount++;
    }

    this.logger.info('过期检查点清理完成', { deletedCount });
    return deletedCount;
  }

  /**
   * 清理多余检查点（保留最新的N个）
   */
  async cleanupExcessCheckpoints(threadId: ID, maxCount: number): Promise<number> {
    const checkpoints = await this.getThreadCheckpoints(threadId);

    if (checkpoints.length <= maxCount) {
      return 0;
    }

    const checkpointsToDelete = checkpoints.slice(maxCount);
    let deletedCount = 0;

    for (const checkpoint of checkpointsToDelete) {
      await this.repository.deleteById(checkpoint.checkpointId);
      deletedCount++;
    }

    this.logger.info('多余检查点清理完成', {
      threadId: threadId.value,
      deletedCount,
    });
    return deletedCount;
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

    const byType: Record<string, number> = {};
    let totalSizeBytes = 0;

    for (const checkpoint of allCheckpoints) {
      const type = checkpoint.type.toString();
      byType[type] = (byType[type] || 0) + 1;
      totalSizeBytes += checkpoint.sizeBytes;
    }

    return {
      total: allCheckpoints.length,
      byType,
      totalSizeBytes,
      averageSizeBytes: totalSizeBytes / Math.max(allCheckpoints.length, 1),
    };
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

    const byType: Record<string, number> = {};
    let totalRestores = 0;
    let mostRestoredCheckpoint: Checkpoint | null = null;

    for (const checkpoint of allCheckpoints) {
      const type = checkpoint.type.toString();
      const restoreCount = checkpoint.restoreCount;

      byType[type] = (byType[type] || 0) + restoreCount;
      totalRestores += restoreCount;

      if (!mostRestoredCheckpoint || restoreCount > mostRestoredCheckpoint.restoreCount) {
        mostRestoredCheckpoint = checkpoint;
      }
    }

    return {
      totalRestores,
      byType,
      mostRestoredCheckpointId: mostRestoredCheckpoint?.checkpointId.value || null,
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
      throw new Error('没有找到有效的检查点');
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
  async exportCheckpoint(checkpointId: ID, format: 'json' | 'yaml' | 'xml'): Promise<string> {
    const checkpoint = await this.repository.findById(checkpointId);
    if (!checkpoint) {
      throw new Error('检查点不存在');
    }

    const data = checkpoint.toDict();

    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'yaml':
        // 简化实现，实际需要yaml库
        return `# YAML export\n${JSON.stringify(data, null, 2)}`;
      case 'xml':
        // 简化实现，实际需要xml库
        return `<?xml version="1.0"?>\n<checkpoint>${JSON.stringify(data)}</checkpoint>`;
      default:
        throw new Error(`不支持的导出格式: ${format}`);
    }
  }

  /**
   * 导入检查点
   */
  async importCheckpoint(
    threadId: ID,
    data: string,
    format: 'json' | 'yaml' | 'xml'
  ): Promise<Checkpoint> {
    let parsedData: Record<string, unknown>;

    try {
      switch (format) {
        case 'json':
          parsedData = JSON.parse(data);
          break;
        case 'yaml':
        case 'xml':
          // 简化实现
          parsedData = JSON.parse(data);
          break;
        default:
          throw new Error(`不支持的导入格式: ${format}`);
      }
    } catch (error) {
      throw new Error(`数据解析失败: ${error}`);
    }

    const checkpoint = Checkpoint.fromDict(parsedData);
    await this.repository.save(checkpoint);
    return checkpoint;
  }

  /**
   * 序列化 Thread 完整状态
   * 包含 Thread 的所有属性和完整的 State 实体
   */
  private serializeThreadState(thread: Thread): Record<string, unknown> {
    return {
      // Thread 基本信息
      threadId: thread.id.value,
      sessionId: thread.sessionId.value,
      workflowId: thread.workflowId.value,
      title: thread.title,
      description: thread.description,
      priority: thread.priority.toString(),
      
      // Thread 状态（包含完整 State）
      status: thread.status,
      execution: thread.execution,
      
      // ✅ 完整序列化 State 实体
      state: {
        data: thread.state.data.toRecord(),
        metadata: thread.state.metadata.toRecord(),
        version: thread.state.version.toString(),
        createdAt: thread.state.createdAt.toISOString(),
        updatedAt: thread.state.updatedAt.toISOString(),
      },
      
      // Thread 元数据
      metadata: thread.metadata.toRecord(),
      
      // 时间戳
      createdAt: thread.createdAt.toISOString(),
      updatedAt: thread.updatedAt.toISOString(),
      version: thread.version.toString(),
    };
  }

  /**
   * 反序列化 Thread 状态
   * 从 Checkpoint 的 stateData 重建 Thread 对象
   */
  private deserializeThreadState(stateData: Record<string, unknown>): Partial<ThreadProps> {
    return {
      id: ID.fromString(stateData['threadId'] as string),
      sessionId: ID.fromString(stateData['sessionId'] as string),
      workflowId: ID.fromString(stateData['workflowId'] as string),
      title: stateData['title'] as string,
      description: stateData['description'] as string,
      priority: ThreadPriority.fromString(stateData['priority'] as string),
      
      // 反序列化 State
      state: State.fromProps({
        id: StateId.generate(), // 创建新的 State ID
        entityId: ID.fromString(stateData['threadId'] as string),
        entityType: StateEntityType.thread(),
        data: (stateData['state'] as any).data,
        metadata: (stateData['state'] as any).metadata,
        version: Version.fromString((stateData['state'] as any).version),
        createdAt: Timestamp.fromString((stateData['state'] as any).createdAt),
        updatedAt: Timestamp.fromString((stateData['state'] as any).updatedAt),
      }),
      
      metadata: Metadata.create(stateData['metadata'] as Record<string, unknown>),
      deletionStatus: DeletionStatus.active(), // 恢复时默认为活跃状态
      createdAt: Timestamp.fromString(stateData['createdAt'] as string),
      updatedAt: Timestamp.fromString(stateData['updatedAt'] as string),
      version: Version.fromString(stateData['version'] as string),
    };
  }
}