/**
 * 统一的执行选项类型
 * 所有Core API的执行方法都接受此类型的选项
 */

/**
 * 执行选项
 */
export interface ExecutionOptions {
  /** 超时时间（毫秒），默认30000ms */
  timeout?: number;
  /** 重试次数，默认0 */
  retries?: number;
  /** 重试延迟（毫秒），默认1000ms */
  retryDelay?: number;
  /** 是否启用缓存，默认false */
  cache?: boolean;
  /** 是否启用日志，默认true */
  logging?: boolean;
  /** 是否启用验证，默认true */
  validation?: boolean;
}

/**
 * 默认执行选项
 */
export const DEFAULT_EXECUTION_OPTIONS: Required<ExecutionOptions> = {
  timeout: 30000,
  retries: 0,
  retryDelay: 1000,
  cache: false,
  logging: true,
  validation: true
};

/**
 * 合并执行选项
 */
export function mergeExecutionOptions(
  options?: ExecutionOptions,
  defaults: Required<ExecutionOptions> = DEFAULT_EXECUTION_OPTIONS
): Required<ExecutionOptions> {
  return {
    timeout: options?.timeout ?? defaults.timeout,
    retries: options?.retries ?? defaults.retries,
    retryDelay: options?.retryDelay ?? defaults.retryDelay,
    cache: options?.cache ?? defaults.cache,
    logging: options?.logging ?? defaults.logging,
    validation: options?.validation ?? defaults.validation
  };
}