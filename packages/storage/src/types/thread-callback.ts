/**
 * 线程存储回调接口定义
 * 定义线程持久化操作的统一接口
 */

import type {
  ThreadStorageMetadata,
  ThreadListOptions,
  ThreadStatus
} from '@modular-agent/types';

/**
 * 线程存储回调接口
 *
 * 定义线程持久化操作的统一接口
 * - packages/storage 提供了基于此接口的 ThreadStorageAdapter 实现
 * - 应用层可以直接使用 ThreadStorageAdapter，或自行实现此接口
 */
export interface ThreadStorageCallback {
  /**
   * 保存线程
   * @param threadId 线程唯一标识
   * @param data 序列化后的线程数据（字节数组）
   * @param metadata 线程元数据（用于索引和查询）
   */
  saveThread(
    threadId: string,
    data: Uint8Array,
    metadata: ThreadStorageMetadata
  ): Promise<void>;

  /**
   * 加载线程数据
   * @param threadId 线程唯一标识
   * @returns 线程数据（字节数组），如果不存在返回null
   */
  loadThread(threadId: string): Promise<Uint8Array | null>;

  /**
   * 删除线程
   * @param threadId 线程唯一标识
   */
  deleteThread(threadId: string): Promise<void>;

  /**
   * 列出线程ID
   * @param options 查询选项（支持多维度过滤和分页）
   * @returns 线程ID数组，按时间戳降序排列
   */
  listThreads(options?: ThreadListOptions): Promise<string[]>;

  /**
   * 检查线程是否存在
   * @param threadId 线程唯一标识
   * @returns 是否存在
   */
  threadExists(threadId: string): Promise<boolean>;

  /**
   * 更新线程状态
   * @param threadId 线程唯一标识
   * @param status 新状态
   */
  updateThreadStatus(threadId: string, status: ThreadStatus): Promise<void>;

  /**
   * 获取线程元数据
   * @param threadId 线程唯一标识
   * @returns 线程元数据，如果不存在返回null
   */
  getThreadMetadata(threadId: string): Promise<ThreadStorageMetadata | null>;
}
