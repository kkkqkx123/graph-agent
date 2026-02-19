/**
 * 检查点存储类型定义
 * 定义检查点存储相关的元数据、查询选项和清理策略
 *
 * 注意：存储接口 CheckpointStorageCallback 已移至 SDK 层
 * 应用层需要实现该接口以提供存储功能
 */

import type { ID, Timestamp } from './common.js';

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
