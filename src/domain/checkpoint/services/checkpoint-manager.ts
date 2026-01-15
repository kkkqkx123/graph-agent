import { ID } from '../../common/value-objects';
import { ThreadCheckpoint } from '../../threads/checkpoints/entities/thread-checkpoint';
import { CheckpointType } from '../../checkpoint/value-objects/checkpoint-type';
import { CheckpointScope } from '../../threads/checkpoints/value-objects/checkpoint-scope';

/**
 * 检查点管理器
 *
 * 职责：
 * - 管理检查点的创建、获取、恢复、删除
 * - 支持检查点列表查询
 * - 支持检查点过期管理
 *
 * 特性：
 * - 使用 ThreadCheckpoint 实体
 * - 支持线程级别的检查点管理
 * - 支持检查点过期清理
 *
 * 不负责：
 * - 状态的日常更新（由 StateManager 负责）
 * - 执行历史记录（由 HistoryManager 负责）
 */
export class CheckpointManager {
  private checkpoints: Map<string, ThreadCheckpoint>;
  private threadCheckpoints: Map<string, string[]>; // threadId -> checkpointIds
  private maxCheckpointsPerThread: number;
  private maxTotalCheckpoints: number;

  constructor(maxCheckpointsPerThread: number = 10, maxTotalCheckpoints: number = 1000) {
    this.checkpoints = new Map();
    this.threadCheckpoints = new Map();
    this.maxCheckpointsPerThread = maxCheckpointsPerThread;
    this.maxTotalCheckpoints = maxTotalCheckpoints;
  }

  /**
   * 创建检查点
   * @param threadId 线程ID
   * @param workflowId 工作流ID
   * @param currentNodeId 当前节点ID
   * @param stateData 状态数据
   * @param metadata 元数据
   * @returns 检查点ID
   */
  create(
    threadId: string,
    workflowId: ID,
    currentNodeId: ID,
    stateData: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): string {
    const checkpoint = ThreadCheckpoint.create(
      ID.fromString(threadId),
      CheckpointScope.thread(),
      CheckpointType.auto(),
      stateData,
      undefined,
      undefined,
      undefined,
      metadata,
      undefined,
      ID.fromString(threadId)
    );

    const checkpointId = checkpoint.checkpointId.toString();

    // 保存检查点
    this.checkpoints.set(checkpointId, checkpoint);

    // 更新线程的检查点列表
    if (!this.threadCheckpoints.has(threadId)) {
      this.threadCheckpoints.set(threadId, []);
    }
    const threadCheckpointIds = this.threadCheckpoints.get(threadId)!;
    threadCheckpointIds.push(checkpointId);

    // 检查并清理过期的检查点
    this.cleanupCheckpoints(threadId);

    return checkpointId;
  }

  /**
   * 获取检查点
   * @param checkpointId 检查点ID
   * @returns 检查点，如果不存在则返回 null
   */
  get(checkpointId: string): ThreadCheckpoint | null {
    return this.checkpoints.get(checkpointId) || null;
  }

  /**
   * 恢复检查点
   * @param checkpointId 检查点ID
   * @returns 状态数据，如果检查点不存在则返回 null
   */
  restore(checkpointId: string): Record<string, unknown> | null {
    const checkpoint = this.checkpoints.get(checkpointId);

    if (!checkpoint) {
      return null;
    }

    // 标记检查点为已恢复
    checkpoint.markRestored();

    return checkpoint.stateData;
  }

  /**
   * 删除检查点
   * @param checkpointId 检查点ID
   * @returns 是否删除成功
   */
  delete(checkpointId: string): boolean {
    const checkpoint = this.checkpoints.get(checkpointId);

    if (!checkpoint) {
      return false;
    }

    // 从主映射中删除
    this.checkpoints.delete(checkpointId);

    // 从线程的检查点列表中删除
    const threadId = checkpoint.threadId.toString();
    const threadCheckpointIds = this.threadCheckpoints.get(threadId);
    if (threadCheckpointIds) {
      const index = threadCheckpointIds.indexOf(checkpointId);
      if (index !== -1) {
        threadCheckpointIds.splice(index, 1);
      }
    }

    return true;
  }

