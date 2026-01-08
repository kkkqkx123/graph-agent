import { ID } from '../../domain/common/value-objects/id';
import { ThreadCheckpoint } from '../../domain/threads/checkpoints/entities/thread-checkpoint';
import { IThreadCheckpointRepository } from '../../domain/threads/checkpoints/repositories/thread-checkpoint-repository';
import { ILogger } from '../../domain/common/types/logger-types';

/**
 * 检查点清理服务
 *
 * 负责清理和归档检查点
 */
export class CheckpointCleanup {
  constructor(
    private readonly repository: IThreadCheckpointRepository,
    private readonly logger: ILogger
  ) {}

  /**
   * 清理过期检查点
   */
  async cleanupExpiredCheckpoints(threadId?: ID): Promise<number> {
    const checkpoints = threadId
      ? await this.repository.findByThreadId(threadId)
      : await this.repository.findAll();

    const expiredCheckpoints = checkpoints.filter(cp => cp.isExpired());
    let cleanedCount = 0;

    for (const checkpoint of expiredCheckpoints) {
      checkpoint.markExpired();
      await this.repository.save(checkpoint);
      cleanedCount++;
    }

    return cleanedCount;
  }

  /**
   * 清理多余的检查点
   */
  async cleanupExcessCheckpoints(threadId: ID, maxCount: number): Promise<number> {
    const checkpoints = await this.repository.findByThreadId(threadId);
    if (checkpoints.length <= maxCount) {
      return 0;
    }

    // 按创建时间排序，保留最新的maxCount个
    checkpoints.sort((a, b) => b.createdAt.toISOString().localeCompare(a.createdAt.toISOString()));
    const toDelete = checkpoints.slice(maxCount);

    let deletedCount = 0;
    for (const checkpoint of toDelete) {
      await this.repository.delete(checkpoint);
      deletedCount++;
    }

    return deletedCount;
  }

  /**
   * 归档旧检查点
   */
  async archiveOldCheckpoints(threadId: ID, days: number): Promise<number> {
    const checkpoints = await this.repository.findByThreadId(threadId);
    const cutoffTime = new Date();
    cutoffTime.setDate(cutoffTime.getDate() - days);

    const oldCheckpoints = checkpoints.filter(cp => cp.createdAt.getDate() < cutoffTime);

    let archivedCount = 0;

    for (const checkpoint of oldCheckpoints) {
      checkpoint.markArchived();
      await this.repository.save(checkpoint);
      archivedCount++;
    }

    return archivedCount;
  }
}
