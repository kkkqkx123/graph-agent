import { injectable } from 'inversify';
import { BaseExecutor, ExecutionContext, ExecutionResult, ValidationResult, ExecutionStatus, ExecutionStatistics, HealthStatus } from './base-executor.interface';

/**
 * 基础执行器抽象类
 * 
 * 提供所有执行器的通用实现，包含错误处理和指标收集功能
 */
@injectable()
export abstract class AbstractBaseExecutor implements BaseExecutor {
  protected readonly metrics: Map<string, number> = new Map();
  protected readonly executionHistory: Array<{
    executionId: string;
    startedAt: Date;
    endedAt: Date;
    success: boolean;
    duration: number;
  }> = [];

  abstract readonly type: string;
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly description: string;

  /**
   * 检查是否支持指定的执行类型
   */
  abstract supports(executionType: string): boolean;

  /**
   * 执行核心逻辑 - 子类必须实现
   */
  protected abstract executeCore(context: ExecutionContext): Promise<unknown>;

  /**
   * 执行方法，包含错误处理和指标收集
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = new Date();
    const executionId = context.executionId;

    try {
      // 验证执行参数
      const validationResult = await this.validate(context);
      if (!validationResult.isValid) {
        throw new Error(`执行参数验证失败: ${validationResult.errors.join(', ')}`);
      }

      // 执行核心逻辑
      const result = await this.executeCore(context);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // 记录执行历史
      this.recordExecution(executionId, startTime, endTime, true, duration);

      // 收集指标
      this.collectMetrics('execution_success', 1);
      this.collectMetrics('execution_duration', duration);

      return {
        success: true,
        data: result,
        duration,
        startedAt: startTime,
        endedAt: endTime,
        metrics: this.getCurrentMetrics()
      };

    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // 记录执行历史
      this.recordExecution(executionId, startTime, endTime, false, duration);

      // 收集错误指标
      this.collectMetrics('execution_failure', 1);
      this.collectMetrics('execution_duration', duration);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration,
        startedAt: startTime,
        endedAt: endTime,
        metrics: this.getCurrentMetrics()
      };
    }
  }

  /**
   * 验证执行参数 - 子类可以重写
   */
  async validate(context: ExecutionContext): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 基础验证：检查必需字段
    if (!context.executionId) {
      errors.push('执行ID不能为空');
    }

    if (!context.executionType) {
      errors.push('执行类型不能为空');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 取消执行 - 基础实现
   */
  async cancel(executionId: string, reason?: string): Promise<boolean> {
    // 基础实现：记录取消事件
    this.collectMetrics('execution_cancelled', 1);
    console.log(`执行 ${executionId} 被取消: ${reason || '未知原因'}`);
    return true;
  }

  /**
   * 获取执行状态 - 基础实现
   */
  async getStatus(executionId: string): Promise<ExecutionStatus> {
    const execution = this.executionHistory.find(e => e.executionId === executionId);
    
    if (!execution) {
      return {
        status: 'completed',
        message: '执行记录不存在'
      };
    }

    return {
      status: 'completed',
      progress: 100,
      message: execution.success ? '执行成功' : '执行失败',
      startedAt: execution.startedAt,
      endedAt: execution.endedAt,
      duration: execution.duration
    };
  }

  /**
   * 获取执行统计信息
   */
  async getStatistics(startTime?: Date, endTime?: Date): Promise<ExecutionStatistics> {
    const executions = this.filterExecutionsByTime(startTime, endTime);
    
    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter(e => e.success).length;
    const failedExecutions = executions.filter(e => !e.success).length;
    const cancelledExecutions = 0; // 基础实现，需要子类扩展
    const timeoutExecutions = 0; // 基础实现，需要子类扩展

    const durations = executions.map(e => e.duration);
    const averageExecutionTime = durations.length > 0 
      ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length 
      : 0;

    const minExecutionTime = durations.length > 0 ? Math.min(...durations) : 0;
    const maxExecutionTime = durations.length > 0 ? Math.max(...durations) : 0;

    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;
    const failureRate = totalExecutions > 0 ? (failedExecutions / totalExecutions) * 100 : 0;
    const cancellationRate = totalExecutions > 0 ? (cancelledExecutions / totalExecutions) * 100 : 0;
    const timeoutRate = totalExecutions > 0 ? (timeoutExecutions / totalExecutions) * 100 : 0;

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      cancelledExecutions,
      timeoutExecutions,
      averageExecutionTime,
      minExecutionTime,
      maxExecutionTime,
      successRate,
      failureRate,
      cancellationRate,
      timeoutRate
    };
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<HealthStatus> {
    const startTime = new Date();
    
    try {
      // 基础健康检查：检查执行器是否可用
      const latency = new Date().getTime() - startTime.getTime();
      
      return {
        status: 'healthy',
        message: '执行器运行正常',
        latency,
        lastChecked: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `健康检查失败: ${error instanceof Error ? error.message : String(error)}`,
        lastChecked: new Date()
      };
    }
  }

  /**
   * 记录执行历史
   */
  protected recordExecution(
    executionId: string, 
    startedAt: Date, 
    endedAt: Date, 
    success: boolean, 
    duration: number
  ): void {
    this.executionHistory.push({
      executionId,
      startedAt,
      endedAt,
      success,
      duration
    });

    // 限制历史记录数量，避免内存泄漏
    if (this.executionHistory.length > 1000) {
      this.executionHistory.shift();
    }
  }

  /**
   * 收集指标
   */
  protected collectMetrics(key: string, value: number): void {
    const currentValue = this.metrics.get(key) || 0;
    this.metrics.set(key, currentValue + value);
  }

  /**
   * 获取当前指标
   */
  protected getCurrentMetrics(): Record<string, number> {
    const metrics: Record<string, number> = {};
    this.metrics.forEach((value, key) => {
      metrics[key] = value;
    });
    return metrics;
  }

  /**
   * 按时间过滤执行记录
   */
  private filterExecutionsByTime(startTime?: Date, endTime?: Date) {
    return this.executionHistory.filter(execution => {
      if (startTime && execution.startedAt < startTime) {
        return false;
      }
      if (endTime && execution.endedAt > endTime) {
        return false;
      }
      return true;
    });
  }

  /**
   * 重置指标
   */
  protected resetMetrics(): void {
    this.metrics.clear();
  }

  /**
   * 清理执行历史
   */
  protected clearExecutionHistory(): void {
    this.executionHistory.length = 0;
  }
}