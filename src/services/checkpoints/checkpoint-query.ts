import { ID } from '../../domain/common/value-objects/id';
import { Checkpoint } from '../../domain/threads/checkpoints/entities/checkpoint';
import { CheckpointStatistics } from '../../domain/threads/checkpoints/value-objects/checkpoint-statistics';
import { ICheckpointRepository } from '../../domain/threads/checkpoints/repositories/checkpoint-repository';
import { ILogger } from '../../domain/common/types/logger-types';

/**
 * 检查点查询服务
 *
 * 负责查询和统计检查点信息
 */
export class CheckpointQuery {
  constructor(
    private readonly repository: ICheckpointRepository,
    private readonly logger: ILogger
  ) {}

  /**
   * 获取线程的检查点历史
   */
  async getThreadCheckpointHistory(threadId: ID, limit?: number): Promise<Checkpoint[]> {
    return await this.repository.getThreadHistory(threadId, limit);
  }

  /**
   * 获取检查点统计信息
   */
  async getCheckpointStatistics(threadId?: ID): Promise<CheckpointStatistics> {
    const checkpoints = threadId
      ? await this.repository.findByThreadId(threadId)
      : await this.repository.findAll();

    return CheckpointStatistics.fromCheckpoints(checkpoints);
  }
}