import { 
  ILLMWrapper, 
  ModelInfo, 
  WrapperStatistics, 
  HealthStatus, 
  WrapperConfiguration 
} from '../interfaces/llm-wrapper.interface';
import { LLMRequest } from '../entities/llm-request';
import { LLMResponse } from '../entities/llm-response';
import { 
  WrapperExecutionException, 
  WrapperConfigurationException 
} from '../exceptions';

/**
 * 基础LLM包装器抽象类
 * 
 * 提供包装器的通用功能和默认实现
 */
export abstract class BaseLLMWrapper implements ILLMWrapper {
  protected readonly name: string;
  protected readonly type: 'pool' | 'task_group' | 'direct';
  protected configuration: WrapperConfiguration;
  protected statistics: WrapperStatistics;
  protected lastHealthCheck: Date;
  protected isInitialized: boolean = false;

  constructor(
    name: string,
    type: 'pool' | 'task_group' | 'direct',
    configuration: WrapperConfiguration
  ) {
    this.name = name;
    this.type = type;
    this.configuration = { ...configuration };
    this.statistics = this.initializeStatistics();
    this.lastHealthCheck = new Date();
    
    this.validateConfiguration();
  }

  // Getters
  public getName(): string {
    return this.name;
  }

  public getType(): 'pool' | 'task_group' | 'direct' {
    return this.type;
  }

  public getConfiguration(): WrapperConfiguration {
    return { ...this.configuration };
  }

  /**
   * 生成响应（抽象方法，子类必须实现）
   */
  public abstract generateResponse(request: LLMRequest): Promise<LLMResponse>;

  /**
   * 流式生成响应（默认实现）
   */
  public async generateResponseStream(request: LLMRequest): Promise<AsyncIterable<LLMResponse>> {
    // 默认实现：使用generateResponse方法并模拟流式输出
    const response = await this.generateResponse(request);
    const content = response.getContent();
    
    // 简单的分块输出
    const chunkSize = 10;
    const chunks: LLMResponse[] = [];
    
    for (let i = 0; i < content.length; i += chunkSize) {
      const chunk = content.slice(i, i + chunkSize);
      chunks.push(LLMResponse.create(
        response.getId(),
        chunk,
        response.getTokenUsage(),
        response.getFinishReason(),
        response.getMetadata()
      ));
    }
    
    return this.createAsyncIterable(chunks);
  }

  /**
   * 获取模型信息（抽象方法，子类必须实现）
   */
  public abstract getModelInfo(): Promise<ModelInfo>;

  /**
   * 获取统计信息
   */
  public async getStatistics(): Promise<WrapperStatistics> {
    // 更新运行时间
    const now = new Date();
    const uptime = now.getTime() - this.statistics.lastRequestTime?.getTime() || 0;
    
    return {
      ...this.statistics,
      uptime,
      errorRate: this.statistics.totalRequests > 0 
        ? this.statistics.failedRequests / this.statistics.totalRequests 
        : 0
    };
  }

  /**
   * 重置统计信息
   */
  public async resetStatistics(): Promise<void> {
    this.statistics = this.initializeStatistics();
  }

  /**
   * 健康检查（默认实现）
   */
  public async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      // 执行具体的健康检查逻辑
      const isHealthy = await this.performHealthCheck();
      const responseTime = Date.now() - startTime;
      
