/**
 * 线程存储类型定义
 * 定义线程持久化存储相关的元数据、查询选项
 */

import type { ID, Timestamp, Version } from '../common.js';
import type { ThreadStatus, ThreadType } from '../thread/status.js';

/**
 * 线程存储元数据
 * 用于索引和查询的元数据信息
 */
export interface ThreadStorageMetadata {
  /** 线程ID */
  threadId: ID;
  /** 工作流ID */
  workflowId: ID;
  /** 工作流版本 */
  workflowVersion: Version;
  /** 线程状态 */
  status: ThreadStatus;
  /** 线程类型 */
  threadType?: ThreadType;
  /** 当前节点ID */
  currentNodeId?: ID;
  /** 父线程ID（子线程场景） */
  parentThreadId?: ID;
  /** 开始时间 */
  startTime: Timestamp;
  /** 结束时间 */
  endTime?: Timestamp;
  /** 标签数组（用于分类和检索） */
  tags?: string[];
  /** 自定义元数据字段 */
  customFields?: Record<string, unknown>;
}

/**
 * 线程列表查询选项
 * 支持多维度过滤和分页
 */
export interface ThreadListOptions {
  /** 按工作流ID过滤 */
  workflowId?: ID;
  /** 按线程状态过滤（支持单个或多个状态） */
  status?: ThreadStatus | ThreadStatus[];
  /** 按线程类型过滤 */
  threadType?: ThreadType;
  /** 按父线程ID过滤 */
  parentThreadId?: ID;
  /** 开始时间范围 - 起始 */
  startTimeFrom?: Timestamp;
  /** 开始时间范围 - 结束 */
  startTimeTo?: Timestamp;
  /** 结束时间范围 - 起始 */
  endTimeFrom?: Timestamp;
  /** 结束时间范围 - 结束 */
  endTimeTo?: Timestamp;
  /** 按标签过滤（匹配任一标签） */
  tags?: string[];
  /** 最大返回数量（分页） */
  limit?: number;
  /** 偏移量（分页） */
  offset?: number;
  /** 排序字段 */
  sortBy?: 'startTime' | 'endTime' | 'updatedAt';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 线程信息（包含ID和元数据）
 * 用于列表展示和统计
 */
export interface ThreadInfo {
  /** 线程ID */
  threadId: string;
  /** 线程元数据 */
  metadata: ThreadStorageMetadata;
}

/**
 * 线程统计信息
 */
export interface ThreadStats {
  /** 总数 */
  total: number;
  /** 各状态数量 */
  byStatus: Record<ThreadStatus, number>;
  /** 各类型数量 */
  byType: Record<ThreadType, number>;
  /** 按工作流分组统计 */
  byWorkflow: Record<ID, number>;
}
