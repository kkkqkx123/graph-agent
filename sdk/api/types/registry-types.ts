/**
 * 注册表API类型定义
 * 定义工作流、线程、节点模板注册表相关的类型
 */

import type { ThreadStatus } from '@modular-agent/types/thread';

/**
 * 工作流过滤器
 */
export interface WorkflowFilter {
  /** 工作流ID */
  id?: string;
  /** 工作流名称 */
  name?: string;
  /** 标签数组 */
  tags?: string[];
  /** 分类 */
  category?: string;
  /** 作者 */
  author?: string;
  /** 版本 */
  version?: string;
}

/**
 * 线程过滤器
 */
export interface ThreadFilter {
  /** 线程ID */
  threadId?: string;
  /** 工作流ID */
  workflowId?: string;
  /** 线程状态 */
  status?: ThreadStatus;
  /** 创建时间范围（开始时间戳） */
  startTimeFrom?: number;
  /** 创建时间范围（结束时间戳） */
  startTimeTo?: number;
}

/**
 * 工作流摘要
 */
export interface WorkflowSummary {
  /** 工作流ID */
  id: string;
  /** 工作流名称 */
  name: string;
  /** 描述 */
  description?: string;
  /** 版本 */
  version: string;
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
  /** 元数据 */
  metadata?: any;
}

/**
 * 线程摘要
 */
export interface ThreadSummary {
  /** 线程ID */
  threadId: string;
  /** 工作流ID */
  workflowId: string;
  /** 工作流版本 */
  workflowVersion: string;
  /** 线程状态 */
  status: ThreadStatus;
  /** 当前节点ID */
  currentNodeId?: string;
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime?: number;
  /** 执行时间（毫秒） */
  executionTime?: number;
}

/**
 * 节点模板过滤器
 */
export interface NodeTemplateFilter {
  /** 节点模板名称 */
  name?: string;
  /** 节点类型 */
  type?: string;
  /** 分类 */
  category?: string;
  /** 标签数组 */
  tags?: string[];
}

/**
 * 节点模板摘要
 */
export interface NodeTemplateSummary {
  /** 节点模板名称 */
  name: string;
  /** 节点类型 */
  type: string;
  /** 节点描述 */
  description?: string;
  /** 分类 */
  category?: string;
  /** 标签数组 */
  tags?: string[];
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
}