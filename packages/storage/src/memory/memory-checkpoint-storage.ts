/**
 * 内存检查点存储实现
 * 用于测试和临时存储场景
 */

import type { CheckpointStorageMetadata, CheckpointListOptions } from '@modular-agent/types';
import type { CheckpointStorageCallback } from '../types/checkpoint-callback.js';

/**
 * 检查点存储条目
 */
interface CheckpointEntry {
  data: Uint8Array;
  metadata: CheckpointStorageMetadata;
}

/**
 * 内存检查点存储
 * 实现 CheckpointStorageCallback 接口
 * 适用于测试和临时存储场景
 */
export class MemoryCheckpointStorage implements CheckpointStorageCallback {
  private store: Map<string, CheckpointEntry> = new Map();

  /**
   * 保存检查点
   */
  async saveCheckpoint(
    checkpointId: string,
    data: Uint8Array,
    metadata: CheckpointStorageMetadata
  ): Promise<void> {
    this.store.set(checkpointId, {
      data: new Uint8Array(data),  // 复制数据避免外部修改
      metadata
    });
  }

  /**
   * 加载检查点数据
   */
  async loadCheckpoint(checkpointId: string): Promise<Uint8Array | null> {
    const entry = this.store.get(checkpointId);
    if (!entry) {
      return null;
    }
    return new Uint8Array(entry.data);  // 返回副本避免外部修改
  }

  /**
   * 删除检查点
   */
  async deleteCheckpoint(checkpointId: string): Promise<void> {
    this.store.delete(checkpointId);
  }

  /**
   * 列出检查点ID
   */
  async listCheckpoints(options?: CheckpointListOptions): Promise<string[]> {
    let ids = Array.from(this.store.keys());

    // 应用过滤
    if (options) {
      ids = ids.filter(id => {
        const entry = this.store.get(id);
        if (!entry) return false;

        const metadata = entry.metadata;

        if (options.threadId && metadata.threadId !== options.threadId) {
          return false;
        }

        if (options.workflowId && metadata.workflowId !== options.workflowId) {
          return false;
        }

        if (options.tags && options.tags.length > 0) {
          if (!metadata.tags || !options.tags.some(tag => metadata.tags!.includes(tag))) {
            return false;
          }
        }

        return true;
      });
    }

    // 按时间戳降序排列
    ids.sort((a, b) => {
      const metaA = this.store.get(a)?.metadata;
      const metaB = this.store.get(b)?.metadata;
      return (metaB?.timestamp ?? 0) - (metaA?.timestamp ?? 0);
    });

    // 分页
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? ids.length;

    return ids.slice(offset, offset + limit);
  }

  /**
   * 检查检查点是否存在
   */
  async checkpointExists(checkpointId: string): Promise<boolean> {
    return this.store.has(checkpointId);
  }

  /**
   * 清空所有检查点
   */
  async clear(): Promise<void> {
    this.store.clear();
  }

  /**
   * 获取存储的检查点数量
   */
  get size(): number {
    return this.store.size;
  }
}
