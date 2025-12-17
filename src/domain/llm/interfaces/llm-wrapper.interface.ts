import { LLMRequest } from '../entities/llm-request';
import { LLMResponse } from '../entities/llm-response';

/**
 * LLM包装器接口
 * 
 * 定义LLM包装器的统一契约，为不同类型的LLM客户端提供一致的API
 */
export interface ILLMWrapper {
  /**
   * 包装器名称
   */
  readonly name: string;

  /**
   * 包装器类型
   */
  readonly type: 'pool' | 'task_group' | 'direct';

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
   * 获取模型信息
   * @returns 模型信息
   */
  getModelInfo(): Promise<ModelInfo>;

  /**
   * 获取统计信息
   * @returns 统计信息
   */
  getStatistics(): Promise<WrapperStatistics>;

  /**
   * 重置统计信息
   */
  resetStatistics(): Promise<void>;

  /**
   * 健康检查
   * @returns 健康状态
   */
  healthCheck(): Promise<HealthStatus>;

  /**
   * 检查是否支持函数调用
   * @returns 是否支持
   */
  supportsFunctionCalling(): boolean;

  /**
   * 获取包装器配置
   * @returns 配置信息
   */
  getConfiguration(): Promise<WrapperConfiguration>;

  /**
   * 更新包装器配置
   * @param config 新配置
   * @returns 是否成功
   */
  updateConfiguration(config: Partial<WrapperConfiguration>): Promise<boolean>;

  /**
   * 关闭包装器
   */
  close(): Promise<void>;
}

/**
 * 模型信息接口
 */
export interface ModelInfo {
  name: string;
  type: string;
  provider: string;
  version: string;
  maxTokens: number;
  contextWindow: number;
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsImages: boolean;
  supportsAudio: boolean;
  supportsVideo: boolean;
  description?: string;
  capabilities?: string[];
}

/**
 * 包装器统计信息接口
 */
export interface WrapperStatistics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalResponseTime: number;
  averageResponseTime: number;
  lastRequestTime?: Date;
  errorRate: number;
  requestsPerMinute: number;
  tokensPerMinute: number;
  uptime: number;
  lastError?: string;
  lastErrorTime?: Date;
}

/**
 * 健康状态接口
 */
export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  lastChecked: Date;
  details?: Record<string, unknown>;
  responseTime?: number;
  consecutiveFailures?: number;
}

/**
 * 包装器配置接口
 */
export interface WrapperConfiguration {
  name: string;
  type: 'pool' | 'task_group' | 'direct';
  enabled: boolean;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  enableMetrics: boolean;
  metricsInterval: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  customSettings?: Record<string, unknown>;
}

/**
 * 包装器工厂接口
 */
export interface ILLMWrapperFactory {
  /**
   * 创建包装器
   * @param config 包装器配置
   * @returns 包装器实例
   */
  createWrapper(config: WrapperConfiguration): Promise<ILLMWrapper>;

  /**
   * 获取包装器
   * @param name 包装器名称
   * @returns 包装器实例
   */
  getWrapper(name: string): Promise<ILLMWrapper | null>;

  /**
   * 获取所有包装器
   * @returns 包装器映射
   */
  getAllWrappers(): Promise<Map<string, ILLMWrapper>>;

  /**
   * 删除包装器
   * @param name 包装器名称
   * @returns 是否成功
   */
  removeWrapper(name: string): Promise<boolean>;

  /**
   * 注册包装器类型
   * @param type 包装器类型
   * @param factory 工厂函数
   */
  registerWrapperType(
    type: string,
    factory: (config: WrapperConfiguration) => Promise<ILLMWrapper>
  ): void;

  /**
   * 批量创建包装器
   * @param configs 配置列表
   * @returns 包装器映射
   */
  createWrappers(configs: WrapperConfiguration[]): Promise<Map<string, ILLMWrapper>>;

  /**
   * 执行健康检查
   * @returns 所有包装器的健康状态
   */
  healthCheckAll(): Promise<Map<string, HealthStatus>>;

  /**
   * 获取所有包装器的统计信息
   * @returns 统计信息映射
   */
  getAllStatistics(): Promise<Map<string, WrapperStatistics>>;

  /**
   * 重置所有包装器的统计信息
   */
  resetAllStatistics(): Promise<void>;

  /**
   * 关闭所有包装器
   */
  closeAll(): Promise<void>;
}

/**
 * 包装器管理器接口
 */
export interface ILLMWrapperManager {
  /**
   * 获取最佳包装器
   * @param request LLM请求
   * @returns 包装器实例
   */
  getBestWrapper(request: LLMRequest): Promise<ILLMWrapper | null>;

  /**
   * 根据名称获取包装器
   * @param name 包装器名称
   * @returns 包装器实例
   */
  getWrapperByName(name: string): Promise<ILLMWrapper | null>;

  /**
   * 根据类型获取包装器
   * @param type 包装器类型
   * @returns 包装器列表
   */
  getWrappersByType(type: 'pool' | 'task_group' | 'direct'): Promise<ILLMWrapper[]>;

  /**
   * 获取可用的包装器
   * @returns 包装器列表
   */
  getAvailableWrappers(): Promise<ILLMWrapper[]>;

  /**
   * 执行请求
   * @param request LLM请求
   * @param wrapperName 可选的包装器名称
   * @returns LLM响应
   */
  executeRequest(
    request: LLMRequest,
    wrapperName?: string
  ): Promise<LLMResponse>;

  /**
   * 执行流式请求
   * @param request LLM请求
   * @param wrapperName 可选的包装器名称
   * @returns 响应流
   */
  executeStreamRequest(
    request: LLMRequest,
    wrapperName?: string
  ): Promise<AsyncIterable<LLMResponse>>;

  /**
   * 获取管理器统计信息
   * @returns 管理器统计信息
   */
  getManagerStatistics(): Promise<ManagerStatistics>;
}

/**
 * 管理器统计信息接口
 */
export interface ManagerStatistics {
  totalWrappers: number;
  activeWrappers: number;
  healthyWrappers: number;
  degradedWrappers: number;
  unhealthyWrappers: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  uptime: number;
  lastHealthCheck: Date;
}