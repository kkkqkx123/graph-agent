/**
 * 检查点状态管理器
 * 有状态服务，维护检查点的内部状态
 */

import type { Checkpoint, CheckpointStorageMetadata, CleanupPolicy, CleanupResult } from '@modular-agent/types';
import type { CheckpointStorageCallback } from '@modular-agent/storage';
import type { EventManager } from '../../../core/services/event-manager.js';
import { LifecycleCapable } from '../../../core/managers/lifecycle-capable.js';
import { serializeCheckpoint, deserializeCheckpoint, createCleanupStrategy } from '../utils/index.js';
import { getErrorOrNew } from '@modular-agent/common-utils';
import { safeEmit } from '../utils/index.js';
import { StateManagementError } from '@modular-agent/types';
import { mergeMetadata } from '../../../utils/metadata-utils.js';
import {
  buildCheckpointCreatedEvent,
  buildCheckpointFailedEvent,
  buildCheckpointDeletedEvent
} from '../utils/event/event-builder.js';

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
  private storageCallback: CheckpointStorageCallback;
  private cleanupPolicy?: CleanupPolicy;
  private checkpointSizes: Map<string, number> = new Map(); // checkpointId -> size in bytes
  private eventManager?: EventManager;

  /**
   * 构造函数
   * @param storageCallback 存储回调接口（由应用层实现）
   * @param eventManager 事件管理器（可选）
   */
  constructor(storageCallback: CheckpointStorageCallback, eventManager?: EventManager) {
    this.storageCallback = storageCallback;
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
    const checkpointIds = await this.storageCallback.list();

    // 获取所有检查点的元数据和大小
    const checkpointInfoArray: Array<{ checkpointId: string; metadata: CheckpointStorageMetadata }> = [];
    for (const checkpointId of checkpointIds) {
      const data = await this.storageCallback.load(checkpointId);
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
      await this.storageCallback.delete(checkpointId);
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
    const checkpointIds = await this.storageCallback.list({ threadId });

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

      await this.storageCallback.save(checkpointId, data, storageMetadata);
      this.checkpointSizes.set(checkpointId, data.length);

      // 触发检查点创建事件
      const createdEvent = buildCheckpointCreatedEvent({
        threadId: checkpointData.threadId,
        checkpointId,
        workflowId: checkpointData.workflowId,
        description: checkpointData.metadata?.description
      });
      await safeEmit(this.eventManager, createdEvent);

      // 执行清理策略（如果配置了）
      if (this.cleanupPolicy) {
        try {
          await this.executeCleanup();
        } catch (error) {
          // 抛出状态管理错误，由 ErrorService 统一处理
          throw new StateManagementError(
            'Error executing cleanup policy',
            'checkpoint',
            'delete',
            undefined,
            undefined,
            undefined,
            { originalError: getErrorOrNew(error) }
          );
        }
      }

      return checkpointId;
    } catch (error) {
      // 触发检查点失败事件
      const failedEvent = buildCheckpointFailedEvent({
        threadId: checkpointData.threadId,
        operation: 'create',
        error: getErrorOrNew(error),
        checkpointId: checkpointData.id,
        workflowId: checkpointData.workflowId
      });
      await safeEmit(this.eventManager, failedEvent);
      throw error;
    }
  }

  /**
   * 获取检查点
   * @param checkpointId 检查点ID
   * @returns 检查点对象
   */
  async get(checkpointId: string): Promise<Checkpoint | null> {
    const data = await this.storageCallback.load(checkpointId);
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
    // 将 CheckpointListOptions 转换为 CheckpointStorageListOptions
    const storageOptions: import('@modular-agent/types').CheckpointStorageListOptions | undefined = options ? {
      threadId: options.parentId as string,
      tags: options.tags,
      limit: options.limit,
      offset: options.offset
    } : undefined;
    return this.storageCallback.list(storageOptions);
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

      await this.storageCallback.delete(checkpointId);
      this.checkpointSizes.delete(checkpointId);

      // 触发检查点删除事件
      if (checkpoint) {
        const deletedEvent = buildCheckpointDeletedEvent({
          threadId: checkpoint.threadId,
          checkpointId,
          workflowId: checkpoint.workflowId,
          reason
        });
        await safeEmit(this.eventManager, deletedEvent);
      }
    } catch (error) {
      // 触发检查点失败事件
      const failedEvent = buildCheckpointFailedEvent({
        threadId: '',
        operation: 'delete',
        error: getErrorOrNew(error),
        checkpointId
      });
      await safeEmit(this.eventManager, failedEvent);
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
      metadata: mergeMetadata(
        metadata,
        {
          description: `Node checkpoint for node ${nodeId}`,
          customFields: mergeMetadata(metadata.customFields || {}, { nodeId })
        }
      )
    };
    return this.create(nodeCheckpointData);
  }

  /**
   * 清理资源
   * 清空所有检查点
   */
  async cleanup(): Promise<void> {
    const checkpointIds = await this.storageCallback.list();
    for (const checkpointId of checkpointIds) {
      await this.storageCallback.delete(checkpointId);
    }
    this.checkpointSizes.clear();
  }

  /**
   * 创建状态快照
   * CheckpointStateManager本身不维护状态，返回空快照
   */
  createSnapshot(): void {
    // CheckpointStateManager本身不维护状态，无需快照
  }

  /**
   * 从快照恢复状态
   * CheckpointStateManager本身不维护状态，无需恢复
   */
  restoreFromSnapshot(): void {
    // CheckpointStateManager本身不维护状态，无需恢复
  }
}
