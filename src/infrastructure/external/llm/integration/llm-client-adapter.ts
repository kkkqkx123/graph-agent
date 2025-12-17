import { injectable, inject } from 'inversify';
import { ILLMClient } from '../../../../domain/llm/interfaces/llm-client.interface';
import { ILLMWrapper } from '../../../../domain/llm/interfaces/llm-wrapper.interface';
import { LLMRequest } from '../../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../../domain/llm/entities/llm-response';
import { HealthStatus } from '../../../../domain/llm/value-objects/health-status';
import { ModelConfig } from '../../../../domain/llm/value-objects/model-config';
import { ID } from '../../../../domain/common/value-objects/id';
import { LLM_DI_IDENTIFIERS } from '../di-identifiers';

/**
 * LLM客户端适配器
 * 
 * 将现有的LLM客户端适配为ILLMWrapper接口，实现与轮询池和任务组系统的集成
 */
@injectable()
export class LLMClientAdapter implements ILLMWrapper {
  private readonly instanceId: string;
  private readonly modelConfig: ModelConfig;
  private readonly healthStatus: HealthStatus;
  private lastHealthCheck: Date = new Date();
  private consecutiveFailures: number = 0;
  private consecutiveSuccesses: number = 0;

  constructor(
    private readonly client: ILLMClient,
    instanceId?: string,
    modelConfig?: ModelConfig
  ) {
    this.instanceId = instanceId || `${client.getClientName()}-${Date.now()}`;
    this.modelConfig = modelConfig || client.getModelConfig();
    this.healthStatus = HealthStatus.createHealthy('Initial status');
  }

  /**
   * 获取包装器ID
   */
  getId(): string {
    return this.instanceId;
  }

  /**
   * 获取包装器名称
   */
  getName(): string {
    return `${this.client.getClientName()}-adapter`;
  }

  /**
   * 获取包装器类型
   */
  getType(): 'client' | 'pool' | 'task_group' {
    return 'client';
  }

  /**
   * 生成响应
   */
  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    try {
      const response = await this.client.generateResponse(request);
      this.consecutiveSuccesses++;
      this.consecutiveFailures = 0;
      this.updateHealthStatus('healthy', 'Request successful');
      return response;
    } catch (error) {
      this.consecutiveFailures++;
      this.consecutiveSuccesses = 0;
      this.updateHealthStatus('unhealthy', `Request failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 生成流式响应
   */
  async generateResponseStream(request: LLMRequest): Promise<AsyncIterable<LLMResponse>> {
    try {
      const stream = await this.client.generateResponseStream(request);
      this.consecutiveSuccesses++;
      this.consecutiveFailures = 0;
      this.updateHealthStatus('healthy', 'Stream request successful');
      return stream;
    } catch (error) {
      this.consecutiveFailures++;
      this.consecutiveSuccesses = 0;
      this.updateHealthStatus('unhealthy', `Stream request failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<HealthStatus> {
    try {
      const clientHealth = await this.client.healthCheck();
      this.lastHealthCheck = new Date();
      
      if (clientHealth.status === 'healthy') {
        this.consecutiveSuccesses++;
        this.consecutiveFailures = 0;
        this.updateHealthStatus('healthy', clientHealth.message || 'Health check passed');
      } else {
        this.consecutiveFailures++;
        this.consecutiveSuccesses = 0;
        this.updateHealthStatus('unhealthy', clientHealth.message || 'Health check failed');
      }
      
      return this.healthStatus;
    } catch (error) {
      this.consecutiveFailures++;
      this.consecutiveSuccesses = 0;
      this.updateHealthStatus('unhealthy', `Health check error: ${error instanceof Error ? error.message : String(error)}`);
      return this.healthStatus;
    }
  }

  /**
   * 获取模型配置
   */
  getModelConfig(): ModelConfig {
    return this.modelConfig;
  }

  /**
   * 获取指标
   */
  async getMetrics(): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageLatency: number;
    lastRequestTime: Date;
    consecutiveFailures: number;
    consecutiveSuccesses: number;
  }> {
    const stats = await this.client.getPerformanceStatistics();
    
    return {
      totalRequests: stats.totalRequests,
      successfulRequests: stats.successfulRequests,
      failedRequests: stats.failedRequests,
      averageLatency: stats.averageLatency,
      lastRequestTime: this.lastHealthCheck,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses
    };
  }

  /**
   * 重置指标
   */
  async resetMetrics(): Promise<void> {
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    // 注意：现有客户端可能没有重置指标的方法
    // 这里只是重置适配器内部的指标
  }

  /**
   * 检查是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      const health = await this.healthCheck();
      return health.getStatus() === 'healthy';
    } catch {
      return false;
    }
  }

  /**
   * 获取支持的模型
   */
  async getSupportedModels(): Promise<string[]> {
    return this.client.getSupportedModels();
  }

  /**
   * 获取客户端信息
   */
  async getInfo(): Promise<{
    name: string;
    version: string;
    provider: string;
    model: string;
    capabilities: any;
  }> {
    const modelInfo = await this.client.getModelInfo();
    
    return {
      name: this.getName(),
      version: this.client.getClientVersion(),
      provider: modelInfo.provider,
      model: modelInfo.name,
      capabilities: await this.client.getModelCapabilities(modelInfo.name)
    };
  }

  /**
   * 关闭包装器
   */
  async close(): Promise<void> {
    try {
      await this.client.close();
    } catch (error) {
      console.warn(`Error closing client adapter ${this.instanceId}:`, error);
    }
  }

  /**
   * 更新健康状态
   */
  private updateHealthStatus(status: 'healthy' | 'unhealthy' | 'degraded', message: string): void {
    this.healthStatus.updateStatus(status, message);
  }

  /**
   * 获取底层客户端
   */
  getClient(): ILLMClient {
    return this.client;
  }

  /**
   * 获取连续失败次数
   */
  getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }

  /**
   * 获取连续成功次数
   */
  getConsecutiveSuccesses(): number {
    return this.consecutiveSuccesses;
  }

  /**
   * 获取最后健康检查时间
   */
  getLastHealthCheck(): Date {
    return this.lastHealthCheck;
  }
}