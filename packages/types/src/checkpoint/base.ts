/**
 * 检查点通用基础类型定义
 * 供 agent 和 graph 模块共用
 */

import type { ID, Timestamp } from '../common.js';

/**
 * 检查点类型
 */
export type CheckpointType = 'FULL' | 'DELTA';

/**
 * 检查点类型枚举值
 */
export const CheckpointTypeEnum: Record<string, CheckpointType> = {
  /** 完整检查点 */
  FULL: 'FULL',
  /** 增量检查点 */
  DELTA: 'DELTA'
};

// 为了向后兼容，同时导出为 CheckpointType
export { CheckpointTypeEnum as CheckpointType };

/**
 * 检查点元数据类型
 */
export interface CheckpointMetadata {
  /** 检查点描述 */
  description?: string;
  /** 标签数组 */
  tags?: string[];
  /** 自定义字段对象 */
  customFields?: Record<string, any>;
}

/**
 * 增量存储策略配置（通用）
 */
export interface DeltaStorageConfig {
  /** 是否启用增量存储 */
  enabled: boolean;
  /** 基线检查点间隔（每N个检查点创建一个基线） */
  baselineInterval: number;
  /** 最大增量链长度（超过则创建新基线） */
  maxDeltaChainLength: number;
}

/**
 * 默认增量存储配置
 */
export const DEFAULT_DELTA_STORAGE_CONFIG: DeltaStorageConfig = {
  enabled: true,
  baselineInterval: 10,
  maxDeltaChainLength: 20,
};

/**
 * 检查点配置结果（通用）
 */
export interface CheckpointConfigResult {
  /** 是否创建检查点 */
  shouldCreate: boolean;
  /** 检查点描述 */
  description?: string;
  /** 使用的配置来源 */
  source: string;
}

/**
 * 通用检查点列表选项
 */
export interface CheckpointListOptions {
  /** 父级ID（threadId 或 agentLoopId） */
  parentId?: ID;
  /** 标签过滤 */
  tags?: string[];
  /** 限制数量 */
  limit?: number;
  /** 偏移量 */
  offset?: number;
}