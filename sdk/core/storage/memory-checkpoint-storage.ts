/**
 * MemoryCheckpointStorage - 内存存储实现
 * 用于开发和测试环境的默认存储实现
 */

import type {
  CheckpointStorage,
  CheckpointStorageMetadata,
  CheckpointListOptions
} from '../../types/checkpoint-storage';

/**
 * 内存存储实现
 * 使用Map存储检查点数据和元数据
 */
export class MemoryCheckpointStorage implements CheckpointStorage {
  private data = new Map<string, { data: Uint8Array; metadata: CheckpointStorageMetadata }>();

  /**
   * 保存检查点
   */
  async save(
    checkpointId: string,
    data: Uint8Array,
    metadata: CheckpointStorageMetadata
  ): Promise<void> {
    this.data.set(checkpointId, { data, metadata });
  }

  /**
   * 加载检查点
   */
  async load(checkpointId: string): Promise<Uint8Array | null> {
    return this.data.get(checkpointId)?.data || null;
  }

  /**
   * 删除检查点
   */
  async delete(checkpointId: string): Promise<void> {
    this.data.delete(checkpointId);
  }

  /**
   * 列出检查点ID
   */
  async list(options?: CheckpointListOptions): Promise<string[]> {
    let entries = Array.from(this.data.entries());

    // 应用过滤条件
    if (options?.threadId) {
      entries = entries.filter(([_, { metadata }]) => metadata.threadId === options.threadId);
    }
    if (options?.workflowId) {
      entries = entries.filter(([_, { metadata }]) => metadata.workflowId === options.workflowId);
    }
    if (options?.tags?.length) {
      entries = entries.filter(([_, { metadata }]) =>
        metadata.tags?.some(tag => options.tags!.includes(tag))
      );
    }

    // 按时间戳降序排序
    entries.sort(([, a], [, b]) => b.metadata.timestamp - a.metadata.timestamp);

    // 应用分页
    const offset = options?.offset || 0;
    const limit = options?.limit !== undefined ? options.limit : entries.length;
    entries = entries.slice(offset, offset + limit);

    return entries.map(([id]) => id);
  }

  /**
   * 检查检查点是否存在
   */
  async exists(checkpointId: string): Promise<boolean> {
    return this.data.has(checkpointId);
  }

  /**
   * 清空所有检查点
   */
  async clear(): Promise<void> {
    this.data.clear();
  }

  /**
   * 获取检查点数量（用于测试）
   */
  getCount(): number {
    return this.data.size;
  }
}