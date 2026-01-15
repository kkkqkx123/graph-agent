import { injectable, inject } from 'inversify';
import { ID } from '../../domain/common/value-objects/id';
import { Thread } from '../../domain/threads/entities/thread';
import { Session } from '../../domain/sessions/entities/session';
import { CheckpointType } from '../../domain/checkpoint/value-objects/checkpoint-type';
import { CheckpointScope } from '../../domain/threads/checkpoints/value-objects/checkpoint-scope';
import { StateHistory } from './state-history';
import { Checkpoint } from '../checkpoints/checkpoint';
import { CheckpointManagement } from '../checkpoints/checkpoint-management';
import { StateRecovery } from './state-recovery';

/**
 * 状态管理协调服务
 * 负责协调各个状态管理子服务，提供统一的状态管理接口
 */
@injectable()
export class StateManagement {
  constructor(
    @inject('StateHistory') private readonly historyService: StateHistory,
    @inject('Checkpoint') private readonly checkpointService: Checkpoint,
    @inject('CheckpointManagement') private readonly checkpointManagement: CheckpointManagement,
    @inject('StateRecovery') private readonly recoveryService: StateRecovery
  ) {}

  /**
   * 捕获Thread状态变更
   */
  public async captureThreadStateChange(
    thread: Thread,
    changeType: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    // 1. 记录状态变更日志
    await this.historyService.recordOperation(thread, changeType, details || {});

    // 2. 根据变更类型决定是否创建Checkpoint
    if (this.shouldCreateCheckpoint(changeType)) {
      await this.checkpointManagement.createThreadCheckpoint(
        thread,
        CheckpointType.auto(),
        `自动检查点: ${thread.status}`,
        `Automatic checkpoint triggered by ${changeType}`,
        ['automatic']
      );
    }

    // 3. 根据变更类型决定是否创建Snapshot（现在使用Checkpoint）
    if (this.shouldCreateSnapshot(changeType)) {
      await this.checkpointManagement.createThreadCheckpoint(
        thread,
        CheckpointType.scheduled(),
        `Auto Snapshot - ${changeType}`,
        `Automatic snapshot triggered by ${changeType}`,
        ['snapshot', 'automatic']
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
    // 这里暂时只创建Checkpoint（替代Snapshot）

    // 根据变更类型决定是否创建Checkpoint
    if (this.shouldCreateSnapshot(changeType)) {
      await this.checkpointManagement.createSessionCheckpoint(
        session,
        CheckpointType.scheduled(),
        `Auto Snapshot - ${changeType}`,
        `Automatic snapshot triggered by ${changeType}`,
        ['snapshot', 'automatic']
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
    await this.checkpointManagement.createThreadCheckpoint(
      thread,
      CheckpointType.manual(),
      title,
      description,
      ['manual']
    );
  }

  /**
   * 创建手动Snapshot（现在使用Checkpoint）
   */
  public async createManualSnapshot(
    thread: Thread,
    title?: string,
    description?: string
  ): Promise<void> {
    await this.checkpointManagement.createThreadCheckpoint(
      thread,
      CheckpointType.manual(),
      title,
      description,
      ['snapshot', 'manual']
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
    await this.checkpointManagement.createThreadCheckpoint(
      thread,
      CheckpointType.milestone(),
      milestoneName,
      description,
      ['milestone']
    );
  }

  /**
   * 捕获错误状态
   */
  public async captureErrorState(
    thread: Thread,
    error: Error,
    context?: Record<string, unknown>
  ): Promise<void> {
    // 1. 记录错误日志
    await this.historyService.recordError(thread, error);

    // 2. 创建错误Checkpoint
    await this.checkpointManagement.createThreadCheckpoint(
      thread,
      CheckpointType.error(),
      `Error Checkpoint - ${error.name}`,
      error.message,
      ['error'],
      {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        ...context,
      }
    );

    // 3. 创建错误Snapshot（现在使用Checkpoint）
    await this.checkpointManagement.createThreadCheckpoint(
      thread,
      CheckpointType.error(),
      `Error Snapshot - ${error.name}`,
      error.message,
      ['snapshot', 'error'],
      {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        ...context,
      }
    );
  }

  /**
   * 恢复Thread状态
   */
  public async restoreThreadState(
    thread: Thread,
    restoreType: 'checkpoint' | 'auto',
    restorePointId?: ID
  ): Promise<Thread> {
    // 1. 验证恢复条件
    const validation = await this.recoveryService.validateRecoveryConditions(
      thread.id,
      restoreType === 'checkpoint' ? restorePointId : undefined
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

      restoredThread = await this.recoveryService.restoreThreadFromCheckpoint(
        thread,
        bestPoint.point.checkpointId
      );
    } else if (restoreType === 'checkpoint' && restorePointId) {
      restoredThread = await this.recoveryService.restoreThreadFromCheckpoint(
        thread,
        restorePointId
      );
    } else {
      throw new Error('Invalid restore parameters');
    }

    // 3. 记录恢复后的状态变更
    await this.historyService.recordOperation(restoredThread, 'state_restored', {
      restoreType,
      restorePointId: restorePointId?.value,
      restoredAt: new Date().toISOString(),
    });

    return restoredThread;
  }

  /**
   * 获取Thread状态历史
   */
  public async getThreadStateHistory(threadId: ID): Promise<{
    checkpoints: any[];
  }> {
    const checkpoints = await this.checkpointManagement.getThreadCheckpoints(threadId);

    return {
      checkpoints: checkpoints.map(cp => cp.toDict()),
    };
  }

  /**
   * 获取Session状态历史
   */
  public async getSessionStateHistory(sessionId: ID): Promise<{
    checkpoints: any[];
  }> {
    const checkpoints = await this.checkpointManagement.getSessionCheckpoints(sessionId);

    return {
      checkpoints: checkpoints.map(cp => cp.toDict()),
    };
  }

  /**
   * 清理过期状态数据
   */
  public async cleanupExpiredStateData(retentionDays: number = 30): Promise<{
    expiredCheckpoints: number;
  }> {
    const expiredCheckpoints = await this.checkpointManagement.cleanupExpiredCheckpoints();

    return {
      expiredCheckpoints,
    };
  }

  /**
   * 清理多余状态数据
   */
  public async cleanupExcessStateData(
    threadId: ID,
    maxCheckpoints: number
  ): Promise<{
    excessCheckpoints: number;
  }> {
    const excessCheckpoints = await this.checkpointManagement.cleanupExcessCheckpoints(
      threadId,
      maxCheckpoints
    );

    return {
      excessCheckpoints,
    };
  }

  /**
   * 获取状态管理统计信息
   */
  public async getStateManagementStatistics(): Promise<{
    checkpoints: {
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
      mostRestoredCheckpointId: string | null;
    };
  }> {
    const [checkpointStats, restoreStats] = await Promise.all([
      this.checkpointManagement.getCheckpointStatistics(),
      this.checkpointManagement.getRestoreStatistics(),
    ]);

    return {
      checkpoints: {
        total: checkpointStats.total,
        byType: checkpointStats.byType,
        byScope: checkpointStats.byScope,
        totalSizeBytes: checkpointStats.totalSizeBytes,
        averageSizeBytes: checkpointStats.averageSizeBytes,
      },
      recovery: {
        totalRestores: restoreStats.totalRestores,
        byType: restoreStats.byType,
        byScope: restoreStats.byScope,
        mostRestoredCheckpointId: restoreStats.mostRestoredCheckpointId,
      },
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
      'workflow_resumed',
    ];

    return checkpointTriggers.includes(changeType);
  }

  /**
   * 判断是否应该创建Snapshot（现在使用Checkpoint）
   */
  private shouldCreateSnapshot(changeType: string): boolean {
    // 定义需要创建Snapshot的变更类型
    const snapshotTriggers = [
      'workflow_completed',
      'workflow_failed',
      'thread_created',
      'thread_destroyed',
      'session_created',
      'session_destroyed',
    ];

    return snapshotTriggers.includes(changeType);
  }
}