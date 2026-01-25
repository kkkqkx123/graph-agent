/**
 * LLM客户端基类
 *
 * 定义客户端的通用接口和实现，提供通用的请求处理逻辑
 */

import type {
  LLMClient,
  LLMRequest,
  LLMResult,
  LLMProfile
} from '../../types/llm';
import { SDKError, ErrorCode } from '../../types/errors';

/**
 * LLM客户端抽象基类
 * 
 * 所有provider客户端继承自BaseLLMClient
 * 提供统一的接口和通用逻辑
 * 子类只需要实现doGenerate和doGenerateStream
 */
export abstract class BaseLLMClient implements LLMClient {
  protected readonly profile: LLMProfile;

  constructor(profile: LLMProfile) {
    this.profile = profile;
  }

  /**
   * 非流式生成（带重试和超时处理）
   */
  async generate(request: LLMRequest): Promise<LLMResult> {
    const maxRetries = this.profile.maxRetries ?? 2;
    const retryDelay = this.profile.retryDelay ?? 1000;
    const timeout = this.profile.timeout ?? 60000;

    // 合并请求参数
    const mergedRequest = this.mergeParameters(request);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // 使用超时包装
        const result = await this.withTimeout(
          this.doGenerate(mergedRequest),
          timeout
        );
        return result;
      } catch (error) {
        // 检查是否应该重试
        if (attempt < maxRetries && this.shouldRetry(error, attempt)) {
          const delay = this.getRetryDelay(attempt, retryDelay);
          await this.sleep(delay);
          continue;
        }

        // 不重试或达到最大重试次数，抛出错误
        throw this.handleError(error);
      }
    }

    // 理论上不会到达这里
    throw new Error('Unknown error occurred');
  }

  /**
   * 流式生成（带超时处理和连接失败重试）
   */
  async *generateStream(request: LLMRequest): AsyncIterable<LLMResult> {
    const maxRetries = this.profile.maxRetries ?? 2;
    const retryDelay = this.profile.retryDelay ?? 1000;
    const timeout = this.profile.timeout ?? 30000;

    // 合并请求参数
    const mergedRequest = this.mergeParameters(request);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const stream = this.withTimeoutStream(
          this.doGenerateStream(mergedRequest),
          timeout
        );

        for await (const chunk of stream) {
          yield chunk;
        }
        return;
      } catch (error) {
        // 流式生成仅对连接失败重试，不重试流式传输中的错误
        if (attempt < maxRetries && this.shouldRetryConnection(error)) {
          const delay = this.getRetryDelay(attempt, retryDelay);
          await this.sleep(delay);
          continue;
        }

        // 不重试或达到最大重试次数，抛出错误
        throw this.handleError(error);
      }
    }

    // 理论上不会到达这里
    throw new Error('Unknown error occurred');
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
   * 判断是否应该重试
   * 
   * 可重试的错误：
   * - 网络错误
   * - 超时错误
   * - 速率限制错误（429）
   * - 服务器错误（5xx）
   * 
   * 不可重试的错误：
   * - 认证错误（401）
   * - 权限错误（403）
   * - 参数错误（400）
   * - 未找到错误（404）
   */
  protected shouldRetry(error: any, retries: number): boolean {
    if (retries >= (this.profile.maxRetries ?? 2)) {
      return false;
    }

    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.code || error?.status;

    // 网络错误
    if (errorMessage.includes('network') ||
      errorMessage.includes('econnrefused') ||
      errorMessage.includes('enotfound') ||
      errorMessage.includes('etimedout')) {
      return true;
    }

    // 超时错误
    if (errorMessage.includes('timeout') || errorCode === 'ETIMEDOUT') {
      return true;
    }

    // 速率限制错误（429）
    if (errorCode === 429 || errorMessage.includes('rate limit')) {
      return true;
    }

    // 服务器错误（5xx）
    if (errorCode >= 500 && errorCode < 600) {
      return true;
    }

    // 模型临时不可用
    if (errorMessage.includes('model is not available') ||
      errorMessage.includes('model is overloaded') ||
      errorMessage.includes('model is temporarily unavailable')) {
      return true;
    }

    return false;
  }

  /**
   * 判断流式连接是否应该重试
   *
   * 流式生成仅对连接失败重试，不重试流式传输中的错误
   * 可重试的错误：
   * - 网络错误
   * - 超时错误
   * - 速率限制错误（429）
   * - 服务器错误（5xx）
   */
  protected shouldRetryConnection(error: any): boolean {
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.code || error?.status;

    // 网络错误
    if (errorMessage.includes('network') ||
      errorMessage.includes('econnrefused') ||
      errorMessage.includes('enotfound') ||
      errorMessage.includes('etimedout')) {
      return true;
    }

    // 超时错误
    if (errorMessage.includes('timeout') || errorCode === 'ETIMEDOUT') {
      return true;
    }

    // 速率限制错误（429）
    if (errorCode === 429 || errorMessage.includes('rate limit')) {
      return true;
    }

    // 服务器错误（5xx）
    if (errorCode >= 500 && errorCode < 600) {
      return true;
    }

    return false;
  }

  /**
   * 获取重试延迟（支持指数退避）
   */
  protected getRetryDelay(retries: number, baseDelay: number): number {
    // 指数退避：baseDelay * 2^retries
    return baseDelay * Math.pow(2, retries);
  }

  /**
   * 处理错误，转换为SDK统一错误格式
   */
  protected handleError(error: any): SDKError {
    const errorMessage = error?.message || String(error);
    const errorCode = error?.code || error?.status;

    // 创建SDK错误
    return new SDKError(
      this.getErrorCode(error),
      `${this.profile.provider} API error: ${errorMessage}`,
      {
        provider: this.profile.provider,
        model: this.profile.model,
        originalError: error
      },
      error instanceof Error ? error : undefined
    );
  }

  /**
   * 根据错误获取错误码
   */
  private getErrorCode(error: any): ErrorCode {
    const errorCode = error?.code || error?.status;

    if (errorCode === 401 || errorCode === 'authentication_error') {
      return ErrorCode.CONFIGURATION_ERROR;
    }

    if (errorCode === 403 || errorCode === 'permission_error') {
      return ErrorCode.CONFIGURATION_ERROR;
    }

    if (errorCode === 404 || errorCode === 'not_found_error') {
      return ErrorCode.NOT_FOUND_ERROR;
    }

    if (errorCode === 429 || errorCode === 'rate_limit_error') {
      return ErrorCode.LLM_ERROR;
    }

    if (errorCode >= 400 && errorCode < 500) {
      return ErrorCode.VALIDATION_ERROR;
    }

    if (errorCode >= 500 && errorCode < 600) {
      return ErrorCode.LLM_ERROR;
    }

    if (error?.message?.toLowerCase().includes('timeout')) {
      return ErrorCode.TIMEOUT_ERROR;
    }

    if (error?.message?.toLowerCase().includes('network')) {
      return ErrorCode.NETWORK_ERROR;
    }

    return ErrorCode.LLM_ERROR;
  }

  /**
   * 超时包装器（使用 AbortController）
   */
  private async withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      return await promise;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 流式超时包装器（使用 AbortController）
   */
  private async *withTimeoutStream<T>(
    stream: AsyncIterable<T>,
    timeout: number
  ): AsyncIterable<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const iterator = stream[Symbol.asyncIterator]();

    try {
      while (true) {
        const result = await iterator.next();

        if (result.done) {
          break;
        }

        yield result.value;
      }
    } finally {
      clearTimeout(timeoutId);
      // 确保迭代器被正确关闭
      if (iterator.return) {
        await iterator.return();
      }
    }
  }

  /**
   * 延迟函数
   */
  protected async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
      version: '1.0.0'
    };
  }
}