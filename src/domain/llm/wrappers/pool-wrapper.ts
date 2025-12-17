import { BaseLLMWrapper } from './base-llm-wrapper';
import { 
  ModelInfo, 
  WrapperConfiguration, 
  HealthStatus 
} from '../interfaces/llm-wrapper.interface';
import { LLMRequest } from '../entities/llm-request';
import { LLMResponse } from '../entities/llm-response';
import { IPoolService } from '../../application/llm/services/pool.service';
import { ILLMClient } from '../interfaces/llm-client.interface';
import { 
  PoolNotFoundException, 
  NoHealthyInstanceException,
  WrapperExecutionException 
} from '../exceptions';

/**
 * 轮询池包装器
 * 
 * 使用轮询池管理LLM实例，提供负载均衡和故障转移功能
 */
export class PoolWrapper extends BaseLLMWrapper {
  private readonly poolService: IPoolService;
  private readonly poolName: string;

  constructor(
    name: string,
    poolName: string,
    poolService: IPoolService,
    configuration: WrapperConfiguration
  ) {
    super(name, 'pool', configuration);
    this.poolName = poolName;
    this.poolService = poolService;
  }

  /**
   * 生成响应
   */
  public async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    return this.executeRequest(async () => {
      this.validateRequest(request);
      
      // 获取池实例
      const poolInstance = await this.poolService.getPoolInstance(this.poolName);
      if (!poolInstance) {
        throw new NoHealthyInstanceException(this.poolName);
      }

      try {
        // 获取LLM客户端
        const client = poolInstance.getClient();
        
        // 调用客户端生成响应
        const response = await client.generateResponse(request);
        
        // 释放池实例
        await this.poolService.releasePoolInstance(this.poolName, poolInstance);
        
        return response;
      } catch (error) {
        // 确保释放实例
        try {
          await this.poolService.releasePoolInstance(this.poolName, poolInstance);
        } catch (releaseError) {
          // 记录释放错误，但不抛出
          console.error('释放池实例失败:', releaseError);
        }
        
        throw error;
      }
    }, 'generateResponse');
  }

  /**
   * 流式生成响应
   */
  public async generateResponseStream(request: LLMRequest): Promise<AsyncIterable<LLMResponse>> {
    return this.executeRequest(async () => {
      this.validateRequest(request);
      
      // 获取池实例
      const poolInstance = await this.poolService.getPoolInstance(this.poolName);
      if (!poolInstance) {
        throw new NoHealthyInstanceException(this.poolName);
      }

      try {
        // 获取LLM客户端
        const client = poolInstance.getClient();
        
        // 调用客户端流式生成响应
        const stream = await client.generateResponseStream(request);
        
        // 包装流以确保实例释放
        return this.wrapStreamWithCleanup(stream, poolInstance);
      } catch (error) {
        // 确保释放实例
        try {
          await this.poolService.releasePoolInstance(this.poolName, poolInstance);
        } catch (releaseError) {
          console.error('释放池实例失败:', releaseError);
        }
        
        throw error;
      }
    }, 'generateResponseStream');
  }

  /**
   * 获取模型信息
   */
  public async getModelInfo(): Promise<ModelInfo> {
    return this.executeRequest(async () => {
      const pool = await this.poolService.getPool(this.poolName);
      if (!pool) {
        throw new PoolNotFoundException(this.poolName);
      }

      // 获取池中的一个健康实例来获取模型信息
      const poolInstance = await this.poolService.getPoolInstance(this.poolName);
      if (!poolInstance) {
        throw new NoHealthyInstanceException(this.poolName);
      }

      try {
        const client = poolInstance.getClient();
        const modelInfo = await client.getModelInfo();
        
        // 释放实例
        await this.poolService.releasePoolInstance(this.poolName, poolInstance);
        
        // 添加池特定的信息
        return {
          ...modelInfo,
          name: `${this.poolName}-${modelInfo.name}`,
          description: `轮询池 ${this.poolName} 中的模型 ${modelInfo.name}`,
          capabilities: [
            ...modelInfo.capabilities || [],
            'load_balancing',
            'failover',
            'health_checking'
          ]
        };
      } catch (error) {
        // 确保释放实例
        try {
          await this.poolService.releasePoolInstance(this.poolName, poolInstance);
        } catch (releaseError) {
          console.error('释放池实例失败:', releaseError);
        }
        
        throw error;
      }
    }, 'getModelInfo');
  }

  /**
   * 检查是否支持函数调用
   */
  public supportsFunctionCalling(): boolean {
    // 轮询池包装器支持函数调用，如果池中的实例支持的话
    return true;
  }

  /**
   * 执行健康检查
   */
  protected async performHealthCheck(): Promise<boolean> {
    try {
      const healthStatus = await this.poolService.healthCheck(this.poolName);
      return healthStatus.healthy && healthStatus.healthyInstances > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * 执行初始化
   */
  protected async performInitialization(): Promise<void> {
    // 检查池是否存在
    const pool = await this.poolService.getPool(this.poolName);
    if (!pool) {
      throw new PoolNotFoundException(this.poolName);
    }

    // 检查池是否有健康实例
    const healthStatus = await this.poolService.healthCheck(this.poolName);
    if (!healthStatus.healthy || healthStatus.healthyInstances === 0) {
      throw new WrapperExecutionException(
        this.name, 
        `轮询池 ${this.poolName} 没有健康的实例`
      );
    }
  }

  /**
   * 获取池统计信息
   */
  public async getPoolStatistics(): Promise<any> {
    return this.poolService.getPoolStatistics(this.poolName);
  }

  /**
   * 获取池名称
   */
  public getPoolName(): string {
    return this.poolName;
  }

  /**
   * 包装流以确保实例释放
   */
  private async* wrapStreamWithCleanup(
    stream: AsyncIterable<LLMResponse>,
    poolInstance: any
  ): AsyncIterable<LLMResponse> {
    try {
      for await (const chunk of stream) {
        yield chunk;
      }
    } finally {
      // 确保释放实例
      try {
        await this.poolService.releasePoolInstance(this.poolName, poolInstance);
      } catch (error) {
        console.error('释放池实例失败:', error);
      }
    }
  }

  /**
   * 创建轮询池包装器
   */
  public static create(
    name: string,
    poolName: string,
    poolService: IPoolService,
    configuration: Partial<WrapperConfiguration> = {}
  ): PoolWrapper {
    const defaultConfig: WrapperConfiguration = {
      name,
      type: 'pool',
      enabled: true,
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      enableMetrics: true,
      metricsInterval: 60000,
      logLevel: 'info',
      customSettings: {
        poolName
      }
    };

    const finalConfig = { ...defaultConfig, ...configuration };
    return new PoolWrapper(name, poolName, poolService, finalConfig);
  }
}