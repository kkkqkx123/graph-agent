/**
 * Checkpoint存储接口类型定义
 * 定义应用层易于实现的存储接口
 */

import type { ID, Timestamp } from './common';

/**
 * 检查点存储元数据
 * 用于索引和查询的元数据信息
 */
export interface CheckpointStorageMetadata {
  /** 线程ID */
  threadId: ID;
  /** 工作流ID */
  workflowId: ID;
  /** 创建时间戳 */
  timestamp: Timestamp;
  /** 标签数组（用于分类和检索） */
  tags?: string[];
  /** 自定义元数据字段 */
  customFields?: Record<string, any>;
}

/**
 * 检查点列表查询选项
 * 支持基本过滤和分页
 */
export interface CheckpointListOptions {
  /** 按线程ID过滤 */
  threadId?: ID;
  /** 按工作流ID过滤 */
  workflowId?: ID;
  /** 按标签过滤（匹配任一标签） */
  tags?: string[];
  /** 最大返回数量（分页） */
  limit?: number;
  /** 偏移量（分页） */
  offset?: number;
}

/**
 * 检查点存储接口
 * 
 * 设计原则：
 * 1. 最简实现：只包含核心CRUD操作
 * 2. 数据无关性：只处理Uint8Array字节数据，不依赖SDK内部类型
 * 3. 元数据分离：索引字段与业务数据分离，便于应用层优化存储
 * 4. 易于实现：接口简单，应用层可以快速实现自定义存储逻辑
 */
export interface CheckpointStorage {
  /**
   * 保存检查点数据
   * @param checkpointId 检查点唯一标识
   * @param data 序列化后的检查点数据（字节数组）
   * @param metadata 检查点元数据（用于索引和查询）
   */
  save(
    checkpointId: string,
    data: Uint8Array,
    metadata: CheckpointStorageMetadata
  ): Promise<void>;

  /**
   * 加载检查点数据
   * @param checkpointId 检查点唯一标识
   * @returns 检查点数据（字节数组），如果不存在返回null
   */
  load(checkpointId: string): Promise<Uint8Array | null>;

  /**
   * 删除检查点
   * @param checkpointId 检查点唯一标识
   */
  delete(checkpointId: string): Promise<void>;

  /**
   * 列出检查点ID
   * @param options 查询选项（支持基本过滤和分页）
   * @returns 检查点ID数组，按时间戳降序排列
   */
  list(options?: CheckpointListOptions): Promise<string[]>;

  /**
   * 检查检查点是否存在
   * @param checkpointId 检查点唯一标识
   * @returns 是否存在
   */
  exists(checkpointId: string): Promise<boolean>;

  /**
   * 清空所有检查点（可选实现）
   * 主要用于测试和开发环境
   */
  clear?(): Promise<void>;
}