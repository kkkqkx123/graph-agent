/**
 * 节点相关事件类型定义
 */

import type { ID, Timestamp } from '../common';
import type { BaseEvent, EventType } from './base';

/**
 * 节点开始事件类型
 */
export interface NodeStartedEvent extends BaseEvent {
  type: EventType.NODE_STARTED;
  /** 节点ID */
  nodeId: ID;
  /** 节点类型 */
  nodeType: string;
}

/**
 * 节点完成事件类型
 */
export interface NodeCompletedEvent extends BaseEvent {
  type: EventType.NODE_COMPLETED;
  /** 节点ID */
  nodeId: ID;
  /** 输出数据 */
  output: any;
  /** 执行时间 */
  executionTime: Timestamp;
}

/**
 * 节点失败事件类型
 */
export interface NodeFailedEvent extends BaseEvent {
  type: EventType.NODE_FAILED;
  /** 节点ID */
  nodeId: ID;
  /** 错误信息 */
  error: any;
}

/**
 * 节点自定义事件类型
 */
export interface NodeCustomEvent extends BaseEvent {
  type: EventType.NODE_CUSTOM_EVENT;
  /** 节点ID */
  nodeId: ID;
  /** 节点类型 */
  nodeType: string;
  /** 自定义事件名称 */
  eventName: string;
  /** 事件数据 */
  eventData: Record<string, any>;
}