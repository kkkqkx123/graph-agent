import { injectable, inject } from 'inversify';
import { ID } from '../../../domain/common/value-objects/id';
import { ThreadCheckpoint } from '../../../domain/threads/checkpoints/entities/thread-checkpoint';
import { Snapshot } from '../../../domain/snapshot/entities/snapshot';
import { ThreadCheckpointRepository } from '../../../domain/threads/checkpoints/repositories/thread-checkpoint-repository';
import { SnapshotRepository } from '../../../domain/snapshot/repositories/snapshot-repository';
import { Thread } from '../../../domain/threads/entities/thread';
import { History } from '../../../domain/history/entities/history';
import { HistoryType } from '../../../domain/history/value-objects/history-type';
import { HistoryRepository } from '../../../domain/history/repositories/history-repository';
import { SnapshotScopeValue } from '../../../domain/snapshot/value-objects/snapshot-scope';
import { CheckpointTypeValue } from '../../../domain/checkpoint/value-objects/checkpoint-type';
import { HistoryTypeValue } from '../../../domain/history/value-objects/history-type';

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
export class StateRecoveryService {
  constructor(
    @inject('ThreadCheckpointRepository') private readonly checkpointRepository: ThreadCheckpointRepository,
    @inject('SnapshotRepository') private readonly snapshotRepository: SnapshotRepository,
    @inject('HistoryRepository') private readonly historyRepository: HistoryRepository
  ) { }

  /**
   * 从Checkpoint恢复Thread
   *
   * @deprecated 请使用 WorkflowEngine.resumeFromCheckpoint() 方法
   * 此方法保留用于向后兼容，但不再执行实际的恢复操作
   */
  public async restoreThreadFromCheckpoint(
    thread: Thread,
    checkpointId: ID
  ): Promise<Thread> {
    // 1. 获取Checkpoint
    const checkpoint = await this.checkpointRepository.findById(checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${checkpointId.value}`);
    }

    // 2. 验证Checkpoint是否属于该Thread
    if (!checkpoint.threadId.equals(thread.id)) {
      throw new Error(`Checkpoint ${checkpointId.value} does not belong to thread ${thread.id.value}`);
    }

    // 3. 验证Checkpoint是否已删除
    if (checkpoint.isDeleted()) {
      throw new Error(`Checkpoint ${checkpointId.value} is deleted`);
    }

    // 4. 记录恢复History
    const history = History.create(
      HistoryType.checkpointCreated(),
      {
        entityType: 'thread',
        entityId: thread.threadId.value,
        checkpointId: checkpointId.value,
        checkpointType: checkpoint.type.getValue(),
        restoredAt: new Date().toISOString()
      },
      thread.sessionId,
      thread.threadId,
      undefined,
      `Thread从Checkpoint恢复`,
      `从检查点 ${checkpointId.toString()} 恢复`,
      {
        timestamp: new Date().toISOString()
      }
    );

    await this.historyRepository.save(history);

    // 注意：实际的恢复操作应该通过 WorkflowEngine.resumeFromCheckpoint() 执行
    // 这里只返回原始的 thread 对象
    return thread;
  }

  /**
   * 从Snapshot恢复Thread
   *
   * @deprecated 请使用 WorkflowEngine.resumeFromCheckpoint() 方法
   * 此方法保留用于向后兼容，但不再执行实际的恢复操作
   */
  public async restoreThreadFromSnapshot(
    thread: Thread,
    snapshotId: ID
  ): Promise<Thread> {
    // 1. 获取Snapshot
    const snapshot = await this.snapshotRepository.findById(snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot not found: ${snapshotId.value}`);
    }

    // 2. 验证Snapshot范围
    if (!snapshot.scope.isThread()) {
      throw new Error(`Snapshot ${snapshotId.value} is not a thread snapshot`);
    }

    // 3. 验证Snapshot是否属于该Thread
    if (!snapshot.targetId?.equals(thread.id)) {
      throw new Error(`Snapshot ${snapshotId.value} does not belong to thread ${thread.id.value}`);
    }

    // 4. 验证Snapshot是否可以恢复
    if (!snapshot.canRestore()) {
      throw new Error(`Snapshot ${snapshotId.value} cannot be restored`);
    }

    // 5. 标记Snapshot已恢复
    snapshot.markRestored();
    await this.snapshotRepository.save(snapshot);

