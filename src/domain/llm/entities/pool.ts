import { Entity } from '../../common/entity';
import { ID } from '../../common/value-objects/id';
import { 
  Pool as IPool, 
  PoolInstance as IPoolInstance, 
  PoolConfig, 
  PoolHealthStatus, 
  PoolStatus,
  InstanceStatus,
  RotationStrategy,
  FallbackConfig,
  RateLimitingConfig
} from '../interfaces/pool-manager.interface';
import { ILLMClient } from '../interfaces/llm-client.interface';
import { 
  PoolNotFoundException, 
  NoHealthyInstanceException,
  PoolConfigurationException 
} from '../exceptions';

/**
 * 轮询池ID值对象
 */
export class PoolId extends ID {
  constructor(value: string) {
    super(value);
    this.validate();
  }

  private validate(): void {
    if (!this.value || this.value.trim().length === 0) {
      throw new PoolConfigurationException('轮询池ID不能为空');
    }
  }
}

/**
 * 轮询池实体
 * 
 * 管理多个LLM实例的集合，提供负载均衡和故障转移功能
 */
export class Pool extends Entity<PoolId> implements IPool {
  private readonly name: string;
  private readonly description: string;
  private readonly taskGroups: string[];
  private readonly rotationStrategy: RotationStrategy;
  private readonly healthCheckInterval: number;
  private readonly failureThreshold: number;
  private readonly recoveryTime: number;
  private readonly fallbackConfig: FallbackConfig;
  private readonly rateLimiting?: RateLimitingConfig;
  
  private instances: Map<string, PoolInstance> = new Map();
  private status: PoolStatus;
  private lastHealthCheck: Date;
  private healthCheckTimer?: NodeJS.Timeout;

  private constructor(
    id: PoolId,
    name: string,
    description: string,
    taskGroups: string[],
    rotationStrategy: RotationStrategy,
    healthCheckInterval: number,
    failureThreshold: number,
    recoveryTime: number,
    fallbackConfig: FallbackConfig,
    rateLimiting?: RateLimitingConfig
  ) {
    super(id);
    this.name = name;
    this.description = description;
    this.taskGroups = [...taskGroups];
    this.rotationStrategy = { ...rotationStrategy };
    this.healthCheckInterval = healthCheckInterval;
    this.failureThreshold = failureThreshold;
    this.recoveryTime = recoveryTime;
    this.fallbackConfig = { ...fallbackConfig };
    this.rateLimiting = rateLimiting ? { ...rateLimiting } : undefined;
    this.status = PoolStatus.ACTIVE;
    this.lastHealthCheck = new Date();
    
    this.validate();
  }

  /**
   * 创建轮询池实例
   */
  public static create(config: PoolConfig): Pool {
    const id = new PoolId(config.name);
    return new Pool(
      id,
      config.name,
      config.description,
      config.taskGroups,
      config.rotationStrategy,
      config.healthCheckInterval,
      config.failureThreshold,
      config.recoveryTime,
      config.fallbackConfig,
      config.rateLimiting
    );
  }

