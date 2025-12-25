/**
 * 工具执行器基类
 * 
 * 提供工具执行器的通用功能和接口定义
 */

import { injectable } from 'inversify';
import { Tool } from '../../../domain/tools/entities/tool';
import { ToolExecution } from '../../../domain/tools/entities/tool-execution';
import { ToolResult } from '../../../domain/tools/entities/tool-result';

/**
 * 工具执行器配置模式
 */
export interface ToolExecutorConfigSchema {
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
}

/**
 * 工具执行器能力
 */
export interface ToolExecutorCapabilities {
  streaming: boolean;
  async: boolean;
  batch: boolean;
  retry: boolean;
  timeout: boolean;
  cancellation: boolean;
  progress: boolean;
  metrics: boolean;
}

/**
 * 工具执行器状态
 */
export interface ToolExecutorStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  details?: Record<string, unknown>;
  lastChecked: Date;
}

/**
 * 工具执行器健康检查
 */
export interface ToolExecutorHealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  latency?: number;
  lastChecked: Date;
}

/**
 * 工具执行器执行统计
 */
export interface ToolExecutorExecutionStatistics {
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
}

/**
 * 工具执行器性能统计
 */
export interface ToolExecutorPerformanceStatistics {
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
}

/**
 * 工具执行器错误统计
 */
export interface ToolExecutorErrorStatistics {
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
}

/**
 * 工具执行器资源使用
 */
export interface ToolExecutorResourceUsage {
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
  networkUsage: number;
  activeConnections: number;
  maxConnections: number;
}

/**
 * 工具执行器并发统计
 */
export interface ToolExecutorConcurrencyStatistics {
  currentExecutions: number;
  maxConcurrentExecutions: number;
  averageConcurrentExecutions: number;
  queuedExecutions: number;
  maxQueueSize: number;
  averageQueueSize: number;
}

/**
 * 工具执行器执行状态
 */
export interface ToolExecutorExecutionStatus {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  progress?: number;
  message?: string;
  startedAt?: Date;
  endedAt?: Date;
  duration?: number;
}

/**
 * 工具执行器执行日志
 */
export interface ToolExecutorExecutionLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: unknown;
}

/**
 * 工具执行器流式结果
 */
export interface ToolExecutorStreamResult {
  type: 'data' | 'progress' | 'log' | 'error' | 'complete';
  data?: unknown;
  progress?: number;
  log?: {
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    data?: unknown;
  };
  error?: string;
}

/**
 * 工具执行器基类
 */
