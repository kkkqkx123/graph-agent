/**
 * 检查点状态管理器
 * 有状态服务，维护检查点的内部状态
 */

import type { Checkpoint } from '@modular-agent/types';
import type { CheckpointStorage, CheckpointStorageMetadata, CleanupPolicy, CleanupResult } from '@modular-agent/types';
import type { EventManager } from '../../services/event-manager';
import { LifecycleCapable } from './lifecycle-capable';
import { serializeCheckpoint, deserializeCheckpoint } from '../utils/checkpoint-serializer';
import { createCleanupStrategy } from '../utils/checkpoint-cleanup-policy';
import { generateId, now } from '@modular-agent/common-utils';
import { EventType } from '@modular-agent/types';
import { safeEmit } from '../utils/event/event-emitter';

/**
 * 从检查点提取存储元数据
 */
function extractStorageMetadata(checkpoint: Checkpoint): CheckpointStorageMetadata {
  return {
    threadId: checkpoint.threadId,
    workflowId: checkpoint.workflowId,
    timestamp: checkpoint.timestamp,
    tags: checkpoint.metadata?.tags,
    customFields: checkpoint.metadata?.customFields
  };
}

/**
 * 检查点状态管理器
 */
export class CheckpointStateManager implements LifecycleCapable<void> {
  private storage: CheckpointStorage;
  private cleanupPolicy?: CleanupPolicy;
  private checkpointSizes: Map<string, number> = new Map(); // checkpointId -> size in bytes
  private eventManager?: EventManager;

  /**
   * 构造函数
   * @param storage 存储实现
   * @param eventManager 事件管理器（可选）
   */
  constructor(storage: CheckpointStorage, eventManager?: EventManager) {
    this.storage = storage;
    this.eventManager = eventManager;
  }

  /**
   * 设置清理策略
   *
   * @param policy 清理策略配置
   */
  setCleanupPolicy(policy: CleanupPolicy): void {
    this.cleanupPolicy = policy;
  }

  /**
   * 获取清理策略
   *
   * @returns 清理策略配置
   */
  getCleanupPolicy(): CleanupPolicy | undefined {
    return this.cleanupPolicy;
  }

  /**
   * 执行清理策略
   *
   * 根据配置的清理策略自动清理过期的检查点
   *
   * @returns 清理结果
   */
  async executeCleanup(): Promise<CleanupResult> {
    if (!this.cleanupPolicy) {
      return {
        deletedCheckpointIds: [],
        deletedCount: 0,
        freedSpaceBytes: 0,
        remainingCount: 0
      };
    }

    // 获取所有检查点ID
    const checkpointIds = await this.storage.list();

    // 获取所有检查点的元数据和大小
    const checkpointInfoArray: Array<{ checkpointId: string; metadata: CheckpointStorageMetadata }> = [];
    for (const checkpointId of checkpointIds) {
      const data = await this.storage.load(checkpointId);
      if (data) {
        const checkpoint = deserializeCheckpoint(data);
        const metadata = extractStorageMetadata(checkpoint);
        checkpointInfoArray.push({ checkpointId, metadata });
        this.checkpointSizes.set(checkpointId, data.length);
      }
    }

    // 创建清理策略实例
    const strategy = createCleanupStrategy(
      this.cleanupPolicy,
      this.checkpointSizes
    );

    // 执行清理策略
    const toDeleteIds = strategy.execute(checkpointInfoArray);

    // 删除检查点
    let freedSpaceBytes = 0;
    for (const checkpointId of toDeleteIds) {
      const size = this.checkpointSizes.get(checkpointId) || 0;
      await this.storage.delete(checkpointId);
      freedSpaceBytes += size;
      this.checkpointSizes.delete(checkpointId);
    }

    return {
      deletedCheckpointIds: toDeleteIds,
      deletedCount: toDeleteIds.length,
      freedSpaceBytes,
      remainingCount: checkpointIds.length - toDeleteIds.length
    };
  }

  /**
   * 清理指定线程的所有检查点
   *
   * @param threadId 线程ID
   * @returns 删除的检查点数量
   */
  async cleanupThreadCheckpoints(threadId: string): Promise<number> {
    const checkpointIds = await this.storage.list({ threadId });

    for (const checkpointId of checkpointIds) {
      await this.delete(checkpointId, 'cleanup');
    }

    return checkpointIds.length;
  }

