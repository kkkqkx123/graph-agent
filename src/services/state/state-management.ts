import { injectable, inject } from 'inversify';
import { ID } from '../../domain/common/value-objects/id';
import { Thread } from '../../domain/threads/entities/thread';
import { Session } from '../../domain/sessions/entities/session';
import { CheckpointType } from '../../domain/threads/checkpoints/value-objects/checkpoint-type';
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
   * 注意：Session 不应该有独立的 checkpoint，Session 的状态通过聚合其 Thread 的 checkpoint 间接获取
   */
  public async captureSessionStateChange(
    session: Session,
    changeType: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    // Session 的状态变更记录应该通过 SessionService 处理
    // 这里暂时不做任何操作，因为 Session 不应该有独立的 checkpoint
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
   * 注意：Session 的状态历史通过聚合其 Thread 的 checkpoint 获取
   */
  public async getSessionStateHistory(sessionId: ID): Promise<{
    checkpoints: any[];
  }> {
    // Session 的 checkpoint 历史应该通过 SessionService 聚合其 Thread 的 checkpoint
    // 这里暂时返回空数组
    return {
      checkpoints: [],
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
      totalSizeBytes: number;
      averageSizeBytes: number;
    };
    recovery: {
      totalRestores: number;
      byType: Record<string, number>;
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
        totalSizeBytes: checkpointStats.totalSizeBytes,
        averageSizeBytes: checkpointStats.averageSizeBytes,
      },
      recovery: {
        totalRestores: restoreStats.totalRestores,
        byType: restoreStats.byType,
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