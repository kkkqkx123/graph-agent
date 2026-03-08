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

/**
 * 任务存储回调接口
 *
 * 定义任务持久化操作的统一接口
 * - packages/storage 提供了基于此接口的 TaskStorageAdapter 实现
 * - 应用层可以直接使用 TaskStorageAdapter，或自行实现此接口
 */
export interface TaskStorageCallback {
  /**
   * 保存任务
   * @param taskId 任务唯一标识
   * @param data 序列化后的任务数据（字节数组）
   * @param metadata 任务元数据（用于索引和查询）
   */
  saveTask(
    taskId: string,
    data: Uint8Array,
    metadata: TaskStorageMetadata
  ): Promise<void>;

  /**
   * 加载任务数据
   * @param taskId 任务唯一标识
   * @returns 任务数据（字节数组），如果不存在返回null
   */
  loadTask(taskId: string): Promise<Uint8Array | null>;

  /**
   * 删除任务
   * @param taskId 任务唯一标识
   */
  deleteTask(taskId: string): Promise<void>;

  /**
   * 列出任务ID
   * @param options 查询选项（支持多维度过滤和分页）
   * @returns 任务ID数组
   */
  listTasks(options?: TaskListOptions): Promise<string[]>;

  /**
   * 检查任务是否存在
   * @param taskId 任务唯一标识
   * @returns 是否存在
   */
  taskExists(taskId: string): Promise<boolean>;

  /**
   * 获取任务元数据
   * @param taskId 任务唯一标识
   * @returns 任务元数据，如果不存在返回null
   */
  getTaskMetadata(taskId: string): Promise<TaskStorageMetadata | null>;

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
