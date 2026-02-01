/**
 * Token 工具函数
 *
 * 提供无状态的 Token 计算和验证功能
 * 使用 tiktoken 进行精确计数，支持 fallback 降级
 * 所有函数都是纯函数，不持有任何状态
 */

import type { LLMMessage, LLMUsage } from '../../../types/llm';
import { encodeText, encodeObject, estimateTokensFallback } from '../../../utils/token-encoder';

/**
 * 估算消息的 Token 使用量（基于 tiktoken 的精确方法）
 *
 * 计数范围：
 * - content（字符串或对象数组）
 * - thinking（思考内容，仅 assistant 角色）
 * - toolCalls（工具调用结构）
 * - 元数据开销（每条消息 4 个 token）
 *
 * @param messages 消息数组
 * @returns Token 数量
 */
export function estimateTokens(messages: LLMMessage[]): number {
  let totalTokens = 0;

  for (const message of messages) {
    // 计数 content
    if (typeof message.content === 'string') {
      totalTokens += encodeText(message.content);
    } else if (Array.isArray(message.content)) {
      // 处理数组内容（通常用于多模态内容）
      for (const item of message.content) {
        if (typeof item === 'string') {
          totalTokens += encodeText(item);
        } else if (typeof item === 'object' && item !== null) {
          totalTokens += encodeObject(item);
        }
      }
    }

    // 计数 thinking（Extended Thinking 内容）
    if (message.thinking) {
      totalTokens += encodeText(message.thinking);
    }

    // 计数 toolCalls（工具调用结构）
    if (message.toolCalls && message.toolCalls.length > 0) {
      totalTokens += encodeObject(message.toolCalls);
    }

    // 元数据开销（每条消息约 4 个 token）
    totalTokens += 4;
  }

  return totalTokens;
}

/**
 * 获取 Token 使用情况（优先使用 API 统计，否则使用本地估算）
 *
 * @param usage API 返回的 Token 使用统计
 * @param messages 消息数组（用于本地估算）
 * @returns Token 数量
 */
export function getTokenUsage(usage: LLMUsage | null, messages: LLMMessage[]): number {
  // 优先使用 API 统计
  if (usage) {
    return usage.totalTokens;
  }

  // 使用本地估算方法
  return estimateTokens(messages);
}

/**
 * 检查 Token 使用是否超过限制
 *
 * @param tokensUsed 已使用的 Token 数量
 * @param tokenLimit Token 限制阈值
 * @returns 是否超过限制
 */
export function isTokenLimitExceeded(tokensUsed: number, tokenLimit: number): boolean {
  return tokensUsed > tokenLimit;
}