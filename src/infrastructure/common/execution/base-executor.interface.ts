/**
 * 通用执行器基类接口
 * 
 * 定义所有执行器的通用契约，只包含核心接口、错误处理和指标收集功能
 */

export interface BaseExecutor {
  /**
   * 执行器类型标识
   */
  readonly type: string;

  /**
   * 执行器名称
   */
  readonly name: string;

  /**
   * 执行器版本
   */
  readonly version: string;

  /**
   * 执行器描述
   */
  readonly description: string;

  /**
   * 检查是否支持指定的执行类型
   * 
   * @param executionType 执行类型
   * @returns 是否支持
   */
  supports(executionType: string): boolean;

  /**
   * 执行核心逻辑
   * 
   * @param context 执行上下文
   * @returns 执行结果
   */
  execute(context: ExecutionContext): Promise<ExecutionResult>;

  /**
   * 验证执行参数
   * 
   * @param context 执行上下文
   * @returns 验证结果
   */
  validate(context: ExecutionContext): Promise<ValidationResult>;

  /**
   * 取消执行
   * 
   * @param executionId 执行ID
   * @param reason 取消原因
   * @returns 是否成功
   */
  cancel(executionId: string, reason?: string): Promise<boolean>;

  /**
   * 获取执行状态
   * 
   * @param executionId 执行ID
   * @returns 执行状态
   */
  getStatus(executionId: string): Promise<ExecutionStatus>;

  /**
   * 获取执行统计信息
   * 
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 统计信息
   */
  getStatistics(startTime?: Date, endTime?: Date): Promise<ExecutionStatistics>;

  /**
   * 健康检查
   * 
   * @returns 健康状态
   */
  healthCheck(): Promise<HealthStatus>;
}

/**
 * 执行上下文接口
 */
export interface ExecutionContext {
  /**
   * 执行ID
   */
  readonly executionId: string;

  /**
   * 执行类型
   */
  readonly executionType: string;

  /**
   * 执行参数
   */
  readonly parameters: Record<string, unknown>;

  /**
   * 执行配置
   */
  readonly configuration: Record<string, unknown>;

  /**
   * 执行开始时间
   */
  readonly startedAt: Date;

  /**
   * 获取变量值
   * 
   * @param key 变量键
   * @returns 变量值
   */
  getVariable(key: string): unknown;

  /**
   * 设置变量值
   * 
   * @param key 变量键
   * @param value 变量值
   */
  setVariable(key: string, value: unknown): void;

  /**
   * 获取所有变量
   * 
   * @returns 变量映射
   */
  getVariables(): Record<string, unknown>;
}

/**
 * 执行结果接口
 */
export interface ExecutionResult {
  /**
   * 执行是否成功
   */
  readonly success: boolean;

  /**
   * 执行结果数据
   */
  readonly data?: unknown;

  /**
   * 执行错误信息
   */
  readonly error?: string;

  /**
   * 执行耗时（毫秒）
   */
  readonly duration: number;

  /**
   * 执行开始时间
   */
  readonly startedAt: Date;

  /**
   * 执行结束时间
   */
  readonly endedAt: Date;

  /**
   * 执行指标
   */
  readonly metrics: Record<string, number>;
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  /**
   * 验证是否通过
   */
  readonly isValid: boolean;

  /**
   * 验证错误信息
   */
  readonly errors: string[];

  /**
   * 验证警告信息
   */
  readonly warnings: string[];
}

/**
 * 执行状态接口
 */
export interface ExecutionStatus {
  /**
   * 执行状态
   */
  readonly status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';

  /**
   * 执行进度（0-100）
   */
  readonly progress?: number;

  /**
   * 状态消息
   */
  readonly message?: string;

  /**
   * 执行开始时间
   */
  readonly startedAt?: Date;

  /**
   * 执行结束时间
   */
  readonly endedAt?: Date;

  /**
   * 执行耗时（毫秒）
   */
  readonly duration?: number;
}

/**
 * 执行统计信息接口
 */
export interface ExecutionStatistics {
  /**
   * 总执行次数
   */
  readonly totalExecutions: number;

  /**
   * 成功执行次数
   */
  readonly successfulExecutions: number;

  /**
   * 失败执行次数
   */
  readonly failedExecutions: number;

  /**
   * 取消执行次数
   */
  readonly cancelledExecutions: number;

  /**
   * 超时执行次数
   */
  readonly timeoutExecutions: number;

  /**
   * 平均执行时间（毫秒）
   */
  readonly averageExecutionTime: number;

  /**
   * 最小执行时间（毫秒）
   */
  readonly minExecutionTime: number;

  /**
   * 最大执行时间（毫秒）
   */
  readonly maxExecutionTime: number;

  /**
   * 成功率
   */
  readonly successRate: number;

  /**
   * 失败率
   */
  readonly failureRate: number;

  /**
   * 取消率
   */
  readonly cancellationRate: number;

  /**
   * 超时率
   */
  readonly timeoutRate: number;
}

/**
 * 健康状态接口
 */
export interface HealthStatus {
  /**
   * 健康状态
   */
  readonly status: 'healthy' | 'unhealthy' | 'degraded';

  /**
   * 状态消息
   */
  readonly message?: string;

  /**
   * 延迟时间（毫秒）
   */
  readonly latency?: number;

  /**
   * 最后检查时间
   */
  readonly lastChecked: Date;

  /**
   * 详细状态信息
   */
  readonly details?: Record<string, unknown>;
}