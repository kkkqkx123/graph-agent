/**
 * 监控服务
 *
 * 负责监控数据收集、指标计算和告警判断，包括：
 * - 执行指标收集
 * - 资源使用监控
 * - 性能指标计算
 * - 健康状态检查
 * - 告警管理
 *
 * 属于基础设施层，提供技术性的监控支持
 */

import { injectable, inject } from 'inversify';
import { Timestamp } from '../../domain/common/value-objects/timestamp';
import { ILogger } from '../../domain/common/types/logger-types';

/**
 * 函数执行结果接口
 */
export interface FunctionExecutionResult {
  /** 函数ID */
  functionId: string;
  /** 是否成功 */
  success: boolean;
  /** 执行耗时（毫秒） */
  executionTime: number;
  /** 资源使用情况 */
  resourceUsage: {
    /** 内存使用（MB） */
    memory: number;
    /** CPU使用率（0-1） */
    cpu: number;
    /** 网络使用（KB） */
    network: number;
    /** 磁盘使用（KB） */
    disk: number;
  };
}

/**
 * 函数执行指标
 */
export interface FunctionExecutionMetrics {
  /** 函数ID */
  functionId: string;
  /** 函数名称 */
  functionName: string;
  /** 函数类型 */
  functionType: string;
  /** 执行次数 */
  executionCount: number;
  /** 成功次数 */
  successCount: number;
  /** 失败次数 */
  errorCount: number;
  /** 平均执行时间（毫秒） */
  averageExecutionTime: number;
  /** 最小执行时间（毫秒） */
  minExecutionTime: number;
  /** 最大执行时间（毫秒） */
  maxExecutionTime: number;
  /** 总执行时间（毫秒） */
  totalExecutionTime: number;
  /** 最后执行时间 */
  lastExecutionTime?: Timestamp;
  /** 最后成功时间 */
  lastSuccessTime?: Timestamp;
  /** 最后失败时间 */
  lastErrorTime?: Timestamp;
  /** 错误率（0-1） */
  errorRate: number;
  /** 成功率（0-1） */
  successRate: number;
}

/**
 * 函数资源使用指标
 */
export interface FunctionResourceMetrics {
  /** 函数ID */
  functionId: string;
  /** 时间戳 */
  timestamp: Timestamp;
  /** 内存使用（MB） */
  memoryUsage: number;
  /** CPU使用率（0-1） */
  cpuUsage: number;
  /** 网络使用（KB） */
  networkUsage: number;
  /** 磁盘使用（KB） */
  diskUsage: number;
  /** 活跃连接数 */
  activeConnections: number;
  /** 队列长度 */
  queueLength: number;
}

/**
 * 函数性能指标
 */
export interface FunctionPerformanceMetrics {
  /** 函数ID */
  functionId: string;
  /** 时间戳 */
  timestamp: Timestamp;
  /** 吞吐量（每秒执行次数） */
  throughput: number;
  /** 延迟分布 */
  latency: {
    /** P50延迟（毫秒） */
    p50: number;
    /** P90延迟（毫秒） */
    p90: number;
    /** P95延迟（毫秒） */
    p95: number;
    /** P99延迟（毫秒） */
    p99: number;
  };
  /** 并发数 */
  concurrency: number;
  /** 扩缩容事件数 */
  scalingEvents: number;
}

/**
 * 函数健康状态
 */
export interface FunctionHealthStatus {
  /** 函数ID */
  functionId: string;
  /** 状态 */
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  /** 最后检查时间 */
  lastCheck: Timestamp;
  /** 运行时间（毫秒） */
  uptime: number;
  /** 响应时间（毫秒） */
  responseTime: number;
  /** 错误率（0-1） */
  errorRate: number;
  /** 告警列表 */
  alerts: FunctionAlert[];
}

/**
 * 函数告警
 */
