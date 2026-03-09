/**
 * LLM客户端基类
 *
 * 定义客户端的通用接口和实现，提供通用的请求处理逻辑
 * 集成HttpClient，提供统一的HTTP请求处理
 * 使用Formatter策略模式处理不同提供商的格式转换
 */

import type {
  LLMClient,
  LLMRequest,
  LLMResult,
  LLMProfile,
  TokenCountResult,
  LLMUsage
} from '@modular-agent/types';
import { HttpClient, SseTransport } from '@modular-agent/common-utils';
import { BaseFormatter, type FormatterConfig } from './formatters/index.js';

/**
 * LLM客户端基类
 *
 * 所有基于HTTP的provider客户端继承自BaseLLMClient
 * 使用 Formatter 策略模式处理格式转换
 */
export class BaseLLMClient implements LLMClient {
  protected readonly profile: LLMProfile;
  protected readonly httpClient: HttpClient;
  protected readonly formatter: BaseFormatter;

  constructor(profile: LLMProfile, formatter: BaseFormatter) {
    this.profile = profile;
    this.formatter = formatter;

    this.httpClient = new HttpClient({
      baseURL: profile.baseUrl || '',
      timeout: profile.timeout || 30000,
      maxRetries: profile.maxRetries || 3,
      retryDelay: profile.retryDelay || 1000,
      enableCircuitBreaker: true,
      enableRateLimiter: true,
    });
  }

  /**
   * 获取 Formatter 配置
   */
  protected getFormatterConfig(stream: boolean = false): FormatterConfig {
    return {
      profile: this.profile,
      stream
    };
  }

  /**
   * 非流式生成
   */
  async generate(request: LLMRequest): Promise<LLMResult> {
    const config = this.getFormatterConfig(false);
    const { httpRequest } = this.formatter.buildRequest(request, config);

    const response = await this.httpClient.post(
      httpRequest.url,
      httpRequest.body,
      {
        headers: httpRequest.headers,
        query: httpRequest.query
      }
    );

    return this.formatter.parseResponse(response.data, config);
  }

  /**
   * 流式生成
   */
  async *generateStream(request: LLMRequest): AsyncIterable<LLMResult> {
    const config = this.getFormatterConfig(true);
    const { httpRequest } = this.formatter.buildRequest(request, config);

    // 创建 SseTransport 实例
    const transport = new SseTransport(
      this.profile.baseUrl,
      httpRequest.headers
    );

    // 使用 SseTransport 执行流式请求
    const stream = transport.executeStream(httpRequest.url, {
      query: httpRequest.query,
      method: 'POST',
      body: httpRequest.body
    });

    // 累积 token 统计
    let accumulatedUsage: LLMUsage | null = null;

    // 处理流式响应
    for await (const line of stream) {
      const result = this.formatter.parseStreamLine(line, config);

      if (result.valid && result.chunk) {
        // 累积 token 统计（累积而非覆盖）
        if (result.chunk.usage) {
          const currentUsage = result.chunk.usage;
          if (accumulatedUsage) {
            accumulatedUsage = {
              promptTokens: currentUsage.promptTokens ?? accumulatedUsage.promptTokens,
              completionTokens: currentUsage.completionTokens ?? accumulatedUsage.completionTokens,
              totalTokens: currentUsage.totalTokens ?? accumulatedUsage.totalTokens,
              reasoningTokens: currentUsage.reasoningTokens ?? accumulatedUsage.reasoningTokens
            };
          } else {
            accumulatedUsage = {
              promptTokens: currentUsage.promptTokens ?? 0,
              completionTokens: currentUsage.completionTokens ?? 0,
              totalTokens: currentUsage.totalTokens ?? 0,
              reasoningTokens: currentUsage.reasoningTokens
            };
          }
        }

        // 构建 LLMResult
        const llmResult: LLMResult = {
          id: `stream-${Date.now()}`,
          model: this.profile.model,
          content: result.chunk.delta || '',
          message: {
            role: 'assistant',
            content: result.chunk.delta || ''
          },
          usage: result.chunk.finishReason && accumulatedUsage ? accumulatedUsage : result.chunk.usage,
          finishReason: result.chunk.finishReason || '',
          duration: 0,
          metadata: {
            raw: result.chunk.raw
          }
        };

        yield llmResult;
      }
    }
  }

  /**
   * 获取客户端信息
   */
  public getClientInfo(): {
    provider: string;
    model: string;
    version: string;
  } {
    return {
      provider: this.profile.provider,
      model: this.profile.model,
      version: '2.0.0'
    };
  }

  /**
   * 统计Token数量
   * 默认实现抛出错误，子类需要覆盖此方法
   * @param _request LLM请求
   * @returns Token计数结果
   */
  async countTokens(_request: LLMRequest): Promise<TokenCountResult> {
    throw new Error('countTokens is not supported by this client');
  }
}
