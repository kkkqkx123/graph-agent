/**
 * JSON 文件线程存储实现
 * 基于 JSON 文件系统的线程持久化存储
 */

import type {
  ThreadStorageMetadata,
  ThreadListOptions,
  ThreadStatus
} from '@modular-agent/types';
import type { ThreadStorageCallback } from '../types/callback/index.js';
import { BaseJsonStorage, BaseJsonStorageConfig } from './base-json-storage.js';
import { StorageError } from '../types/storage-errors.js';

/**
 * JSON 文件线程存储
 * 实现 ThreadStorageCallback 接口
 */
export class JsonThreadStorage extends BaseJsonStorage<ThreadStorageMetadata> implements ThreadStorageCallback {
  constructor(config: BaseJsonStorageConfig) {
    super(config);
  }

  /**
   * 列出线程ID
   */
  async list(options?: ThreadListOptions): Promise<string[]> {
    this.ensureInitialized();

    let ids = this.getAllIds();

    // 应用过滤
    if (options) {
      ids = ids.filter(id => {
        const entry = this['metadataIndex'].get(id);
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
      const metaA = this['metadataIndex'].get(a)?.metadata;
      const metaB = this['metadataIndex'].get(b)?.metadata;

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
   * 更新线程状态
   */
  async updateThreadStatus(threadId: string, status: ThreadStatus): Promise<void> {
    this.ensureInitialized();

    const indexEntry = this['metadataIndex'].get(threadId);
    if (!indexEntry) {
      throw new StorageError(
        `Thread not found: ${threadId}`,
        'updateStatus',
        { threadId }
      );
    }

    // 更新元数据
    const updatedMetadata: ThreadStorageMetadata = {
      ...indexEntry.metadata,
      status
    };

    // 重新保存文件
    const data = await this.load(threadId);
    if (data) {
      await this.save(threadId, data, updatedMetadata);
    }
  }
}
