import { ID } from '../../common/value-objects/id';
import { LLMRequest } from '../entities/llm-request';
import { LLMResponse } from '../entities/llm-response';
import { ModelConfig } from '../value-objects/model-config';

/**
 * LLM客户端接口
 * 
 * 定义LLM客户端的契约
 */
export interface ILLMClient {
  /**
   * 生成响应
   * @param request LLM请求
   * @returns LLM响应
   */
  generateResponse(request: LLMRequest): Promise<LLMResponse>;

  /**
   * 流式生成响应
   * @param request LLM请求
   * @returns 响应流
   */
  generateResponseStream(request: LLMRequest): Promise<AsyncIterable<LLMResponse>>;

  /**
   * 计算Token数
   * @param request LLM请求
   * @returns Token数
   */
  calculateTokens(request: LLMRequest): Promise<number>;

  /**
   * 计算成本
   * @param request LLM请求
   * @param response LLM响应
   * @returns 成本
   */
  calculateCost(request: LLMRequest, response: LLMResponse): Promise<number>;

  /**
   * 获取模型配置
   * @returns 模型配置
   */
  getModelConfig(): ModelConfig;

  /**
   * 检查模型是否可用
   * @returns 是否可用
   */
  isModelAvailable(): Promise<boolean>;

  /**
   * 获取模型信息
   * @returns 模型信息
   */
  getModelInfo(): Promise<{
    name: string;
    provider: string;
    version: string;
    maxTokens: number;
    contextWindow: number;
    supportsStreaming: boolean;
    supportsTools: boolean;
    supportsImages: boolean;
    supportsAudio: boolean;
    supportsVideo: boolean;
  }>;

  /**
   * 验证请求
   * @param request LLM请求
   * @returns 验证结果
   */
  validateRequest(request: LLMRequest): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;

  /**
   * 健康检查
   * @returns 健康状态
   */
  healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    message?: string;
    latency?: number;
    lastChecked: Date;
  }>;

  /**
   * 获取客户端名称
   * @returns 客户端名称
   */
  getClientName(): string;

  /**
   * 获取客户端版本
   * @returns 客户端版本
   */
  getClientVersion(): string;

  /**
   * 获取支持的模型列表
   * @returns 支持的模型列表
   */
  getSupportedModels(): Promise<string[]>;

  /**
   * 获取速率限制信息
   * @returns 速率限制信息
   */
  getRateLimitInfo(): Promise<{
    requestsPerMinute: number;
    tokensPerMinute: number;
    requestsPerHour: number;
    tokensPerHour: number;
    requestsPerDay: number;
    tokensPerDay: number;
    currentRequests: number;
    currentTokens: number;
    resetTime: Date;
  }>;

  /**
   * 重置速率限制
   * @returns 是否成功
   */
  resetRateLimit(): Promise<boolean>;

  /**
   * 等待速率限制重置
   * @param timeout 超时时间（毫秒）
   * @returns 是否成功
   */
  waitForRateLimitReset(timeout?: number): Promise<boolean>;

  /**
   * 获取缓存统计
   * @returns 缓存统计
   */
  getCacheStatistics(): Promise<{
    hits: number;
    misses: number;
    hitRate: number;
    totalRequests: number;
    cacheSize: number;
    maxCacheSize: number;
  }>;

  /**
   * 清除缓存
   * @returns 是否成功
   */
  clearCache(): Promise<boolean>;

  /**
   * 获取错误统计
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 错误统计
   */
  getErrorStatistics(startTime?: Date, endTime?: Date): Promise<{
    totalErrors: number;
    byType: Record<string, number>;
    byStatusCode: Record<string, number>;
    averageRetryCount: number;
    maxRetryCount: number;
  }>;

  /**
   * 获取性能统计
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 性能统计
   */
  getPerformanceStatistics(startTime?: Date, endTime?: Date): Promise<{
    averageLatency: number;
    medianLatency: number;
    p95Latency: number;
    p99Latency: number;
    maxLatency: number;
    minLatency: number;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    successRate: number;
  }>;

  /**
   * 获取使用统计
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 使用统计
   */
  getUsageStatistics(startTime?: Date, endTime?: Date): Promise<{
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    byModel: Record<string, {
      requests: number;
      tokens: number;
      cost: number;
    }>;
    averageTokensPerRequest: number;
    averageCostPerRequest: number;
  }>;

  /**
   * 导出统计
   * @param format 导出格式
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 导出数据
   */
  exportStatistics(
    format: 'json' | 'csv' | 'xml',
    startTime?: Date,
    endTime?: Date
  ): Promise<string>;

  /**
   * 配置客户端
   * @param config 配置
   * @returns 是否成功
   */
  configure(config: Record<string, unknown>): Promise<boolean>;

  /**
   * 获取配置
   * @returns 配置
   */
  getConfiguration(): Promise<Record<string, unknown>>;

  /**
   * 重置配置
   * @returns 是否成功
   */
  resetConfiguration(): Promise<boolean>;

  /**
   * 关闭客户端
   * @returns 是否成功
   */
  close(): Promise<boolean>;
}