/**
 * 函数监控应用服务
 * 负责监控函数执行状态、收集执行指标和处理执行异常
 */

import { injectable, inject } from 'inversify';
import { ILogger } from '../../../domain/common/types/logger-types';

/**
 * 工作流函数类型枚举
 */
export enum WorkflowFunctionType {
  NODE = 'node',
  CONDITION = 'condition',
  ROUTING = 'routing',
  TRIGGER = 'trigger',
  TRANSFORM = 'transform'
}

/**
 * 函数执行结果接口
 */
export interface FunctionExecutionResult {
  functionId: string;
  success: boolean;
  executionTime: number;
  resourceUsage: {
    memory: number;
    cpu: number;
    network: number;
    disk: number;
  };
}

/**
 * 函数执行指标
 */
export interface FunctionExecutionMetrics {
  functionId: string;
  functionName: string;
  functionType: WorkflowFunctionType;
  executionCount: number;
  successCount: number;
  errorCount: number;
  averageExecutionTime: number;
  minExecutionTime: number;
  maxExecutionTime: number;
  totalExecutionTime: number;
  lastExecutionTime?: Date;
  lastSuccessTime?: Date;
  lastErrorTime?: Date;
  errorRate: number;
  successRate: number;
}

/**
 * 函数资源使用指标
 */
export interface FunctionResourceMetrics {
  functionId: string;
  timestamp: Date;
  memoryUsage: number;
  cpuUsage: number;
  networkUsage: number;
  diskUsage: number;
  activeConnections: number;
  queueLength: number;
}

/**
 * 函数性能指标
 */
export interface FunctionPerformanceMetrics {
  functionId: string;
  timestamp: Date;
  throughput: number; // 每秒执行次数
  latency: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  concurrency: number;
  scalingEvents: number;
}

/**
 * 函数健康状态
 */
export interface FunctionHealthStatus {
  functionId: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  lastCheck: Date;
  uptime: number;
  responseTime: number;
  errorRate: number;
  alerts: FunctionAlert[];
}

/**
 * 函数告警
 */
export interface FunctionAlert {
  id: string;
  functionId: string;
  type: 'error_rate' | 'latency' | 'resource' | 'availability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

/**
 * 监控配置
 */
export interface MonitoringConfig {
  metricsRetentionDays: number;
  alertThresholds: {
    errorRate: number;
    latency: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  checkInterval: number; // 毫秒
  enableAutoScaling: boolean;
}

/**
 * 监控查询参数
 */
export interface MonitoringQuery {
  functionIds?: string[];
  functionTypes?: WorkflowFunctionType[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  metrics?: string[];
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
  interval?: number; // 聚合间隔（分钟）
}

/**
 * 函数监控服务
 */
@injectable()
export class FunctionMonitoringService {
  private readonly executionMetrics = new Map<string, FunctionExecutionMetrics>();
  private readonly resourceMetrics = new Map<string, FunctionResourceMetrics[]>();
  private readonly performanceMetrics = new Map<string, FunctionPerformanceMetrics[]>();
  private readonly healthStatus = new Map<string, FunctionHealthStatus>();
  private readonly alerts = new Map<string, FunctionAlert[]>();
  private readonly monitoringConfig: MonitoringConfig;

  constructor(
    @inject('Logger') private readonly logger: ILogger
  ) {
    this.monitoringConfig = {
      metricsRetentionDays: 30,
      alertThresholds: {
        errorRate: 0.05, // 5%
        latency: 5000, // 5秒
        memoryUsage: 0.8, // 80%
        cpuUsage: 0.8 // 80%
      },
      checkInterval: 60000, // 1分钟
      enableAutoScaling: true
    };

    // 启动定期健康检查
    this.startHealthCheck();
  }

