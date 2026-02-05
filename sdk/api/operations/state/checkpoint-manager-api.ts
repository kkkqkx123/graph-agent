/**
 * CheckpointManagerAPI - 检查点管理API
 * 封装CheckpointCoordinator和CheckpointStateManager，提供状态快照和恢复功能
 */

import { CheckpointCoordinator } from '../../../core/execution/coordinators/checkpoint-coordinator';
import { CheckpointStateManager } from '../../../core/execution/managers/checkpoint-state-manager';
import type { Checkpoint, CheckpointMetadata } from '../../../types/checkpoint';
import type { Thread } from '../../../types/thread';
import { NotFoundError } from '../../../types/errors';
import type { CheckpointFilter, CheckpointSummary } from '../../types/management-types';
import { MemoryCheckpointStorage } from '../../../core/storage/memory-checkpoint-storage';
import { globalMessageStorage } from '../../../core/services/global-message-storage';
import { SingletonRegistry } from '../../../core/execution/context/singleton-registry';

/**
 * CheckpointManagerAPI - 检查点管理API
 */
export class CheckpointManagerAPI {
  private coordinator: CheckpointCoordinator;
  private stateManager: CheckpointStateManager;

  constructor(coordinator?: CheckpointCoordinator, stateManager?: CheckpointStateManager) {
    if (coordinator && stateManager) {
      this.coordinator = coordinator;
      this.stateManager = stateManager;
    } else {
      // 创建默认的检查点管理组件
      const storage = new MemoryCheckpointStorage();
      this.stateManager = new CheckpointStateManager(storage);
      
      // 从SingletonRegistry获取全局服务
      SingletonRegistry.initialize();
      const threadRegistry = SingletonRegistry.get<any>('threadRegistry');
      const workflowRegistry = SingletonRegistry.get<any>('workflowRegistry');
      
      this.coordinator = new CheckpointCoordinator(
        this.stateManager,
        threadRegistry,
        workflowRegistry,
        globalMessageStorage
      );
    }
  }

  /**
   * 创建检查点
   * @param threadId 线程ID
   * @param metadata 检查点元数据
   * @returns 检查点对象
   */
  async createCheckpoint(threadId: string, metadata?: CheckpointMetadata): Promise<Checkpoint> {
    const checkpointId = await this.coordinator.createCheckpoint(threadId, metadata);
    const checkpoint = await this.stateManager.get(checkpointId);
    
    if (!checkpoint) {
      throw new Error(`Failed to retrieve created checkpoint: ${checkpointId}`);
    }
    
    return checkpoint;
  }

