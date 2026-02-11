/**
 * LLM 消息辅助工具
 * 提供消息提取、过滤等辅助功能
 */

import type { LLMMessage } from '@modular-agent/types/llm';

/**
 * 提取系统消息
 *
 * 从消息数组中提取第一条系统消息
 *
 * @example
 * const systemMsg = extractSystemMessage([
 *   { role: 'system', content: 'You are helpful' },
 *   { role: 'user', content: 'Hello' }
 * ]);
 * // 结果: { role: 'system', content: 'You are helpful' }
 */
export function extractSystemMessage(messages: LLMMessage[]): LLMMessage | null {
  if (!messages || messages.length === 0) {
    return null;
  }

  return messages.find(msg => msg.role === 'system') || null;
}

/**
 * 过滤系统消息
 *
 * 从消息数组中移除所有系统消息
 *
 * @example
 * const filtered = filterSystemMessages([
 *   { role: 'system', content: 'You are helpful' },
 *   { role: 'user', content: 'Hello' }
 * ]);
 * // 结果: [{ role: 'user', content: 'Hello' }]
 */
export function filterSystemMessages(messages: LLMMessage[]): LLMMessage[] {
  if (!messages || messages.length === 0) {
    return [];
  }

  return messages.filter(msg => msg.role !== 'system');
}

/**
 * 提取并分离系统消息
 *
 * 返回系统消息和过滤后的消息数组
 *
 * @example
 * const { systemMessage, filteredMessages } = extractAndFilterSystemMessages([
 *   { role: 'system', content: 'You are helpful' },
 *   { role: 'user', content: 'Hello' }
 * ]);
 * // systemMessage: { role: 'system', content: 'You are helpful' }
 * // filteredMessages: [{ role: 'user', content: 'Hello' }]
 */
export function extractAndFilterSystemMessages(messages: LLMMessage[]): {
  systemMessage: LLMMessage | null;
  filteredMessages: LLMMessage[];
} {
  const systemMessage = extractSystemMessage(messages);
  const filteredMessages = filterSystemMessages(messages);

  return { systemMessage, filteredMessages };
}

/**
 * 判断消息数组是否为空
 */
export function isEmptyMessages(messages?: LLMMessage[]): boolean {
  return !messages || messages.length === 0;
}

/**
 * 获取最后一条消息
 */
export function getLastMessage(messages: LLMMessage[]): LLMMessage | null {
  if (!messages || messages.length === 0) {
    return null;
  }

  return messages[messages.length - 1] ?? null;
}

/**
 * 获取最后一条用户消息
 */
export function getLastUserMessage(messages: LLMMessage[]): LLMMessage | null {
  if (!messages || messages.length === 0) {
    return null;
  }

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg && msg.role === 'user') {
      return msg;
    }
  }

  return null;
}

/**
 * 获取最后一条助手消息
 */
export function getLastAssistantMessage(messages: LLMMessage[]): LLMMessage | null {
  if (!messages || messages.length === 0) {
    return null;
  }

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg && msg.role === 'assistant') {
      return msg;
    }
  }

  return null;
}

/**
 * 统计消息数量（按角色）
 */
export function countMessagesByRole(messages: LLMMessage[]): Record<string, number> {
  const counts: Record<string, number> = {
    system: 0,
    user: 0,
    assistant: 0,
    tool: 0
  };

  if (!messages || messages.length === 0) {
    return counts;
  }

  for (const msg of messages) {
    if (msg && msg.role && counts[msg.role] !== undefined) {
      counts[msg.role] = (counts[msg.role] ?? 0) + 1;
    }
  }

  return counts;
}