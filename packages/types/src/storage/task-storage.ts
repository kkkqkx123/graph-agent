/**
 * 任务存储类型定义
 * 定义任务持久化存储相关的元数据、查询选项和统计信息
 */

import type { ID, Timestamp } from '../common.js';

/**
 * 任务状态
 */
export type TaskStatus =
  /** 排队中 */
  'QUEUED' |
  /** 运行中 */
  'RUNNING' |
  /** 已完成 */
  'COMPLETED' |
  /** 已失败 */
  'FAILED' |
  /** 已取消 */
  'CANCELLED' |
  /** 超时 */
  'TIMEOUT';

/**
 * 任务存储元数据
 * 用于索引和查询的元数据信息
 */
export interface TaskStorageMetadata {
  /** 任务ID */
  taskId: ID;
  /** 线程ID */
  threadId: ID;
  /** 工作流ID */
  workflowId: ID;
  /** 任务状态 */
  status: TaskStatus;
  /** 提交时间 */
  submitTime: Timestamp;
  /** 开始时间 */
  startTime?: Timestamp;
  /** 完成时间 */
  completeTime?: Timestamp;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 错误信息 */
  error?: string;
  /** 错误堆栈 */
  errorStack?: string;
  /** 标签数组 */
  tags?: string[];
  /** 自定义元数据字段 */
  customFields?: Record<string, unknown>;
}

/**
 * 任务列表查询选项
 * 支持多维度过滤和分页
 */
export interface TaskListOptions {
  /** 按线程ID过滤 */
  threadId?: ID;
  /** 按工作流ID过滤 */
  workflowId?: ID;
  /** 按任务状态过滤（支持单个或多个状态） */
  status?: TaskStatus | TaskStatus[];
  /** 提交时间范围 - 起始 */
  submitTimeFrom?: Timestamp;
  /** 提交时间范围 - 结束 */
  submitTimeTo?: Timestamp;
  /** 开始时间范围 - 起始 */
  startTimeFrom?: Timestamp;
  /** 开始时间范围 - 结束 */
  startTimeTo?: Timestamp;
  /** 完成时间范围 - 起始 */
  completeTimeFrom?: Timestamp;
  /** 完成时间范围 - 结束 */
  completeTimeTo?: Timestamp;
  /** 按标签过滤 */
  tags?: string[];
  /** 最大返回数量（分页） */
  limit?: number;
  /** 偏移量（分页） */
  offset?: number;
  /** 排序字段 */
  sortBy?: 'submitTime' | 'startTime' | 'completeTime';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 任务信息（包含ID和元数据）
 * 用于列表展示
 */
export interface TaskInfo {
  /** 任务ID */
  taskId: string;
  /** 任务元数据 */
  metadata: TaskStorageMetadata;
}

/**
 * 任务统计选项
 */
export interface TaskStatsOptions {
  /** 按工作流ID过滤 */
  workflowId?: ID;
  /** 时间范围 - 起始 */
  timeFrom?: Timestamp;
  /** 时间范围 - 结束 */
  timeTo?: Timestamp;
}

/**
 * 任务统计信息
 */
export interface TaskStats {
  /** 总数 */
  total: number;
  /** 各状态数量 */
  byStatus: Record<TaskStatus, number>;
  /** 按工作流分组统计 */
  byWorkflow: Record<ID, number>;
  /** 平均执行时间（毫秒） */
  avgExecutionTime?: number;
  /** 最大执行时间（毫秒） */
  maxExecutionTime?: number;
  /** 最小执行时间（毫秒） */
  minExecutionTime?: number;
  /** 成功率 */
  successRate?: number;
  /** 超时率 */
  timeoutRate?: number;
}

/**
 * 任务执行时间统计
 */
export interface TaskExecutionTimeStats {
  /** 平均执行时间 */
  avgTime: number;
  /** 最大执行时间 */
  maxTime: number;
  /** 最小执行时间 */
  minTime: number;
  /** 中位数执行时间 */
  medianTime?: number;
  /** P95执行时间 */
  p95Time?: number;
  /** P99执行时间 */
  p99Time?: number;
}
