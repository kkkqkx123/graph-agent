/**
 * Anthropic客户端实现
 *
 * 实现Anthropic API调用，处理Anthropic特定的请求和响应格式
 * 支持流式和非流式调用
 */

import { BaseLLMClient } from '../base-client.js';
import { AnthropicFormatter } from '../formatters/index.js';
import type { LLMProfile } from '@modular-agent/types';

/**
 * Anthropic客户端
 */
export class AnthropicClient extends BaseLLMClient {
  constructor(profile: LLMProfile) {
    const apiVersion = profile.metadata?.['apiVersion'] || '2023-06-01';
    super(profile, new AnthropicFormatter(apiVersion));
  }
}
