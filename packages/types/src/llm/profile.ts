/**
 * LLM配置文件类型定义
 */

import type { ID, Metadata } from '../common';
import type { LLMProvider } from './state';

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