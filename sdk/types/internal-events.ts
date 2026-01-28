/**
 * 内部协调事件类型定义
 * 用于模块内部协调的事件，不对外暴露
 * 主要用于 LLM 和工具执行的内部协调
 */

import type { ID, Timestamp } from './common';

/**
 * 内部事件类型枚举
 */
export enum InternalEventType {
  /** LLM执行请求 */
  LLM_EXECUTION_REQUEST = 'INTERNAL_LLM_EXECUTION_REQUEST',
  /** LLM执行完成 */
  LLM_EXECUTION_COMPLETED = 'INTERNAL_LLM_EXECUTION_COMPLETED',
  /** LLM执行失败 */
  LLM_EXECUTION_FAILED = 'INTERNAL_LLM_EXECUTION_FAILED',
  /** 工具执行请求 */
  TOOL_EXECUTION_REQUEST = 'INTERNAL_TOOL_EXECUTION_REQUEST',
  /** 工具执行完成 */
  TOOL_EXECUTION_COMPLETED = 'INTERNAL_TOOL_EXECUTION_COMPLETED',
  /** 工具执行失败 */
  TOOL_EXECUTION_FAILED = 'INTERNAL_TOOL_EXECUTION_FAILED'
}

/**
 * 内部事件基础类型
 */
export interface BaseInternalEvent {
  /** 事件类型 */
  type: InternalEventType;
  /** 时间戳 */
  timestamp: Timestamp;
  /** 工作流ID */
  workflowId: ID;
  /** 线程ID */
  threadId: ID;
}

/**
 * LLM执行请求数据
 */
export interface LLMExecutionRequestData {
  /** 处理后的prompt文本 */
  prompt: string;
  /** 可用工具列表（可选） */
  tools?: Array<{
    name: string;
    description: string;
    parameters: any;
  }>;
  /** LLM配置ID */
  profileId: string;
  /** LLM参数（temperature、maxTokens等） */
  parameters?: Record<string, any>;
  /** 是否流式响应 */
  stream?: boolean;
}

/**
 * 上下文快照
 */
export interface ContextSnapshot {
  /** 对话历史 */
  conversationHistory?: any[];
  /** 变量值映射 */
  variableValues?: Record<string, any>;
  /** 节点执行结果 */
  nodeResults?: any[];
}

/**
 * LLM执行请求事件
 */
export interface LLMExecutionRequestEvent extends BaseInternalEvent {
  type: InternalEventType.LLM_EXECUTION_REQUEST;
  /** 请求执行的节点ID */
  nodeId: string;
  /** 节点类型（llm、tool、context_processor、user_interaction） */
  nodeType: string;
  /** LLM请求数据 */
  requestData: LLMExecutionRequestData;
  /** 当前上下文快照 */
  contextSnapshot: ContextSnapshot;
}

/**
 * LLM执行结果
 */
export interface LLMExecutionResult {
  /** 响应内容 */
  content: string;
  /** Token使用情况 */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** 完成原因 */
  finishReason?: string;
  /** 工具调用列表（如果有） */
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: string;
  }>;
}

/**
 * LLM执行完成事件
 */
export interface LLMExecutionCompletedEvent extends BaseInternalEvent {
  type: InternalEventType.LLM_EXECUTION_COMPLETED;
  /** 原始请求节点ID */
  nodeId: string;
  /** LLM执行结果 */
  result: LLMExecutionResult;
  /** 更新后的上下文数据（LLMExecutor可能修改了对话历史） */
  updatedContext?: ContextSnapshot;
}

/**
 * LLM执行失败事件
 */
export interface LLMExecutionFailedEvent extends BaseInternalEvent {
  type: InternalEventType.LLM_EXECUTION_FAILED;
  /** 原始请求节点ID */
  nodeId: string;
  /** 错误信息 */
  error: string;
  /** 错误详情（可选） */
  errorDetails?: any;
}

/**
 * 工具调用信息
 */
export interface ToolCallInfo {
  /** 工具调用ID */
  id: string;
  /** 工具名称 */
  name: string;
  /** 工具参数（JSON字符串） */
  arguments: string;
}

/**
 * 工具执行选项
 */
export interface ToolExecutionOptions {
  /** 超时时间 */
  timeout: number;
  /** 重试次数 */
  retries: number;
  /** 重试延迟 */
  retryDelay: number;
}

/**
 * 工具执行请求事件
 */
export interface ToolExecutionRequestEvent extends BaseInternalEvent {
  type: InternalEventType.TOOL_EXECUTION_REQUEST;
  /** 工具调用信息 */
  toolCall: ToolCallInfo;
  /** 执行选项 */
  executionOptions: ToolExecutionOptions;
}

/**
 * 工具执行结果
 */
export interface ToolExecutionResult {
  /** 是否成功 */
  success: boolean;
  /** 执行结果（成功时） */
  result?: any;
  /** 错误信息（失败时） */
  error?: string;
  /** 执行时间 */
  executionTime: number;
  /** 重试次数 */
  retryCount: number;
}

/**
 * 工具执行完成事件
 */
export interface ToolExecutionCompletedEvent extends BaseInternalEvent {
  type: InternalEventType.TOOL_EXECUTION_COMPLETED;
  /** 原始工具调用ID */
  toolCallId: string;
  /** 工具执行结果 */
  result: ToolExecutionResult;
}

/**
 * 工具执行失败事件
 */
export interface ToolExecutionFailedEvent extends BaseInternalEvent {
  type: InternalEventType.TOOL_EXECUTION_FAILED;
  /** 原始工具调用ID */
  toolCallId: string;
  /** 错误信息 */
  error: string;
  /** 错误详情（可选） */
  errorDetails?: any;
}

/**
 * 所有内部事件类型的联合类型
 */
export type InternalEvent =
  | LLMExecutionRequestEvent
  | LLMExecutionCompletedEvent
  | LLMExecutionFailedEvent
  | ToolExecutionRequestEvent
  | ToolExecutionCompletedEvent
  | ToolExecutionFailedEvent;