export interface FunctionAlert {
  /** 告警ID */
  id: string;
  /** 函数ID */
  functionId: string;
  /** 告警类型 */
  type: 'error_rate' | 'latency' | 'resource' | 'availability';
  /** 严重程度 */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** 告警消息 */
  message: string;
  /** 告警时间 */
  timestamp: Timestamp;
  /** 是否已解决 */
  resolved: boolean;
  /** 解决时间 */
  resolvedAt?: Timestamp;
}

/**
 * 监控配置
 */
export interface MonitoringConfig {
  /** 指标保留天数 */
  metricsRetentionDays: number;
  /** 告警阈值 */
  alertThresholds: {
    /** 错误率阈值 */
    errorRate: number;
    /** 延迟阈值（毫秒） */
    latency: number;
    /** 内存使用阈值（0-1） */
    memoryUsage: number;
    /** CPU使用阈值（0-1） */
    cpuUsage: number;
  };
  /** 检查间隔（毫秒） */
  checkInterval: number;
  /** 是否启用自动扩缩容 */
  enableAutoScaling: boolean;
}

/**
 * 监控查询参数
 */
export interface MonitoringQuery {
  /** 函数ID列表 */
  functionIds?: string[];
  /** 函数类型列表 */
  functionTypes?: string[];
  /** 时间范围 */
  timeRange?: {
    /** 开始时间 */
    start: Timestamp;
    /** 结束时间 */
    end: Timestamp;
  };
  /** 指标列表 */
  metrics?: string[];
  /** 聚合方式 */
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
  /** 聚合间隔（分钟） */
  interval?: number;
}

/**
 * 监控服务
 */
@injectable()
export class MonitoringService {
  private readonly executionMetrics = new Map<string, FunctionExecutionMetrics>();
  private readonly resourceMetrics = new Map<string, FunctionResourceMetrics[]>();
  private readonly performanceMetrics = new Map<string, FunctionPerformanceMetrics[]>();
  private readonly healthStatus = new Map<string, FunctionHealthStatus>();
  private readonly alerts = new Map<string, FunctionAlert[]>();
  private readonly monitoringConfig: MonitoringConfig;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(@inject('Logger') private readonly logger: ILogger) {
    this.monitoringConfig = {
      metricsRetentionDays: 30,
      alertThresholds: {
        errorRate: 0.05, // 5%
        latency: 5000, // 5秒
        memoryUsage: 0.8, // 80%
        cpuUsage: 0.8, // 80%
      },
      checkInterval: 60000, // 1分钟
      enableAutoScaling: true,
    };

    // 启动定期健康检查
    this.startHealthCheck();
  }

