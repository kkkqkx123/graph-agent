/**
 * LLM配置文件类型定义
 */

import type { ID, Metadata } from '../common.js';
import type { LLMProvider } from './state.js';

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

  /**
   * 工具调用模式
   * - 'function_call': 使用 API 原生函数调用
   * - 'xml': 使用 XML 格式在提示词中描述工具
   * - 'json': 使用 JSON 格式在提示词中描述工具
   * @default 'function_call'
   */
  toolMode?: 'function_call' | 'xml' | 'json';
}