  /**
   * 从现有池重建实例
   */
  public static reconstitute(
    id: PoolId,
    name: string,
    description: string,
    taskGroups: string[],
    rotationStrategy: RotationStrategy,
    healthCheckInterval: number,
    failureThreshold: number,
    recoveryTime: number,
    fallbackConfig: FallbackConfig,
    rateLimiting: RateLimitingConfig | undefined,
    instances: Map<string, PoolInstance>,
    status: PoolStatus,
    lastHealthCheck: Date
  ): Pool {
    const pool = new Pool(
      id,
      name,
      description,
      taskGroups,
      rotationStrategy,
      healthCheckInterval,
      failureThreshold,
      recoveryTime,
      fallbackConfig,
      rateLimiting
    );
    
    pool.instances = new Map(instances);
    pool.status = status;
    pool.lastHealthCheck = lastHealthCheck;
    
    return pool;
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

  public getTaskGroups(): string[] {
    return [...this.taskGroups];
  }

  public getRotationStrategy(): RotationStrategy {
    return { ...this.rotationStrategy };
  }

  public getHealthCheckInterval(): number {
    return this.healthCheckInterval;
  }

  public getFailureThreshold(): number {
    return this.failureThreshold;
  }

  public getRecoveryTime(): number {
    return this.recoveryTime;
  }

  public getFallbackConfig(): FallbackConfig {
    return { ...this.fallbackConfig };
  }

  public getRateLimiting(): RateLimitingConfig | undefined {
    return this.rateLimiting ? { ...this.rateLimiting } : undefined;
  }

  public getStatus(): PoolStatus {
    return this.status;
  }

  public getInstances(): Map<string, PoolInstance> {
    return new Map(this.instances);
  }

  public getInstanceCount(): number {
    return this.instances.size;
  }

  public getHealthyInstanceCount(): number {
    let count = 0;
    for (const instance of this.instances.values()) {
      if (instance.isHealthy()) {
        count++;
      }
    }
    return count;
  }

  /**
   * 添加实例到池中
   */
  public addInstance(instance: PoolInstance): void {
    if (this.instances.has(instance.getId())) {
      throw new PoolConfigurationException(`实例已存在: ${instance.getId()}`);
    }
    
    this.instances.set(instance.getId(), instance);
  }

  /**
   * 从池中移除实例
   */
  public removeInstance(instanceId: string): boolean {
    return this.instances.delete(instanceId);
  }

  /**
   * 获取池实例
   */
  public async getInstance(): Promise<PoolInstance | null> {
    const healthyInstances = Array.from(this.instances.values())
      .filter(instance => instance.isHealthy() && instance.canAcquire());

    if (healthyInstances.length === 0) {
      throw new NoHealthyInstanceException(this.name);
    }

    // 根据轮询策略选择实例
    const selectedInstance = this.selectInstanceByStrategy(healthyInstances);
    
    if (selectedInstance) {
      selectedInstance.acquire();
      return selectedInstance;
    }

    return null;
  }

  /**
   * 释放池实例
   */
  public releaseInstance(instance: PoolInstance): void {
    const poolInstance = this.instances.get(instance.getId());
    if (poolInstance) {
      poolInstance.release();
    }
  }

  /**
   * 执行健康检查
   */
  public async healthCheck(): Promise<PoolHealthStatus> {
    const healthyInstances: string[] = [];
    const errors: string[] = [];

    // 检查所有实例的健康状态
    for (const instance of this.instances.values()) {
      try {
        const isHealthy = await instance.checkHealth();
        if (isHealthy) {
          healthyInstances.push(instance.getId());
        } else {
          errors.push(`实例 ${instance.getId()} 不健康`);
        }
      } catch (error) {
        errors.push(`实例 ${instance.getId()} 健康检查失败: ${error}`);
      }
    }

    // 更新池状态
    this.updatePoolStatus(healthyInstances.length, this.instances.size);
    this.lastHealthCheck = new Date();

    return {
      healthy: healthyInstances.length > 0,
      healthyInstances: healthyInstances.length,
      totalInstances: this.instances.size,
      healthRatio: this.instances.size > 0 ? healthyInstances.length / this.instances.size : 0,
      lastChecked: this.lastHealthCheck,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * 启动健康检查定时器
   */
  public startHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(
      () => {
        this.healthCheck().catch(error => {
          console.error(`池 ${this.name} 健康检查失败:`, error);
        });
      },
      this.healthCheckInterval * 1000
    );
  }

  /**
   * 停止健康检查定时器
   */
  public stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  /**
   * 更新池配置
   */
  public updateConfig(config: Partial<PoolConfig>): Pool {
    // 创建新的池实例
    const newConfig = this.mergeConfig(config);
    const newPool = Pool.create(newConfig);
    
    // 复制现有实例
    for (const instance of this.instances.values()) {
      newPool.addInstance(instance);
    }
    
    return newPool;
  }

  /**
   * 获取池统计信息
   */
  public getStatistics(): PoolStatistics {
    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;
    let totalResponseTime = 0;

    for (const instance of this.instances.values()) {
      const stats = instance.getStatistics();
      totalRequests += stats.totalRequests;
      successfulRequests += stats.successfulRequests;
      failedRequests += stats.failedRequests;
      totalResponseTime += stats.totalResponseTime;
    }

    return {
      poolName: this.name,
      totalInstances: this.instances.size,
      healthyInstances: this.getHealthyInstanceCount(),
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime: totalRequests > 0 ? totalResponseTime / totalRequests : 0,
      lastHealthCheck: this.lastHealthCheck,
      instanceStatistics: Array.from(this.instances.values()).map(instance => ({
        instanceId: instance.getId(),
        status: instance.getStatus(),
        successCount: instance.getSuccessCount(),
        failureCount: instance.getFailureCount(),
        lastUsed: instance.getLastUsed(),
        averageResponseTime: instance.getAverageResponseTime()
      }))
    };
  }

  private validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new PoolConfigurationException('轮询池名称不能为空');
    }

    if (!this.taskGroups || this.taskGroups.length === 0) {
      throw new PoolConfigurationException('轮询池必须包含至少一个任务组');
    }

    if (this.healthCheckInterval <= 0) {
      throw new PoolConfigurationException('健康检查间隔必须大于0');
    }

    if (this.failureThreshold <= 0) {
      throw new PoolConfigurationException('故障阈值必须大于0');
    }

    if (this.recoveryTime <= 0) {
      throw new PoolConfigurationException('恢复时间必须大于0');
    }
  }

