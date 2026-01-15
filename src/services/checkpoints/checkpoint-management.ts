import { ID } from '../../domain/common/value-objects/id';
import { ThreadCheckpoint } from '../../domain/threads/checkpoints/entities/thread-checkpoint';
import { CheckpointType } from '../../domain/checkpoint/value-objects/checkpoint-type';
import { CheckpointScope } from '../../domain/threads/checkpoints/value-objects/checkpoint-scope';
import { IThreadCheckpointRepository } from '../../domain/threads/checkpoints/repositories/thread-checkpoint-repository';
import { ILogger } from '../../domain/common/types/logger-types';
import { Thread } from '../../domain/threads/entities/thread';
import { Session } from '../../domain/sessions/entities/session';

/**
 * 检查点管理服务
 *
 * 负责检查点的管理操作，包括创建、查询、清理和统计
 * 支持Thread、Session和Global三种范围的检查点
 */
export class CheckpointManagement {
  constructor(
    private readonly repository: IThreadCheckpointRepository,
    private readonly logger: ILogger
  ) {}

  /**
   * 创建Thread检查点
   */
  async createThreadCheckpoint(
    thread: Thread,
    type: CheckpointType,
    title?: string,
    description?: string,
    tags?: string[],
    metadata?: Record<string, unknown>,
    expirationHours?: number
  ): Promise<ThreadCheckpoint> {
    const stateData = this.serializeThreadState(thread);

    const checkpoint = ThreadCheckpoint.create(
      thread.id,
      CheckpointScope.thread(),
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
      expirationHours,
      thread.id
    );

    await this.repository.save(checkpoint);
    this.logger.info('Thread检查点创建成功', {
      checkpointId: checkpoint.checkpointId.value,
      threadId: thread.id.value,
      type: type.value,
    });

    return checkpoint;
  }

  /**
   * 创建Session检查点
   */
  async createSessionCheckpoint(
    session: Session,
    type: CheckpointType,
    title?: string,
    description?: string,
    tags?: string[],
    metadata?: Record<string, unknown>,
    expirationHours?: number
  ): Promise<ThreadCheckpoint> {
    const stateData = this.serializeSessionState(session);

    const checkpoint = ThreadCheckpoint.create(
      ID.generate(), // Session检查点使用生成的ID作为threadId
      CheckpointScope.session(),
      type,
      stateData,
      title || `Session Checkpoint - ${session.id.value}`,
      description || `Automatic checkpoint for session ${session.id.value}`,
      tags,
      {
        ...metadata,
        sessionId: session.id.value,
        threadCount: session.threadCount,
        status: session.status.value,
        createdAt: new Date().toISOString(),
      },
      expirationHours,
      session.id
    );

    await this.repository.save(checkpoint);
    this.logger.info('Session检查点创建成功', {
      checkpointId: checkpoint.checkpointId.value,
      sessionId: session.id.value,
      type: type.value,
    });

    return checkpoint;
  }

  /**
   * 创建全局检查点
   */
  async createGlobalCheckpoint(
    type: CheckpointType,
    title?: string,
    description?: string,
    tags?: string[],
    metadata?: Record<string, unknown>,
    expirationHours?: number
  ): Promise<ThreadCheckpoint> {
    const stateData = {
      timestamp: new Date().toISOString(),
      checkpointType: type.value,
    };

    const checkpoint = ThreadCheckpoint.create(
      ID.generate(), // 全局检查点使用生成的ID作为threadId
      CheckpointScope.global(),
      type,
      stateData,
      title || `Global Checkpoint - ${new Date().toISOString()}`,
      description || 'Global system checkpoint',
      tags,
      {
        ...metadata,
        createdAt: new Date().toISOString(),
      },
      expirationHours
    );

    await this.repository.save(checkpoint);
    this.logger.info('全局检查点创建成功', {
      checkpointId: checkpoint.checkpointId.value,
      type: type.value,
    });

    return checkpoint;
  }

  /**
   * 查询Thread的所有检查点
   */
  async getThreadCheckpoints(threadId: ID): Promise<ThreadCheckpoint[]> {
    return await this.repository.findByScopeAndTarget(CheckpointScope.thread(), threadId);
  }

  /**
   * 查询Session的所有检查点
   */
  async getSessionCheckpoints(sessionId: ID): Promise<ThreadCheckpoint[]> {
    return await this.repository.findByScopeAndTarget(CheckpointScope.session(), sessionId);
  }

  /**
   * 查询所有全局检查点
   */
  async getGlobalCheckpoints(): Promise<ThreadCheckpoint[]> {
    return await this.repository.findByScope(CheckpointScope.global());
  }