  /**
   * 获取线程的所有检查点
   * @param threadId 线程ID
   * @returns 检查点数组（按时间倒序）
   */
  getThreadCheckpoints(threadId: string): ThreadCheckpoint[] {
    const checkpointIds = this.threadCheckpoints.get(threadId);

    if (!checkpointIds) {
      return [];
    }

    const checkpoints = checkpointIds
      .map(id => this.checkpoints.get(id))
      .filter((cp): cp is ThreadCheckpoint => cp !== undefined)
      .sort((a, b) => b.createdAt.differenceInSeconds(a.createdAt));

    return checkpoints;
  }

  /**
   * 获取线程的最新检查点
   * @param threadId 线程ID
   * @returns 最新检查点，如果不存在则返回 null
   */
  getLatestCheckpoint(threadId: string): ThreadCheckpoint | null {
    const checkpoints = this.getThreadCheckpoints(threadId);

    if (checkpoints.length === 0) {
      return null;
    }

    return checkpoints[0] ?? null;
  }

  /**
   * 清除线程的所有检查点
   * @param threadId 线程ID
   * @returns 删除的检查点数量
   */
  clearThreadCheckpoints(threadId: string): number {
    const checkpointIds = this.threadCheckpoints.get(threadId);

    if (!checkpointIds) {
      return 0;
    }

    let deletedCount = 0;
    for (const checkpointId of checkpointIds) {
      if (this.checkpoints.delete(checkpointId)) {
        deletedCount++;
      }
    }

    this.threadCheckpoints.delete(threadId);

    return deletedCount;
  }

  /**
   * 清除所有检查点
   */
  clearAllCheckpoints(): void {
    this.checkpoints.clear();
    this.threadCheckpoints.clear();
  }

  /**
   * 检查检查点是否存在
   * @param checkpointId 检查点ID
   * @returns 是否存在
   */
  hasCheckpoint(checkpointId: string): boolean {
    return this.checkpoints.has(checkpointId);
  }

  /**
   * 获取检查点数量
   * @returns 检查点数量
   */
  getCheckpointCount(): number {
    return this.checkpoints.size;
  }

  /**
   * 获取线程的检查点数量
   * @param threadId 线程ID
   * @returns 检查点数量
   */
  getThreadCheckpointCount(threadId: string): number {
    const checkpointIds = this.threadCheckpoints.get(threadId);
    return checkpointIds ? checkpointIds.length : 0;
  }

  /**
   * 获取所有线程ID
   * @returns 线程ID数组
   */
  getAllThreadIds(): string[] {
    return Array.from(this.threadCheckpoints.keys());
  }

  /**
   * 清理过期的检查点（私有方法）
   * @param threadId 线程ID
   */
  private cleanupCheckpoints(threadId: string): void {
    // 清理线程级别的过期检查点
    const threadCheckpointIds = this.threadCheckpoints.get(threadId);
    if (threadCheckpointIds && threadCheckpointIds.length > this.maxCheckpointsPerThread) {
      // 删除最旧的检查点
      const toDelete = threadCheckpointIds.splice(
        0,
        threadCheckpointIds.length - this.maxCheckpointsPerThread
      );
      for (const checkpointId of toDelete) {
        this.checkpoints.delete(checkpointId);
      }
    }

    // 清理全局级别的过期检查点
    if (this.checkpoints.size > this.maxTotalCheckpoints) {
      // 按时间排序，删除最旧的检查点
      const sortedCheckpoints = Array.from(this.checkpoints.values()).sort((a, b) =>
        a.createdAt.differenceInSeconds(b.createdAt)
      );

      const toDeleteCount = this.checkpoints.size - this.maxTotalCheckpoints;
      for (let i = 0; i < toDeleteCount; i++) {
        const checkpoint = sortedCheckpoints[i];
        if (checkpoint) {
          this.delete(checkpoint.checkpointId.toString());
        }
      }
    }
  }
}
