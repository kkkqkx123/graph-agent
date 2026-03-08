/**
 * Anthropic客户端实现
 *
 * 实现Anthropic API调用，处理Anthropic特定的请求和响应格式
 * 支持流式和非流式调用
 */

import { BaseLLMClient } from '../base-client.js';
import { AnthropicFormatter } from '../formatters/index.js';
import type { LLMProfile, LLMRequest, TokenCountResult } from '@modular-agent/types';

/**
 * Anthropic客户端
 */
export class AnthropicClient extends BaseLLMClient {
  constructor(profile: LLMProfile) {
    const apiVersion = profile.metadata?.['apiVersion'] || '2023-06-01';
    super(profile, new AnthropicFormatter(apiVersion));
  }

  /**
   * 统计Token数量
   * 调用 Anthropic 的 /v1/messages/count_tokens API
   * @param request LLM请求
   * @returns Token计数结果
   */
  async countTokens(request: LLMRequest): Promise<TokenCountResult> {
    const formatter = this.formatter as AnthropicFormatter;
    const config = this.getFormatterConfig(false);
    const { httpRequest } = formatter.buildCountTokensRequest(request, config);

    const response = await this.httpClient.post(
      httpRequest.url,
      httpRequest.body,
      {
        headers: httpRequest.headers,
        query: httpRequest.query
      }
    );

    return {
      inputTokens: response.data.input_tokens || 0,
      raw: response.data
    };
  }
}
