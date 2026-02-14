/**
 * LLM客户端基类
 *
 * 定义客户端的通用接口和实现，提供通用的请求处理逻辑
 * 集成HttpClient，提供统一的HTTP请求处理
 */

import type {
  LLMClient,
  LLMRequest,
  LLMResult,
  LLMProfile
} from '@modular-agent/types';
import { HttpClient, SseTransport } from '../http';
import { initialVersion } from '../utils';

/**
 * LLM客户端抽象基类
 *
 * 所有基于HTTP的provider客户端继承自BaseLLMClient
 * 提供统一的接口和通用逻辑
 * 子类只需要实现parseResponse和parseStreamLine
 */
export abstract class BaseLLMClient implements LLMClient {
  protected readonly profile: LLMProfile;
  protected readonly httpClient: HttpClient;

  constructor(profile: LLMProfile) {
    this.profile = profile;
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
   * 非流式生成
   *
   * 重试和超时由HttpClient处理
   * 错误处理由上层LLMWrapper负责
   */
  async generate(request: LLMRequest): Promise<LLMResult> {
    // 合并请求参数
    const mergedRequest = this.mergeParameters(request);
    return this.doGenerate(mergedRequest);
  }

  /**
   * 流式生成
   *
   * 重试和超时由HttpClient处理
   * 在客户端层累积 token 统计信息
   * 错误处理由上层LLMWrapper负责
   */
  async *generateStream(request: LLMRequest): AsyncIterable<LLMResult> {
    // 合并请求参数
    const mergedRequest = this.mergeParameters(request);

    // 参考 Anthropic SDK 的做法：在流式传输期间持续累积 token 统计
    // message_start 事件提供初始 token 计数（输入 token）
    // message_delta 事件提供输出 token 计数的持续更新
    let accumulatedUsage: any = null;

    for await (const chunk of this.doGenerateStream(mergedRequest)) {
      // 累积 token 统计
      if (chunk.usage) {
        if (!accumulatedUsage) {
          // 第一次收到 usage，通常是 message_start 事件
          accumulatedUsage = { ...chunk.usage };
        } else {
          // 后续的 usage，通常是 message_delta 事件，进行增量更新
          // Anthropic SDK 的做法：直接更新为最新值
          accumulatedUsage = { ...chunk.usage };
        }
      }

      // 如果是最后一个 chunk（有 finishReason），确保包含累积的 usage
      if (chunk.finishReason && accumulatedUsage) {
        chunk.usage = accumulatedUsage;
      }

      yield chunk;
    }
  }

  /**
   * 合并请求参数
   *
   * 将request.parameters合并到Profile.parameters中
   * request.parameters会覆盖Profile.parameters中的同名参数
   *
   * @param request LLM请求
   * @returns 合并后的请求
   */
  protected mergeParameters(request: LLMRequest): LLMRequest {
    const mergedParameters = {
      ...this.profile.parameters,
      ...request.parameters
    };

    return {
      ...request,
      parameters: mergedParameters
    };
  }

  /**
   * 子类必须实现：执行非流式生成
   */
  protected abstract doGenerate(request: LLMRequest): Promise<LLMResult>;

  /**
   * 子类必须实现：执行流式生成
   */
  protected abstract doGenerateStream(request: LLMRequest): AsyncIterable<LLMResult>;




  /**
   * 执行HTTP POST请求（非流式）
   *
   * 提供统一的HTTP POST请求处理
   *
   * @param url 请求路径
   * @param body 请求体
   * @param options 请求选项
   * @returns 解析后的LLM结果
   */
  protected async doHttpPost(
    url: string,
    body: any,
    options?: {
      headers?: Record<string, string>;
      query?: Record<string, string | number | boolean>;
    }
  ): Promise<LLMResult> {
    const response = await this.httpClient.post(url, body, options);
    return this.parseResponse(response.data);
  }

  /**
   * 执行HTTP POST请求（流式）
   *
   * 提供统一的HTTP流式请求处理
   *
   * @param url 请求路径
   * @param body 请求体
   * @param options 请求选项
   * @returns 流式LLM结果
   */
  protected async *doHttpStream(
    url: string,
    body: any,
    options?: {
      headers?: Record<string, string>;
      query?: Record<string, string | number | boolean>;
    }
  ): AsyncIterable<LLMResult> {
    // 创建SseTransport实例
    const transport = new SseTransport(
      this.profile.baseUrl,
      options?.headers
    );

    // 使用SseTransport执行流式请求
    const stream = transport.executeStream(url, {
      query: options?.query,
      method: 'POST',
      body: body
    });

    // 处理流式响应
    for await (const chunk of stream) {
      // 使用子类实现的parseStreamLine进行自定义解析
      const result = this.parseStreamLine(chunk);
      if (result) {
        yield result;
      }
    }
  }

  /**
   * 构建完整URL
   */
  private buildFullUrl(
    url: string,
    query?: Record<string, string | number | boolean>
  ): string {
    let fullUrl = url;

    // 如果URL不是完整的，添加baseURL
    if (!url.startsWith('http') && this.profile.baseUrl) {
      fullUrl = this.profile.baseUrl + url;
    }

    // 添加查询参数
    if (query && Object.keys(query).length > 0) {
      const queryString = Object.entries(query)
        .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
        .join('&');
      fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString;
    }

    return fullUrl;
  }

  /**
   * 子类必须实现：解析非流式响应
   */
  protected abstract parseResponse(data: any): LLMResult;

  /**
   * 解析流式响应行（默认实现）
   *
   * 大多数LLM提供商使用SSE格式，每行以 "data: " 开头
   * 子类可以重写此方法以支持不同的格式
   *
   * @param line 流式响应的一行文本
   * @returns 解析后的LLM结果，如果该行不包含有效数据则返回null
   */
  protected parseStreamLine(line: string): LLMResult | null {
    // 跳过空行
    if (!line) {
      return null;
    }

    // 跳过结束标记（OpenAI格式）
    if (line === 'data: [DONE]') {
      return null;
    }

    // 解析 data: 前缀
    if (!line.startsWith('data: ')) {
      return null;
    }

    const dataStr = line.slice(6);
    try {
      const data = JSON.parse(dataStr);
      return this.parseStreamChunk(data);
    } catch (e) {
      // 跳过无效JSON
      return null;
    }
  }

  /**
   * 子类必须实现：解析流式响应块
   *
   * @param data 解析后的JSON数据
   * @returns 解析后的LLM结果，如果该数据不包含有效内容则返回null
   */
  protected abstract parseStreamChunk(data: any): LLMResult | null;

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
      version: initialVersion()
    };
  }
}