    // 6. 记录恢复History
    const history = History.create(
      HistoryType.checkpointCreated(),
      {
        entityType: 'thread',
        entityId: thread.threadId.value,
        snapshotId: snapshotId.value,
        snapshotType: snapshot.type.value,
        restoredAt: new Date().toISOString()
      },
      thread.sessionId,
      thread.threadId,
      undefined,
      `Thread从Snapshot恢复`,
      `从快照 ${snapshotId.toString()} 恢复`,
      {
        timestamp: new Date().toISOString()
      }
    );

    await this.historyRepository.save(history);

    // 注意：实际的恢复操作应该通过 WorkflowEngine.resumeFromCheckpoint() 执行
    // 这里只返回原始的 thread 对象
    return thread;
  }

  /**
   * 从Snapshot恢复Session
   */
  public async restoreSessionFromSnapshot(
    sessionId: ID,
    snapshotId: ID
  ): Promise<void> {
    // 1. 获取Snapshot
    const snapshot = await this.snapshotRepository.findById(snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot not found: ${snapshotId.value}`);
    }

    // 2. 验证Snapshot范围
    if (!snapshot.scope.isSession()) {
      throw new Error(`Snapshot ${snapshotId.value} is not a session snapshot`);
    }

    // 3. 验证Snapshot是否属于该Session
    if (!snapshot.targetId?.equals(sessionId)) {
      throw new Error(`Snapshot ${snapshotId.value} does not belong to session ${sessionId.value}`);
    }

    // 4. 验证Snapshot是否可以恢复
    if (!snapshot.canRestore()) {
      throw new Error(`Snapshot ${snapshotId.value} cannot be restored`);
    }

    // 5. 反序列化Session状态
    const sessionState = snapshot.stateData as Record<string, unknown>;

    // 6. 标记Snapshot已恢复
    snapshot.markRestored();
    await this.snapshotRepository.save(snapshot);

    // 7. 记录恢复History
    const history = History.create(
      HistoryType.checkpointCreated(),
      {
        entityType: 'session',
        entityId: sessionId.value,
        snapshotId: snapshotId.value,
        snapshotType: snapshot.type.value,
        restoredAt: new Date().toISOString(),
        threadCount: sessionState['threadCount'] as number
      },
      sessionId,
      undefined,
      undefined,
      `Session从Snapshot恢复`,
      `从快照 ${snapshotId.toString()} 恢复`,
      {
        timestamp: new Date().toISOString()
      }
    );

    await this.historyRepository.save(history);

    // 注意：Session的实际恢复逻辑由SessionService处理
    // 这里只负责验证和记录
  }

  /**
   * 验证恢复条件
   */
  public async validateRecoveryConditions(
    threadId: ID,
    checkpointId?: ID,
    snapshotId?: ID
  ): Promise<{
    canRestore: boolean;
    reason?: string;
    availableCheckpoints: ThreadCheckpoint[];
    availableSnapshots: Snapshot[];
  }> {
    const availableCheckpoints = await this.checkpointRepository.findByThreadId(threadId);
    const availableSnapshots = await this.snapshotRepository.findByScopeAndTarget(
      { value: 'thread', requiresTargetId: () => true, getDescription: () => 'Thread' } as any,
      threadId
    );

    // 如果指定了Checkpoint，验证其有效性
    if (checkpointId) {
      const checkpoint = availableCheckpoints.find(cp => cp.id.equals(checkpointId));
      if (!checkpoint) {
        return {
          canRestore: false,
          reason: `Checkpoint ${checkpointId.value} not found`,
          availableCheckpoints,
          availableSnapshots
        };
      }

      if (checkpoint.isDeleted()) {
        return {
          canRestore: false,
          reason: `Checkpoint ${checkpointId.value} is deleted`,
          availableCheckpoints,
          availableSnapshots
        };
      }
    }

    // 如果指定了Snapshot，验证其有效性
    if (snapshotId) {
      const snapshot = availableSnapshots.find(sn => sn.id.equals(snapshotId));
      if (!snapshot) {
        return {
          canRestore: false,
          reason: `Snapshot ${snapshotId.value} not found`,
          availableCheckpoints,
          availableSnapshots
        };
      }

      if (!snapshot.canRestore()) {
        return {
          canRestore: false,
          reason: `Snapshot ${snapshotId.value} cannot be restored`,
          availableCheckpoints,
          availableSnapshots
        };
      }
    }

    // 如果没有指定Checkpoint或Snapshot，检查是否有可用的
    if (!checkpointId && !snapshotId) {
      if (availableCheckpoints.length === 0 && availableSnapshots.length === 0) {
        return {
          canRestore: false,
          reason: 'No checkpoints or snapshots available for restoration',
          availableCheckpoints,
          availableSnapshots
        };
      }
    }

    return {
      canRestore: true,
      availableCheckpoints,
      availableSnapshots
    };
  }

  /**
   * 获取Thread的恢复历史
   */
  public async getThreadRecoveryHistory(threadId: ID): Promise<{
    checkpointRestores: ThreadCheckpoint[];
    snapshotRestores: Snapshot[];
    historyRecords: History[];
  }> {
    // 获取所有Checkpoint
    const checkpoints = await this.checkpointRepository.findByThreadId(threadId);
    const checkpointRestores = checkpoints.filter(cp => !cp.isDeleted());

    // 获取所有Snapshot
    const snapshots = await this.snapshotRepository.findByScopeAndTarget(
      { value: 'thread', requiresTargetId: () => true, getDescription: () => 'Thread' } as any,
      threadId
    );
    const snapshotRestores = snapshots.filter(sn => sn.restoreCount > 0);

    // 获取History记录
    const allHistory = await this.historyRepository.findByThreadId(threadId);
    const historyRecords = allHistory.filter(h =>
      h.type.getValue() === HistoryTypeValue.CHECKPOINT_CREATED
    );

    return {
      checkpointRestores,
      snapshotRestores,
      historyRecords
    };
  }

  /**
   * 获取Session的恢复历史
   */
  public async getSessionRecoveryHistory(sessionId: ID): Promise<{
    snapshotRestores: Snapshot[];
    historyRecords: History[];
  }> {
    // 获取所有Snapshot
    const snapshots = await this.snapshotRepository.findByScopeAndTarget(
      { value: 'session', requiresTargetId: () => true, getDescription: () => 'Session' } as any,
      sessionId
    );
    const snapshotRestores = snapshots.filter(sn => sn.restoreCount > 0);

    // 获取History记录
    const allHistory = await this.historyRepository.findBySessionId(sessionId);
    const historyRecords = allHistory.filter(h =>
      h.type.getValue() === HistoryTypeValue.CHECKPOINT_CREATED
    );

    return {
      snapshotRestores,
      historyRecords
    };
  }

  /**
   * 获取最佳恢复点
   */
  public async getBestRecoveryPoint(threadId: ID): Promise<{
    type: 'checkpoint' | 'snapshot';
    point: ThreadCheckpoint | Snapshot;
    reason: string;
  } | null> {
    const checkpoints = await this.checkpointRepository.findByThreadId(threadId);
    const snapshots = await this.snapshotRepository.findByScopeAndTarget(
      { value: 'thread', requiresTargetId: () => true, getDescription: () => 'Thread' } as any,
      threadId
    );

    // 优先选择最新的里程碑Checkpoint
    const milestoneCheckpoints = checkpoints.filter(cp => cp.type.isMilestone());
    if (milestoneCheckpoints.length > 0) {
      const latest = milestoneCheckpoints.sort((a, b) =>
        b.createdAt.differenceInSeconds(a.createdAt)
      )[0];
      if (latest) {
        return {
          type: 'checkpoint',
          point: latest,
          reason: 'Latest milestone checkpoint'
        };
      }
    }

    // 其次选择最新的手动Checkpoint
    const manualCheckpoints = checkpoints.filter(cp => cp.type.isManual());
    if (manualCheckpoints.length > 0) {
      const latest = manualCheckpoints.sort((a, b) =>
        b.createdAt.differenceInSeconds(a.createdAt)
      )[0];
      if (latest) {
        return {
          type: 'checkpoint',
          point: latest,
          reason: 'Latest manual checkpoint'
        };
      }
    }

    // 再次选择最新的自动Checkpoint
    const autoCheckpoints = checkpoints.filter(cp => cp.type.isAuto());
    if (autoCheckpoints.length > 0) {
      const latest = autoCheckpoints.sort((a, b) =>
        b.createdAt.differenceInSeconds(a.createdAt)
      )[0];
      if (latest) {
        return {
          type: 'checkpoint',
          point: latest,
          reason: 'Latest automatic checkpoint'
        };
      }
    }

    // 最后选择最新的Snapshot
    if (snapshots.length > 0) {
      const latest = snapshots.sort((a, b) =>
        b.createdAt.differenceInSeconds(a.createdAt)
      )[0];
      if (latest) {
        return {
          type: 'snapshot',
          point: latest,
          reason: 'Latest snapshot'
        };
      }
    }

    return null;
  }
}