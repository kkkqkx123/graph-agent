/**
 * CheckpointResourceAPI - 检查点资源管理API
 * 继承GenericResourceAPI，提供统一的CRUD操作
 */

import { GenericResourceAPI } from '../generic-resource-api';
import { CheckpointStateManager } from '../../../core/execution/managers/checkpoint-state-manager';
import type { Checkpoint, CheckpointMetadata } from '../../../types/checkpoint';
import type { CheckpointFilter } from '../../types/management-types';
import { MemoryCheckpointStorage } from '../../../core/storage/memory-checkpoint-storage';
import { CheckpointCoordinator } from '../../../core/execution/coordinators/checkpoint-coordinator';
import { globalMessageStorage } from '../../../core/services/global-message-storage';
import { SingletonRegistry } from '../../../core/execution/context/singleton-registry';

/**
 * CheckpointResourceAPI - 检查点资源管理API
 */
export class CheckpointResourceAPI extends GenericResourceAPI<Checkpoint, string, CheckpointFilter> {
  private stateManager: CheckpointStateManager;

  constructor() {
    super();
    
    // 创建默认的检查点管理组件
    const storage = new MemoryCheckpointStorage();
    this.stateManager = new CheckpointStateManager(storage);
  }

  // ============================================================================
  // 实现抽象方法
  // ============================================================================

  /**
   * 从注册表获取检查点
   */
  protected async getResource(id: string): Promise<Checkpoint | null> {
    return this.stateManager.get(id) || null;
  }

  /**
   * 从注册表获取所有检查点
   */
  protected async getAllResources(): Promise<Checkpoint[]> {
    const checkpointIds = await this.stateManager.list();
    const checkpoints: Checkpoint[] = [];
    for (const checkpointId of checkpointIds) {
      const checkpoint = await this.stateManager.get(checkpointId);
      if (checkpoint) {
        checkpoints.push(checkpoint);
      }
    }
    return checkpoints;
  }

  /**
   * 创建检查点
   */
  protected async createResource(checkpoint: Checkpoint): Promise<void> {
    // 检查点由coordinator创建，这里直接存储
    await this.stateManager.create(checkpoint);
  }

  /**
   * 更新检查点
   */
  protected async updateResource(id: string, updates: Partial<Checkpoint>): Promise<void> {
    const existing = await this.stateManager.get(id);
    if (!existing) {
      throw new Error(`Checkpoint not found: ${id}`);
    }
    const updated = { ...existing, ...updates };
    await this.stateManager.create(updated);
  }

  /**
   * 删除检查点
   */
  protected async deleteResource(id: string): Promise<void> {
    await this.stateManager.delete(id);
  }

  /**
   * 应用过滤条件
   */
  protected applyFilter(checkpoints: Checkpoint[], filter: CheckpointFilter): Checkpoint[] {
    return checkpoints.filter(cp => {
      if (filter.threadId && cp.threadId !== filter.threadId) {
        return false;
      }
      if (filter.workflowId && cp.workflowId !== filter.workflowId) {
        return false;
      }
      if (filter.startTimeFrom && cp.timestamp < filter.startTimeFrom) {
        return false;
      }
      if (filter.startTimeTo && cp.timestamp > filter.startTimeTo) {
        return false;
      }
      if (filter.tags && cp.metadata?.tags) {
        if (!filter.tags.every(tag => cp.metadata?.tags?.includes(tag))) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * 清空所有检查点
   */
  protected override async clearResources(): Promise<void> {
    const checkpointIds = await this.stateManager.list();
    for (const checkpointId of checkpointIds) {
      await this.stateManager.delete(checkpointId);
    }
  }

  // ============================================================================
  // 检查点特定方法
  // ============================================================================

  /**
   * 创建线程检查点
   * @param threadId 线程ID
   * @param metadata 检查点元数据
   * @returns 检查点ID
   */
  async createThreadCheckpoint(threadId: string, metadata?: CheckpointMetadata): Promise<string> {
    // 从SingletonRegistry获取全局服务
    SingletonRegistry.initialize();
    const threadRegistry = SingletonRegistry.get<any>('threadRegistry');
    const workflowRegistry = SingletonRegistry.get<any>('workflowRegistry');

    const dependencies = {
      threadRegistry,
      checkpointStateManager: this.stateManager,
      workflowRegistry,
      globalMessageStorage
    };

    const checkpointId = await CheckpointCoordinator.createCheckpoint(threadId, dependencies, metadata);
    return checkpointId;
  }

  /**
   * 从检查点恢复线程
   * @param checkpointId 检查点ID
   * @returns 恢复的线程ID
   */
  async restoreFromCheckpoint(checkpointId: string): Promise<string> {
    // 从SingletonRegistry获取全局服务
    SingletonRegistry.initialize();
    const threadRegistry = SingletonRegistry.get<any>('threadRegistry');
    const workflowRegistry = SingletonRegistry.get<any>('workflowRegistry');

    const dependencies = {
      threadRegistry,
      checkpointStateManager: this.stateManager,
      workflowRegistry,
      globalMessageStorage
    };

    const threadContext = await CheckpointCoordinator.restoreFromCheckpoint(checkpointId, dependencies);
    return threadContext.getThreadId();
  }

  /**
   * 获取线程的检查点列表
   * @param threadId 线程ID
   * @returns 检查点数组
   */
  async getThreadCheckpoints(threadId: string): Promise<Checkpoint[]> {
    const result = await this.getAll({ threadId });
    if (!result.success) {
      throw new Error(result.error || 'Failed to get thread checkpoints');
    }
    return result.data;
  }

  /**
   * 获取最新的检查点
   * @param threadId 线程ID
   * @returns 最新检查点，如果不存在则返回null
   */
  async getLatestCheckpoint(threadId: string): Promise<Checkpoint | null> {
    const checkpoints = await this.getThreadCheckpoints(threadId);
    if (checkpoints.length === 0) {
      return null;
    }
    
    // 按时间戳降序排序，返回最新的检查点
    const latest = checkpoints.sort((a, b) => b.timestamp - a.timestamp)[0];
    return latest || null;
  }

  /**
   * 获取检查点统计信息
   * @returns 统计信息
   */
  async getCheckpointStatistics(): Promise<{
    total: number;
    byThread: Record<string, number>;
    byWorkflow: Record<string, number>;
  }> {
    const result = await this.getAll();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get checkpoint statistics');
    }
    const checkpoints = result.data;
    
    const byThread: Record<string, number> = {};
    const byWorkflow: Record<string, number> = {};

    for (const checkpoint of checkpoints) {
      byThread[checkpoint.threadId] = (byThread[checkpoint.threadId] || 0) + 1;
      byWorkflow[checkpoint.workflowId] = (byWorkflow[checkpoint.workflowId] || 0) + 1;
    }

    return {
      total: checkpoints.length,
      byThread,
      byWorkflow
    };
  }

  /**
   * 获取底层CheckpointStateManager实例
   * @returns CheckpointStateManager实例
   */
  getStateManager(): CheckpointStateManager {
    return this.stateManager;
  }
}