  /**
   * 记录函数执行结果
   */
  async recordFunctionExecution(result: FunctionExecutionResult): Promise<void> {
    const functionId = result.functionId;
    const executionTime = result.executionTime;
    const timestamp = new Date();

    this.logger.debug('记录函数执行结果', {
      functionId,
      success: result.success,
      executionTime
    });

    // 更新执行指标
    await this.updateExecutionMetrics(functionId, result, timestamp);

    // 更新资源指标
    await this.updateResourceMetrics(functionId, result.resourceUsage, timestamp);

    // 检查告警条件
    await this.checkAlertConditions(functionId, result);

    // 更新健康状态
    await this.updateHealthStatus(functionId);
  }

  /**
   * 获取函数执行指标
   */
  async getExecutionMetrics(functionId: string): Promise<FunctionExecutionMetrics | null> {
    return this.executionMetrics.get(functionId) || null;
  }

  /**
   * 获取函数资源使用指标
   */
  async getResourceMetrics(
    functionId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<FunctionResourceMetrics[]> {
    const metrics = this.resourceMetrics.get(functionId) || [];
    
    if (!timeRange) {
      return metrics;
    }

    return metrics.filter(metric => 
      metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end
    );
  }

  /**
   * 获取函数性能指标
   */
  async getPerformanceMetrics(
    functionId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<FunctionPerformanceMetrics[]> {
    const metrics = this.performanceMetrics.get(functionId) || [];
    
    if (!timeRange) {
      return metrics;
    }

    return metrics.filter(metric => 
      metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end
    );
  }

  /**
   * 获取函数健康状态
   */
  async getHealthStatus(functionId: string): Promise<FunctionHealthStatus | null> {
    return this.healthStatus.get(functionId) || null;
  }

  /**
   * 获取所有函数的健康状态
   */
  async getAllHealthStatus(): Promise<FunctionHealthStatus[]> {
    return Array.from(this.healthStatus.values());
  }

  /**
   * 获取函数告警
   */
  async getAlerts(
    functionId?: string,
    resolved?: boolean
  ): Promise<FunctionAlert[]> {
    let alerts: FunctionAlert[] = [];

    if (functionId) {
      alerts = this.alerts.get(functionId) || [];
    } else {
      for (const functionAlerts of this.alerts.values()) {
        alerts.push(...functionAlerts);
      }
    }

    if (resolved !== undefined) {
      alerts = alerts.filter(alert => alert.resolved === resolved);
    }

    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * 创建告警
   */
  async createAlert(
    functionId: string,
    type: FunctionAlert['type'],
    severity: FunctionAlert['severity'],
    message: string
  ): Promise<FunctionAlert> {
    const alert: FunctionAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      functionId,
      type,
      severity,
      message,
      timestamp: new Date(),
      resolved: false
    };

    if (!this.alerts.has(functionId)) {
      this.alerts.set(functionId, []);
    }
    this.alerts.get(functionId)!.push(alert);

    this.logger.warn('创建函数告警', {
      alertId: alert.id,
      functionId,
      type,
      severity,
      message
    });

    return alert;
  }

  /**
   * 解决告警
   */
  async resolveAlert(alertId: string, functionId: string): Promise<boolean> {
    const alerts = this.alerts.get(functionId);
    if (!alerts) {
      return false;
    }

    const alert = alerts.find(a => a.id === alertId);
    if (!alert) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = new Date();

    this.logger.info('解决函数告警', {
      alertId,
      functionId
    });

    return true;
  }

  /**
   * 查询监控数据
   */
  async queryMonitoringData(query: MonitoringQuery): Promise<{
    executionMetrics: FunctionExecutionMetrics[];
    resourceMetrics: FunctionResourceMetrics[];
    performanceMetrics: FunctionPerformanceMetrics[];
  }> {
    let executionMetrics: FunctionExecutionMetrics[] = [];
    let resourceMetrics: FunctionResourceMetrics[] = [];
    let performanceMetrics: FunctionPerformanceMetrics[] = [];

    // 过滤函数
    const functionIds = query.functionIds || Array.from(this.executionMetrics.keys());

    for (const functionId of functionIds) {
      // 执行指标
      const execMetric = this.executionMetrics.get(functionId);
      if (execMetric && (!query.functionTypes || query.functionTypes.includes(execMetric.functionType))) {
        executionMetrics.push(execMetric);
      }

      // 资源指标
      const resMetrics = this.resourceMetrics.get(functionId) || [];
      if (query.timeRange) {
        resourceMetrics.push(...resMetrics.filter(m => 
          m.timestamp >= query.timeRange!.start && m.timestamp <= query.timeRange!.end
        ));
      } else {
        resourceMetrics.push(...resMetrics);
      }

      // 性能指标
      const perfMetrics = this.performanceMetrics.get(functionId) || [];
      if (query.timeRange) {
        performanceMetrics.push(...perfMetrics.filter(m => 
          m.timestamp >= query.timeRange!.start && m.timestamp <= query.timeRange!.end
        ));
      } else {
        performanceMetrics.push(...perfMetrics);
      }
    }

    return {
      executionMetrics,
      resourceMetrics,
      performanceMetrics
    };
  }

  /**
   * 更新执行指标
   */
  private async updateExecutionMetrics(
    functionId: string,
    result: FunctionExecutionResult,
    timestamp: Date
  ): Promise<void> {
    let metrics = this.executionMetrics.get(functionId);
    
    if (!metrics) {
      metrics = {
        functionId,
        functionName: result.functionId, // 应该从函数定义获取
        functionType: WorkflowFunctionType.NODE, // 应该从函数定义获取
        executionCount: 0,
        successCount: 0,
        errorCount: 0,
        averageExecutionTime: 0,
        minExecutionTime: Infinity,
        maxExecutionTime: 0,
        totalExecutionTime: 0,
        errorRate: 0,
        successRate: 0
      };
      this.executionMetrics.set(functionId, metrics);
    }

    // 更新统计
    metrics.executionCount++;
    metrics.totalExecutionTime += result.executionTime;
    metrics.averageExecutionTime = metrics.totalExecutionTime / metrics.executionCount;
    metrics.minExecutionTime = Math.min(metrics.minExecutionTime, result.executionTime);
    metrics.maxExecutionTime = Math.max(metrics.maxExecutionTime, result.executionTime);

    if (result.success) {
      metrics.successCount++;
      metrics.lastSuccessTime = timestamp;
    } else {
      metrics.errorCount++;
      metrics.lastErrorTime = timestamp;
    }

    metrics.lastExecutionTime = timestamp;
    metrics.errorRate = metrics.errorCount / metrics.executionCount;
    metrics.successRate = metrics.successCount / metrics.executionCount;
  }

  /**
   * 更新资源指标
   */
  private async updateResourceMetrics(
    functionId: string,
    resourceUsage: any,
    timestamp: Date
  ): Promise<void> {
    if (!this.resourceMetrics.has(functionId)) {
      this.resourceMetrics.set(functionId, []);
    }

    const metrics = this.resourceMetrics.get(functionId)!;
    metrics.push({
      functionId,
      timestamp,
      memoryUsage: resourceUsage.memory || 0,
      cpuUsage: resourceUsage.cpu || 0,
      networkUsage: resourceUsage.network || 0,
      diskUsage: resourceUsage.disk || 0,
      activeConnections: 0,
      queueLength: 0
    });

    // 保留最近的数据点
    const maxDataPoints = 1000;
    if (metrics.length > maxDataPoints) {
      metrics.splice(0, metrics.length - maxDataPoints);
    }
  }

  /**
   * 检查告警条件
   */
  private async checkAlertConditions(functionId: string, result: FunctionExecutionResult): Promise<void> {
    const metrics = this.executionMetrics.get(functionId);
    if (!metrics) {
      return;
    }

    // 检查错误率
    if (metrics.errorRate > this.monitoringConfig.alertThresholds.errorRate) {
      await this.createAlert(
        functionId,
        'error_rate',
        'high',
        `错误率过高: ${(metrics.errorRate * 100).toFixed(2)}%`
      );
    }

    // 检查延迟
    if (result.executionTime > this.monitoringConfig.alertThresholds.latency) {
      await this.createAlert(
        functionId,
        'latency',
        'medium',
        `执行延迟过高: ${result.executionTime}ms`
      );
    }

    // 检查资源使用
    if (result.resourceUsage.memory > this.monitoringConfig.alertThresholds.memoryUsage * 100) {
      await this.createAlert(
        functionId,
        'resource',
        'medium',
        `内存使用过高: ${result.resourceUsage.memory}MB`
      );
    }
  }

  /**
   * 更新健康状态
   */
  private async updateHealthStatus(functionId: string): Promise<void> {
    const metrics = this.executionMetrics.get(functionId);
    const alerts = this.alerts.get(functionId) || [];

    if (!metrics) {
      return;
    }

    let status: FunctionHealthStatus['status'] = 'healthy';
    
    // 根据指标和告警确定健康状态
    if (metrics.errorRate > 0.1) {
      status = 'critical';
    } else if (metrics.errorRate > 0.05 || metrics.averageExecutionTime > 10000) {
      status = 'warning';
    }

    const unresolvedAlerts = alerts.filter(a => !a.resolved);
    if (unresolvedAlerts.some(a => a.severity === 'critical')) {
      status = 'critical';
    } else if (unresolvedAlerts.some(a => a.severity === 'high')) {
      status = 'warning';
    }

    const healthStatus: FunctionHealthStatus = {
      functionId,
      status,
      lastCheck: new Date(),
      uptime: Date.now() - (metrics.lastExecutionTime?.getTime() || Date.now()),
      responseTime: metrics.averageExecutionTime,
      errorRate: metrics.errorRate,
      alerts: unresolvedAlerts
    };

    this.healthStatus.set(functionId, healthStatus);
  }

  /**
   * 启动健康检查
   */
  private startHealthCheck(): void {
    setInterval(async () => {
      try {
        for (const functionId of this.executionMetrics.keys()) {
          await this.updateHealthStatus(functionId);
        }
      } catch (error) {
        this.logger.error('健康检查失败', error instanceof Error ? error : new Error(String(error)));
      }
    }, this.monitoringConfig.checkInterval);
  }

  /**
   * 清理过期数据
   */
  async cleanupExpiredData(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.monitoringConfig.metricsRetentionDays);

    // 清理资源指标
    for (const [functionId, metrics] of this.resourceMetrics.entries()) {
      const filteredMetrics = metrics.filter(m => m.timestamp >= cutoffDate);
      this.resourceMetrics.set(functionId, filteredMetrics);
    }

    // 清理性能指标
    for (const [functionId, metrics] of this.performanceMetrics.entries()) {
      const filteredMetrics = metrics.filter(m => m.timestamp >= cutoffDate);
      this.performanceMetrics.set(functionId, filteredMetrics);
    }

    // 清理已解决的告警
    for (const [functionId, alerts] of this.alerts.entries()) {
      const filteredAlerts = alerts.filter(a => 
        !a.resolved || (a.resolvedAt && a.resolvedAt >= cutoffDate)
      );
      this.alerts.set(functionId, filteredAlerts);
    }

    this.logger.info('清理过期监控数据完成');
  }

  /**
   * 获取监控配置
   */
  getMonitoringConfig(): MonitoringConfig {
    return { ...this.monitoringConfig };
  }

  /**
   * 更新监控配置
   */
  updateMonitoringConfig(config: Partial<MonitoringConfig>): void {
    Object.assign(this.monitoringConfig, config);
    this.logger.info('更新监控配置', config);
  }
}