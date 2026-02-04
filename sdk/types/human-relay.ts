/**
 * HumanRelay 类型定义
 * 定义人工中继（Human Relay）相关的核心业务类型
 *
 * HumanRelay 是一种特殊的 LLM Provider，允许人工介入 LLM 对话流程
 */

import type { ID, Metadata, VariableScope } from './common';
import type { LLMMessage } from './llm';

/**
 * HumanRelay 请求类型
 */
export interface HumanRelayRequest {
  /** 请求ID */
  requestId: ID;
  /** 消息数组（包含对话历史） */
  messages: LLMMessage[];
  /** 给用户的提示信息（应用层用于显示） */
  prompt: string;
  /** 请求超时时间（毫秒） */
  timeout: number;
  /** 额外的业务信息 */
  metadata?: Metadata;
}

/**
 * HumanRelay 响应类型
 */
export interface HumanRelayResponse {
  /** 请求ID */
  requestId: ID;
  /** 人工输入的消息内容 */
  content: string;
  /** 响应时间戳 */
  timestamp: number;
}

/**
 * HumanRelay 执行结果
 */
export interface HumanRelayExecutionResult {
  /** 请求ID */
  requestId: ID;
  /** 人工输入的消息 */
  message: LLMMessage;
  /** 执行时间（毫秒） */
  executionTime: number;
}

/**
 * HumanRelay 上下文
 * SDK 提供给应用层的执行上下文
 */
export interface HumanRelayContext {
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
 * HumanRelay 处理器接口
 * 应用层必须实现的接口，用于处理人工输入
 */
export interface HumanRelayHandler {
  /**
   * 处理 HumanRelay 请求
   * @param request HumanRelay 请求
   * @param context HumanRelay 上下文
   * @returns HumanRelay 响应
   */
  handle(request: HumanRelayRequest, context: HumanRelayContext): Promise<HumanRelayResponse>;
}