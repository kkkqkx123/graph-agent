/**
 * 系统事件类型定义
 */

import type { ID } from '../common';
import type { BaseEvent, EventType } from './base';

/**
 * Token 超过限制事件类型
 */
export interface TokenLimitExceededEvent extends BaseEvent {
  type: EventType.TOKEN_LIMIT_EXCEEDED;
  /** 当前使用的 Token 数量 */
  tokensUsed: number;
  /** Token 限制阈值 */
  tokenLimit: number;
}

/**
 * Token 使用警告事件类型
 */
export interface TokenUsageWarningEvent extends BaseEvent {
  type: EventType.TOKEN_USAGE_WARNING;
  /** 当前使用的 Token 数量 */
  tokensUsed: number;
  /** Token 限制阈值 */
  tokenLimit: number;
  /** 使用百分比 */
  usagePercentage: number;
}

/**
 * 错误事件类型
 */
export interface ErrorEvent extends BaseEvent {
  type: EventType.ERROR;
  /** 节点ID（可选） */
  nodeId?: ID;
  /** 错误信息 */
  error: any;
  /** 堆栈跟踪 */
  stackTrace?: string;
}

/**
 * 变量变更事件类型
 */
export interface VariableChangedEvent extends BaseEvent {
  type: EventType.VARIABLE_CHANGED;
  /** 变量名称 */
  variableName: string;
  /** 变量值 */
  variableValue: any;
  /** 变量作用域 */
  variableScope: string;
}