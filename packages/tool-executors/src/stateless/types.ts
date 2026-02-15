/**
 * Stateless执行器类型定义
 */

/**
 * 函数注册表项
 */
export interface FunctionRegistryItem {
  /** 函数 */
  execute: (parameters: any) => Promise<any>;
  /** 版本 */
  version?: string;
  /** 描述 */
  description?: string;
  /** 注册时间 */
  registeredAt: Date;
  /** 调用次数 */
  callCount: number;
  /** 最后调用时间 */
  lastCalledAt?: Date;
}

/**
 * 函数注册表配置
 */
export interface FunctionRegistryConfig {
  /** 是否启用版本控制 */
  enableVersionControl: boolean;
  /** 是否记录调用统计 */
  enableCallStatistics: boolean;
  /** 最大注册函数数 */
  maxFunctions: number;
}
