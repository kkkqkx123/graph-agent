/**
 * LLM 提供商认证头构建工具
 * 统一管理各提供商的认证方式
 */

import { LLMProvider } from '@modular-agent/types/llm';

/**
 * 为 LLM 提供商构建认证头
 */
export function buildAuthHeaders(
  provider: LLMProvider,
  apiKey: string
): Record<string, string> {
  switch (provider) {
    case LLMProvider.OPENAI_CHAT:
    case LLMProvider.OPENAI_RESPONSE:
      return { 'Authorization': `Bearer ${apiKey}` };

    case LLMProvider.ANTHROPIC:
      return { 'x-api-key': apiKey };

    case LLMProvider.GEMINI_NATIVE:
      return { 'x-goog-api-key': apiKey };

    case LLMProvider.GEMINI_OPENAI:
      return { 'Authorization': `Bearer ${apiKey}` };

    case LLMProvider.HUMAN_RELAY:
      return {};  // 人工中继不需要 API Key

    default:
      const exhaustive: never = provider;
      throw new Error(`Unknown provider: ${exhaustive}`);
  }
}

/**
 * 合并认证头和自定义头
 */
export function mergeAuthHeaders(
  authHeaders: Record<string, string>,
  customHeaders?: Record<string, string>
): Record<string, string> {
  return {
    ...authHeaders,
    ...customHeaders
  };
}