import { Entity } from '../../common/entity';
import { ID } from '../../common/value-objects/id';
import { 
  TaskGroup as ITaskGroup, 
  Echelon as IEchelon,
  CircuitBreaker as ICircuitBreaker,
  TaskGroupConfig,
  TaskGroupStatus,
  CircuitBreakerState,
  FallbackStrategy,
  CircuitBreakerConfig,
  FallbackConfig
} from '../interfaces/task-group-manager.interface';
import { LLMRequest } from './llm-request';
import { LLMResponse } from './llm-response';
import { 
  TaskGroupNotFoundException,
  EchelonNotFoundException,
  NoAvailableModelException,
  TaskGroupConfigurationException
} from '../exceptions';

/**
 * 任务组ID值对象
 */
export class TaskGroupId extends ID {
  constructor(value: string) {
    super(value);
    this.validate();
  }

  private validate(): void {
    if (!this.value || this.value.trim().length === 0) {
      throw new TaskGroupConfigurationException('任务组ID不能为空');
    }
  }
}

/**
 * 任务组实体
 * 
 * 管理层级模型配置，提供降级和熔断功能
 */
export class TaskGroup extends Entity<TaskGroupId> implements ITaskGroup {
  private readonly name: string;
  private readonly description: string;
  private readonly echelons: Map<string, Echelon>;
  private readonly fallbackStrategy: FallbackStrategy;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly fallbackConfig: FallbackConfig;
  
  private status: TaskGroupStatus;
  private lastExecution: Date | null;
  private executionCount: number;

  private constructor(
    id: TaskGroupId,
    name: string,
    description: string,
    echelons: Map<string, Echelon>,
    fallbackStrategy: FallbackStrategy,
    circuitBreaker: CircuitBreaker,
    fallbackConfig: FallbackConfig
  ) {
    super(id);
    this.name = name;
    this.description = description;
    this.echelons = new Map(echelons);
    this.fallbackStrategy = { ...fallbackStrategy };
    this.circuitBreaker = circuitBreaker;
    this.fallbackConfig = { ...fallbackConfig };
    this.status = TaskGroupStatus.ACTIVE;
    this.lastExecution = null;
    this.executionCount = 0;
    
    this.validate();
  }

  /**
   * 创建任务组实例
   */
  public static create(config: TaskGroupConfig): TaskGroup {
    const id = new TaskGroupId(config.name);
    const echelons = new Map<string, Echelon>();
    
    // 创建层级
    for (const [echelonName, echelonConfig] of Object.entries(config.echelons)) {
      const echelon = Echelon.create(echelonName, echelonConfig);
      echelons.set(echelonName, echelon);
    }
    
    // 创建熔断器
    const circuitBreaker = new CircuitBreaker(config.circuitBreaker);
    
    return new TaskGroup(
      id,
      config.name,
      config.description,
      echelons,
      config.fallbackStrategy,
      circuitBreaker,
      config.fallbackConfig
    );
  }

  /**
   * 从现有任务组重建实例
   */
  public static reconstitute(
    id: TaskGroupId,
    name: string,
    description: string,
    echelons: Map<string, Echelon>,
    fallbackStrategy: FallbackStrategy,
    circuitBreaker: CircuitBreaker,
    fallbackConfig: FallbackConfig,
    status: TaskGroupStatus,
    lastExecution: Date | null,
    executionCount: number
  ): TaskGroup {
    const taskGroup = new TaskGroup(
      id,
      name,
      description,
      echelons,
      fallbackStrategy,
      circuitBreaker,
      fallbackConfig
    );
    
    taskGroup.status = status;
    taskGroup.lastExecution = lastExecution;
    taskGroup.executionCount = executionCount;
    
    return taskGroup;
  }

  // Getters
  public getId(): string {
    return this.id.getValue();
  }

  public getName(): string {
    return this.name;
  }

  public getDescription(): string {
    return this.description;
  }

  public getEchelons(): Map<string, Echelon> {
    return new Map(this.echelons);
  }

  public getFallbackStrategy(): FallbackStrategy {
    return { ...this.fallbackStrategy };
  }

  public getCircuitBreaker(): ICircuitBreaker {
    return this.circuitBreaker;
  }

