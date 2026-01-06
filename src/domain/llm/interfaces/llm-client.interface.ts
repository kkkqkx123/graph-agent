import { LLMRequest } from '../entities/llm-request';
import { LLMResponse } from '../entities/llm-response';

/**
 * 健康状态
 */
export type HealthStatus = 'healthy' | 'unhealthy' | 'degraded';

/**
 * 健康检查结果
 */
export interface HealthCheckResult {
  status: HealthStatus;
  message?: string;
  latency?: number;
  lastChecked: Date;
}

/**
 * 模型信息
 */
export interface ModelInfo {
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
}

/**
 * 域层LLM客户端接口
 * 
 * 此接口定义了域层需要的LLM客户端能力，
 * 避免直接依赖基础设施层的具体实现
 */
export interface ILLMClient {
  /**
   * 生成响应
   */
  generateResponse(request: LLMRequest): Promise<LLMResponse>;

  /**
   * 流式生成响应
   */
  generateResponseStream(request: LLMRequest): Promise<AsyncIterable<LLMResponse>>;

  /**
   * 健康检查
   */
  healthCheck(): Promise<HealthCheckResult>;

  /**
   * 获取模型信息
   */
  getModelInfo(): Promise<ModelInfo>;

  /**
   * 检查模型是否可用
   */
  isModelAvailable(): Promise<boolean>;

  /**
   * 获取客户端名称
   */
  getClientName(): string;

  /**
   * 获取支持的模型列表
   */
  getSupportedModels(): Promise<string[]>;
}