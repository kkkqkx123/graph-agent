import { ID } from '../../domain/common/value-objects/id';
import { Checkpoint } from '../../domain/threads/checkpoints/entities/checkpoint';
import { ICheckpointRepository } from '../../domain/threads/checkpoints/repositories/checkpoint-repository';
import { ILogger } from '../../domain/common/types/logger-types';
import { Timestamp } from '../../domain/common/value-objects/timestamp';

/**
 * 检查点清理服务
 *
 * 负责清理过期、多余和旧的检查点
 */
export class CheckpointCleanup {
  constructor(
    private readonly repository: ICheckpointRepository,
    private readonly logger: ILogger
  ) {}

  /**
   * 清理过期检查点
   */
  async cleanupExpiredCheckpoints(threadId?: ID): Promise<number> {
    const checkpoints = threadId
      ? await this.repository.findByThreadId(threadId)
      : await this.repository.findAll();

    const expiredCheckpoints = checkpoints.filter((cp: Checkpoint) => cp.isExpired());
    let deletedCount = 0;

    for (const checkpoint of expiredCheckpoints) {
      await this.repository.deleteById(checkpoint.checkpointId);
      deletedCount++;
    }

    this.logger.info('过期检查点清理完成', { threadId: threadId?.value, deletedCount });
    return deletedCount;
  }

  /**
   * 清理多余检查点
   */
  async cleanupExcessCheckpoints(threadId: ID, maxCount: number): Promise<number> {
    const checkpoints = await this.repository.findByThreadId(threadId);

    if (checkpoints.length <= maxCount) {
      return 0;
    }

    checkpoints.sort((a: Checkpoint, b: Checkpoint) => 
      b.createdAt.toISOString().localeCompare(a.createdAt.toISOString())
    );

    const checkpointsToDelete = checkpoints.slice(maxCount);
    let deletedCount = 0;

    for (const checkpoint of checkpointsToDelete) {
      await this.repository.deleteById(checkpoint.checkpointId);
      deletedCount++;
    }

    this.logger.info('多余检查点清理完成', { threadId: threadId.value, maxCount, deletedCount });
    return deletedCount;
  }

  /**
   * 归档旧检查点
   */
  async archiveOldCheckpoints(threadId: ID, days: number): Promise<number> {
    const checkpoints = await this.repository.findByThreadId(threadId);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffTime = Timestamp.create(cutoffDate);

    const oldCheckpoints = checkpoints.filter((cp: Checkpoint) =>
      cp.createdAt.isBefore(cutoffTime)
    );
    let archivedCount = 0;

    for (const checkpoint of oldCheckpoints) {
      checkpoint.markArchived();
      await this.repository.save(checkpoint);
      archivedCount++;
    }

    this.logger.info('旧检查点归档完成', { threadId: threadId.value, days, archivedCount });
    return archivedCount;
  }
}