  public getFallbackConfig(): FallbackConfig {
    return { ...this.fallbackConfig };
  }

  public getStatus(): TaskGroupStatus {
    return this.status;
  }

  public getLastExecution(): Date | null {
    return this.lastExecution;
  }

  public getExecutionCount(): number {
    return this.executionCount;
  }

  /**
   * 获取指定层级的模型列表
   */
  public getModelsForEchelon(echelonName: string): string[] {
    const echelon = this.echelons.get(echelonName);
    if (!echelon) {
      throw new EchelonNotFoundException(this.name, echelonName);
    }
    
    return echelon.getModels();
  }

  /**
   * 获取指定层级
   */
  public getEchelon(echelonName: string): Echelon | null {
    return this.echelons.get(echelonName) || null;
  }

  /**
   * 获取所有可用的模型
   */
  public getAvailableModels(): string[] {
    const models: string[] = [];
    
    for (const echelon of this.echelons.values()) {
      if (echelon.isAvailable()) {
        models.push(...echelon.getModels());
      }
    }
    
    return models;
  }

  /**
   * 执行带降级的请求
   */
  public async executeWithFallback(request: LLMRequest): Promise<LLMResponse> {
    this.executionCount++;
    this.lastExecution = new Date();
    
    return await this.circuitBreaker.execute(async () => {
      return await this.executeWithEchelonFallback(request);
    });
  }

  /**
   * 更新任务组配置
   */
  public updateConfig(config: Partial<TaskGroupConfig>): TaskGroup {
    // 创建新的任务组实例
    const newConfig = this.mergeConfig(config);
    const newTaskGroup = TaskGroup.create(newConfig);
    
    // 复制状态信息
    newTaskGroup.status = this.status;
    newTaskGroup.lastExecution = this.lastExecution;
    newTaskGroup.executionCount = this.executionCount;
    
    return newTaskGroup;
  }

  /**
   * 获取任务组统计信息
   */
  public getStatistics(): TaskGroupStatistics {
    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;
    let totalResponseTime = 0;
    
    for (const echelon of this.echelons.values()) {
      const stats = echelon.getStatistics();
      totalRequests += stats.totalRequests;
      successfulRequests += stats.successfulRequests;
      failedRequests += stats.failedRequests;
      totalResponseTime += stats.totalResponseTime;
    }
    
    return {
      groupName: this.name,
      status: this.status,
      totalEchelons: this.echelons.size,
      activeEchelons: Array.from(this.echelons.values()).filter(e => e.isAvailable()).length,
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime: totalRequests > 0 ? totalResponseTime / totalRequests : 0,
      lastExecution: this.lastExecution,
      executionCount: this.executionCount,
      circuitBreakerState: this.circuitBreaker.getState(),
      echelonStatistics: Array.from(this.echelons.entries()).map(([name, echelon]) => ({
        echelonName: name,
        models: echelon.getModels(),
        concurrencyLimit: echelon.getConcurrencyLimit(),
        currentConcurrency: echelon.getCurrentConcurrency(),
        rpmLimit: echelon.getRpmLimit(),
        currentRpm: echelon.getCurrentRpm(),
        isAvailable: echelon.isAvailable(),
        statistics: echelon.getStatistics()
      }))
    };
  }

  private async executeWithEchelonFallback(request: LLMRequest): Promise<LLMResponse> {
    const sortedEchelons = Array.from(this.echelons.entries())
      .sort(([, a], [, b]) => a.getPriority() - b.getPriority());
    
    const errors: Error[] = [];
    
    for (const [echelonName, echelon] of sortedEchelons) {
      if (!echelon.isAvailable()) {
        continue;
      }
      
      try {
        return await this.executeWithEchelon(request, echelon);
      } catch (error) {
        errors.push(error as Error);
        continue;
      }
    }
    
    if (errors.length > 0) {
      throw new NoAvailableModelException(this.name);
    }
    
    throw new TaskGroupNotFoundException(this.name);
  }

