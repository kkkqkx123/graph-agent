/**
 * 内存线程存储实现
 * 用于测试和临时存储场景
 */

import type {
  ThreadStorageMetadata,
  ThreadListOptions,
  ThreadStatus
} from '@modular-agent/types';
import type { ThreadStorageCallback } from '../types/thread-callback.js';

/**
 * 线程存储条目
 */
interface ThreadEntry {
  data: Uint8Array;
  metadata: ThreadStorageMetadata;
}

/**
 * 内存线程存储
 * 实现 ThreadStorageCallback 接口
 * 适用于测试和临时存储场景
 */
export class MemoryThreadStorage implements ThreadStorageCallback {
  private store: Map<string, ThreadEntry> = new Map();

  /**
   * 保存线程
   */
  async saveThread(
    threadId: string,
    data: Uint8Array,
    metadata: ThreadStorageMetadata
  ): Promise<void> {
    this.store.set(threadId, {
      data: new Uint8Array(data),  // 复制数据避免外部修改
      metadata
    });
  }

  /**
   * 加载线程数据
   */
  async loadThread(threadId: string): Promise<Uint8Array | null> {
    const entry = this.store.get(threadId);
    if (!entry) {
      return null;
    }
    return new Uint8Array(entry.data);  // 返回副本避免外部修改
  }

  /**
   * 删除线程
   */
  async deleteThread(threadId: string): Promise<void> {
    this.store.delete(threadId);
  }

  /**
   * 列出线程ID
   */
  async listThreads(options?: ThreadListOptions): Promise<string[]> {
    let ids = Array.from(this.store.keys());

    // 应用过滤
    if (options) {
      ids = ids.filter(id => {
        const entry = this.store.get(id);
        if (!entry) return false;

        const metadata = entry.metadata;

        if (options.workflowId && metadata.workflowId !== options.workflowId) {
          return false;
        }

        if (options.status) {
          if (Array.isArray(options.status)) {
            if (!options.status.includes(metadata.status)) {
              return false;
            }
          } else if (metadata.status !== options.status) {
            return false;
          }
        }

        if (options.threadType && metadata.threadType !== options.threadType) {
          return false;
        }

        if (options.parentThreadId && metadata.parentThreadId !== options.parentThreadId) {
          return false;
        }

        if (options.startTimeFrom && metadata.startTime < options.startTimeFrom) {
          return false;
        }

        if (options.startTimeTo && metadata.startTime > options.startTimeTo) {
          return false;
        }

        if (options.endTimeFrom && (metadata.endTime === undefined || metadata.endTime < options.endTimeFrom)) {
          return false;
        }

        if (options.endTimeTo && (metadata.endTime === undefined || metadata.endTime > options.endTimeTo)) {
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

    // 排序
    const sortBy = options?.sortBy ?? 'startTime';
    const sortOrder = options?.sortOrder ?? 'desc';

    ids.sort((a, b) => {
      const metaA = this.store.get(a)?.metadata;
      const metaB = this.store.get(b)?.metadata;

      let valueA: number;
      let valueB: number;

      switch (sortBy) {
        case 'startTime':
          valueA = metaA?.startTime ?? 0;
          valueB = metaB?.startTime ?? 0;
          break;
        case 'endTime':
          valueA = metaA?.endTime ?? 0;
          valueB = metaB?.endTime ?? 0;
          break;
        case 'updatedAt':
        default:
          valueA = metaA?.startTime ?? 0;
          valueB = metaB?.startTime ?? 0;
          break;
      }

      return sortOrder === 'asc' ? valueA - valueB : valueB - valueA;
    });

    // 分页
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? ids.length;

    return ids.slice(offset, offset + limit);
  }

  /**
   * 检查线程是否存在
   */
  async threadExists(threadId: string): Promise<boolean> {
    return this.store.has(threadId);
  }

  /**
   * 更新线程状态
   */
  async updateThreadStatus(threadId: string, status: ThreadStatus): Promise<void> {
    const entry = this.store.get(threadId);
    if (entry) {
      entry.metadata = {
        ...entry.metadata,
        status
      };
    }
  }

  /**
   * 获取线程元数据
   */
  async getThreadMetadata(threadId: string): Promise<ThreadStorageMetadata | null> {
    const entry = this.store.get(threadId);
    return entry?.metadata ?? null;
  }

  /**
   * 清空所有线程
   */
  async clear(): Promise<void> {
    this.store.clear();
  }

  /**
   * 获取存储的线程数量
   */
  get size(): number {
    return this.store.size;
  }
}
