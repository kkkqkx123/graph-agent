/**
 * 通用 Checkpoint 类型定义
 *
 * 提供可被 Graph 和 Agent 模块复用的 Checkpoint 基础类型。
 */

import type { CheckpointMetadata, CheckpointConfigSource } from '@modular-agent/types';

// 重新导出 CheckpointConfigSource 以便使用
export type { CheckpointConfigSource } from '@modular-agent/types';

/**
 * 通用检查点数据（基础接口）
 *
 * 所有检查点数据都应扩展此接口。
 */
export interface BaseCheckpointData {
  /** 检查点 ID */
  checkpointId?: string;
  /** 创建时间戳 */
  timestamp: number;
  /** 检查点元数据 */
  metadata?: CheckpointMetadata;
  /** 自定义数据（扩展用） */
  [key: string]: any;
}

/**
 * 检查点创建选项（基础接口）
 */
export interface BaseCheckpointOptions {
  /** 检查点描述 */
  description?: string;
  /** 自定义元数据 */
  metadata?: CheckpointMetadata;
  /** 标签 */
  tags?: string[];
}

/**
 * 检查点配置来源类型
 *
 * 使用 @modular-agent/types 中定义的类型
 */
export type CheckpointConfigSourceType = CheckpointConfigSource;

/**
 * 检查点配置解析结果
 */
export interface CheckpointConfigResult {
  /** 是否创建检查点 */
  shouldCreate: boolean;
  /** 检查点描述 */
  description?: string;
  /** 配置来源 */
  source: CheckpointConfigSource;
  /** 自定义元数据 */
  metadata?: CheckpointMetadata;
}

/**
 * 检查点管理器接口
 *
 * 定义检查点管理的通用操作。
 * 具体模块需要实现此接口。
 */
export interface CheckpointManager<TData extends BaseCheckpointData = BaseCheckpointData> {
  /**
   * 创建检查点
   * @param data 检查点数据
   * @param options 创建选项
   * @returns 检查点 ID
   */
  create(data: TData, options?: BaseCheckpointOptions): Promise<string>;

  /**
   * 恢复检查点
   * @param checkpointId 检查点 ID
   * @returns 检查点数据
   */
  restore(checkpointId: string): Promise<TData | null>;

  /**
   * 删除检查点
   * @param checkpointId 检查点 ID
   */
  delete(checkpointId: string): Promise<void>;

  /**
   * 列出检查点
   * @param filter 过滤条件
   * @returns 检查点列表
   */
  list(filter?: CheckpointListFilter): Promise<TData[]>;
}

/**
 * 检查点列表过滤条件
 */
export interface CheckpointListFilter {
  /** 限制数量 */
  limit?: number;
  /** 偏移量 */
  offset?: number;
  /** 标签过滤 */
  tags?: string[];
  /** 时间范围 - 开始 */
  startTime?: number;
  /** 时间范围 - 结束 */
  endTime?: number;
}

/**
 * 检查点快照构建器接口
 *
 * 用于从执行上下文构建检查点快照数据。
 */
export interface CheckpointSnapshotBuilder<TContext, TData extends BaseCheckpointData> {
  /**
   * 构建快照数据
   * @param context 执行上下文
   * @returns 快照数据
   */
  build(context: TContext): Promise<TData>;
}
