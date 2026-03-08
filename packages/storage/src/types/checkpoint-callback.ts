/**
 * 检查点存储回调接口定义
 * 定义检查点持久化操作的统一接口
 */

import type { CheckpointStorageMetadata, CheckpointListOptions } from '@modular-agent/types';

/**
 * 检查点存储回调接口
 *
 * 定义检查点持久化操作的统一接口
 * - packages/storage 提供了基于此接口的 CheckpointStorageAdapter 实现
 * - 应用层可以直接使用 CheckpointStorageAdapter，或自行实现此接口
 */
export interface CheckpointStorageCallback {
  // ==================== 生命周期管理 ====================

  /**
   * 初始化存储
   * 创建必要的资源（目录、数据库连接等）
   */
  initialize(): Promise<void>;

  /**
   * 关闭存储连接
   * 释放资源并清理状态
   */
  close(): Promise<void>;

  /**
   * 清空所有检查点
   */
  clear(): Promise<void>;

  // ==================== 数据操作 ====================

  /**
   * 保存检查点
   * @param checkpointId 检查点唯一标识
   * @param data 序列化后的检查点数据（字节数组）
   * @param metadata 检查点元数据（用于索引和查询）
   */
  saveCheckpoint(
    checkpointId: string,
    data: Uint8Array,
    metadata: CheckpointStorageMetadata
  ): Promise<void>;

  /**
   * 加载检查点数据
   * @param checkpointId 检查点唯一标识
   * @returns 检查点数据（字节数组），如果不存在返回null
   */
  loadCheckpoint(checkpointId: string): Promise<Uint8Array | null>;

  /**
   * 删除检查点
   * @param checkpointId 检查点唯一标识
   */
  deleteCheckpoint(checkpointId: string): Promise<void>;

  /**
   * 列出检查点ID
   * @param options 查询选项（支持基本过滤和分页）
   * @returns 检查点ID数组，按时间戳降序排列
   */
  listCheckpoints(options?: CheckpointListOptions): Promise<string[]>;

  /**
   * 检查检查点是否存在
   * @param checkpointId 检查点唯一标识
   * @returns 是否存在
   */
  checkpointExists(checkpointId: string): Promise<boolean>;
}
