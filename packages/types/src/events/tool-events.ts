/**
 * 工具相关事件类型定义
 */

import type { ID } from '../common';
import type { BaseEvent, EventType } from './base';

/**
 * 工具调用开始事件类型
 */
export interface ToolCallStartedEvent extends BaseEvent {
  type: EventType.TOOL_CALL_STARTED;
  /** 节点ID */
  nodeId: ID;
  /** 工具名称 */
  toolName: string;
  /** 工具参数 */
  toolArguments: string;
}

/**
 * 工具调用完成事件类型
 */
export interface ToolCallCompletedEvent extends BaseEvent {
  type: EventType.TOOL_CALL_COMPLETED;
  /** 节点ID */
  nodeId: ID;
  /** 工具名称 */
  toolName: string;
  /** 工具结果 */
  toolResult: any;
  /** 执行时间 */
  executionTime: number;
}

/**
 * 工具调用失败事件类型
 */
export interface ToolCallFailedEvent extends BaseEvent {
  type: EventType.TOOL_CALL_FAILED;
  /** 节点ID */
  nodeId: ID;
  /** 工具名称 */
  toolName: string;
  /** 错误信息 */
  error: string;
}