  /**
   * 获取Thread的最新检查点
   */
  async getLatestThreadCheckpoint(threadId: ID): Promise<ThreadCheckpoint | null> {
    const checkpoints = await this.getThreadCheckpoints(threadId);
    if (checkpoints.length === 0) {
      return null;
    }
    const sortedCheckpoints = checkpoints.sort((a, b) =>
      b.createdAt.differenceInSeconds(a.createdAt)
    );
    return sortedCheckpoints[0] || null;
  }

  /**
   * 获取Session的最新检查点
   */
  async getLatestSessionCheckpoint(sessionId: ID): Promise<ThreadCheckpoint | null> {
    const checkpoints = await this.getSessionCheckpoints(sessionId);
    if (checkpoints.length === 0) {
      return null;
    }
    const sortedCheckpoints = checkpoints.sort((a, b) =>
      b.createdAt.differenceInSeconds(a.createdAt)
    );
    return sortedCheckpoints[0] || null;
  }

  /**
   * 按类型查询检查点
   */
  async getCheckpointsByType(type: CheckpointType): Promise<ThreadCheckpoint[]> {
    const allCheckpoints = await this.repository.findAll();
    return allCheckpoints.filter(checkpoint => checkpoint.type.equals(type));
  }

  /**
   * 按范围查询检查点
   */
  async getCheckpointsByScope(scope: CheckpointScope): Promise<ThreadCheckpoint[]> {
    return await this.repository.findByScope(scope);
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

    const sortedCheckpoints = checkpoints.sort((a, b) =>
      b.createdAt.differenceInSeconds(a.createdAt)
    );

    const checkpointsToDelete = sortedCheckpoints.slice(maxCount);
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
    byScope: Record<string, number>;
    totalSizeBytes: number;
    averageSizeBytes: number;
  }> {
    const allCheckpoints = await this.repository.findAll();

    const byType: Record<string, number> = {};
    const byScope: Record<string, number> = {};
    let totalSizeBytes = 0;

    for (const checkpoint of allCheckpoints) {
      const type = checkpoint.type.toString();
      const scope = checkpoint.scope.toString();

      byType[type] = (byType[type] || 0) + 1;
      byScope[scope] = (byScope[scope] || 0) + 1;
      totalSizeBytes += checkpoint.sizeBytes;
    }

    return {
      total: allCheckpoints.length,
      byType,
      byScope,
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
    byScope: Record<string, number>;
    mostRestoredCheckpointId: string | null;
  }> {
    const allCheckpoints = await this.repository.findAll();

    const byType: Record<string, number> = {};
    const byScope: Record<string, number> = {};
    let totalRestores = 0;
    let mostRestoredCheckpoint: ThreadCheckpoint | null = null;

    for (const checkpoint of allCheckpoints) {
      const type = checkpoint.type.toString();
      const scope = checkpoint.scope.toString();
      const restoreCount = checkpoint.restoreCount;

      byType[type] = (byType[type] || 0) + restoreCount;
      byScope[scope] = (byScope[scope] || 0) + restoreCount;
      totalRestores += restoreCount;

      if (!mostRestoredCheckpoint || restoreCount > mostRestoredCheckpoint.restoreCount) {
        mostRestoredCheckpoint = checkpoint;
      }
    }

    return {
      totalRestores,
      byType,
      byScope,
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
  ): Promise<ThreadCheckpoint> {
    const checkpoints = await Promise.all(checkpointIds.map(id => this.repository.findById(id)));

    const validCheckpoints = checkpoints.filter(cp => cp !== null) as ThreadCheckpoint[];
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

    const merged = ThreadCheckpoint.create(
      latest.threadId,
      latest.scope,
      CheckpointType.manual(),
      mergedStateData,
      title || `合并检查点 (${checkpointIds.length}个)`,
      description,
      ['merged'],
      mergedMetadata,
      undefined,
      latest.targetId
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
  ): Promise<ThreadCheckpoint> {
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

    const checkpoint = ThreadCheckpoint.fromDict(parsedData);
    await this.repository.save(checkpoint);
    return checkpoint;
  }

  /**
   * 序列化Thread状态
   */
  private serializeThreadState(thread: Thread): Record<string, unknown> {
    return {
      threadId: thread.id.value,
      sessionId: thread.sessionId.value,
      workflowId: thread.workflowId.value,
      status: thread.status,
      execution: thread.execution,
      createdAt: thread.createdAt.toISOString(),
      updatedAt: thread.updatedAt.toISOString(),
    };
  }

  /**
   * 序列化Session状态
   */
  private serializeSessionState(session: Session): Record<string, unknown> {
    return {
      sessionId: session.id.value,
      threadCount: session.threadCount,
      status: session.status.value,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }
}
