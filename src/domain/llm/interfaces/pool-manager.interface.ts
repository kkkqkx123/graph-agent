import { ILLMClient } from './llm-client.interface';

/**
 * 轮询池管理器接口
 * 
 * 定义轮询池管理的核心契约，包括池的创建、实例获取和健康检查等功能
 */
export interface ILLMPoolManager {
  /**
   * 获取轮询池
   * @param poolName 池名称
   * @returns 轮询池实例
   */
  getPool(poolName: string): Promise<Pool | null>;

  /**
   * 创建轮询池
   * @param poolConfig 池配置
   * @returns 创建的轮询池
   */
  createPool(poolConfig: PoolConfig): Promise<Pool>;

  /**
   * 获取池实例
   * @param poolName 池名称
   * @returns 池实例
   */
  getPoolInstance(poolName: string): Promise<PoolInstance | null>;

  /**
   * 释放池实例
   * @param poolName 池名称
   * @param instance 池实例
   */
  releasePoolInstance(poolName: string, instance: PoolInstance): Promise<void>;

  /**
   * 执行健康检查
   * @param poolName 池名称
   * @returns 健康状态
   */
  healthCheck(poolName: string): Promise<PoolHealthStatus>;

  /**
   * 获取所有轮询池
   * @returns 轮询池列表
   */
  getAllPools(): Promise<Pool[]>;

  /**
   * 更新轮询池配置
   * @param poolName 池名称
   * @param config 新配置
   * @returns 更新后的池
   */
  updatePoolConfig(poolName: string, config: Partial<PoolConfig>): Promise<Pool>;

  /**
   * 删除轮询池
   * @param poolName 池名称
   * @returns 是否成功
   */
  deletePool(poolName: string): Promise<boolean>;
}

/**
 * 轮询池配置接口
 */
export interface PoolConfig {
  name: string;
  description: string;
  taskGroups: string[];
  rotationStrategy: RotationStrategy;
  healthCheckInterval: number;
  failureThreshold: number;
  recoveryTime: number;
  fallbackConfig: FallbackConfig;
  rateLimiting?: RateLimitingConfig;
}

/**
 * 降级配置接口
 */
export interface FallbackConfig {
  strategy: 'instance_rotation' | 'pool_fallback';
  maxInstanceAttempts: number;
  fallbackPools?: string[];
}

/**
 * 速率限制配置接口
 */
export interface RateLimitingConfig {
  enabled: boolean;
  algorithm: 'token_bucket' | 'fixed_window';
  tokenBucket?: {
    bucketSize: number;
    refillRate: number;
  };
  fixedWindow?: {
    windowSize: number;
    maxRequests: number;
  };
}

/**
 * 轮询策略接口
 */
export interface RotationStrategy {
  type: 'round_robin' | 'weighted_random' | 'least_connections' | 'fastest_response';
  options?: Record<string, unknown>;
}

/**
 * 池健康状态接口
 */
export interface PoolHealthStatus {
  healthy: boolean;
  healthyInstances: number;
  totalInstances: number;
  healthRatio: number;
  lastChecked: Date;
  errors?: string[];
}

/**
 * 轮询池实体接口
 */
export interface Pool {
  getId(): string;
  getName(): string;
  getDescription(): string;
  getTaskGroups(): string[];
  getRotationStrategy(): RotationStrategy;
  getHealthCheckInterval(): number;
  getFailureThreshold(): number;
  getRecoveryTime(): number;
  getFallbackConfig(): FallbackConfig;
  getRateLimiting(): RateLimitingConfig | undefined;
  
  getInstance(): Promise<PoolInstance | null>;
  releaseInstance(instance: PoolInstance): void;
  healthCheck(): Promise<PoolHealthStatus>;
  getStatus(): PoolStatus;
  updateConfig(config: Partial<PoolConfig>): Pool;
}

/**
 * 池实例接口
 */
export interface PoolInstance {
  getId(): string;
  getClient(): ILLMClient;
  getStatus(): InstanceStatus;
  isHealthy(): boolean;
  getWeight(): number;
  getConnectionCount(): number;
  getLastUsed(): Date | null;
  getSuccessCount(): number;
  getFailureCount(): number;
  getAverageResponseTime(): number;
  
  acquire(): void;
  release(): void;
  markHealthy(): void;
  markUnhealthy(): void;
  updateResponseTime(responseTime: number): void;
  incrementSuccess(): void;
  incrementFailure(): void;
}

/**
 * 池状态枚举
 */
export enum PoolStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DEGRADED = 'degraded',
  MAINTENANCE = 'maintenance'
}

/**
 * 实例状态枚举
 */
export enum InstanceStatus {
  HEALTHY = 'healthy',
  UNHEALTHY = 'unhealthy',
  DEGRADED = 'degraded',
  DRAINING = 'draining'
}