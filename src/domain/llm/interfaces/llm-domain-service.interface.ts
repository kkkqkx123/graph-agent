import { ID } from '../../common/value-objects/id';
import { LLMRequest } from '../entities/llm-request';
import { LLMResponse } from '../entities/llm-response';
import { ModelConfig } from '../value-objects/model-config';
import { ILLMClient } from './llm-client.interface';

/**
 * LLM领域服务接口
 * 
 * 定义LLM领域服务的契约
 */
export interface ILLMDomainService {
  /**
   * 创建LLM请求
   * @param model 模型名称
   * @param messages 消息列表
   * @param options 选项
   * @returns LLM请求
   */
  createRequest(
    model: string,
    messages: Array<{
      role: 'system' | 'user' | 'assistant' | 'function';
      content: string;
      name?: string;
      functionCall?: any;
    }>,
    options?: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
      stop?: string[];
      stream?: boolean;
      functions?: Array<{
        name: string;
        description?: string;
        parameters?: any;
      }>;
      functionCall?: 'auto' | 'none' | { name: string };
      user?: string;
      metadata?: Record<string, unknown>;
    }
  ): LLMRequest;

  /**
   * 创建LLM响应
   * @param requestId 请求ID
   * @param content 内容
   * @param tokenUsage Token使用情况
   * @param finishReason 完成原因
   * @param metadata 元数据
   * @returns LLM响应
   */
  createResponse(
    requestId: ID,
    content: string,
    tokenUsage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    },
    finishReason: 'stop' | 'length' | 'function_call' | 'content_filter' | 'tool_calls' | null,
    metadata?: Record<string, unknown>
  ): LLMResponse;

  /**
   * 验证LLM请求
   * @param request LLM请求
   * @returns 验证结果
   */
  validateRequest(request: LLMRequest): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };

  /**
   * 验证LLM响应
   * @param response LLM响应
   * @returns 验证结果
   */
  validateResponse(response: LLMResponse): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };

  /**
   * 计算Token数
   * @param text 文本
   * @param model 模型
   * @returns Token数
   */
  calculateTokens(text: string, model: string): Promise<number>;

  /**
   * 计算请求成本
   * @param request LLM请求
   * @param response LLM响应
   * @returns 成本
   */
  calculateCost(request: LLMRequest, response: LLMResponse): Promise<number>;

  /**
   * 获取模型配置
   * @param model 模型名称
   * @returns 模型配置
   */
  getModelConfig(model: string): ModelConfig;

  /**
   * 获取所有支持的模型
   * @returns 模型列表
   */
  getSupportedModels(): Promise<string[]>;

  /**
   * 检查模型是否支持功能
   * @param model 模型名称
   * @param feature 功能名称
   * @returns 是否支持
   */
  isFeatureSupported(model: string, feature: 'streaming' | 'tools' | 'images' | 'audio' | 'video'): Promise<boolean>;

  /**
   * 获取模型信息
   * @param model 模型名称
   * @returns 模型信息
   */
  getModelInfo(model: string): Promise<{
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
    pricing: {
      promptTokenPrice: number;
      completionTokenPrice: number;
      currency: string;
    };
  }>;

  /**
   * 选择最佳模型
   * @param requirements 需求
   * @returns 模型名称
   */
  selectBestModel(requirements: {
    task: 'chat' | 'completion' | 'embedding' | 'classification' | 'generation';
    maxTokens?: number;
    budget?: number;
    latency?: number;
    features?: Array<'streaming' | 'tools' | 'images' | 'audio' | 'video'>;
    quality?: 'low' | 'medium' | 'high';
  }): Promise<string>;

  /**
   * 优化请求
   * @param request LLM请求
   * @returns 优化后的请求
   */
  optimizeRequest(request: LLMRequest): Promise<LLMRequest>;

  /**
   * 优化响应
   * @param response LLM响应
   * @returns 优化后的响应
   */
  optimizeResponse(response: LLMResponse): Promise<LLMResponse>;

  /**
   * 缓存请求
   * @param request LLM请求
   * @param ttl 生存时间（秒）
   * @returns 是否成功
   */
  cacheRequest(request: LLMRequest, ttl?: number): Promise<boolean>;

  /**
   * 缓存响应
   * @param response LLM响应
   * @param ttl 生存时间（秒）
   * @returns 是否成功
   */
  cacheResponse(response: LLMResponse, ttl?: number): Promise<boolean>;

  /**
   * 获取缓存的响应
   * @param request LLM请求
   * @returns 缓存的响应
   */
  getCachedResponse(request: LLMRequest): Promise<LLMResponse | null>;

  /**
   * 清除缓存
   * @param pattern 模式
   * @returns 清除的条目数
   */
  clearCache(pattern?: string): Promise<number>;

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
   * 获取错误统计
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 错误统计
   */
  getErrorStatistics(startTime?: Date, endTime?: Date): Promise<{
    totalErrors: number;
    byType: Record<string, number>;
    byModel: Record<string, number>;
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
   * 重置统计
   * @returns 是否成功
   */
  resetStatistics(): Promise<boolean>;

  /**
   * 配置服务
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
   * 健康检查
   * @returns 健康状态
   */
  healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    message?: string;
    details?: Record<string, unknown>;
    lastChecked: Date;
  }>;

  /**
   * 关闭服务
   * @returns 是否成功
   */
  close(): Promise<boolean>;
}