import { ID } from '../../domain/common/value-objects/id';
import { ThreadCheckpoint } from '../../domain/threads/checkpoints/entities/thread-checkpoint';
import { CheckpointType } from '../../domain/checkpoint/value-objects/checkpoint-type';
import { IThreadCheckpointRepository } from '../../domain/threads/checkpoints/repositories/thread-checkpoint-repository';
import { ILogger } from '../../domain/common/types/logger-types';

/**
 * 检查点备份服务
 *
 * 负责检查点的备份和备份链管理
 */
export class CheckpointBackup {
  constructor(
    private readonly repository: IThreadCheckpointRepository,
    private readonly logger: ILogger
  ) {}

  /**
   * 创建检查点备份
   */
  async createBackup(checkpointId: ID): Promise<ThreadCheckpoint> {
    const original = await this.repository.findById(checkpointId);
    if (!original) {
      throw new Error('原始检查点不存在');
    }

    const backupMetadata = {
      ...original.metadata,
      backupOf: checkpointId.toString(),
      backupTimestamp: new Date().toISOString(),
    };

    const backup = ThreadCheckpoint.create(
      original.threadId,
      CheckpointType.manual(),
      original.stateData,
      `${original.title || '检查点'} - 备份`,
      original.description,
      [...original.tags, 'backup'],
      backupMetadata
    );

    await this.repository.save(backup);
    return backup;
  }

  /**
   * 从备份恢复
   */
  async restoreFromBackup(backupId: ID): Promise<Record<string, unknown> | null> {
    const checkpoint = await this.repository.findById(backupId);
    if (!checkpoint || !checkpoint.canRestore()) {
      return null;
    }

    checkpoint.markRestored();
    await this.repository.save(checkpoint);

    return checkpoint.stateData;
  }

  /**
   * 获取备份链
   */
  async getBackupChain(checkpointId: ID): Promise<ThreadCheckpoint[]> {
    const checkpoint = await this.repository.findById(checkpointId);
    if (!checkpoint) {
      return [];
    }

    // 查找所有带有backup标签的检查点
    const allCheckpoints = await this.repository.findByThreadId(checkpoint.threadId);
    const backupCheckpoints = allCheckpoints.filter(
      cp => cp.tags.includes('backup') && cp.metadata?.['backupOf'] === checkpointId.toString()
    );

    return backupCheckpoints;
  }
}
