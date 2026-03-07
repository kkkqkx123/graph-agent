/**
 * Gemini Native客户端实现
 *
 * 实现Gemini Native API调用，使用Gemini原生端点
 * 支持流式和非流式调用
 */

import { BaseLLMClient } from '../base-client.js';
import { GeminiNativeFormatter } from '../formatters/index.js';
import type { LLMProfile } from '@modular-agent/types';

/**
 * Gemini Native客户端
 */
export class GeminiNativeClient extends BaseLLMClient {
  constructor(profile: LLMProfile) {
    super(profile, new GeminiNativeFormatter());
  }
}