      this.lastHealthCheck = new Date();
      
      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        lastChecked: this.lastHealthCheck,
        responseTime,
        consecutiveFailures: isHealthy ? 0 : (this.statistics.lastErrorTime ? 1 : 0)
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'unhealthy',
        message: (error as Error).message,
        lastChecked: new Date(),
        responseTime,
        consecutiveFailures: 1
      };
    }
  }

  /**
   * 检查是否支持函数调用（默认实现）
   */
  public supportsFunctionCalling(): boolean {
    return false;
  }

  /**
   * 更新包装器配置
   */
  public async updateConfiguration(config: Partial<WrapperConfiguration>): Promise<boolean> {
    try {
      const newConfiguration = { ...this.configuration, ...config };
      this.validateConfiguration(newConfiguration);
      
      this.configuration = newConfiguration;
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 关闭包装器（默认实现）
   */
  public async close(): Promise<void> {
    this.isInitialized = false;
  }

  /**
   * 初始化包装器（可选实现）
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    await this.performInitialization();
    this.isInitialized = true;
  }

  /**
   * 执行请求的通用逻辑
   */
  protected async executeRequest<T>(
    operation: () => Promise<T>,
    operationName: string = 'request'
  ): Promise<T> {
    if (!this.isInitialized) {
      throw new WrapperExecutionException(this.name, '包装器未初始化');
    }

    const startTime = Date.now();
    this.statistics.totalRequests++;
    this.statistics.lastRequestTime = new Date();

    try {
      const result = await operation();
      
      // 更新成功统计
      this.statistics.successfulRequests++;
      const responseTime = Date.now() - startTime;
      this.updateResponseTime(responseTime);
      
      return result;
    } catch (error) {
      // 更新失败统计
      this.statistics.failedRequests++;
      this.statistics.lastError = (error as Error).message;
      this.statistics.lastErrorTime = new Date();
      
      throw new WrapperExecutionException(
        this.name, 
        `${operationName}执行失败: ${(error as Error).message}`
      );
    }
  }

  /**
   * 更新响应时间统计
   */
  protected updateResponseTime(responseTime: number): void {
    const totalRequests = this.statistics.totalRequests;
    const currentAverage = this.statistics.averageResponseTime;
    
    this.statistics.totalResponseTime += responseTime;
    this.statistics.averageResponseTime = 
      (currentAverage * (totalRequests - 1) + responseTime) / totalRequests;
  }

  /**
   * 创建异步可迭代对象
   */
  protected createAsyncIterable<T>(items: T[]): AsyncIterable<T> {
    return {
      async *[Symbol.asyncIterator]() {
        for (const item of items) {
          yield item;
        }
      }
    };
  }

  /**
   * 验证请求
   */
  protected validateRequest(request: LLMRequest): void {
    if (!request) {
      throw new WrapperExecutionException(this.name, '请求不能为空');
    }

    if (!request.getMessages() || request.getMessages().length === 0) {
      throw new WrapperExecutionException(this.name, '请求必须包含至少一条消息');
    }
  }

  /**
   * 初始化统计信息
   */
  private initializeStatistics(): WrapperStatistics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
      errorRate: 0,
      requestsPerMinute: 0,
      tokensPerMinute: 0,
      uptime: 0
    };
  }

  /**
   * 验证配置
   */
  private validateConfiguration(config?: WrapperConfiguration): void {
    const configToValidate = config || this.configuration;
    
    if (!configToValidate.name || configToValidate.name.trim().length === 0) {
      throw new WrapperConfigurationException('包装器名称不能为空');
    }

    if (!configToValidate.type || !['pool', 'task_group', 'direct'].includes(configToValidate.type)) {
      throw new WrapperConfigurationException('无效的包装器类型');
    }

    if (configToValidate.timeout <= 0) {
      throw new WrapperConfigurationException('超时时间必须大于0');
    }

    if (configToValidate.maxRetries < 0) {
      throw new WrapperConfigurationException('最大重试次数不能为负数');
    }

    if (configToValidate.retryDelay < 0) {
      throw new WrapperConfigurationException('重试延迟不能为负数');
    }

    if (configToValidate.metricsInterval <= 0) {
      throw new WrapperConfigurationException('指标间隔必须大于0');
    }
  }

  /**
   * 执行健康检查（抽象方法，子类可以重写）
   */
  protected abstract performHealthCheck(): Promise<boolean>;

  /**
   * 执行初始化（抽象方法，子类可以重写）
   */
  protected async performInitialization(): Promise<void> {
    // 默认实现为空，子类可以重写
  }
}