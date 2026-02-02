/**
 * 用户交互类型定义
 * 定义用户交互相关的核心业务类型
 */

import type { ID, Metadata, VariableScope } from './common';

/**
 * 用户交互操作类型
 */
export enum UserInteractionOperationType {
  /** 更新工作流变量 */
  UPDATE_VARIABLES = 'UPDATE_VARIABLES',
  /** 添加用户消息到 LLM 对话 */
  ADD_MESSAGE = 'ADD_MESSAGE'
}

/**
 * 变量更新配置
 */
export interface VariableUpdateConfig {
  /** 变量名称 */
  variableName: string;
  /** 变量更新表达式（可能包含 {{input}} 占位符） */
  expression: string;
  /** 变量作用域 */
  scope: VariableScope;
}

/**
 * 消息配置
 */
export interface MessageConfig {
  /** 消息角色（固定为 'user'） */
  role: 'user';
  /** 消息内容模板（可能包含 {{input}} 占位符） */
  contentTemplate: string;
}

/**
 * 用户交互请求
 */
export interface UserInteractionRequest {
  /** 交互ID */
  interactionId: ID;
  /** 操作类型 */
  operationType: UserInteractionOperationType;
  /** 变量更新配置（当 operationType = UPDATE_VARIABLES） */
  variables?: VariableUpdateConfig[];
  /** 消息配置（当 operationType = ADD_MESSAGE） */
  message?: MessageConfig;
  /** 给用户的提示信息（应用层用于显示） */
  prompt: string;
  /** 交互超时时间（毫秒） */
  timeout: number;
  /** 额外的业务信息 */
  metadata?: Metadata;
}

/**
 * 用户交互响应
 */
export interface UserInteractionResponse {
  /** 交互ID */
  interactionId: ID;
  /** 用户输入数据 */
  inputData: any;
  /** 响应时间戳 */
  timestamp: number;
}

/**
 * 用户交互处理结果
 */
export interface UserInteractionResult {
  /** 交互ID */
  interactionId: ID;
  /** 操作类型 */
  operationType: UserInteractionOperationType;
  /** 处理结果（更新的变量或添加的消息） */
  results: any;
  /** 处理时间戳 */
  timestamp: number;
}