import { ID } from '../../common/value-objects';
import { WorkflowState } from '../value-objects/workflow-state';

/**
 * 检查点接口
 */
export interface Checkpoint {
  /** 检查点ID */
  readonly id: string;
  /** 线程ID */
  readonly threadId: string;
  /** 工作流ID */
  readonly workflowId: ID;
  /** 当前节点ID */
  readonly currentNodeId: ID;
  /** 状态快照 */
  readonly stateSnapshot: string;
  /** 创建时间 */
  readonly timestamp: number;
  /** 元数据 */
  readonly metadata?: Record<string, any>;
}

/**
 * 检查点管理器
 *
 * 职责：
 * - 管理工作流执行的检查点
 * - 提供检查点的创建、恢复、删除操作
 * - 支持检查点列表查询
 * - 支持检查点元数据管理
 *
 * 特性：
 * - 支持状态快照和恢复
 * - 支持检查点元数据
 * - 支持检查点列表管理
 * - 支持检查点过期清理
 */
export class CheckpointManager {
  private checkpoints: Map<string, Checkpoint>;
  private threadCheckpoints: Map<string, string[]>; // threadId -> checkpointIds
  private maxCheckpointsPerThread: number;
  private maxTotalCheckpoints: number;

  constructor(
    maxCheckpointsPerThread: number = 10,
    maxTotalCheckpoints: number = 1000
  ) {
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
   * @param state 工作流状态
   * @param metadata 元数据
   * @returns 检查点ID
   */
  create(
    threadId: string,
    workflowId: ID,
    currentNodeId: ID,
    state: WorkflowState,
    metadata?: Record<string, any>
  ): string {
    const checkpointId = this.generateCheckpointId();
    const timestamp = Date.now();

    const checkpoint: Checkpoint = {
      id: checkpointId,
      threadId,
      workflowId,
      currentNodeId,
      stateSnapshot: JSON.stringify(state.toProps()),
      timestamp,
      metadata
    };

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
  get(checkpointId: string): Checkpoint | null {
    return this.checkpoints.get(checkpointId) || null;
  }

  /**
   * 恢复检查点
   * @param checkpointId 检查点ID
   * @returns 工作流状态，如果检查点不存在则返回 null
   */
  restore(checkpointId: string): WorkflowState | null {
    const checkpoint = this.checkpoints.get(checkpointId);
    
    if (!checkpoint) {
      return null;
    }

    const stateProps = JSON.parse(checkpoint.stateSnapshot);
    return WorkflowState.fromProps(stateProps);
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
    const threadCheckpointIds = this.threadCheckpoints.get(checkpoint.threadId);
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
  getThreadCheckpoints(threadId: string): Checkpoint[] {
    const checkpointIds = this.threadCheckpoints.get(threadId);
    
    if (!checkpointIds) {
      return [];
    }

    const checkpoints = checkpointIds
      .map(id => this.checkpoints.get(id))
      .filter((cp): cp is Checkpoint => cp !== undefined)
      .sort((a, b) => b.timestamp - a.timestamp);

    return checkpoints;
  }

  /**
   * 获取线程的最新检查点
   * @param threadId 线程ID
   * @returns 最新检查点，如果不存在则返回 null
   */
  getLatestCheckpoint(threadId: string): Checkpoint | null {
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
      const toDelete = threadCheckpointIds.splice(0, threadCheckpointIds.length - this.maxCheckpointsPerThread);
      for (const checkpointId of toDelete) {
        this.checkpoints.delete(checkpointId);
      }
    }

    // 清理全局级别的过期检查点
    if (this.checkpoints.size > this.maxTotalCheckpoints) {
      // 按时间排序，删除最旧的检查点
      const sortedCheckpoints = Array.from(this.checkpoints.values())
        .sort((a, b) => a.timestamp - b.timestamp);
      
      const toDeleteCount = this.checkpoints.size - this.maxTotalCheckpoints;
      for (let i = 0; i < toDeleteCount; i++) {
        const checkpoint = sortedCheckpoints[i];
        if (checkpoint) {
          this.delete(checkpoint.id);
        }
      }
    }
  }

  /**
   * 生成检查点ID（私有方法）
   * @returns 检查点ID
   */
  private generateCheckpointId(): string {
    return `cp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}