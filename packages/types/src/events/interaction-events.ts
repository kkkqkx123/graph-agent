/**
 * 交互相关事件类型定义
 */

import type { ID } from '../common';
import type { BaseEvent, EventType } from './base';

/**
 * 用户交互请求事件类型
 */
export interface UserInteractionRequestedEvent extends BaseEvent {
  type: EventType.USER_INTERACTION_REQUESTED;
  /** 节点ID */
  nodeId: ID;
  /** 交互ID */
  interactionId: ID;
  /** 操作类型 */
  operationType: string;
  /** 提示信息 */
  prompt: string;
  /** 超时时间 */
  timeout: number;
}

/**
 * 用户交互响应事件类型
 */
export interface UserInteractionRespondedEvent extends BaseEvent {
  type: EventType.USER_INTERACTION_RESPONDED;
  /** 交互ID */
  interactionId: ID;
  /** 用户输入数据 */
  inputData: any;
}

/**
 * 用户交互处理完成事件类型
 */
export interface UserInteractionProcessedEvent extends BaseEvent {
  type: EventType.USER_INTERACTION_PROCESSED;
  /** 交互ID */
  interactionId: ID;
  /** 操作类型 */
  operationType: string;
  /** 处理结果 */
  results: any;
}

/**
 * 用户交互失败事件类型
 */
export interface UserInteractionFailedEvent extends BaseEvent {
  type: EventType.USER_INTERACTION_FAILED;
  /** 交互ID */
  interactionId: ID;
  /** 失败原因 */
  reason: string;
}

/**
 * HumanRelay 请求事件类型
 */
export interface HumanRelayRequestedEvent extends BaseEvent {
  type: EventType.HUMAN_RELAY_REQUESTED;
  /** 节点ID */
  nodeId: ID;
  /** 请求ID */
  requestId: ID;
  /** 提示信息 */
  prompt: string;
  /** 消息数量 */
  messageCount: number;
  /** 超时时间 */
  timeout: number;
}

/**
 * HumanRelay 响应事件类型
 */
export interface HumanRelayRespondedEvent extends BaseEvent {
  type: EventType.HUMAN_RELAY_RESPONDED;
  /** 请求ID */
  requestId: ID;
  /** 人工输入内容 */
  content: string;
}

/**
 * HumanRelay 处理完成事件类型
 */
export interface HumanRelayProcessedEvent extends BaseEvent {
  type: EventType.HUMAN_RELAY_PROCESSED;
  /** 请求ID */
  requestId: ID;
  /** 处理结果 */
  message: {
    role: string;
    content: string;
  };
  /** 执行时间（毫秒） */
  executionTime: number;
}

/**
 * HumanRelay 失败事件类型
 */
export interface HumanRelayFailedEvent extends BaseEvent {
  type: EventType.HUMAN_RELAY_FAILED;
  /** 请求ID */
  requestId: ID;
  /** 失败原因 */
  reason: string;
}