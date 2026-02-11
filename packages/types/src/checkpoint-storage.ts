/**
 * 检查点存储接口类型定义
 * 定义应用层易于实现的存储接口及清理策略
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

/**
 * 检查点信息（包含ID和元数据）
 * 用于清理策略决策
 */
export interface CheckpointInfo {
  /** 检查点ID */
  checkpointId: string;
  /** 检查点元数据 */
  metadata: CheckpointStorageMetadata;
}

/**
 * 清理策略类型
 */
export type CleanupStrategyType = 'time' | 'count' | 'size';

/**
 * 基于时间的清理策略配置
 */
export interface TimeBasedCleanupPolicy {
  /** 策略类型 */
  type: 'time';
  /** 保留天数 */
  retentionDays: number;
  /** 最少保留数量（防止删除所有检查点） */
  minRetention?: number;
}

/**
 * 基于数量的清理策略配置
 */
export interface CountBasedCleanupPolicy {
  /** 策略类型 */
  type: 'count';
  /** 最大保留数量 */
  maxCount: number;
  /** 最少保留数量（防止删除所有检查点） */
  minRetention?: number;
}

/**
 * 基于存储空间的清理策略配置
 */
export interface SizeBasedCleanupPolicy {
  /** 策略类型 */
  type: 'size';
  /** 最大存储空间（字节） */
  maxSizeBytes: number;
  /** 最少保留数量（防止删除所有检查点） */
  minRetention?: number;
}

/**
 * 清理策略配置（联合类型）
 */
export type CleanupPolicy = 
  | TimeBasedCleanupPolicy 
  | CountBasedCleanupPolicy 
  | SizeBasedCleanupPolicy;

/**
 * 清理结果
 */
export interface CleanupResult {
  /** 删除的检查点ID列表 */
  deletedCheckpointIds: string[];
  /** 删除的检查点数量 */
  deletedCount: number;
  /** 释放的存储空间（字节） */
  freedSpaceBytes: number;
  /** 剩余检查点数量 */
  remainingCount: number;
}

/**
 * 检查点清理策略接口
 *
 * 提供统一的清理策略执行接口
 */
export interface CheckpointCleanupStrategy {
  /**
   * 执行清理策略
   *
   * @param checkpoints 所有检查点的信息列表（包含ID和元数据）
   * @returns 需要删除的检查点ID列表
   */
  execute(checkpoints: CheckpointInfo[]): string[];
}
