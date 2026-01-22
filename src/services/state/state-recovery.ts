import { injectable, inject } from 'inversify';
import { ID } from '../../domain/common/value-objects/id';
import { Checkpoint } from '../../domain/threads/checkpoints/entities/checkpoint';
import { ICheckpointRepository } from '../../domain/threads/checkpoints/repositories/checkpoint-repository';
import { Thread } from '../../domain/threads/entities/thread';
import { ILogger } from '../../domain/common/types/logger-types';
import { TYPES } from '../../di/service-keys';

/**
 * 状态恢复服务
 *
 * 注意：Thread 的检查点恢复功能已迁移到 WorkflowEngine 和 CheckpointManager
 * 此服务现在主要负责：
 * 1. 验证恢复条件
 * 2. 获取恢复历史
 * 3. 推荐最佳恢复点
 *
 * 实际的恢复操作应该通过 WorkflowEngine.resumeFromCheckpoint() 方法执行
 */
@injectable()
export class StateRecovery {
  constructor(
    @inject(TYPES.CheckpointRepository)
    private readonly checkpointRepository: ICheckpointRepository,
    @inject(TYPES.Logger) private readonly logger: ILogger
  ) {}

  /**
   * 从Checkpoint恢复Thread
   *
   * @deprecated 请使用 WorkflowEngine.resumeFromCheckpoint() 方法
   * 此方法保留用于向后兼容，但不再执行实际的恢复操作
   */
  public async restoreThreadFromCheckpoint(thread: Thread, checkpointId: ID): Promise<Thread> {
    // 1. 获取Checkpoint
    const checkpoint = await this.checkpointRepository.findById(checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${checkpointId.value}`);
    }

    // 2. 验证Checkpoint是否属于该Thread
    if (!checkpoint.threadId.equals(thread.threadId)) {
      throw new Error(`Checkpoint ${checkpointId.value} does not belong to thread ${thread.threadId.value}`);
    }

    // 3. 验证Checkpoint是否已删除
    if (checkpoint.isDeleted()) {
      throw new Error(`Checkpoint ${checkpointId.value} is deleted`);
    }

    // 4. 记录恢复日志
    this.logger.info('Thread从Checkpoint恢复', {
      threadId: thread.threadId.value,
      sessionId: thread.sessionId?.value,
      checkpointId: checkpointId.value,
      checkpointType: checkpoint.type.toString(),
      restoredAt: new Date().toISOString(),
    });

    // 注意：实际的恢复操作应该通过 WorkflowEngine.resumeFromCheckpoint() 执行
    // 这里只返回原始的 thread 对象
    return thread;
  }

  /**
   * 验证恢复条件
   */
  public async validateRecoveryConditions(
    threadId: ID,
    checkpointId?: ID
  ): Promise<{
    canRestore: boolean;
    reason?: string;
    availableCheckpoints: Checkpoint[];
  }> {
    const availableCheckpoints = await this.checkpointRepository.findByThreadId(threadId);

    // 如果指定了Checkpoint，验证其有效性
    if (checkpointId) {
      const checkpoint = availableCheckpoints.find(cp => cp.checkpointId.equals(checkpointId));
      if (!checkpoint) {
        return {
          canRestore: false,
          reason: `Checkpoint ${checkpointId.value} not found`,
          availableCheckpoints,
        };
      }

      if (checkpoint.isDeleted()) {
        return {
          canRestore: false,
          reason: `Checkpoint ${checkpointId.value} is deleted`,
          availableCheckpoints,
        };
      }
    }

    // 如果没有指定Checkpoint，检查是否有可用的
    if (!checkpointId) {
      if (availableCheckpoints.length === 0) {
        return {
          canRestore: false,
          reason: 'No checkpoints available for restoration',
          availableCheckpoints,
        };
      }
    }

    return {
      canRestore: true,
      availableCheckpoints,
    };
  }

  /**
   * 获取Thread的恢复历史
   */
  public async getThreadRecoveryHistory(threadId: ID): Promise<{
    checkpointRestores: Checkpoint[];
  }> {
    // 获取所有Thread的Checkpoint
    const checkpoints = await this.checkpointRepository.findByThreadId(threadId);
    const checkpointRestores = checkpoints.filter((cp: Checkpoint) => !cp.isDeleted());

    return {
      checkpointRestores,
    };
  }

  /**
   * 获取最佳恢复点
   */
  public async getBestRecoveryPoint(threadId: ID): Promise<{
    type: 'checkpoint';
    point: Checkpoint;
    reason: string;
  } | null> {
    const checkpoints = await this.checkpointRepository.findByThreadId(threadId);

    // 优先选择最新的里程碑Checkpoint
    const milestoneCheckpoints = checkpoints.filter((cp: Checkpoint) => cp.type.isMilestone());
    if (milestoneCheckpoints.length > 0) {
      const latest = milestoneCheckpoints.sort((a: Checkpoint, b: Checkpoint) =>
        b.createdAt.differenceInSeconds(a.createdAt)
      )[0];
      if (latest) {
        return {
          type: 'checkpoint',
          point: latest,
          reason: 'Latest milestone checkpoint',
        };
      }
    }

    // 其次选择最新的手动Checkpoint
    const manualCheckpoints = checkpoints.filter((cp: Checkpoint) => cp.type.isManual());
    if (manualCheckpoints.length > 0) {
      const latest = manualCheckpoints.sort((a: Checkpoint, b: Checkpoint) =>
        b.createdAt.differenceInSeconds(a.createdAt)
      )[0];
      if (latest) {
        return {
          type: 'checkpoint',
          point: latest,
          reason: 'Latest manual checkpoint',
        };
      }
    }

    // 最后选择最新的自动Checkpoint
    const autoCheckpoints = checkpoints.filter((cp: Checkpoint) => cp.type.isAuto());
    if (autoCheckpoints.length > 0) {
      const latest = autoCheckpoints.sort((a: Checkpoint, b: Checkpoint) =>
        b.createdAt.differenceInSeconds(a.createdAt)
      )[0];
      if (latest) {
        return {
          type: 'checkpoint',
          point: latest,
          reason: 'Latest automatic checkpoint',
        };
      }
    }

    return null;
  }
}