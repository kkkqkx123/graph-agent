/**
 * 任务存储回调接口定义
 * 定义任务持久化操作的统一接口
 */

import type {
  TaskStorageMetadata,
  TaskListOptions,
  TaskStats,
  TaskStatsOptions
} from '@modular-agent/types';
import type { BaseStorageCallback } from './base-storage-callback.js';

/**
 * 任务存储回调接口
 *
 * 定义任务持久化操作的统一接口
 * - 继承自 BaseStorageCallback，提供标准 CRUD 操作
 * - packages/storage 提供了基于此接口的 TaskStorageAdapter 实现
 * - 应用层可以直接使用 TaskStorageAdapter，或自行实现此接口
 */
export interface TaskStorageCallback
  extends BaseStorageCallback<TaskStorageMetadata, TaskListOptions> {
  /**
   * 获取任务统计信息
   * @param options 统计选项
   * @returns 任务统计信息
   */
  getTaskStats(options?: TaskStatsOptions): Promise<TaskStats>;

  /**
   * 清理过期任务
   * @param retentionTime 保留时间（毫秒）
   * @returns 清理的任务数量
   */
  cleanupTasks(retentionTime: number): Promise<number>;
}
