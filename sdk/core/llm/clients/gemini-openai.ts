/**
 * Gemini OpenAI兼容客户端实现
 *
 * 实现Gemini OpenAI兼容API调用，使用Gemini的OpenAI兼容端点
 * 支持thinking_budget、cached_content等特殊参数
 * 支持流式和非流式调用
 */

import { BaseLLMClient } from '../base-client.js';
import { GeminiOpenAIFormatter } from '../formatters/index.js';
import type { LLMProfile } from '@modular-agent/types';

/**
 * Gemini OpenAI兼容客户端
 */
export class GeminiOpenAIClient extends BaseLLMClient {
  constructor(profile: LLMProfile) {
    super(profile, new GeminiOpenAIFormatter());
  }
}
