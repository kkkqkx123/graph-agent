/**
 * Formatter 类型定义
 *
 * 定义格式转换器相关的类型
 */

import type { LLMRequest, LLMResult, LLMProfile } from '@modular-agent/types';
import type { ToolSchema } from '@modular-agent/types';

/**
 * HTTP 请求选项
 */
export interface HttpRequestOptions {
  /** 请求 URL（相对路径或完整 URL） */
  url: string;
  /** 请求方法 */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** 请求头 */
  headers?: Record<string, string>;
  /** 查询参数 */
  query?: Record<string, string | number | boolean>;
  /** 请求体 */
  body?: any;
}

/**
 * 流式响应块
 */
export interface StreamChunk {
  /** 内容增量 */
  delta?: string;
  /** 是否完成 */
  done: boolean;
  /** Token 使用情况 */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** 完成原因 */
  finishReason?: string;
  /** 模型版本 */
  modelVersion?: string;
  /** 原始数据 */
  raw?: any;
  /**
   * 思考/推理内容增量
   *
   * 用于流式输出思考过程
   */
  reasoningDelta?: string;
}

/**
 * 格式转换器配置
 */
export interface FormatterConfig {
  /** Profile 配置 */
  profile: LLMProfile;
  /** 是否流式 */
  stream?: boolean;
  /** 工具定义 */
  tools?: ToolSchema[];
  /** 动态系统提示词 */
  dynamicSystemPrompt?: string;
  /** 动态上下文消息 */
  dynamicContextMessages?: any[];
}

/**
 * 格式转换器请求构建结果
 */
export interface BuildRequestResult {
  /** HTTP 请求选项 */
  httpRequest: HttpRequestOptions;
  /** 转换后的请求体（用于调试） */
  transformedBody?: any;
}

/**
 * 格式转换器响应解析结果
 */
export interface ParseResponseResult {
  /** LLM 结果 */
  result: LLMResult;
  /** 是否需要继续处理 */
  needsMoreData?: boolean;
}

/**
 * 格式转换器流式块解析结果
 */
export interface ParseStreamChunkResult {
  /** 流式块 */
  chunk: StreamChunk;
  /** 是否有效 */
  valid: boolean;
}
