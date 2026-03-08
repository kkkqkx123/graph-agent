/**
 * 线程存储回调接口定义
 * 定义线程持久化操作的统一接口
 */

import type {
  ThreadStorageMetadata,
  ThreadListOptions,
  ThreadStatus
} from '@modular-agent/types';
import type { BaseStorageCallback } from './base-storage-callback.js';

/**
 * 线程存储回调接口
 *
 * 定义线程持久化操作的统一接口
 * - 继承自 BaseStorageCallback，提供标准 CRUD 操作
 * - packages/storage 提供了基于此接口的 ThreadStorageAdapter 实现
 * - 应用层可以直接使用 ThreadStorageAdapter，或自行实现此接口
 */
export interface ThreadStorageCallback
  extends BaseStorageCallback<ThreadStorageMetadata, ThreadListOptions> {
  /**
   * 更新线程状态
   * @param threadId 线程唯一标识
   * @param status 新状态
   */
  updateThreadStatus(threadId: string, status: ThreadStatus): Promise<void>;
}
