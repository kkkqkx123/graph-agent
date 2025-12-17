/**
 * 任务组管理器接口
 * 
 * 定义任务组管理的核心契约，包括组的创建、模型获取和降级管理等功能
 */
export interface ILLMTaskGroupManager {
  /**
   * 获取任务组
   * @param groupName 组名称
   * @returns 任务组实例
   */
  getTaskGroup(groupName: string): Promise<TaskGroup | null>;

  /**
   * 创建任务组
   * @param groupConfig 组配置
   * @returns 创建的任务组
   */
  createTaskGroup(groupConfig: TaskGroupConfig): Promise<TaskGroup>;

  /**
   * 获取组中的模型列表
   * @param groupName 组名称
   * @param echelon 层级
   * @returns 模型列表
   */
  getModelsForGroup(groupName: string, echelon?: string): Promise<string[]>;

  /**
   * 解析组引用
   * @param reference 组引用
   * @returns 解析结果 [组名, 层级]
   */
  parseGroupReference(reference: string): [string, string] | null;

  /**
   * 获取层级配置
   * @param groupName 组名称
   * @param echelon 层级
   * @returns 层级配置
   */
  getEchelonConfig(groupName: string, echelon: string): Promise<EchelonConfig | null>;

  /**
   * 获取降级组列表
   * @param groupName 组名称
   * @returns 降级组列表
   */
  getFallbackGroups(groupName: string): Promise<string[]>;

  /**
   * 获取所有任务组
   * @returns 任务组列表
   */
  getAllTaskGroups(): Promise<TaskGroup[]>;

  /**
   * 更新任务组配置
   * @param groupName 组名称
   * @param config 新配置
   * @returns 更新后的任务组
   */
  updateTaskGroupConfig(groupName: string, config: Partial<TaskGroupConfig>): Promise<TaskGroup>;

  /**
   * 删除任务组
   * @param groupName 组名称
   * @returns 是否成功
   */
  deleteTaskGroup(groupName: string): Promise<boolean>;
}

/**
 * 任务组配置接口
 */
export interface TaskGroupConfig {
  name: string;
  description: string;
  echelons: Record<string, EchelonConfig>;
  fallbackStrategy: FallbackStrategy;
  circuitBreaker: CircuitBreakerConfig;
  fallbackConfig: FallbackConfig;
}

/**
 * 层级配置接口
 */
export interface EchelonConfig {
  models: string[];
  concurrencyLimit: number;
  rpmLimit: number;
  priority: number;
  timeout: number;
  maxRetries: number;
  temperature: number;
  maxTokens: number;
  modelType?: string;
  apiKey?: string;
  baseUrl?: string;
  functionCalling?: boolean;
}

/**
 * 降级策略接口
 */
export interface FallbackStrategy {
  type: 'echelon_down' | 'group_fallback' | 'custom';
  options?: Record<string, unknown>;
}

/**
 * 熔断器配置接口
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTime: number;
  halfOpenRequests: number;
}

/**
 * 降级配置接口
 */
export interface FallbackConfig {
  strategy: 'echelon_down' | 'group_fallback';
  fallbackGroups: string[];
  maxAttempts: number;
  retryDelay: number;
  circuitBreaker: CircuitBreakerConfig;
}

/**
 * 任务组实体接口
 */
export interface TaskGroup {
  getId(): string;
  getName(): string;
  getDescription(): string;
  getEchelons(): Map<string, Echelon>;
  getFallbackStrategy(): FallbackStrategy;
  getCircuitBreaker(): CircuitBreaker;
  getFallbackConfig(): FallbackConfig;
  
  getModelsForEchelon(echelonName: string): string[];
  getEchelon(echelonName: string): Echelon | null;
  executeWithFallback(request: any): Promise<any>;
  getStatus(): TaskGroupStatus;
  updateConfig(config: Partial<TaskGroupConfig>): TaskGroup;
}

/**
 * 层级实体接口
 */
export interface Echelon {
  getName(): string;
  getModels(): string[];
  getConcurrencyLimit(): number;
  getRpmLimit(): number;
  getPriority(): number;
  getTimeout(): number;
  getMaxRetries(): number;
  getTemperature(): number;
  getMaxTokens(): number;
  getModelType(): string;
  getApiKey(): string;
  getBaseUrl(): string;
  getFunctionCalling(): boolean;
  
  isAvailable(): boolean;
  getCurrentConcurrency(): number;
  getCurrentRpm(): number;
  incrementConcurrency(): void;
  decrementConcurrency(): void;
  canAcceptRequest(): boolean;
}

/**
 * 熔断器接口
 */
export interface CircuitBreaker {
  getState(): CircuitBreakerState;
  execute<T>(operation: () => Promise<T>): Promise<T>;
  reset(): void;
  getFailureCount(): number;
  getLastFailureTime(): Date | null;
}

/**
 * 任务组状态枚举
 */
export enum TaskGroupStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DEGRADED = 'degraded',
  MAINTENANCE = 'maintenance'
}

/**
 * 熔断器状态枚举
 */
export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}