  /**
   * 记录函数执行结果
   *
   * @param result 执行结果
   */
  async recordFunctionExecution(result: FunctionExecutionResult): Promise<void> {
    const functionId = result.functionId;
    const executionTime = result.executionTime;
    const timestamp = Timestamp.now();

    this.logger.debug('记录函数执行结果', {
      functionId,
      success: result.success,
      executionTime,
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
   *
   * @param functionId 函数ID
   * @returns 执行指标
   */
  async getExecutionMetrics(functionId: string): Promise<FunctionExecutionMetrics | null> {
    return this.executionMetrics.get(functionId) || null;
  }

  /**
   * 获取函数资源使用指标
   *
   * @param functionId 函数ID
   * @param timeRange 时间范围
   * @returns 资源使用指标列表
   */
  async getResourceMetrics(
    functionId: string,
    timeRange?: { start: Timestamp; end: Timestamp }
  ): Promise<FunctionResourceMetrics[]> {
    const metrics = this.resourceMetrics.get(functionId) || [];

    if (!timeRange) {
      return metrics;
    }

    return metrics.filter(
      metric =>
        (metric.timestamp.isAfter(timeRange.start) || metric.timestamp.equals(timeRange.start)) &&
        (metric.timestamp.isBefore(timeRange.end) || metric.timestamp.equals(timeRange.end))
    );
  }

  /**
   * 获取函数性能指标
   *
   * @param functionId 函数ID
   * @param timeRange 时间范围
   * @returns 性能指标列表
   */
  async getPerformanceMetrics(
    functionId: string,
    timeRange?: { start: Timestamp; end: Timestamp }
  ): Promise<FunctionPerformanceMetrics[]> {
    const metrics = this.performanceMetrics.get(functionId) || [];

    if (!timeRange) {
      return metrics;
    }

    return metrics.filter(
      metric =>
        (metric.timestamp.isAfter(timeRange.start) || metric.timestamp.equals(timeRange.start)) &&
        (metric.timestamp.isBefore(timeRange.end) || metric.timestamp.equals(timeRange.end))
    );
  }

  /**
   * 获取函数健康状态
   *
   * @param functionId 函数ID
   * @returns 健康状态
   */
  async getHealthStatus(functionId: string): Promise<FunctionHealthStatus | null> {
    return this.healthStatus.get(functionId) || null;
  }

  /**
   * 获取所有函数的健康状态
   *
   * @returns 健康状态列表
   */
  async getAllHealthStatus(): Promise<FunctionHealthStatus[]> {
    return Array.from(this.healthStatus.values());
  }

  /**
   * 获取函数告警
   *
   * @param functionId 函数ID
   * @param resolved 是否已解决
   * @returns 告警列表
   */
  async getAlerts(functionId?: string, resolved?: boolean): Promise<FunctionAlert[]> {
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

    return alerts.sort((a, b) => b.timestamp.getMilliseconds() - a.timestamp.getMilliseconds());
  }

  /**
   * 创建告警
   *
   * @param functionId 函数ID
   * @param type 告警类型
   * @param severity 严重程度
   * @param message 告警消息
   * @returns 告警
   */
  async createAlert(
    functionId: string,
    type: FunctionAlert['type'],
    severity: FunctionAlert['severity'],
    message: string
  ): Promise<FunctionAlert> {
    const alert: FunctionAlert = {
      id: `alert_${Timestamp.now().getMilliseconds()}_${Math.random().toString(36).substr(2, 9)}`,
      functionId,
      type,
      severity,
      message,
      timestamp: Timestamp.now(),
      resolved: false,
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
      message,
    });

    return alert;
  }

  /**
   * 解决告警
   *
   * @param alertId 告警ID
   * @param functionId 函数ID
   * @returns 是否成功
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
    alert.resolvedAt = Timestamp.now();

    this.logger.info('解决函数告警', {
      alertId,
      functionId,
    });

    return true;
  }

  /**
   * 查询监控数据
   *
   * @param query 查询参数
   * @returns 监控数据
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
      if (
        execMetric &&
        (!query.functionTypes || query.functionTypes.includes(execMetric.functionType))
      ) {
        executionMetrics.push(execMetric);
      }

      // 资源指标
      const resMetrics = this.resourceMetrics.get(functionId) || [];
      if (query.timeRange) {
        resourceMetrics.push(
          ...resMetrics.filter(
            m =>
              (m.timestamp.isAfter(query.timeRange!.start) ||
                m.timestamp.equals(query.timeRange!.start)) &&
              (m.timestamp.isBefore(query.timeRange!.end) ||
                m.timestamp.equals(query.timeRange!.end))
          )
        );
      } else {
        resourceMetrics.push(...resMetrics);
      }

      // 性能指标
      const perfMetrics = this.performanceMetrics.get(functionId) || [];
      if (query.timeRange) {
        performanceMetrics.push(
          ...perfMetrics.filter(
            m =>
              (m.timestamp.isAfter(query.timeRange!.start) ||
                m.timestamp.equals(query.timeRange!.start)) &&
              (m.timestamp.isBefore(query.timeRange!.end) ||
                m.timestamp.equals(query.timeRange!.end))
          )
        );
      } else {
        performanceMetrics.push(...perfMetrics);
      }
    }

    return {
      executionMetrics,
      resourceMetrics,
      performanceMetrics,
    };
  }

  /**
   * 更新执行指标
   *
   * @param functionId 函数ID
   * @param result 执行结果
   * @param timestamp 时间戳
   */
  private async updateExecutionMetrics(
    functionId: string,
    result: FunctionExecutionResult,
    timestamp: Timestamp
  ): Promise<void> {
    let metrics = this.executionMetrics.get(functionId);

    if (!metrics) {
      metrics = {
        functionId,
        functionName: result.functionId,
        functionType: 'unknown',
        executionCount: 0,
        successCount: 0,
        errorCount: 0,
        averageExecutionTime: 0,
        minExecutionTime: Infinity,
        maxExecutionTime: 0,
        totalExecutionTime: 0,
        errorRate: 0,
        successRate: 0,
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
   *
   * @param functionId 函数ID
   * @param resourceUsage 资源使用情况
   * @param timestamp 时间戳
   */
  private async updateResourceMetrics(
    functionId: string,
    resourceUsage: any,
    timestamp: Timestamp
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
      queueLength: 0,
    });

    // 保留最近的数据点
    const maxDataPoints = 1000;
    if (metrics.length > maxDataPoints) {
      metrics.splice(0, metrics.length - maxDataPoints);
    }
  }

  /**
   * 检查告警条件
   *
   * @param functionId 函数ID
   * @param result 执行结果
   */
  private async checkAlertConditions(
    functionId: string,
    result: FunctionExecutionResult
  ): Promise<void> {
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
   *
   * @param functionId 函数ID
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
      lastCheck: Timestamp.now(),
      uptime:
        Timestamp.now().getMilliseconds() -
        (metrics.lastExecutionTime?.getMilliseconds() || Timestamp.now().getMilliseconds()),
      responseTime: metrics.averageExecutionTime,
      errorRate: metrics.errorRate,
      alerts: unresolvedAlerts,
    };

    this.healthStatus.set(functionId, healthStatus);
  }

  /**
   * 启动健康检查
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        for (const functionId of this.executionMetrics.keys()) {
          await this.updateHealthStatus(functionId);
        }
      } catch (error) {
        this.logger.error(
          '健康检查失败',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }, this.monitoringConfig.checkInterval);
  }

  /**
   * 停止健康检查
   */
  stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  /**
   * 清理过期数据
   */
  async cleanupExpiredData(): Promise<void> {
    const cutoffDate = Timestamp.now().addDays(-this.monitoringConfig.metricsRetentionDays);

    // 清理资源指标
    for (const [functionId, metrics] of this.resourceMetrics.entries()) {
      const filteredMetrics = metrics.filter(
        m => m.timestamp.isAfter(cutoffDate) || m.timestamp.equals(cutoffDate)
      );
      this.resourceMetrics.set(functionId, filteredMetrics);
    }

    // 清理性能指标
    for (const [functionId, metrics] of this.performanceMetrics.entries()) {
      const filteredMetrics = metrics.filter(
        m => m.timestamp.isAfter(cutoffDate) || m.timestamp.equals(cutoffDate)
      );
      this.performanceMetrics.set(functionId, filteredMetrics);
    }

    // 清理已解决的告警
    for (const [functionId, alerts] of this.alerts.entries()) {
      const filteredAlerts = alerts.filter(
        a =>
          !a.resolved ||
          (a.resolvedAt && (a.resolvedAt.isAfter(cutoffDate) || a.resolvedAt.equals(cutoffDate)))
      );
      this.alerts.set(functionId, filteredAlerts);
    }

    this.logger.info('清理过期监控数据完成');
  }

  /**
   * 获取监控配置
   *
   * @returns 监控配置
   */
  getMonitoringConfig(): MonitoringConfig {
    return { ...this.monitoringConfig };
  }

  /**
   * 更新监控配置
   *
   * @param config 配置更新
   */
  updateMonitoringConfig(config: Partial<MonitoringConfig>): void {
    Object.assign(this.monitoringConfig, config);
    this.logger.info('更新监控配置', config);

    // 如果检查间隔改变，重启健康检查
    if (config.checkInterval !== undefined) {
      this.stopHealthCheck();
      this.startHealthCheck();
    }
  }
}
