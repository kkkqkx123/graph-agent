import { ID } from '../../domain/common/value-objects/id';
import { ThreadCheckpoint } from '../../domain/threads/checkpoints/entities/thread-checkpoint';
import { CheckpointType } from '../../domain/checkpoint/value-objects/checkpoint-type';
import { IThreadCheckpointRepository } from '../../domain/threads/checkpoints/repositories/thread-checkpoint-repository';
import { ILogger } from '../../domain/common/types/logger-types';

/**
 * 检查点管理服务
 *
 * 负责检查点的管理操作
 */
export class CheckpointManagementService {
  constructor(
    private readonly repository: IThreadCheckpointRepository,
    private readonly logger: ILogger
  ) {}

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
      CheckpointType.manual(),
      mergedStateData,
      title || `合并检查点 (${checkpointIds.length}个)`,
      description,
      ['merged'],
      mergedMetadata
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
}