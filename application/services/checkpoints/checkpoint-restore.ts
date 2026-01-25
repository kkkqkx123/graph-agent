import { ID } from '../../domain/common/value-objects/id';
import { Checkpoint } from '../../domain/threads/checkpoints/entities/checkpoint';
import { ICheckpointRepository } from '../../domain/threads/checkpoints/repositories/checkpoint-repository';
import { ILogger } from '../../domain/common/types/logger-types';

/**
 * 检查点恢复服务
 *
 * 负责检查点的恢复操作
 */
export class CheckpointRestore {
  constructor(
    private readonly repository: ICheckpointRepository,
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
