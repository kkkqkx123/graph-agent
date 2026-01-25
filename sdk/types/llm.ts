/**
 * LLM类型定义
 * 定义LLM配置文件（Profile），支持独立配置和复用
 */

import type { ToolSchema } from './tool';
import type { ID, Timestamp, Metadata } from './common';

/**
 * LLM提供商枚举
 */
export enum LLMProvider {
  /** OpenAI Chat API */
  OPENAI_CHAT = 'OPENAI_CHAT',
  /** OpenAI Response API */
  OPENAI_RESPONSE = 'OPENAI_RESPONSE',
  /** Anthropic */
  ANTHROPIC = 'ANTHROPIC',
  /** Gemini Native API */
  GEMINI_NATIVE = 'GEMINI_NATIVE',
  /** Gemini OpenAI Compatible API */
  GEMINI_OPENAI = 'GEMINI_OPENAI',
  /** Mock */
  MOCK = 'MOCK',
  /** 人工中继 */
  HUMAN_RELAY = 'HUMAN_RELAY'
}

/**
 * LLM配置文件类型，用于独立配置和复用
 */
export interface LLMProfile {
  /** Profile唯一标识符 */
  id: ID;
  /** Profile名称 */
  name: string;
  /** LLM提供商 */
  provider: LLMProvider;
  /** 模型名称 */
  model: string;
  /** API密钥 */
  apiKey: string;
  /** 可选的基础URL（用于第三方API渠道） */
  baseUrl?: string;
  /** 模型参数对象（temperature、maxTokens等，不强制类型） */
  parameters: Record<string, any>;
  /** 自定义HTTP请求头（用于第三方API渠道） */
  headers?: Record<string, string>;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 可选的元数据 */
  metadata?: Metadata;
}

/**
 * LLM消息角色
 */
export type LLMMessageRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * LLM工具调用类型
 */
export interface LLMToolCall {
  /** 工具调用ID */
  id: ID;
  /** 类型（function） */
  type: 'function';
  /** 函数调用信息 */
  function: {
    /** 函数名称 */
    name: string;
    /** 函数参数（JSON字符串） */
    arguments: string;
  };
}

/**
 * LLM消息类型
 */
export interface LLMMessage {
  /** 角色（system、user、assistant、tool） */
  role: LLMMessageRole;
  /** 消息内容（字符串或对象） */
  content: string | any[];
  /** 工具调用数组（assistant角色） */
  toolCalls?: LLMToolCall[];
  /** 工具调用ID（tool角色） */
  toolCallId?: string;
}

/**
 * LLM请求类型
 */
export interface LLMRequest {
  /** 引用的LLM Profile ID（可选，如果不提供则使用默认配置） */
  profileId?: ID;
  /** 消息数组 */
  messages: LLMMessage[];
  /** 请求参数对象（覆盖Profile中的parameters） */
  parameters?: Record<string, any>;
  /** 可用的工具定义 */
  tools?: ToolSchema[];
  /** 是否流式传输 */
  stream?: boolean;
}

/**
 * LLM Token使用类型
 */
export interface LLMUsage {
  /** 提示token数 */
  promptTokens: number;
  /** 完成token数 */
  completionTokens: number;
  /** 总token数 */
  totalTokens: number;
  /** 提示token成本（可选） */
  promptTokensCost?: number;
  /** 完成token成本（可选） */
  completionTokensCost?: number;
  /** 总成本（可选） */
  totalCost?: number;
}

/**
 * LLM响应结果类型（整合choices和finishReason）
 */
export interface LLMResult {
  /** 响应ID */
  id: ID;
  /** 模型名称 */
  model: string;
  /** 响应内容文本 */
  content: string;
  /** 完整的LLMMessage对象 */
  message: LLMMessage;
  /** 工具调用数组 */
  toolCalls?: LLMToolCall[];
  /** Token使用情况 */
  usage?: LLMUsage;
  /** 完成原因 */
  finishReason: string;
  /** 响应时间（毫秒） */
  duration: Timestamp;
  /** 响应元数据 */
  metadata?: Metadata;
}

/**
 * LLM客户端接口
 */
export interface LLMClient {
  /**
   * 非流式生成
   */
  generate(request: LLMRequest): Promise<LLMResult>;

  /**
   * 流式生成
   */
  generateStream(request: LLMRequest): AsyncIterable<LLMResult>;
}

/**
 * LLM客户端配置类型
 */
export interface LLMClientConfig {
  /** LLM提供商 */
  provider: LLMProvider;
  /** API密钥 */
  apiKey: string;
  /** 基础URL */
  baseUrl?: string;
  /** 超时时间 */
  timeout?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试延迟 */
  retryDelay?: number;
}