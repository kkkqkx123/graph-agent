/**
 * MemoryStorage - 内存存储实现
 * 用于开发和测试环境
 */

import type { Checkpoint } from '../../../../types/checkpoint';
import type { CheckpointStorage, CheckpointFilter } from './storage-interface';

/**
 * 内存存储实现
 */
export class MemoryStorage implements CheckpointStorage {
  private checkpoints: Map<string, Checkpoint> = new Map();

  /**
   * 保存检查点
   */
  async save(checkpoint: Checkpoint): Promise<void> {
    this.checkpoints.set(checkpoint.id, checkpoint);
  }

  /**
   * 加载检查点
   */
  async load(checkpointId: string): Promise<Checkpoint | null> {
    return this.checkpoints.get(checkpointId) || null;
  }

  /**
   * 查询检查点
   */
  async list(filter?: CheckpointFilter): Promise<Checkpoint[]> {
    let results = Array.from(this.checkpoints.values());

    // 应用过滤条件
    if (filter) {
      if (filter.threadId) {
        results = results.filter(cp => cp.threadId === filter.threadId);
      }
      if (filter.workflowId) {
        results = results.filter(cp => cp.workflowId === filter.workflowId);
      }
      if (filter.tags && filter.tags.length > 0) {
        results = results.filter(cp => {
          const checkpointTags = cp.metadata?.tags || [];
          return filter.tags!.some(tag => checkpointTags.includes(tag));
        });
      }
      if (filter.startTime !== undefined) {
        results = results.filter(cp => cp.timestamp >= filter.startTime!);
      }
      if (filter.endTime !== undefined) {
        results = results.filter(cp => cp.timestamp <= filter.endTime!);
      }
    }

    // 按时间戳降序排序
    results.sort((a, b) => b.timestamp - a.timestamp);

    return results;
  }

  /**
   * 删除检查点
   */
  async delete(checkpointId: string): Promise<void> {
    this.checkpoints.delete(checkpointId);
  }

  /**
   * 检查检查点是否存在
   */
  async exists(checkpointId: string): Promise<boolean> {
    return this.checkpoints.has(checkpointId);
  }

  /**
   * 清空所有检查点
   */
  async clear(): Promise<void> {
    this.checkpoints.clear();
  }

  /**
   * 获取检查点数量（用于测试）
   */
  getCount(): number {
    return this.checkpoints.size;
  }
}