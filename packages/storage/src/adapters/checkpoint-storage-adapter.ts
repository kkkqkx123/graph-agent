/**
 * 检查点存储适配器
 * 实现 SDK 的 CheckpointStorageCallback 接口
 */

import type { CheckpointStorageMetadata, CheckpointListOptions } from '@modular-agent/types';
import type { StorageProvider, StorageMetadata } from '../types/index.js';

/**
 * 检查点存储适配器
 * 将通用的 StorageProvider 适配为 SDK 的 CheckpointStorageCallback 接口
 */
export class CheckpointStorageAdapter {
  constructor(private readonly storage: StorageProvider<Uint8Array>) { }

  /**
   * 保存检查点
   * @param checkpointId 检查点唯一标识
   * @param data 序列化后的检查点数据（字节数组）
   * @param metadata 检查点元数据
   */
  async saveCheckpoint(
    checkpointId: string,
    data: Uint8Array,
    metadata: CheckpointStorageMetadata
  ): Promise<void> {
    const storageMetadata: StorageMetadata = {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      modelType: 'checkpoint',
      parentId: metadata.threadId,
      workflowId: metadata.workflowId,
      tags: metadata.tags,
      customFields: {
        timestamp: metadata.timestamp,
        ...metadata.customFields
      }
    };

    await this.storage.save(checkpointId, data, storageMetadata);
  }

  /**
   * 加载检查点数据
   * @param checkpointId 检查点唯一标识
   * @returns 检查点数据（字节数组），如果不存在返回null
   */
  async loadCheckpoint(checkpointId: string): Promise<Uint8Array | null> {
    return await this.storage.load(checkpointId);
  }

  /**
   * 删除检查点
   * @param checkpointId 检查点唯一标识
   */
  async deleteCheckpoint(checkpointId: string): Promise<void> {
    await this.storage.delete(checkpointId);
  }

  /**
   * 列出检查点ID
   * @param options 查询选项
   * @returns 检查点ID数组，按时间戳降序排列
   */
  async listCheckpoints(options?: CheckpointListOptions): Promise<string[]> {
    const filter: Record<string, unknown> = {};

    if (options?.threadId) {
      filter['parentId'] = options.threadId;
    }

    if (options?.workflowId) {
      filter['workflowId'] = options.workflowId;
    }

    if (options?.tags && options.tags.length > 0) {
      filter['tags'] = options.tags;
    }

    const result = await this.storage.list({
      filter: Object.keys(filter).length > 0 ? filter : undefined,
      limit: options?.limit,
      offset: options?.offset,
      orderBy: 'timestamp',
      orderDirection: 'desc'
    });

    return result.items;
  }

  /**
   * 检查检查点是否存在
   * @param checkpointId 检查点唯一标识
   * @returns 是否存在
   */
  async checkpointExists(checkpointId: string): Promise<boolean> {
    return await this.storage.exists(checkpointId);
  }

  /**
   * 获取检查点元数据
   * @param checkpointId 检查点唯一标识
   * @returns 检查点元数据或 null
   */
  async getCheckpointMetadata(checkpointId: string): Promise<CheckpointStorageMetadata | null> {
    const metadata = await this.storage.getMetadata(checkpointId);
    if (!metadata) return null;

    return {
      threadId: metadata.parentId ?? '',
      workflowId: metadata.workflowId ?? '',
      timestamp: (metadata.customFields?.['timestamp'] as number) ?? metadata.createdAt,
      tags: metadata.tags,
      customFields: metadata.customFields
    };
  }

  /**
   * 批量删除检查点
   * @param checkpointIds 检查点ID数组
   */
  async deleteCheckpointsBatch(checkpointIds: string[]): Promise<void> {
    await this.storage.deleteBatch(checkpointIds);
  }

  /**
   * 清空所有检查点
   */
  async clearAllCheckpoints(): Promise<void> {
    await this.storage.clear();
  }

  /**
   * 关闭存储连接
   */
  async close(): Promise<void> {
    await this.storage.close();
  }
}
