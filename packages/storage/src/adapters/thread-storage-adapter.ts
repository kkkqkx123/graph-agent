/**
 * 线程存储适配器
 * 提供线程实体的存储接口
 */

import type { Thread } from '@modular-agent/types';
import type { StorageProvider, StorageMetadata, ListOptions } from '../types/index.js';
import type { ThreadStorageMetadataExt, ThreadListOptions, ThreadInfo } from '../types/storage-metadata.js';

/**
 * 线程存储适配器
 * 提供线程实体的 CRUD 操作
 */
export class ThreadStorageAdapter {
  constructor(private readonly storage: StorageProvider<Thread>) {}

  /**
   * 保存线程
   * @param thread 线程实体
   */
  async saveThread(thread: Thread): Promise<void> {
    const metadata: StorageMetadata = {
      createdAt: thread.startTime,
      updatedAt: Date.now(),
      modelType: 'thread',
      workflowId: thread.workflowId,
      customFields: {
        status: thread.status,
        startTime: thread.startTime,
        endTime: thread.endTime
      }
    };

    await this.storage.save(thread.id, thread, metadata);
  }

  /**
   * 加载线程
   * @param threadId 线程ID
   * @returns 线程实体或 null
   */
  async loadThread(threadId: string): Promise<Thread | null> {
    return await this.storage.load(threadId);
  }

  /**
   * 删除线程
   * @param threadId 线程ID
   */
  async deleteThread(threadId: string): Promise<void> {
    await this.storage.delete(threadId);
  }

  /**
   * 列出线程
   * @param options 查询选项
   * @returns 线程ID列表
   */
  async listThreads(options?: ThreadListOptions): Promise<string[]> {
    const filter: Record<string, unknown> = {};

    if (options?.workflowId) {
      filter['workflowId'] = options.workflowId;
    }

    if (options?.status) {
      filter['status'] = options.status;
    }

    const listOptions: ListOptions = {
      filter: Object.keys(filter).length > 0 ? filter : undefined,
      limit: options?.limit,
      offset: options?.offset,
      orderBy: 'updated_at',
      orderDirection: 'desc'
    };

    const result = await this.storage.list(listOptions);
    return result.items;
  }

  /**
   * 列出线程信息（包含ID和元数据）
   * @param options 查询选项
   * @returns 线程信息列表
   */
  async listThreadInfos(options?: ThreadListOptions): Promise<ThreadInfo[]> {
    const threadIds = await this.listThreads(options);
    const threadInfos: ThreadInfo[] = [];

    for (const threadId of threadIds) {
      const metadata = await this.storage.getMetadata(threadId);
      if (metadata) {
        threadInfos.push({
          threadId,
          metadata: {
            ...metadata,
            modelType: 'thread',
            workflowId: metadata.workflowId ?? '',
            status: (metadata.customFields?.['status'] as string) ?? 'pending',
            startTime: (metadata.customFields?.['startTime'] as number) ?? metadata.createdAt,
            endTime: metadata.customFields?.['endTime'] as number | undefined
          } as ThreadStorageMetadataExt
        });
      }
    }

    return threadInfos;
  }

  /**
   * 检查线程是否存在
   * @param threadId 线程ID
   * @returns 是否存在
   */
  async threadExists(threadId: string): Promise<boolean> {
    return await this.storage.exists(threadId);
  }

  /**
   * 获取线程元数据
   * @param threadId 线程ID
   * @returns 线程元数据或 null
   */
  async getThreadMetadata(threadId: string): Promise<ThreadStorageMetadataExt | null> {
    const metadata = await this.storage.getMetadata(threadId);
    if (!metadata) return null;

    return {
      ...metadata,
      modelType: 'thread',
      workflowId: metadata.workflowId ?? '',
      status: (metadata.customFields?.['status'] as string) ?? 'pending',
      startTime: (metadata.customFields?.['startTime'] as number) ?? metadata.createdAt,
      endTime: metadata.customFields?.['endTime'] as number | undefined
    } as ThreadStorageMetadataExt;
  }

  /**
   * 批量保存线程
   * @param threads 线程数组
   */
  async saveThreadsBatch(threads: Thread[]): Promise<void> {
    const items = threads.map(thread => ({
      id: thread.id,
      entity: thread,
      metadata: {
        createdAt: thread.startTime,
        updatedAt: Date.now(),
        modelType: 'thread',
        workflowId: thread.workflowId,
        customFields: {
          status: thread.status,
          startTime: thread.startTime,
          endTime: thread.endTime
        }
      } as StorageMetadata
    }));

    await this.storage.saveBatch(items);
  }

  /**
   * 批量删除线程
   * @param threadIds 线程ID数组
   */
  async deleteThreadsBatch(threadIds: string[]): Promise<void> {
    await this.storage.deleteBatch(threadIds);
  }

  /**
   * 清空所有线程
   */
  async clearAllThreads(): Promise<void> {
    await this.storage.clear();
  }

  /**
   * 关闭存储连接
   */
  async close(): Promise<void> {
    await this.storage.close();
  }
}
