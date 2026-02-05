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
  ADD_MESSAGE = 'ADD_MESSAGE',
  /** 工具调用审批 */
  TOOL_APPROVAL = 'TOOL_APPROVAL'
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

/**
 * 用户交互上下文
 * SDK 提供给应用层的执行上下文
 */
export interface UserInteractionContext {
  /** 线程ID */
  threadId: ID;
  /** 工作流ID */
  workflowId: ID;
  /** 节点ID */
  nodeId: ID;
  /** 获取变量值 */
  getVariable(variableName: string, scope?: VariableScope): any;
  /** 设置变量值 */
  setVariable(variableName: string, value: any, scope?: VariableScope): Promise<void>;
  /** 获取所有变量 */
  getVariables(scope?: VariableScope): Record<string, any>;
  /** 超时控制 */
  timeout: number;
  /** 取消令牌 */
  cancelToken: {
    cancelled: boolean;
    cancel(): void;
  };
}

/**
 * 工具审批数据结构
 * 用于工具审批请求和响应
 */
export interface ToolApprovalData {
  /** 工具名称 */
  toolName: string;
  /** 工具描述 */
  toolDescription: string;
  /** 工具参数 */
  toolParameters: Record<string, any>;
  /** 是否批准 */
  approved: boolean;
  /** 编辑后的参数（可选） */
  editedParameters?: Record<string, any>;
  /** 用户指令（可选） */
  userInstruction?: string;
}

/**
 * 用户交互处理器接口
 * 应用层必须实现的接口，用于获取用户输入
 */
export interface UserInteractionHandler {
  /**
   * 处理用户交互请求
   * @param request 交互请求
   * @param context 交互上下文
   * @returns 用户输入数据
   */
  handle(request: UserInteractionRequest, context: UserInteractionContext): Promise<any>;
}