  /**
   * 从检查点恢复线程
   * @param checkpointId 检查点ID
   * @returns 线程实例
   */
  async restoreFromCheckpoint(checkpointId: string): Promise<Thread> {
    try {
      const threadContext = await this.coordinator.restoreFromCheckpoint(checkpointId);
      return threadContext.thread;
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw new NotFoundError(`Checkpoint not found: ${checkpointId}`, 'checkpoint', checkpointId);
      }
      throw error;
    }
  }

  /**
   * 获取检查点
   * @param checkpointId 检查点ID
   * @returns 检查点对象，如果不存在则返回null
   */
  async getCheckpoint(checkpointId: string): Promise<Checkpoint | null> {
    return this.stateManager.get(checkpointId);
  }

  /**
   * 获取检查点列表
   * @param filter 过滤条件
   * @returns 检查点对象数组
   */
  async getCheckpoints(filter?: CheckpointFilter): Promise<Checkpoint[]> {
    // 获取所有检查点ID
    const checkpointIds = await this.stateManager.list();
    
    // 加载所有检查点
    const checkpoints: Checkpoint[] = [];
    for (const checkpointId of checkpointIds) {
      const checkpoint = await this.stateManager.get(checkpointId);
      if (checkpoint) {
        checkpoints.push(checkpoint);
      }
    }
    
    // 应用过滤条件
    if (!filter) {
      return checkpoints;
    }
    
    return checkpoints.filter(cp => this.applyFilter(cp, filter));
  }

  /**
   * 获取检查点摘要列表
   * @param filter 过滤条件
   * @returns 检查点摘要数组
   */
  async getCheckpointSummaries(filter?: CheckpointFilter): Promise<CheckpointSummary[]> {
    const checkpoints = await this.getCheckpoints(filter);
    
    return checkpoints.map(cp => ({
      checkpointId: cp.id,
      threadId: cp.threadId,
      workflowId: cp.workflowId,
      timestamp: cp.timestamp,
      metadata: cp.metadata
    }));
  }

  /**
   * 删除检查点
   * @param checkpointId 检查点ID
   */
  async deleteCheckpoint(checkpointId: string): Promise<void> {
    const checkpoint = await this.stateManager.get(checkpointId);
    if (!checkpoint) {
      throw new NotFoundError(`Checkpoint not found: ${checkpointId}`, 'checkpoint', checkpointId);
    }
    
    await this.stateManager.delete(checkpointId);
  }

  /**
   * 批量删除检查点
   * @param checkpointIds 检查点ID数组
   */
  async deleteCheckpoints(checkpointIds: string[]): Promise<void> {
    for (const checkpointId of checkpointIds) {
      await this.stateManager.delete(checkpointId);
    }
  }

  /**
   * 创建节点级别检查点
   * @param threadId 线程ID
   * @param nodeId 节点ID
   * @param metadata 检查点元数据
   * @returns 检查点对象
   */
  async createNodeCheckpoint(
    threadId: string,
    nodeId: string,
    metadata?: CheckpointMetadata
  ): Promise<Checkpoint> {
    const checkpointId = await this.coordinator.createNodeCheckpoint(threadId, nodeId, metadata);
    const checkpoint = await this.stateManager.get(checkpointId);
    
    if (!checkpoint) {
      throw new Error(`Failed to retrieve created node checkpoint: ${checkpointId}`);
    }
    
    return checkpoint;
  }

  /**
   * 按线程ID获取检查点列表
   * @param threadId 线程ID
   * @returns 检查点对象数组
   */
  async getCheckpointsByThread(threadId: string): Promise<Checkpoint[]> {
    return this.getCheckpoints({ threadId });
  }

  /**
   * 按工作流ID获取检查点列表
   * @param workflowId 工作流ID
   * @returns 检查点对象数组
   */
  async getCheckpointsByWorkflow(workflowId: string): Promise<Checkpoint[]> {
    return this.getCheckpoints({ workflowId });
  }

  /**
   * 按时间范围获取检查点列表
   * @param startTimeFrom 开始时间戳
   * @param startTimeTo 结束时间戳
   * @returns 检查点对象数组
   */
  async getCheckpointsByTimeRange(startTimeFrom: number, startTimeTo: number): Promise<Checkpoint[]> {
    return this.getCheckpoints({ startTimeFrom, startTimeTo });
  }

  /**
   * 检查检查点是否存在
   * @param checkpointId 检查点ID
   * @returns 是否存在
   */
  async hasCheckpoint(checkpointId: string): Promise<boolean> {
    const checkpoint = await this.stateManager.get(checkpointId);
    return checkpoint !== null;
  }

  /**
   * 获取检查点数量
   * @returns 检查点数量
   */
  async getCheckpointCount(): Promise<number> {
    const checkpointIds = await this.stateManager.list();
    return checkpointIds.length;
  }

  /**
   * 获取指定线程的检查点数量
   * @param threadId 线程ID
   * @returns 检查点数量
   */
  async getCheckpointCountByThread(threadId: string): Promise<number> {
    const checkpoints = await this.getCheckpointsByThread(threadId);
    return checkpoints.length;
  }

  /**
   * 清空所有检查点
   */
  async clearAllCheckpoints(): Promise<void> {
    await this.stateManager.clearAll();
  }

  /**
   * 获取底层CheckpointCoordinator实例
   * @returns CheckpointCoordinator实例
   */
  getCoordinator(): CheckpointCoordinator {
    return this.coordinator;
  }

  /**
   * 获取底层CheckpointStateManager实例
   * @returns CheckpointStateManager实例
   */
  getStateManager(): CheckpointStateManager {
    return this.stateManager;
  }

  /**
   * 应用过滤条件
   * @param checkpoint 检查点对象
   * @param filter 过滤条件
   * @returns 是否匹配
   */
  private applyFilter(checkpoint: Checkpoint, filter: CheckpointFilter): boolean {
    if (filter.threadId && checkpoint.threadId !== filter.threadId) {
      return false;
    }
    if (filter.workflowId && checkpoint.workflowId !== filter.workflowId) {
      return false;
    }
    if (filter.startTimeFrom && checkpoint.timestamp < filter.startTimeFrom) {
      return false;
    }
    if (filter.startTimeTo && checkpoint.timestamp > filter.startTimeTo) {
      return false;
    }
    if (filter.tags && checkpoint.metadata?.tags) {
      if (!filter.tags.every(tag => checkpoint.metadata?.tags?.includes(tag))) {
        return false;
      }
    }
    return true;
  }
}