  private mergeConfig(config: Partial<PoolConfig>): PoolConfig {
    return {
      name: this.name,
      description: config.description || this.description,
      taskGroups: config.taskGroups || this.taskGroups,
      rotationStrategy: config.rotationStrategy || this.rotationStrategy,
      healthCheckInterval: config.healthCheckInterval || this.healthCheckInterval,
      failureThreshold: config.failureThreshold || this.failureThreshold,
      recoveryTime: config.recoveryTime || this.recoveryTime,
      fallbackConfig: config.fallbackConfig || this.fallbackConfig,
      rateLimiting: config.rateLimiting || this.rateLimiting
    };
  }

  private selectInstanceByStrategy(instances: PoolInstance[]): PoolInstance | null {
    switch (this.rotationStrategy.type) {
      case 'round_robin':
        return this.selectRoundRobin(instances);
      case 'weighted_random':
        return this.selectWeightedRandom(instances);
      case 'least_connections':
        return this.selectLeastConnections(instances);
      case 'fastest_response':
        return this.selectFastestResponse(instances);
      default:
        return instances[0] || null;
    }
  }

  private selectRoundRobin(instances: PoolInstance[]): PoolInstance | null {
    // 简单的轮询实现
    const index = Math.floor(Math.random() * instances.length);
    return instances[index] || null;
  }

  private selectWeightedRandom(instances: PoolInstance[]): PoolInstance | null {
    const weights = instances.map(instance => instance.getWeight());
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    
    let random = Math.random() * totalWeight;
    for (let i = 0; i < instances.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return instances[i];
      }
    }
    
    return instances[0] || null;
  }

  private selectLeastConnections(instances: PoolInstance[]): PoolInstance | null {
    return instances.reduce((min, current) => 
      current.getConnectionCount() < min.getConnectionCount() ? current : min
    , instances[0] || null);
  }

  private selectFastestResponse(instances: PoolInstance[]): PoolInstance | null {
    return instances.reduce((fastest, current) => 
      current.getAverageResponseTime() < fastest.getAverageResponseTime() ? current : fastest
    , instances[0] || null);
  }

  private updatePoolStatus(healthyCount: number, totalCount: number): void {
    if (healthyCount === 0) {
      this.status = PoolStatus.INACTIVE;
    } else if (healthyCount < totalCount) {
      this.status = PoolStatus.DEGRADED;
    } else {
      this.status = PoolStatus.ACTIVE;
    }
  }
}

