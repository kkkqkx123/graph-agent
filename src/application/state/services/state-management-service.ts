import { injectable, inject } from 'inversify';
import { ID } from '../../../domain/common/value-objects/id';
import { Thread } from '../../../domain/threads/entities/thread';
import { Session } from '../../../domain/sessions/entities/session';
import { SnapshotType } from '../../../domain/snapshot/value-objects/snapshot-type';
import { CheckpointType } from '../../../domain/checkpoint/value-objects/checkpoint-type';
import { StateHistoryService } from './state-history-service';
import { CheckpointService } from '../../threads/checkpoints/services/checkpoint-service';
import { StateSnapshotService } from './state-snapshot-service';
import { StateRecoveryService } from './state-recovery-service';

/**
 * 状态管理协调服务
 * 负责协调各个状态管理子服务，提供统一的状态管理接口
 */
@injectable()
export class StateManagementService {
  constructor(
    @inject('StateHistoryService') private readonly historyService: StateHistoryService,
    @inject('CheckpointService') private readonly checkpointService: CheckpointService,
    @inject('StateSnapshotService') private readonly snapshotService: StateSnapshotService,
    @inject('StateRecoveryService') private readonly recoveryService: StateRecoveryService
  ) {}

  /**
   * 捕获Thread状态变更
   */
  public async captureThreadStateChange(
    thread: Thread,
    changeType: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    // 1. 记录状态变更History（使用操作History）
    await this.historyService.createOperationHistory(
      thread,
      changeType,
      details || {}
    );

    // 2. 根据变更类型决定是否创建Checkpoint
    if (this.shouldCreateCheckpoint(changeType)) {
      await this.checkpointService.createCheckpoint({
        threadId: thread.threadId.toString(),
        type: 'auto',
        stateData: {
          status: thread.status.value,
          metadata: thread.metadata
        },
        title: `自动检查点: ${thread.status.value}`,
        tags: ['automatic']
      });
    }

    // 3. 根据变更类型决定是否创建Snapshot
    if (this.shouldCreateSnapshot(changeType)) {
      await this.snapshotService.createThreadSnapshot(
        thread,
        SnapshotType.automatic(),
        `Auto Snapshot - ${changeType}`,
        `Automatic snapshot triggered by ${changeType}`
      );
    }
  }

  /**
   * 捕获Session状态变更
   */
  public async captureSessionStateChange(
    session: Session,
    changeType: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    // 注意：Session的History记录需要通过SessionService处理
    // 这里暂时只创建Snapshot

    // 2. 根据变更类型决定是否创建Snapshot
    if (this.shouldCreateSnapshot(changeType)) {
      await this.snapshotService.createSessionSnapshot(
        session,
        SnapshotType.automatic(),
        `Auto Snapshot - ${changeType}`,
        `Automatic snapshot triggered by ${changeType}`
      );
    }
  }

  /**
   * 创建手动Checkpoint
   */
  public async createManualCheckpoint(
    thread: Thread,
    title?: string,
    description?: string
  ): Promise<void> {
    await this.checkpointService.createManualCheckpoint({
      threadId: thread.threadId.toString(),
      stateData: {
        status: thread.status.value,
        metadata: thread.metadata
      },
      title,
      description,
      tags: ['manual']
    });
  }

  /**
   * 创建手动Snapshot
   */
  public async createManualSnapshot(
    thread: Thread,
    title?: string,
    description?: string
  ): Promise<void> {
    await this.snapshotService.createThreadSnapshot(
      thread,
      SnapshotType.manual(),
      title,
      description
    );
  }

  /**
   * 创建里程碑Checkpoint
   */
  public async createMilestoneCheckpoint(
    thread: Thread,
    milestoneName: string,
    description?: string
  ): Promise<void> {
    await this.checkpointService.createMilestoneCheckpoint({
      threadId: thread.threadId.toString(),
      stateData: {
        status: thread.status.value,
        metadata: thread.metadata
      },
      milestoneName,
      description
    });
  }

  /**
   * 捕获错误状态
   */
  public async captureErrorState(
    thread: Thread,
    error: Error,
    context?: Record<string, unknown>
  ): Promise<void> {
    // 1. 记录错误History
    await this.historyService.createErrorHistory(thread, error);

    // 2. 创建错误Checkpoint
    await this.checkpointService.createErrorCheckpoint({
      threadId: thread.threadId.toString(),
      stateData: {
        status: thread.status.value,
        metadata: thread.metadata,
        errorMessage: error.message,
        errorStack: error.stack
      },
      errorMessage: error.message,
      errorType: error.name,
      metadata: {
        errorName: error.name,
        errorMessage: error.message
      }
    });

    // 3. 创建错误Snapshot
    await this.snapshotService.createThreadSnapshot(
      thread,
      SnapshotType.error(),
      `Error Snapshot - ${error.name}`,
      error.message
    );
  }

