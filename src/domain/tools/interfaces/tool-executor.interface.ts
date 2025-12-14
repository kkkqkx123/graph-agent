import { ID } from '../../common/value-objects/id';
import { Tool } from '../entities/tool';
import { ToolExecution } from '../entities/tool-execution';
import { ToolResult } from '../entities/tool-result';

/**
 * 工具执行器接口
 * 
 * 定义工具执行的契约
 */
export interface IToolExecutor {
  /**
   * 执行工具
   * 
   * @param tool 工具
   * @param execution 执行上下文
   * @returns 执行结果
   */
  execute(tool: Tool, execution: ToolExecution): Promise<ToolResult>;

  /**
   * 验证工具配置
   * 
   * @param tool 工具
   * @returns 验证结果
   */
  validateTool(tool: Tool): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;

  /**
   * 验证执行参数
   * 
   * @param tool 工具
   * @param parameters 执行参数
   * @returns 验证结果
   */
  validateParameters(tool: Tool, parameters: Record<string, unknown>): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;

  /**
   * 预处理执行参数
   * 
   * @param tool 工具
   * @param parameters 原始参数
   * @returns 处理后的参数
   */
  preprocessParameters(tool: Tool, parameters: Record<string, unknown>): Promise<Record<string, unknown>>;

  /**
   * 后处理执行结果
   * 
   * @param tool 工具
   * @param result 原始结果
   * @returns 处理后的结果
   */
  postprocessResult(tool: Tool, result: unknown): Promise<unknown>;

  /**
   * 获取执行器类型
   * 
   * @returns 执行器类型
   */
  getType(): string;

  /**
   * 获取执行器名称
   * 
   * @returns 执行器名称
   */
  getName(): string;

  /**
   * 获取执行器版本
   * 
   * @returns 执行器版本
   */
  getVersion(): string;

  /**
   * 获取执行器描述
   * 
   * @returns 执行器描述
   */
  getDescription(): string;

  /**
   * 获取支持的工具类型
   * 
   * @returns 支持的工具类型列表
   */
  getSupportedToolTypes(): string[];

  /**
   * 检查是否支持指定工具
   * 
   * @param tool 工具
   * @returns 是否支持
   */
  supportsTool(tool: Tool): boolean;