@injectable()
export abstract class ToolExecutorBase {
  protected isInitialized = false;
  protected isRunningFlag = false;
  protected config: Record<string, unknown> = {};
  protected executionStats = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    cancelledExecutions: 0,
    timeoutExecutions: 0,
    totalExecutionTime: 0
  };

  /**
   * 执行工具
   */
  abstract execute(tool: Tool, execution: ToolExecution): Promise<ToolResult>;

  /**
   * 验证工具配置
   */
  abstract validateTool(tool: Tool): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;

  /**
   * 验证执行参数
   */
  abstract validateParameters(tool: Tool, parameters: Record<string, unknown>): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;

  /**
   * 预处理执行参数
   */
  async preprocessParameters(tool: Tool, parameters: Record<string, unknown>): Promise<Record<string, unknown>> {
    return parameters;
  }

  /**
   * 后处理执行结果
   */
  async postprocessResult(tool: Tool, result: unknown): Promise<unknown> {
    return result;
  }

  /**
   * 获取执行器类型
   */
  abstract getType(): string;

  /**
   * 获取执行器名称
   */
  abstract getName(): string;

  /**
   * 获取执行器版本
   */
  abstract getVersion(): string;

  /**
   * 获取执行器描述
   */
  abstract getDescription(): string;

  /**
   * 获取支持的工具类型
   */
  abstract getSupportedToolTypes(): string[];

  /**
   * 检查是否支持指定工具
   */
  supportsTool(tool: Tool): boolean {
    return this.getSupportedToolTypes().includes(tool.type.toString());
  }

  /**
   * 获取配置模式
   */
  abstract getConfigSchema(): ToolExecutorConfigSchema;

  /**
   * 获取执行器能力
   */
  abstract getCapabilities(): ToolExecutorCapabilities;

  /**
   * 获取执行器状态
   */
  async getStatus(): Promise<ToolExecutorStatus> {
    const healthCheck = await this.healthCheck();
    return {
      status: healthCheck.status,
      message: healthCheck.message,
      lastChecked: healthCheck.lastChecked
    };
  }

  /**
   * 健康检查
   */
  abstract healthCheck(): Promise<ToolExecutorHealthCheck>;

  /**
   * 初始化执行器
   */
  async initialize(config: Record<string, unknown>): Promise<boolean> {
    try {
      this.config = config;
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error(`初始化${this.getName()}失败:`, error);
      return false;
    }
  }

  /**
   * 配置执行器
   */
  async configure(config: Record<string, unknown>): Promise<boolean> {
    try {
      this.config = { ...this.config, ...config };
      return true;
    } catch (error) {
      console.error(`配置${this.getName()}失败:`, error);
      return false;
    }
  }

  /**
   * 获取配置
   */
  async getConfiguration(): Promise<Record<string, unknown>> {
    return { ...this.config };
  }

  /**
   * 重置配置
   */
  async resetConfiguration(): Promise<boolean> {
    this.config = {};
    return true;
  }

  /**
   * 启动执行器
   */
  async start(): Promise<boolean> {
    this.isRunningFlag = true;
    return true;
  }

  /**
   * 停止执行器
   */
  async stop(): Promise<boolean> {
    this.isRunningFlag = false;
    return true;
  }

  /**
   * 重启执行器
   */
  async restart(): Promise<boolean> {
    await this.stop();
    await this.start();
    return true;
  }

  /**
   * 检查执行器是否正在运行
   */
  async isRunning(): Promise<boolean> {
    return this.isRunningFlag;
  }

  /**
   * 获取执行统计
   */
  async getExecutionStatistics(startTime?: Date, endTime?: Date): Promise<ToolExecutorExecutionStatistics> {
    const total = this.executionStats.totalExecutions;
    const successRate = total > 0 ? (this.executionStats.successfulExecutions / total) * 100 : 0;
    const failureRate = total > 0 ? (this.executionStats.failedExecutions / total) * 100 : 0;
    const cancellationRate = total > 0 ? (this.executionStats.cancelledExecutions / total) * 100 : 0;
    const timeoutRate = total > 0 ? (this.executionStats.timeoutExecutions / total) * 100 : 0;
    const averageExecutionTime = total > 0 ? this.executionStats.totalExecutionTime / total : 0;

    return {
      totalExecutions: this.executionStats.totalExecutions,
      successfulExecutions: this.executionStats.successfulExecutions,
      failedExecutions: this.executionStats.failedExecutions,
      cancelledExecutions: this.executionStats.cancelledExecutions,
      timeoutExecutions: this.executionStats.timeoutExecutions,
      averageExecutionTime,
      minExecutionTime: 0,
      maxExecutionTime: 0,
      successRate,
      failureRate,
      cancellationRate,
      timeoutRate
    };
  }

  /**
   * 获取性能统计
   */
  async getPerformanceStatistics(startTime?: Date, endTime?: Date): Promise<ToolExecutorPerformanceStatistics> {
    const stats = await this.getExecutionStatistics();
    return {
      averageLatency: stats.averageExecutionTime,
      medianLatency: stats.averageExecutionTime,
      p95Latency: stats.averageExecutionTime,
      p99Latency: stats.averageExecutionTime,
      maxLatency: stats.maxExecutionTime,
      minLatency: stats.minExecutionTime,
      throughput: stats.totalExecutions,
      errorRate: stats.failureRate,
      memoryUsage: 0,
      cpuUsage: 0
    };
  }

  /**
   * 获取错误统计
   */
  async getErrorStatistics(startTime?: Date, endTime?: Date): Promise<ToolExecutorErrorStatistics> {
    return {
      totalErrors: this.executionStats.failedExecutions,
      byType: {},
      byTool: {},
      averageRetryCount: 0,
      maxRetryCount: 0,
      mostCommonErrors: []
    };
  }

  /**
   * 获取资源使用统计
   */
  async getResourceUsage(): Promise<ToolExecutorResourceUsage> {
    return {
      memoryUsage: 0,
      cpuUsage: 0,
      diskUsage: 0,
      networkUsage: 0,
      activeConnections: 0,
      maxConnections: 0
    };
  }

  /**
   * 获取并发统计
   */
  async getConcurrencyStatistics(): Promise<ToolExecutorConcurrencyStatistics> {
    return {
      currentExecutions: 0,
      maxConcurrentExecutions: 0,
      averageConcurrentExecutions: 0,
      queuedExecutions: 0,
      maxQueueSize: 0,
      averageQueueSize: 0
    };
  }

  /**
   * 取消执行
   */
  async cancelExecution(executionId: any, reason?: string): Promise<boolean> {
    // 默认实现，子类可以重写
    return false;
  }

  /**
   * 获取执行状态
   */
  async getExecutionStatus(executionId: any): Promise<ToolExecutorExecutionStatus> {
    // 默认实现，子类可以重写
    return {
      status: 'completed'
    };
  }

  /**
   * 获取执行日志
   */
  async getExecutionLogs(
    executionId: any,
    level?: 'debug' | 'info' | 'warn' | 'error',
    limit?: number
  ): Promise<ToolExecutorExecutionLog[]> {
    // 默认实现，子类可以重写
    return [];
  }

  /**
   * 流式执行工具
   */
  async executeStream(tool: Tool, execution: ToolExecution): Promise<AsyncIterable<ToolExecutorStreamResult>> {
    // 默认实现，子类可以重写
    const self = this;
    async function* streamGenerator() {
      const result = await self.execute(tool, execution);
      yield {
        type: 'complete',
        data: result
      };
    }
    return streamGenerator();
  }

  /**
   * 批量执行工具
   */
  async executeBatch(tools: Tool[], executions: ToolExecution[]): Promise<ToolResult[]> {
    const results: ToolResult[] = [];
    for (let i = 0; i < tools.length; i++) {
      const tool = tools[i];
      const execution = executions[i];
      if (tool && execution) {
        results.push(await this.execute(tool, execution));
      }
    }
    return results;
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<boolean> {
    this.executionStats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      cancelledExecutions: 0,
      timeoutExecutions: 0,
      totalExecutionTime: 0
    };
    return true;
  }

  /**
   * 重置执行器
   */
  async reset(): Promise<boolean> {
    await this.cleanup();
    return true;
  }

  /**
   * 关闭执行器
   */
  async close(): Promise<boolean> {
    await this.stop();
    await this.cleanup();
    return true;
  }

  /**
   * 更新执行统计
   */
  protected updateExecutionStats(success: boolean, executionTime: number): void {
    this.executionStats.totalExecutions++;
    this.executionStats.totalExecutionTime += executionTime;
    
    if (success) {
      this.executionStats.successfulExecutions++;
    } else {
      this.executionStats.failedExecutions++;
    }
  }
}