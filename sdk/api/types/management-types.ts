/**
 * 管理API类型定义
 * 定义检查点、事件、变量、触发器管理相关的类型
 */

import type { EventType } from '@modular-agent/types/events';

/**
 * 检查点过滤器
 */
export interface CheckpointFilter {
  /** 线程ID */
  threadId?: string;
  /** 工作流ID */
  workflowId?: string;
  /** 开始时间戳 */
  startTimeFrom?: number;
  /** 结束时间戳 */
  startTimeTo?: number;
  /** 标签数组 */
  tags?: string[];
}

/**
 * 检查点摘要
 */
export interface CheckpointSummary {
  /** 检查点ID */
  checkpointId: string;
  /** 线程ID */
  threadId: string;
  /** 工作流ID */
  workflowId: string;
  /** 时间戳 */
  timestamp: number;
  /** 元数据 */
  metadata?: any;
}

/**
 * 事件过滤器
 */
export interface EventFilter {
  /** 事件类型 */
  eventType?: EventType;
  /** 线程ID */
  threadId?: string;
  /** 工作流ID */
  workflowId?: string;
  /** 节点ID */
  nodeId?: string;
  /** 开始时间戳 */
  startTimeFrom?: number;
  /** 结束时间戳 */
  startTimeTo?: number;
}

/**
 * 变量更新选项
 */
export interface VariableUpdateOptions {
  /** 是否验证变量类型 */
  validateType?: boolean;
  /** 是否允许更新只读变量 */
  allowReadonlyUpdate?: boolean;
}

/**
 * 变量过滤器
 */
export interface VariableFilter {
  /** 变量名称 */
  name?: string;
  /** 变量类型 */
  type?: string;
  /** 变量作用域 */
  scope?: 'local' | 'global';
  /** 是否只读 */
  readonly?: boolean;
}

/**
 * 触发器过滤器
 */
export interface TriggerFilter {
  /** 触发器ID */
  triggerId?: string;
  /** 触发器名称 */
  name?: string;
  /** 触发器状态 */
  status?: string;
  /** 关联的工作流ID */
  workflowId?: string;
  /** 关联的线程ID */
  threadId?: string;
}