  /**
   * 获取执行器配置模式
   * 
   * @returns 配置模式
   */
  getConfigSchema(): {
    type: string;
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
      items?: any;
      properties?: Record<string, any>;
      required?: string[];
      default?: any;
    }>;
    required: string[];
  };

  /**
   * 获取执行器能力
   * 
   * @returns 能力列表
   */
  getCapabilities(): {
    streaming: boolean;
    async: boolean;
    batch: boolean;
    retry: boolean;
    timeout: boolean;
    cancellation: boolean;
    progress: boolean;
    metrics: boolean;
  };

  /**
   * 获取执行器状态
   * 
   * @returns 执行器状态
   */
  getStatus(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    message?: string;
    details?: Record<string, unknown>;
    lastChecked: Date;
  }>;

  /**
   * 健康检查
   * 
   * @returns 健康状态
   */
  healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    message?: string;
    latency?: number;
    lastChecked: Date;
  }>;

  /**
   * 初始化执行器
   * 
   * @param config 配置
   * @returns 是否成功
   */
  initialize(config: Record<string, unknown>): Promise<boolean>;

  /**
   * 配置执行器
   * 
   * @param config 配置
   * @returns 是否成功
   */
  configure(config: Record<string, unknown>): Promise<boolean>;

  /**
   * 获取配置
   * 
   * @returns 配置
   */
  getConfiguration(): Promise<Record<string, unknown>>;

  /**
   * 重置配置
   * 
   * @returns 是否成功
   */
  resetConfiguration(): Promise<boolean>;

  /**
   * 启动执行器
   * 
   * @returns 是否成功
   */
  start(): Promise<boolean>;

  /**
   * 停止执行器
   * 
   * @returns 是否成功
   */
  stop(): Promise<boolean>;

  /**
   * 重启执行器
   * 
   * @returns 是否成功
   */
  restart(): Promise<boolean>;

  /**
   * 检查执行器是否正在运行
   * 
   * @returns 是否正在运行
   */
  isRunning(): Promise<boolean>;

  /**
   * 获取执行统计
   * 
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 执行统计
   */
  getExecutionStatistics(startTime?: Date, endTime?: Date): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    cancelledExecutions: number;
    timeoutExecutions: number;
    averageExecutionTime: number;
    minExecutionTime: number;
    maxExecutionTime: number;
    successRate: number;
    failureRate: number;
    cancellationRate: number;
    timeoutRate: number;
  }>;

  /**
   * 获取性能统计
   * 
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 性能统计
   */
  getPerformanceStatistics(startTime?: Date, endTime?: Date): Promise<{
    averageLatency: number;
    medianLatency: number;
    p95Latency: number;
    p99Latency: number;
    maxLatency: number;
    minLatency: number;
    throughput: number;
    errorRate: number;
    memoryUsage: number;
    cpuUsage: number;
  }>;

  /**
   * 获取错误统计
   * 
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 错误统计
   */
  getErrorStatistics(startTime?: Date, endTime?: Date): Promise<{
    totalErrors: number;
    byType: Record<string, number>;
    byTool: Record<string, number>;
    averageRetryCount: number;
    maxRetryCount: number;
    mostCommonErrors: Array<{
      error: string;
      count: number;
      percentage: number;
    }>;
  }>;

  /**
   * 获取资源使用统计
   * 
   * @returns 资源使用统计
   */
  getResourceUsage(): Promise<{
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
    networkUsage: number;
    activeConnections: number;
    maxConnections: number;
  }>;

  /**
   * 获取并发执行统计
   * 
   * @returns 并发执行统计
   */
  getConcurrencyStatistics(): Promise<{
    currentExecutions: number;
    maxConcurrentExecutions: number;
    averageConcurrentExecutions: number;
    queuedExecutions: number;
    maxQueueSize: number;
    averageQueueSize: number;
  }>;

  /**
   * 取消执行
   * 
   * @param executionId 执行ID
   * @param reason 取消原因
   * @returns 是否成功
   */
  cancelExecution(executionId: ID, reason?: string): Promise<boolean>;

  /**
   * 获取执行状态
   * 
   * @param executionId 执行ID
   * @returns 执行状态
   */
  getExecutionStatus(executionId: ID): Promise<{
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
    progress?: number;
    message?: string;
    startedAt?: Date;
    endedAt?: Date;
    duration?: number;
  }>;

  /**
   * 获取执行日志
   * 
   * @param executionId 执行ID
   * @param level 日志级别
   * @param limit 数量限制
   * @returns 日志列表
   */
  getExecutionLogs(
    executionId: ID,
    level?: 'debug' | 'info' | 'warn' | 'error',
    limit?: number
  ): Promise<Array<{
    timestamp: Date;
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    data?: unknown;
  }>>;

  /**
   * 流式执行工具
   * 
   * @param tool 工具
   * @param execution 执行上下文
   * @returns 结果流
   */
  executeStream(tool: Tool, execution: ToolExecution): Promise<AsyncIterable<{
    type: 'data' | 'progress' | 'log' | 'error' | 'complete';
    data?: unknown;
    progress?: number;
    log?: {
      level: 'debug' | 'info' | 'warn' | 'error';
      message: string;
      data?: unknown;
    };
    error?: string;
  }>>;

  /**
   * 批量执行工具
   * 
   * @param tools 工具列表
   * @param executions 执行上下文列表
   * @returns 结果列表
   */
  executeBatch(tools: Tool[], executions: ToolExecution[]): Promise<ToolResult[]>;

  /**
   * 清理资源
   * 
   * @returns 是否成功
   */
  cleanup(): Promise<boolean>;

  /**
   * 重置执行器
   * 
   * @returns 是否成功
   */
  reset(): Promise<boolean>;

  /**
   * 关闭执行器
   * 
   * @returns 是否成功
   */
  close(): Promise<boolean>;
}