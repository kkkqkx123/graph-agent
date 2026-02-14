/**
 * 子图相关事件类型定义
 */

import type { ID } from '../common';
import type { BaseEvent, EventType } from './base';

/**
 * 子图开始事件类型
 */
export interface SubgraphStartedEvent extends BaseEvent {
  type: EventType.SUBGRAPH_STARTED;
  /** 子工作流ID */
  subgraphId: ID;
  /** 父工作流ID */
  parentWorkflowId: ID;
  /** 输入数据 */
  input: Record<string, any>;
}

/**
 * 子图完成事件类型
 */
export interface SubgraphCompletedEvent extends BaseEvent {
  type: EventType.SUBGRAPH_COMPLETED;
  /** 子工作流ID */
  subgraphId: ID;
  /** 输出数据 */
  output: Record<string, any>;
  /** 执行时间 */
  executionTime: number;
}

/**
 * 触发子工作流开始事件类型
 */
export interface TriggeredSubgraphStartedEvent extends BaseEvent {
  type: EventType.TRIGGERED_SUBGRAPH_STARTED;
  /** 子工作流ID */
  subgraphId: ID;
  /** 触发器ID */
  triggerId: ID;
  /** 输入数据 */
  input: Record<string, any>;
}

/**
 * 触发子工作流完成事件类型
 */
export interface TriggeredSubgraphCompletedEvent extends BaseEvent {
  type: EventType.TRIGGERED_SUBGRAPH_COMPLETED;
  /** 子工作流ID */
  subgraphId: ID;
  /** 触发器ID */
  triggerId: ID;
  /** 输出数据 */
  output?: Record<string, any>;
  /** 执行时间（毫秒） */
  executionTime?: number;
}

/**
 * 触发子工作流失败事件类型
 */
export interface TriggeredSubgraphFailedEvent extends BaseEvent {
  type: EventType.TRIGGERED_SUBGRAPH_FAILED;
  /** 子工作流ID */
  subgraphId: ID;
  /** 触发器ID */
  triggerId: ID;
  /** 错误信息 */
  error: string;
  /** 执行时间（毫秒） */
  executionTime?: number;
}