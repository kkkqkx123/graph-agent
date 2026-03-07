/**
 * OpenAI Chat客户端实现
 *
 * 实现OpenAI Chat API调用，使用/chat/completions端点
 * 支持流式和非流式调用
 */

import { BaseLLMClient } from '../base-client.js';
import { OpenAIChatFormatter } from '../formatters/index.js';
import type { LLMProfile } from '@modular-agent/types';

/**
 * OpenAI Chat客户端
 */
export class OpenAIChatClient extends BaseLLMClient {
  constructor(profile: LLMProfile) {
    super(profile, new OpenAIChatFormatter());
  }
}
