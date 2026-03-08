/**
 * 工作流存储类型定义
 * 定义工作流持久化存储相关的元数据、查询选项和版本管理
 */

import type { ID, Timestamp, Version } from './common.js';

/**
 * 工作流存储元数据
 * 用于索引和查询的元数据信息
 */
export interface WorkflowStorageMetadata {
  /** 工作流ID */
  workflowId: ID;
  /** 工作流名称 */
  name: string;
  /** 工作流版本 */
  version: Version;
  /** 描述 */
  description?: string;
  /** 作者 */
  author?: string;
  /** 分类 */
  category?: string;
  /** 标签数组 */
  tags?: string[];
  /** 创建时间 */
  createdAt: Timestamp;
  /** 更新时间 */
  updatedAt: Timestamp;
  /** 节点数量 */
  nodeCount: number;
  /** 边数量 */
  edgeCount: number;
  /** 是否启用 */
  enabled?: boolean;
  /** 自定义元数据字段 */
  customFields?: Record<string, unknown>;
}

/**
 * 工作流列表查询选项
 * 支持多维度过滤和分页
 */
export interface WorkflowListOptions {
  /** 按名称模糊搜索 */
  name?: string;
  /** 按作者过滤 */
  author?: string;
  /** 按分类过滤 */
  category?: string;
  /** 按标签过滤（匹配任一标签） */
  tags?: string[];
  /** 按启用状态过滤 */
  enabled?: boolean;
  /** 创建时间范围 - 起始 */
  createdAtFrom?: Timestamp;
  /** 创建时间范围 - 结束 */
  createdAtTo?: Timestamp;
  /** 更新时间范围 - 起始 */
  updatedAtFrom?: Timestamp;
  /** 更新时间范围 - 结束 */
  updatedAtTo?: Timestamp;
  /** 最大返回数量（分页） */
  limit?: number;
  /** 偏移量（分页） */
  offset?: number;
  /** 排序字段 */
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 工作流信息（包含ID和元数据）
 * 用于列表展示
 */
export interface WorkflowInfo {
  /** 工作流ID */
  workflowId: string;
  /** 工作流元数据 */
  metadata: WorkflowStorageMetadata;
}

/**
 * 工作流版本信息
 */
export interface WorkflowVersionInfo {
  /** 版本号 */
  version: Version;
  /** 创建时间 */
  createdAt: Timestamp;
  /** 创建者 */
  createdBy?: string;
  /** 变更说明 */
  changeNote?: string;
  /** 是否为当前版本 */
  isCurrent?: boolean;
}

/**
 * 工作流版本列表选项
 */
export interface WorkflowVersionListOptions {
  /** 最大返回数量 */
  limit?: number;
  /** 偏移量 */
  offset?: number;
}

/**
 * 工作流统计信息
 */
export interface WorkflowStats {
  /** 总数 */
  total: number;
  /** 启用数量 */
  enabled: number;
  /** 禁用数量 */
  disabled: number;
  /** 按分类统计 */
  byCategory: Record<string, number>;
  /** 按作者统计 */
  byAuthor: Record<string, number>;
}
