import { ID } from '../../domain/common/value-objects/id';
import { ThreadCheckpoint } from '../../domain/threads/checkpoints/entities/thread-checkpoint';
import { IThreadCheckpointRepository } from '../../domain/threads/checkpoints/repositories/thread-checkpoint-repository';
import { ILogger } from '../../domain/common/types/logger-types';

/**
 * 检查点恢复服务
 *
 * 负责检查点的恢复操作
 */
export class CheckpointRestoreService {
  constructor(
    private readonly repository: IThreadCheckpointRepository,
    private readonly logger: ILogger
  ) {}

  /**
   * 从检查点恢复状态
   */
  async restoreFromCheckpoint(checkpointId: ID): Promise<Record<string, unknown> | null> {
    const checkpoint = await this.repository.findById(checkpointId);
    if (!checkpoint || !checkpoint.canRestore()) {
      return null;
    }

    checkpoint.markRestored();
    await this.repository.save(checkpoint);

    return checkpoint.stateData;
  }
}