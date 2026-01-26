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
} from '../../types/llm';
import { SDKError, ErrorCode, LLMError } from '../../types/errors';
import { HttpClient } from '../http';

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
   */
  async generate(request: LLMRequest): Promise<LLMResult> {
    // 合并请求参数
    const mergedRequest = this.mergeParameters(request);

    try {
      return await this.doGenerate(mergedRequest);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * 流式生成
   *
   * 重试和超时由HttpClient处理
   */
  async *generateStream(request: LLMRequest): AsyncIterable<LLMResult> {
    // 合并请求参数
    const mergedRequest = this.mergeParameters(request);

    try {
      yield* this.doGenerateStream(mergedRequest);
    } catch (error) {
      throw this.handleError(error);
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
   * 处理错误，转换为SDK统一错误格式
   */
  protected handleError(error: any): SDKError {
    const errorMessage = error?.message || String(error);
    const errorCode = error?.code || error?.status;

    // 创建LLM错误
    return new LLMError(
      `${this.profile.provider} API error: ${errorMessage}`,
      this.profile.provider,
      this.profile.model,
      errorCode,
      {
        originalError: error
      },
      error instanceof Error ? error : undefined
    );
  }


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
    const fullUrl = this.buildFullUrl(url, options?.query);
    const headers = { ...options?.headers };

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) {
            continue;
          }

          const chunk = this.parseStreamLine(trimmedLine);
          if (chunk) {
            yield chunk;
          }
        }
      }
    } finally {
      reader.releaseLock();
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
      version: '1.0.0'
    };
  }
}