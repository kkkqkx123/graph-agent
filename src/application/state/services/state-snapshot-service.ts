import { injectable, inject } from 'inversify';
import { ID } from '../../../domain/common/value-objects/id';
import { Snapshot } from '../../../domain/snapshot/entities/snapshot';
import { SnapshotType } from '../../../domain/snapshot/value-objects/snapshot-type';
import { SnapshotScope } from '../../../domain/snapshot/value-objects/snapshot-scope';
import { ISnapshotRepository } from '../../../domain/snapshot/repositories/snapshot-repository';
import { Thread } from '../../../domain/threads/entities/thread';
import { Session } from '../../../domain/sessions/entities/session';
import { ThreadExecution } from '../../../domain/threads/value-objects/thread-execution';

/**
 * 状态快照服务
 * 负责管理Thread、Session和全局的快照
 */
@injectable()
export class StateSnapshotService {
  constructor(
    @inject('SnapshotRepository') private readonly snapshotRepository: ISnapshotRepository
  ) {}

  /**
   * 创建Thread快照
   */
  public async createThreadSnapshot(
    thread: Thread,
    type: SnapshotType,
    title?: string,
    description?: string
  ): Promise<Snapshot> {
    // 1. 序列化Thread状态
    const stateData = this.serializeThreadState(thread);

    // 2. 创建快照
    const snapshot = Snapshot.create(
      type,
      SnapshotScope.thread(),
      thread.id,
      title || `Thread Snapshot - ${thread.id.value}`,
      description || `Automatic snapshot for thread ${thread.id.value}`,
      stateData,
      {
        threadId: thread.id.value,
        sessionId: thread.sessionId.value,
        workflowId: thread.workflowId.value,
        status: thread.status.value,
        createdAt: new Date().toISOString()
      }
    );

    // 3. 持久化快照
    await this.snapshotRepository.save(snapshot);

    return snapshot;
  }

  /**
   * 创建Session快照
   */
  public async createSessionSnapshot(
    session: Session,
    type: SnapshotType,
    title?: string,
    description?: string
  ): Promise<Snapshot> {
    // 1. 序列化Session状态
    const stateData = this.serializeSessionState(session);

    // 2. 创建快照
    const snapshot = Snapshot.create(
      type,
      SnapshotScope.session(),
      session.id,
      title || `Session Snapshot - ${session.id.value}`,
      description || `Automatic snapshot for session ${session.id.value}`,
      stateData,
      {
        sessionId: session.id.value,
        threadCount: session.threadCount,
        status: session.status.value,
        createdAt: new Date().toISOString()
      }
    );

    // 3. 持久化快照
    await this.snapshotRepository.save(snapshot);

    return snapshot;
  }

  /**
   * 创建全局快照
   */
  public async createGlobalSnapshot(
    type: SnapshotType,
    title?: string,
    description?: string
  ): Promise<Snapshot> {
    // 1. 创建全局快照（不绑定特定Thread或Session）
    const snapshot = Snapshot.create(
      type,
      SnapshotScope.global(),
      undefined,
      title || `Global Snapshot - ${new Date().toISOString()}`,
      description || 'Global system snapshot',
      {
        timestamp: new Date().toISOString(),
        snapshotType: type.value
      },
      {
        createdAt: new Date().toISOString()
      }
    );

    // 2. 持久化快照
    await this.snapshotRepository.save(snapshot);

    return snapshot;
  }

  /**
   * 查询Thread的所有快照
   */
  public async getThreadSnapshots(threadId: ID): Promise<Snapshot[]> {
    return await this.snapshotRepository.findByScopeAndTarget(
      SnapshotScope.thread(),
      threadId
    );
  }

  /**
   * 查询Session的所有快照
   */
  public async getSessionSnapshots(sessionId: ID): Promise<Snapshot[]> {
    return await this.snapshotRepository.findByScopeAndTarget(
      SnapshotScope.session(),
      sessionId
    );
  }

  /**
   * 查询所有全局快照
   */
  public async getGlobalSnapshots(): Promise<Snapshot[]> {
    return await this.snapshotRepository.findByScope(SnapshotScope.global());
  }

  /**
   * 获取Thread的最新快照
   */
  public async getLatestThreadSnapshot(threadId: ID): Promise<Snapshot | null> {
    const snapshots = await this.getThreadSnapshots(threadId);
    if (snapshots.length === 0) {
      return null;
    }
    // 按创建时间降序排序，返回最新的
    const sortedSnapshots = snapshots.sort((a, b) =>
      b.createdAt.differenceInSeconds(a.createdAt)
    );
    return sortedSnapshots[0] || null;
  }

  /**
   * 获取Session的最新快照
   */
  public async getLatestSessionSnapshot(sessionId: ID): Promise<Snapshot | null> {
    const snapshots = await this.getSessionSnapshots(sessionId);
    if (snapshots.length === 0) {
      return null;
    }
    // 按创建时间降序排序，返回最新的
    const sortedSnapshots = snapshots.sort((a, b) =>
      b.createdAt.differenceInSeconds(a.createdAt)
    );
    return sortedSnapshots[0] || null;
  }

