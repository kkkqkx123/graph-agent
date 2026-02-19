/**
 * 检查点存储回调接口
 * 
 * 由应用层实现，SDK 通过回调与存储交互
 * 
 * 设计原则：
 * - SDK 不提供存储实现，只定义接口契约
 * - 应用层负责具体的存储逻辑（ORM、数据库、Redis 等）
 * - 通过回调接口实现 SDK 与存储的解耦
 */

import type { CheckpointStorageMetadata, CheckpointListOptions } from '@modular-agent/types';

/**
 * 检查点存储回调接口
 * 
 * 应用层需要实现此接口，提供检查点的持久化功能
 */
export interface CheckpointStorageCallback {
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