/**
 * 池实例实体
 */
export class PoolInstance implements IPoolInstance {
  private readonly id: string;
  private readonly client: ILLMClient;
  private status: InstanceStatus;
  private weight: number;
  private connectionCount: number;
  private lastUsed: Date | null;
  private successCount: number;
  private failureCount: number;
  private totalResponseTime: number;
  private acquired: boolean;
  private lastHealthCheck: Date;

  constructor(
    id: string,
    client: ILLMClient,
    weight: number = 1
  ) {
    this.id = id;
    this.client = client;
    this.status = InstanceStatus.HEALTHY;
    this.weight = weight;
    this.connectionCount = 0;
    this.lastUsed = null;
    this.successCount = 0;
    this.failureCount = 0;
    this.totalResponseTime = 0;
    this.acquired = false;
    this.lastHealthCheck = new Date();
  }

  // Getters
  public getId(): string {
    return this.id;
  }

  public getClient(): ILLMClient {
    return this.client;
  }

  public getStatus(): InstanceStatus {
    return this.status;
  }

  public getWeight(): number {
    return this.weight;
  }

  public getConnectionCount(): number {
    return this.connectionCount;
  }

  public getLastUsed(): Date | null {
    return this.lastUsed;
  }

  public getSuccessCount(): number {
    return this.successCount;
  }

  public getFailureCount(): number {
    return this.failureCount;
  }

  public getAverageResponseTime(): number {
    const totalRequests = this.successCount + this.failureCount;
    return totalRequests > 0 ? this.totalResponseTime / totalRequests : 0;
  }

  public isHealthy(): boolean {
    return this.status === InstanceStatus.HEALTHY;
  }

  public canAcquire(): boolean {
    return !this.acquired && this.status !== InstanceStatus.UNHEALTHY;
  }

  // Actions
  public acquire(): void {
    if (this.acquired) {
      throw new Error(`实例 ${this.id} 已被获取`);
    }
    
    this.acquired = true;
    this.connectionCount++;
    this.lastUsed = new Date();
  }

  public release(): void {
    if (!this.acquired) {
      throw new Error(`实例 ${this.id} 未被获取`);
    }
    
    this.acquired = false;
  }

  public markHealthy(): void {
    this.status = InstanceStatus.HEALTHY;
    this.lastHealthCheck = new Date();
  }

  public markUnhealthy(): void {
    this.status = InstanceStatus.UNHEALTHY;
    this.lastHealthCheck = new Date();
  }

  public updateResponseTime(responseTime: number): void {
    this.totalResponseTime += responseTime;
  }

  public incrementSuccess(): void {
    this.successCount++;
  }

  public incrementFailure(): void {
    this.failureCount++;
  }

  public async checkHealth(): Promise<boolean> {
    try {
      const healthStatus = await this.client.healthCheck();
      const isHealthy = healthStatus.status === 'healthy';
      
      if (isHealthy) {
        this.markHealthy();
      } else {
        this.markUnhealthy();
      }
      
      return isHealthy;
    } catch (error) {
      this.markUnhealthy();
      return false;
    }
  }

  public getStatistics(): InstanceStatistics {
    return {
      instanceId: this.id,
      status: this.status,
      successCount: this.successCount,
      failureCount: this.failureCount,
      lastUsed: this.lastUsed,
      averageResponseTime: this.getAverageResponseTime()
    };
  }
}

/**
 * 池统计信息接口
 */
export interface PoolStatistics {
  poolName: string;
  totalInstances: number;
  healthyInstances: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastHealthCheck: Date;
  instanceStatistics: InstanceStatistics[];
}

/**
 * 实例统计信息接口
 */
export interface InstanceStatistics {
  instanceId: string;
  status: InstanceStatus;
  successCount: number;
  failureCount: number;
  lastUsed: Date | null;
  averageResponseTime: number;
}