  private async executeWithEchelon(request: LLMRequest, echelon: Echelon): Promise<LLMResponse> {
    if (!echelon.canAcceptRequest()) {
      throw new Error(`层级 ${echelon.getName()} 无法接受更多请求`);
    }
    
    try {
      echelon.incrementConcurrency();
      
      // 这里应该调用实际的LLM客户端
      // 暂时返回模拟响应
      const response = LLMResponse.create(
        this.id,
        `模拟响应来自 ${echelon.getName()}`,
        {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150
        },
        'stop',
        {
          echelon: echelon.getName(),
          models: echelon.getModels()
        }
      );
      
      echelon.incrementSuccess();
      return response;
    } catch (error) {
      echelon.incrementFailure();
      throw error;
    } finally {
      echelon.decrementConcurrency();
    }
  }

  private mergeConfig(config: Partial<TaskGroupConfig>): TaskGroupConfig {
    const existingEchelons: Record<string, any> = {};
    for (const [name, echelon] of this.echelons.entries()) {
      existingEchelons[name] = {
        models: echelon.getModels(),
        concurrencyLimit: echelon.getConcurrencyLimit(),
        rpmLimit: echelon.getRpmLimit(),
        priority: echelon.getPriority(),
        timeout: echelon.getTimeout(),
        maxRetries: echelon.getMaxRetries(),
        temperature: echelon.getTemperature(),
        maxTokens: echelon.getMaxTokens(),
        modelType: echelon.getModelType(),
        apiKey: echelon.getApiKey(),
        baseUrl: echelon.getBaseUrl(),
        functionCalling: echelon.getFunctionCalling()
      };
    }
    
    return {
      name: this.name,
      description: config.description || this.description,
      echelons: config.echelons || existingEchelons,
      fallbackStrategy: config.fallbackStrategy || this.fallbackStrategy,
      circuitBreaker: config.circuitBreaker || this.circuitBreaker.getConfig(),
      fallbackConfig: config.fallbackConfig || this.fallbackConfig
    };
  }

  private validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new TaskGroupConfigurationException('任务组名称不能为空');
    }

    if (this.echelons.size === 0) {
      throw new TaskGroupConfigurationException('任务组必须包含至少一个层级');
    }

    // 验证层级优先级唯一性
    const priorities = Array.from(this.echelons.values()).map(e => e.getPriority());
    const uniquePriorities = new Set(priorities);
    if (priorities.length !== uniquePriorities.size) {
      throw new TaskGroupConfigurationException('层级优先级必须唯一');
    }
  }
}

/**
 * 层级实体
 */
export class Echelon implements IEchelon {
  private readonly name: string;
  private readonly models: string[];
  private readonly concurrencyLimit: number;
  private readonly rpmLimit: number;
  private readonly priority: number;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly temperature: number;
  private readonly maxTokens: number;
  private readonly modelType: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly functionCalling: boolean;
  
  private currentConcurrency: number;
  private currentRpm: number;
  private lastRpmReset: Date;
  private totalRequests: number;
  private successfulRequests: number;
  private failedRequests: number;
  private totalResponseTime: number;

  private constructor(
    name: string,
    models: string[],
    concurrencyLimit: number,
    rpmLimit: number,
    priority: number,
    timeout: number,
    maxRetries: number,
    temperature: number,
    maxTokens: number,
    modelType: string,
    apiKey: string,
    baseUrl: string,
    functionCalling: boolean
  ) {
    this.name = name;
    this.models = [...models];
    this.concurrencyLimit = concurrencyLimit;
    this.rpmLimit = rpmLimit;
    this.priority = priority;
    this.timeout = timeout;
    this.maxRetries = maxRetries;
    this.temperature = temperature;
    this.maxTokens = maxTokens;
    this.modelType = modelType;
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.functionCalling = functionCalling;
    
    this.currentConcurrency = 0;
    this.currentRpm = 0;
    this.lastRpmReset = new Date();
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;
    this.totalResponseTime = 0;
  }

  /**
   * 创建层级实例
   */
  public static create(name: string, config: any): Echelon {
    return new Echelon(
      name,
      config.models || [],
      config.concurrencyLimit || 10,
      config.rpmLimit || 100,
      config.priority || 1,
      config.timeout || 30,
      config.maxRetries || 3,
      config.temperature || 0.7,
      config.maxTokens || 2000,
      config.modelType || 'openai',
      config.apiKey || '',
      config.baseUrl || '',
      config.functionCalling || false
    );
  }

