/**
 * Stateful执行器类型定义
 */

/**
 * 工具实例工厂
 */
export interface ToolInstanceFactory {
  /** 创建工具实例 */
  create(): any;
  /** 销毁工具实例 */
  destroy?(instance: any): Promise<void> | void;
}

/**
 * 实例池配置
 */
export interface InstancePoolConfig {
  /** 最大实例数 */
  maxInstances: number;
  /** 最小实例数 */
  minInstances: number;
  /** 实例空闲超时（毫秒） */
  idleTimeout: number;
  /** 实例最大生命周期（毫秒） */
  maxLifetime: number;
  /** 是否启用健康检查 */
  enableHealthCheck: boolean;
  /** 健康检查间隔（毫秒） */
  healthCheckInterval: number;
}

/**
 * 实例信息
 */
export interface InstanceInfo {
  /** 实例 */
  instance: any;
  /** 创建时间 */
  createdAt: Date;
  /** 最后使用时间 */
  lastUsedAt: Date;
  /** 使用次数 */
  useCount: number;
  /** 是否健康 */
  isHealthy: boolean;
}

/**
 * Stateful执行器配置
 */
export interface StatefulExecutorConfig {
  /** 实例池配置 */
  instancePool?: Partial<InstancePoolConfig>;
  /** 是否启用实例池 */
  enableInstancePool?: boolean;
}