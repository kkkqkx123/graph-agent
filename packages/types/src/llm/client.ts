/**
 * LLM客户端类型定义
 */

import type { LLMProvider } from './state.js';
import type { LLMRequest } from './request.js';
import type { LLMResult } from './response.js';
import type { TokenCountResult } from './usage.js';

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

  /**
   * 统计Token数量
   * 调用LLM提供商的Token计数API
   * @param request LLM请求
   * @returns Token计数结果
   */
  countTokens?(request: LLMRequest): Promise<TokenCountResult>;
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