  /**
   * 创建检查点
   * @param checkpointData 检查点数据
   * @returns 检查点ID
   */
  async create(checkpointData: Checkpoint): Promise<string> {
    try {
      // 使用传入的 checkpointData.id，而不是生成新的 ID
      const checkpointId = checkpointData.id;
      const data = serializeCheckpoint(checkpointData);
      const storageMetadata = extractStorageMetadata(checkpointData);

      await this.storage.save(checkpointId, data, storageMetadata);
      this.checkpointSizes.set(checkpointId, data.length);

      // 触发检查点创建事件
      await safeEmit(this.eventManager, {
        type: EventType.CHECKPOINT_CREATED,
        timestamp: now(),
        workflowId: checkpointData.workflowId,
        threadId: checkpointData.threadId,
        checkpointId,
        description: checkpointData.metadata?.description
      });

      // 执行清理策略（如果配置了）
      if (this.cleanupPolicy) {
        try {
          await this.executeCleanup();
        } catch (error) {
          console.error('Error executing cleanup policy:', error);
          // 清理失败不应影响检查点创建
        }
      }

      return checkpointId;
    } catch (error) {
      // 触发检查点失败事件
      await safeEmit(this.eventManager, {
        type: EventType.CHECKPOINT_FAILED,
        timestamp: now(),
        workflowId: checkpointData.workflowId,
        threadId: checkpointData.threadId,
        operation: 'create',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * 获取检查点
   * @param checkpointId 检查点ID
   * @returns 检查点对象
   */
  async get(checkpointId: string): Promise<Checkpoint | null> {
    const data = await this.storage.load(checkpointId);
    if (!data) {
      return null;
    }
    return deserializeCheckpoint(data);
  }

  /**
   * 列出检查点ID
   * @param options 查询选项
   * @returns 检查点ID数组
   */
  async list(options?: import('@modular-agent/types').CheckpointListOptions): Promise<string[]> {
    return this.storage.list(options);
  }

  /**
   * 删除检查点
   * @param checkpointId 检查点ID
   * @param reason 删除原因
   */
  async delete(checkpointId: string, reason: 'manual' | 'cleanup' | 'policy' = 'manual'): Promise<void> {
    try {
      // 先获取检查点信息（用于触发事件）
      const checkpoint = await this.get(checkpointId);
      
      await this.storage.delete(checkpointId);
      this.checkpointSizes.delete(checkpointId);

      // 触发检查点删除事件
      if (checkpoint) {
        await safeEmit(this.eventManager, {
          type: EventType.CHECKPOINT_DELETED,
          timestamp: now(),
          workflowId: checkpoint.workflowId,
          threadId: checkpoint.threadId,
          checkpointId,
          reason
        });
      }
    } catch (error) {
      // 触发检查点失败事件
      await safeEmit(this.eventManager, {
        type: EventType.CHECKPOINT_FAILED,
        timestamp: now(),
        workflowId: '',
        threadId: '',
        checkpointId,
        operation: 'delete',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * 创建节点级别检查点
   * @param checkpointData 检查点数据
   * @param nodeId 节点ID
   * @returns 检查点ID
   */
  async createNodeCheckpoint(checkpointData: Checkpoint, nodeId: string): Promise<string> {
    const metadata = checkpointData.metadata || {};
    const nodeCheckpointData: Checkpoint = {
      ...checkpointData,
      metadata: {
        ...metadata,
        description: `Node checkpoint for node ${nodeId}`,
        customFields: {
          ...metadata.customFields,
          nodeId
        }
      }
    };
    return this.create(nodeCheckpointData);
  }

  /**
   * 清空所有检查点
   */
  async clearAll(): Promise<void> {
    if (this.storage.clear) {
      await this.storage.clear();
    }
  }

  /**
   * 初始化管理器
   * CheckpointStateManager在构造时已初始化，此方法为空实现
   */
  initialize(): void {
    // CheckpointStateManager在构造时已初始化，无需额外操作
  }

  /**
   * 清理资源
   * 清空所有检查点
   */
  async cleanup(): Promise<void> {
    await this.clearAll();
  }

  /**
   * 创建状态快照
   * CheckpointStateManager本身不维护状态，此方法为空实现
   */
  createSnapshot(): void {
    // CheckpointStateManager本身不维护状态，无需快照
  }

  /**
   * 从快照恢复状态
   * CheckpointStateManager本身不维护状态，此方法为空实现
   */
  restoreFromSnapshot(): void {
    // CheckpointStateManager本身不维护状态，无需恢复
  }

  /**
   * 检查是否已初始化
   * @returns 始终返回true，因为CheckpointStateManager在构造时已初始化
   */
  isInitialized(): boolean {
    return true;
  }
}