  /**
   * 恢复Thread状态
   */
  public async restoreThreadState(
    thread: Thread,
    restoreType: 'checkpoint' | 'snapshot' | 'auto',
    restorePointId?: ID
  ): Promise<Thread> {
    // 1. 验证恢复条件
    const validation = await this.recoveryService.validateRecoveryConditions(
      thread.id,
      restoreType === 'checkpoint' ? restorePointId : undefined,
      restoreType === 'snapshot' ? restorePointId : undefined
    );

    if (!validation.canRestore) {
      throw new Error(`Cannot restore thread: ${validation.reason}`);
    }

    // 2. 根据恢复类型执行恢复
    let restoredThread: Thread;

    if (restoreType === 'auto') {
      // 自动选择最佳恢复点
      const bestPoint = await this.recoveryService.getBestRecoveryPoint(thread.id);
      if (!bestPoint) {
        throw new Error('No recovery point available');
      }

      if (bestPoint.type === 'checkpoint') {
        restoredThread = await this.recoveryService.restoreThreadFromCheckpoint(
          thread,
          bestPoint.point.id
        );
      } else {
        restoredThread = await this.recoveryService.restoreThreadFromSnapshot(
          thread,
          bestPoint.point.id
        );
      }
    } else if (restoreType === 'checkpoint' && restorePointId) {
      restoredThread = await this.recoveryService.restoreThreadFromCheckpoint(
        thread,
        restorePointId
      );
    } else if (restoreType === 'snapshot' && restorePointId) {
      restoredThread = await this.recoveryService.restoreThreadFromSnapshot(
        thread,
        restorePointId
      );
    } else {
      throw new Error('Invalid restore parameters');
    }

    // 3. 记录恢复后的状态变更
    await this.historyService.createOperationHistory(
      restoredThread,
      'state_restored',
      {
        restoreType,
        restorePointId: restorePointId?.value,
        restoredAt: new Date().toISOString()
      }
    );

    return restoredThread;
  }

  /**
   * 获取Thread状态历史
   */
  public async getThreadStateHistory(threadId: ID): Promise<{
    history: any[];
    checkpoints: any[];
    snapshots: any[];
  }> {
    const [history, checkpoints, snapshots] = await Promise.all([
      this.historyService.getThreadHistory(threadId),
      this.checkpointService.getThreadCheckpointHistory(threadId.toString()),
      this.snapshotService.getThreadSnapshots(threadId)
    ]);

    return {
      history,
      checkpoints,
      snapshots
    };
  }

  /**
   * 获取Session状态历史
   */
  public async getSessionStateHistory(sessionId: ID): Promise<{
    history: any[];
    snapshots: any[];
  }> {
    const [history, snapshots] = await Promise.all([
      this.historyService.getSessionHistory(sessionId),
      this.snapshotService.getSessionSnapshots(sessionId)
    ]);

    return {
      history,
      snapshots
    };
  }

  /**
   * 清理过期状态数据
   */
  public async cleanupExpiredStateData(retentionDays: number = 30): Promise<{
    expiredHistory: number;
    expiredCheckpoints: number;
    expiredSnapshots: number;
  }> {
    const [expiredHistory, expiredCheckpoints, expiredSnapshots] = await Promise.all([
      this.historyService.cleanupExpiredHistory(retentionDays),
      this.checkpointService.cleanupExpiredCheckpoints(),
      this.snapshotService.cleanupExpiredSnapshots()
    ]);

    return {
      expiredHistory,
      expiredCheckpoints,
      expiredSnapshots
    };
  }

  /**
   * 清理多余状态数据
   */
  public async cleanupExcessStateData(
    threadId: ID,
    maxCheckpoints: number,
    maxSnapshots: number
  ): Promise<{
    excessCheckpoints: number;
    excessSnapshots: number;
  }> {
    const [excessCheckpoints, excessSnapshots] = await Promise.all([
      this.checkpointService.cleanupExcessCheckpoints(threadId.toString(), maxCheckpoints),
      this.snapshotService.cleanupExcessSnapshots(threadId, maxSnapshots)
    ]);

    return {
      excessCheckpoints,
      excessSnapshots
    };
  }

  /**
   * 获取状态管理统计信息
   */
  public async getStateManagementStatistics(): Promise<{
    snapshots: {
      total: number;
      byType: Record<string, number>;
      byScope: Record<string, number>;
      totalSizeBytes: number;
      averageSizeBytes: number;
    };
    recovery: {
      totalRestores: number;
      byType: Record<string, number>;
      byScope: Record<string, number>;
      mostRestoredSnapshotId: string | null;
    };
  }> {
    const [snapshotStats, restoreStats] = await Promise.all([
      this.snapshotService.getSnapshotStatistics(),
      this.snapshotService.getRestoreStatistics()
    ]);

    return {
      snapshots: {
        total: snapshotStats.total,
        byType: snapshotStats.byType,
        byScope: snapshotStats.byScope,
        totalSizeBytes: snapshotStats.totalSizeBytes,
        averageSizeBytes: snapshotStats.averageSizeBytes
      },
      recovery: {
        totalRestores: restoreStats.totalRestores,
        byType: restoreStats.byType,
        byScope: restoreStats.byScope,
        mostRestoredSnapshotId: restoreStats.mostRestoredSnapshotId
      }
    };
  }

  /**
   * 判断是否应该创建Checkpoint
   */
  private shouldCreateCheckpoint(changeType: string): boolean {
    // 定义需要创建Checkpoint的变更类型
    const checkpointTriggers = [
      'node_completed',
      'node_failed',
      'workflow_paused',
      'workflow_resumed'
    ];

    return checkpointTriggers.includes(changeType);
  }

  /**
   * 判断是否应该创建Snapshot
   */
  private shouldCreateSnapshot(changeType: string): boolean {
    // 定义需要创建Snapshot的变更类型
    const snapshotTriggers = [
      'workflow_completed',
      'workflow_failed',
      'thread_created',
      'thread_destroyed',
      'session_created',
      'session_destroyed'
    ];

    return snapshotTriggers.includes(changeType);
  }
}