  // Getters
  public getName(): string {
    return this.name;
  }

  public getModels(): string[] {
    return [...this.models];
  }

  public getConcurrencyLimit(): number {
    return this.concurrencyLimit;
  }

  public getRpmLimit(): number {
    return this.rpmLimit;
  }

  public getPriority(): number {
    return this.priority;
  }

  public getTimeout(): number {
    return this.timeout;
  }

  public getMaxRetries(): number {
    return this.maxRetries;
  }

  public getTemperature(): number {
    return this.temperature;
  }

  public getMaxTokens(): number {
    return this.maxTokens;
  }

  public getModelType(): string {
    return this.modelType;
  }

  public getApiKey(): string {
    return this.apiKey;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public getFunctionCalling(): boolean {
    return this.functionCalling;
  }

  public getCurrentConcurrency(): number {
    return this.currentConcurrency;
  }

  public getCurrentRpm(): number {
    this.resetRpmIfNeeded();
    return this.currentRpm;
  }

  public isAvailable(): boolean {
    return this.models.length > 0 && 
           this.currentConcurrency < this.concurrencyLimit &&
           this.getCurrentRpm() < this.rpmLimit;
  }

  public canAcceptRequest(): boolean {
    return this.isAvailable();
  }

  public incrementConcurrency(): void {
    this.currentConcurrency++;
    this.totalRequests++;
  }

  public decrementConcurrency(): void {
    if (this.currentConcurrency > 0) {
      this.currentConcurrency--;
    }
  }

  public incrementSuccess(): void {
    this.successfulRequests++;
  }

  public incrementFailure(): void {
    this.failedRequests++;
  }

  public updateResponseTime(responseTime: number): void {
    this.totalResponseTime += responseTime;
  }

  public getStatistics(): EchelonStatistics {
    return {
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      averageResponseTime: this.totalRequests > 0 ? this.totalResponseTime / this.totalRequests : 0
    };
  }

  private resetRpmIfNeeded(): void {
    const now = new Date();
    const timeDiff = now.getTime() - this.lastRpmReset.getTime();
    
    // 如果超过1分钟，重置RPM计数
    if (timeDiff >= 60000) {
      this.currentRpm = 0;
      this.lastRpmReset = now;
    }
  }
}

/**
 * 熔断器实现
 */
export class CircuitBreaker implements ICircuitBreaker {
  private state: CircuitBreakerState;
  private failureCount: number;
  private lastFailureTime: Date | null;
  private halfOpenRequests: number;

  constructor(private config: CircuitBreakerConfig) {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.halfOpenRequests = 0;
  }

  public getState(): CircuitBreakerState {
    return this.state;
  }

  public getFailureCount(): number {
    return this.failureCount;
  }

  public getLastFailureTime(): Date | null {
    return this.lastFailureTime;
  }

  public getConfig(): CircuitBreakerConfig {
    return { ...this.config };
  }

  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.halfOpenRequests = 0;
      } else {
        throw new Error('熔断器处于开启状态');
      }
    }

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      if (this.halfOpenRequests >= this.config.halfOpenRequests) {
        throw new Error('熔断器半开状态请求数已达上限');
      }
      this.halfOpenRequests++;
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  public reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.halfOpenRequests = 0;
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = CircuitBreakerState.CLOSED;
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
    }
  }

  private shouldAttemptReset(): boolean {
    return this.lastFailureTime !== null &&
           Date.now() - this.lastFailureTime.getTime() >= this.config.recoveryTime * 1000;
  }
}

/**
 * 统计信息接口
 */
export interface TaskGroupStatistics {
  groupName: string;
  status: TaskGroupStatus;
  totalEchelons: number;
  activeEchelons: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastExecution: Date | null;
  executionCount: number;
  circuitBreakerState: CircuitBreakerState;
  echelonStatistics: EchelonStatisticsInfo[];
}

export interface EchelonStatisticsInfo {
  echelonName: string;
  models: string[];
  concurrencyLimit: number;
  currentConcurrency: number;
  rpmLimit: number;
  currentRpm: number;
  isAvailable: boolean;
  statistics: EchelonStatistics;
}

export interface EchelonStatistics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
}