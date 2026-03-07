/**
 * LLM响应类型定义
 */

import type { ID, Timestamp, Metadata } from '../common.js';
import type { LLMMessage, LLMToolCall } from '../message/index.js';
import type { LLMUsage } from './usage.js';

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
  /**
   * 思考/推理内容
   *
   * 用于存储模型的思考过程或推理内容
   * - OpenAI: reasoning_content (DeepSeek R1, o1等推理模型)
   * - Anthropic: thinking (Claude extended thinking)
   * - Gemini: thoughts (Gemini thinking models)
   */
  reasoningContent?: string;
  /**
   * 思考/推理Token数量
   *
   * 用于区分思考token和普通token的计费
   */
  reasoningTokens?: number;
  /**
   * 流式统计信息
   *
   * 记录流式生成过程中的性能数据
   */
  streamStats?: {
    /** 接收到的流式块总数 */
    chunkCount: number;
    /** 从请求发送到首包到达的时间（毫秒） */
    timeToFirstChunk: number;
    /** 从首包到最后包的时间（毫秒） */
    streamDuration: number;
    /** 从请求发送到流结束的总时间（毫秒） */
    totalDuration: number;
  };
}