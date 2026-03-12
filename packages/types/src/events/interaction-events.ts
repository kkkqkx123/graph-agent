/**
 * Interaction-related event type definitions
 */

import type { ID } from '../common.js';
import type { BaseEvent } from './base.js';
import type { UserInteractionOperationType } from '../interaction.js';

/**
 * User interaction requested event type
 */
export interface UserInteractionRequestedEvent extends BaseEvent {
  type: 'USER_INTERACTION_REQUESTED';
  /** Interaction ID */
  interactionId: ID;
  /** Operation type */
  operationType: UserInteractionOperationType;
  /** Prompt message */
  prompt: string;
  /** Timeout in milliseconds */
  timeout: number;
  /** Additional context data (optional) */
  contextData?: Record<string, any>;
}

/**
 * 用户交互响应事件类型
 */
export interface UserInteractionRespondedEvent extends BaseEvent {
  type: 'USER_INTERACTION_RESPONDED';
  /** 交互ID */
  interactionId: ID;
  /** 用户输入数据 */
  inputData: any;
}

/**
 * 用户交互处理完成事件类型
 */
export interface UserInteractionProcessedEvent extends BaseEvent {
  type: 'USER_INTERACTION_PROCESSED';
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
  type: 'USER_INTERACTION_FAILED';
  /** 交互ID */
  interactionId: ID;
  /** 失败原因 */
  reason: string;
}

/**
 * HumanRelay requested event type
 */
export interface HumanRelayRequestedEvent extends BaseEvent {
  type: 'HUMAN_RELAY_REQUESTED';
  /** Request ID */
  requestId: ID;
  /** Prompt message */
  prompt: string;
  /** Message count */
  messageCount: number;
  /** Timeout in milliseconds */
  timeout: number;
}

/**
 * HumanRelay 响应事件类型
 */
export interface HumanRelayRespondedEvent extends BaseEvent {
  type: 'HUMAN_RELAY_RESPONDED';
  /** 请求ID */
  requestId: ID;
  /** 人工输入内容 */
  content: string;
}

/**
 * HumanRelay 处理完成事件类型
 */
export interface HumanRelayProcessedEvent extends BaseEvent {
  type: 'HUMAN_RELAY_PROCESSED';
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
  type: 'HUMAN_RELAY_FAILED';
  /** 请求ID */
  requestId: ID;
  /** 失败原因 */
  reason: string;
}