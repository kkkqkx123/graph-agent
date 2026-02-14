/**
 * LLM响应类型定义
 */

import type { ID, Timestamp, Metadata } from '../common';
import type { LLMMessage, LLMToolCall } from '../message';
import type { LLMUsage } from './usage';

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