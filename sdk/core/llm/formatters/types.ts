/**
 * Formatter 类型定义
 *
 * 定义格式转换器相关的类型
 */

import type { LLMResult, LLMProfile, LLMUsage } from '@modular-agent/types';
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
  /** 请求超时时间 (毫秒) */
  timeout?: number;
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
  usage?: LLMUsage;
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
  /**
   * 隐私模式思考内容
   *
   * 用于 Anthropic 的 redacted_thinking 块
   */
  redactedThinking?: string;
}

/**
 * 认证类型
 */
export type AuthType = 'native' | 'bearer';

/**
 * 自定义请求头配置
 */
export interface CustomHeader {
  /** 键名 */
  key: string;
  /** 值 */
  value: string;
  /** 是否启用 */
  enabled?: boolean;
}

/**
 * 自定义请求体配置
 */
export interface CustomBodyConfig {
  /** 简单模式: 键值对列表 */
  items?: Array<{
    key: string;
    value: string;
    enabled?: boolean;
  }>;
  /** 高级模式: JSON 字符串 */
  json?: string;
  /** 模式 */
  mode?: 'simple' | 'advanced';
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

  // === 可迁移的 API 请求增强功能 ===

  /** 认证类型 (native: 使用提供商原生认证头, bearer: 使用 Authorization Bearer) */
  authType?: AuthType;
  /** 自定义请求头 (简化版: 直接的键值对) */
  customHeaders?: Record<string, string>;
  /** 自定义请求头 (完整版: 支持启用/禁用) */
  customHeadersList?: CustomHeader[];
  /** 自定义请求体 (简化版: 直接合并的对象) */
  customBody?: Record<string, any>;
  /** 自定义请求体 (完整版: 支持简单/高级模式) */
  customBodyConfig?: CustomBodyConfig;
  /** 是否启用自定义请求体 */
  customBodyEnabled?: boolean;
  /** 请求超时时间 (毫秒) */
  timeout?: number;
  /** 查询参数 */
  queryParams?: Record<string, string | number | boolean>;
  /** 流式选项 */
  streamOptions?: {
    /** 是否包含 usage 信息 */
    includeUsage?: boolean;
  };

  /**
   * 工具调用模式
   * - 'function_call': 使用 API 原生函数调用
   * - 'xml': 使用 XML 格式在提示词中描述工具
   * - 'json': 使用 JSON 格式在提示词中描述工具
   * @default 'function_call'
   */
  toolMode?: 'function_call' | 'xml' | 'json';
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
