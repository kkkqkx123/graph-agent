/**
 * 工具相关事件类型定义
 */

import type { ID } from '../common.js';
import type { BaseEvent, EventType } from './base.js';

/**
 * 工具调用开始事件类型
 */
export interface ToolCallStartedEvent extends BaseEvent {
  type: 'TOOL_CALL_STARTED';
  /** 节点ID */
  nodeId: ID;
  /** 工具ID */
  toolId: ID;
  /** 工具调用任务ID（用于追踪单个工具调用） */
  taskId?: string;
  /** 批次ID（一批并行工具调用的标识） */
  batchId?: string;
  /** 工具名称 */
  toolName?: string;
  /** 工具参数 */
  toolArguments: string;
}

/**
 * 工具调用完成事件类型
 */
export interface ToolCallCompletedEvent extends BaseEvent {
  type: 'TOOL_CALL_COMPLETED';
  /** 节点ID */
  nodeId: ID;
  /** 工具ID */
  toolId: ID;
  /** 工具调用任务ID（用于追踪单个工具调用） */
  taskId?: string;
  /** 批次ID（一批并行工具调用的标识） */
  batchId?: string;
  /** 工具名称 */
  toolName?: string;
  /** 工具结果 */
  toolResult: any;
  /** 执行时间 */
  executionTime: number;
}

/**
 * 工具调用失败事件类型
 */
export interface ToolCallFailedEvent extends BaseEvent {
  type: 'TOOL_CALL_FAILED';
  /** 节点ID */
  nodeId: ID;
  /** 工具ID */
  toolId: ID;
  /** 工具调用任务ID（用于追踪单个工具调用） */
  taskId?: string;
  /** 批次ID（一批并行工具调用的标识） */
  batchId?: string;
  /** 工具名称 */
  toolName?: string;
  /** 错误信息 */
  error: string;
}

/**
 * 工具添加事件类型
 */
export interface ToolAddedEvent extends BaseEvent {
  type: 'TOOL_ADDED';
  /** 节点ID */
  nodeId: ID;
  /** 工具ID列表 */
  toolIds: ID[];
  /** 作用域 */
  scope: 'GLOBAL' | 'THREAD' | 'LOCAL';
  /** 成功添加的工具数量 */
  addedCount: number;
  /** 被跳过的工具数量 */
  skippedCount: number;
}