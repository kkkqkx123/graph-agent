/**
 * LLM客户端类型定义
 */

import type { LLMProvider } from './state';
import type { LLMRequest } from './request';
import type { LLMResult } from './response';

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