  /**
   * 按类型查询快照
   */
  public async getSnapshotsByType(type: SnapshotType): Promise<Snapshot[]> {
    const allSnapshots = await this.snapshotRepository.findAll();
    return allSnapshots.filter(snapshot => snapshot.type.equals(type));
  }

  /**
   * 按范围查询快照
   */
  public async getSnapshotsByScope(scope: SnapshotScope): Promise<Snapshot[]> {
    return await this.snapshotRepository.findByScope(scope);
  }

  /**
   * 标记快照已恢复
   */
  public async markSnapshotRestored(snapshotId: ID): Promise<void> {
    const snapshot = await this.snapshotRepository.findById(snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot not found: ${snapshotId.value}`);
    }

    snapshot.markRestored();
    await this.snapshotRepository.save(snapshot);
  }

  /**
   * 清理过期快照
   */
  public async cleanupExpiredSnapshots(): Promise<number> {
    const expiredSnapshots = await this.snapshotRepository.query({
      scope: SnapshotScope.global(),
      limit: 100
    });
    let deletedCount = 0;

    for (const snapshot of expiredSnapshots) {
      await this.snapshotRepository.deleteById(snapshot.id);
      deletedCount++;
    }

    return deletedCount;
  }

  /**
   * 清理多余快照（保留最新的N个）
   */
  public async cleanupExcessSnapshots(
    threadId: ID,
    maxCount: number
  ): Promise<number> {
    const snapshots = await this.getThreadSnapshots(threadId);
    
    if (snapshots.length <= maxCount) {
      return 0;
    }

    // 按创建时间降序排序，删除多余的旧快照
    const sortedSnapshots = snapshots.sort((a, b) =>
      b.createdAt.differenceInSeconds(a.createdAt)
    );

    const snapshotsToDelete = sortedSnapshots.slice(maxCount);
    let deletedCount = 0;

    for (const snapshot of snapshotsToDelete) {
      await this.snapshotRepository.deleteById(snapshot.id);
      deletedCount++;
    }

    return deletedCount;
  }

  /**
   * 获取快照统计信息
   */
  public async getSnapshotStatistics(): Promise<{
    total: number;
    byType: Record<string, number>;
    byScope: Record<string, number>;
    totalSizeBytes: number;
    averageSizeBytes: number;
  }> {
    const stats = await this.snapshotRepository.getStatistics();
    return {
      total: stats.total,
      byType: stats.byType,
      byScope: {},
      totalSizeBytes: stats.totalSizeBytes,
      averageSizeBytes: stats.totalSizeBytes / Math.max(stats.total, 1)
    };
  }

  /**
   * 获取恢复统计信息
   */
  public async getRestoreStatistics(): Promise<{
    totalRestores: number;
    byType: Record<string, number>;
    byScope: Record<string, number>;
    mostRestoredSnapshotId: string | null;
  }> {
    const stats = await this.snapshotRepository.getRestoreStatistics();
    return {
      totalRestores: stats.totalRestores,
      byType: {},
      byScope: {},
      mostRestoredSnapshotId: stats.mostRestoredSnapshot?.id.value || null
    };
  }

  /**
   * 序列化Thread状态
   */
  private serializeThreadState(thread: Thread): Record<string, unknown> {
    return {
      threadId: thread.id.value,
      sessionId: thread.sessionId.value,
      workflowId: thread.workflowId.value,
      status: thread.status.value,
      execution: this.serializeThreadExecution(thread.execution),
      createdAt: thread.createdAt.toISOString(),
      updatedAt: thread.updatedAt.toISOString()
    };
  }

  /**
   * 序列化ThreadExecution
   */
  private serializeThreadExecution(execution: ThreadExecution): Record<string, unknown> {
    return {
      threadId: execution.threadId.value,
      status: execution.status.value,
      progress: execution.progress,
      currentStep: execution.currentStep,
      startedAt: execution.startedAt?.toISOString(),
      completedAt: execution.completedAt?.toISOString(),
      errorMessage: execution.errorMessage,
      retryCount: execution.retryCount,
      lastActivityAt: execution.lastActivityAt.toISOString(),
      context: execution.context,
      operationHistory: execution.operationHistory.map(op => ({
        operationId: op.operationId.value,
        operationType: op.operationType,
        timestamp: op.timestamp.toISOString(),
        operatorId: op.operatorId?.value,
        reason: op.reason,
        metadata: op.metadata
      }))
    };
  }

  /**
   * 序列化Session状态
   */
  private serializeSessionState(session: Session): Record<string, unknown> {
    return {
      sessionId: session.id.value,
      threadCount: session.threadCount,
      status: session.status.value,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString()
    };
  }
}