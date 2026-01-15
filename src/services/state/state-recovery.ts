import { injectable, inject } from 'inversify';
import { ID } from '../../domain/common/value-objects/id';
import { ThreadCheckpoint } from '../../domain/threads/checkpoints/entities/thread-checkpoint';
import { CheckpointScope } from '../../domain/threads/checkpoints/value-objects/checkpoint-scope';
import { IThreadCheckpointRepository } from '../../domain/threads/checkpoints/repositories/thread-checkpoint-repository';
import { Thread } from '../../domain/threads/entities/thread';
import { ILogger } from '../../domain/common/types/logger-types';

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
    @inject('ThreadCheckpointRepository')
    private readonly checkpointRepository: IThreadCheckpointRepository,
    @inject('Logger') private readonly logger: ILogger
  ) {}

  /**
   * 从Checkpoint恢复Thread（支持Thread、Session、Global范围）
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

    // 2. 验证Checkpoint范围
    if (!checkpoint.scope.isThread()) {
      throw new Error(`Checkpoint ${checkpointId.value} is not a thread checkpoint`);
    }

    // 3. 验证Checkpoint是否属于该Thread
    if (!checkpoint.targetId?.equals(thread.id)) {
      throw new Error(`Checkpoint ${checkpointId.value} does not belong to thread ${thread.id.value}`);
    }

    // 4. 验证Checkpoint是否已删除
    if (checkpoint.isDeleted()) {
      throw new Error(`Checkpoint ${checkpointId.value} is deleted`);
    }

    // 5. 记录恢复日志
    this.logger.info('Thread从Checkpoint恢复', {
      threadId: thread.threadId.value,
      sessionId: thread.sessionId?.value,
      checkpointId: checkpointId.value,
      checkpointType: checkpoint.type.value,
      restoredAt: new Date().toISOString(),
    });

    // 注意：实际的恢复操作应该通过 WorkflowEngine.resumeFromCheckpoint() 执行
    // 这里只返回原始的 thread 对象
    return thread;
  }

  /**
   * 从Checkpoint恢复Session
   */
  public async restoreSessionFromCheckpoint(sessionId: ID, checkpointId: ID): Promise<void> {
    // 1. 获取Checkpoint
    const checkpoint = await this.checkpointRepository.findById(checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${checkpointId.value}`);
    }

    // 2. 验证Checkpoint范围
    if (!checkpoint.scope.isSession()) {
      throw new Error(`Checkpoint ${checkpointId.value} is not a session checkpoint`);
    }

    // 3. 验证Checkpoint是否属于该Session
    if (!checkpoint.targetId?.equals(sessionId)) {
      throw new Error(`Checkpoint ${checkpointId.value} does not belong to session ${sessionId.value}`);
    }

    // 4. 验证Checkpoint是否可以恢复
    if (!checkpoint.canRestore()) {
      throw new Error(`Checkpoint ${checkpointId.value} cannot be restored`);
    }

    // 5. 反序列化Session状态
    const sessionState = checkpoint.stateData as Record<string, unknown>;

    // 6. 标记Checkpoint已恢复
    checkpoint.markRestored();
    await this.checkpointRepository.save(checkpoint);

    // 7. 记录恢复日志
    this.logger.info('Session从Checkpoint恢复', {
      sessionId: sessionId.value,
      checkpointId: checkpointId.value,
      checkpointType: checkpoint.type.value,
      restoredAt: new Date().toISOString(),
      threadCount: sessionState['threadCount'] as number,
    });

    // 注意：Session的实际恢复逻辑由SessionService处理
    // 这里只负责验证和记录
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
    availableCheckpoints: ThreadCheckpoint[];
  }> {
    const availableCheckpoints = await this.checkpointRepository.findByScopeAndTarget(
      CheckpointScope.thread(),
      threadId
    );

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
    checkpointRestores: ThreadCheckpoint[];
  }> {
    // 获取所有Thread范围的Checkpoint
    const checkpoints = await this.checkpointRepository.findByScopeAndTarget(
      CheckpointScope.thread(),
      threadId
    );
    const checkpointRestores = checkpoints.filter((cp: ThreadCheckpoint) => !cp.isDeleted());

    return {
      checkpointRestores,
    };
  }

  /**
   * 获取Session的恢复历史
   */
  public async getSessionRecoveryHistory(sessionId: ID): Promise<{
    checkpointRestores: ThreadCheckpoint[];
  }> {
    // 获取所有Session范围的Checkpoint
    const checkpoints = await this.checkpointRepository.findByScopeAndTarget(
      CheckpointScope.session(),
      sessionId
    );
    const checkpointRestores = checkpoints.filter((cp: ThreadCheckpoint) => cp.restoreCount > 0);

    return {
      checkpointRestores,
    };
  }

  /**
   * 获取最佳恢复点
   */
  public async getBestRecoveryPoint(threadId: ID): Promise<{
    type: 'checkpoint';
    point: ThreadCheckpoint;
    reason: string;
  } | null> {
    const checkpoints = await this.checkpointRepository.findByScopeAndTarget(
      CheckpointScope.thread(),
      threadId
    );

    // 优先选择最新的里程碑Checkpoint
    const milestoneCheckpoints = checkpoints.filter((cp: ThreadCheckpoint) => cp.type.isMilestone());
    if (milestoneCheckpoints.length > 0) {
      const latest = milestoneCheckpoints.sort((a: ThreadCheckpoint, b: ThreadCheckpoint) =>
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
    const manualCheckpoints = checkpoints.filter((cp: ThreadCheckpoint) => cp.type.isManual());
    if (manualCheckpoints.length > 0) {
      const latest = manualCheckpoints.sort((a: ThreadCheckpoint, b: ThreadCheckpoint) =>
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

    // 再次选择最新的计划Checkpoint
    const scheduledCheckpoints = checkpoints.filter((cp: ThreadCheckpoint) => cp.type.isScheduled());
    if (scheduledCheckpoints.length > 0) {
      const latest = scheduledCheckpoints.sort((a: ThreadCheckpoint, b: ThreadCheckpoint) =>
        b.createdAt.differenceInSeconds(a.createdAt)
      )[0];
      if (latest) {
        return {
          type: 'checkpoint',
          point: latest,
          reason: 'Latest scheduled checkpoint',
        };
      }
    }

    // 最后选择最新的自动Checkpoint
    const autoCheckpoints = checkpoints.filter((cp: ThreadCheckpoint) => cp.type.isAuto());
    if (autoCheckpoints.length > 0) {
      const latest = autoCheckpoints.sort((a: ThreadCheckpoint, b: ThreadCheckpoint) =>
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