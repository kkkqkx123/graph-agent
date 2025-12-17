import { EventEmitter } from 'events';
import { ILogger } from '@shared/types/logger';

/**
 * 指标数据接口
 */
export interface MetricData {
  timestamp: Date;
  value: number;
  tags?: Record<string, string>;
}

/**
 * 时间序列数据接口
 */
export interface TimeSeriesData {
  name: string;
  data: MetricData[];
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count';
  unit?: string;
  description?: string;
}

/**
 * 指标收集器配置接口
 */
export interface MetricsCollectorConfig {
  enabled: boolean;
  retentionPeriod: number; // 数据保留时间（毫秒）
  aggregationInterval: number; // 聚合间隔（毫秒）
  maxDataPoints: number; // 最大数据点数
  enablePersistence: boolean;
  persistencePath?: string;
}

/**
 * 指标收集器
 * 
 * 负责收集、聚合和存储LLM系统的性能指标
 */
export class MetricsCollector extends EventEmitter {
  private readonly timeSeries: Map<string, TimeSeriesData> = new Map();
  private readonly config: MetricsCollectorConfig;
  private readonly logger: ILogger;
  private aggregationTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: MetricsCollectorConfig, logger: ILogger) {
    super();
    this.config = config;
    this.logger = logger.child({ service: 'MetricsCollector' });
    
    if (config.enabled) {
      this.startAggregation();
      this.startCleanup();
    }
  }

  /**
   * 记录指标
   */
  public recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    if (!this.config.enabled) {
      return;
    }

    const timestamp = new Date();
    const metric: MetricData = { timestamp, value, tags };

    // 获取或创建时间序列
    let timeSeries = this.timeSeries.get(name);
    if (!timeSeries) {
      timeSeries = {
        name,
        data: [],
        aggregation: 'avg',
        unit: 'count',
        description: `${name} metric`
      };
      this.timeSeries.set(name, timeSeries);
    }

    // 添加数据点
    timeSeries.data.push(metric);

    // 限制数据点数量
    if (timeSeries.data.length > this.config.maxDataPoints) {
      timeSeries.data = timeSeries.data.slice(-this.config.maxDataPoints);
    }

    // 发出指标事件
    this.emit('metric', { name, value, tags, timestamp });

    this.logger.debug('记录指标', { name, value, tags });
  }

  /**
   * 记录请求指标
   */
  public recordRequest(
    wrapperName: string,
    duration: number,
    success: boolean,
    tokenCount?: number,
    tags?: Record<string, string>
  ): void {
    const baseTags = { wrapper: wrapperName, ...tags };

    // 记录请求总数
    this.recordMetric('requests.total', 1, baseTags);

    // 记录请求持续时间
    this.recordMetric('requests.duration', duration, baseTags);

    // 记录成功/失败
    this.recordMetric(`requests.${success ? 'success' : 'failure'}`, 1, baseTags);

    // 记录Token使用量
    if (tokenCount !== undefined) {
      this.recordMetric('requests.tokens', tokenCount, baseTags);
    }
  }

  /**
   * 记录包装器指标
   */
  public recordWrapperMetrics(
    wrapperName: string,
    statistics: any,
    tags?: Record<string, string>
  ): void {
    const baseTags = { wrapper: wrapperName, ...tags };

    this.recordMetric('wrapper.total_requests', statistics.totalRequests, baseTags);
    this.recordMetric('wrapper.successful_requests', statistics.successfulRequests, baseTags);
    this.recordMetric('wrapper.failed_requests', statistics.failedRequests, baseTags);
    this.recordMetric('wrapper.average_response_time', statistics.averageResponseTime, baseTags);
    this.recordMetric('wrapper.error_rate', statistics.errorRate, baseTags);
    this.recordMetric('wrapper.requests_per_minute', statistics.requestsPerMinute, baseTags);
    this.recordMetric('wrapper.tokens_per_minute', statistics.tokensPerMinute, baseTags);
  }

  /**
   * 记录池指标
   */
  public recordPoolMetrics(
    poolName: string,
    statistics: any,
    tags?: Record<string, string>
  ): void {
    const baseTags = { pool: poolName, ...tags };

    this.recordMetric('pool.total_instances', statistics.totalInstances, baseTags);
    this.recordMetric('pool.healthy_instances', statistics.healthyInstances, baseTags);
    this.recordMetric('pool.total_requests', statistics.totalRequests, baseTags);
    this.recordMetric('pool.successful_requests', statistics.successfulRequests, baseTags);
    this.recordMetric('pool.failed_requests', statistics.failedRequests, baseTags);
    this.recordMetric('pool.average_response_time', statistics.averageResponseTime, baseTags);
  }

  /**
   * 记录任务组指标
   */
  public recordTaskGroupMetrics(
    groupName: string,
    statistics: any,
    tags?: Record<string, string>
  ): void {
    const baseTags = { group: groupName, ...tags };

    this.recordMetric('task_group.total_echelons', statistics.totalEchelons, baseTags);
    this.recordMetric('task_group.active_echelons', statistics.activeEchelons, baseTags);
    this.recordMetric('task_group.total_requests', statistics.totalRequests, baseTags);
    this.recordMetric('task_group.successful_requests', statistics.successfulRequests, baseTags);
    this.recordMetric('task_group.failed_requests', statistics.failedRequests, baseTags);
    this.recordMetric('task_group.average_response_time', statistics.averageResponseTime, baseTags);
    this.recordMetric('task_group.execution_count', statistics.executionCount, baseTags);
  }

  /**
   * 获取指标数据
   */
  public getMetrics(name: string, startTime?: Date, endTime?: Date): MetricData[] {
    const timeSeries = this.timeSeries.get(name);
    if (!timeSeries) {
      return [];
    }

    let data = timeSeries.data;

    // 应用时间过滤
    if (startTime || endTime) {
      data = data.filter(metric => {
        if (startTime && metric.timestamp < startTime) return false;
        if (endTime && metric.timestamp > endTime) return false;
        return true;
      });
    }

    return data;
  }

  /**
   * 获取聚合指标
   */
  public getAggregatedMetrics(
    name: string,
    aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count' = 'avg',
    timeWindow?: number // 时间窗口（毫秒）
  ): number | null {
    const data = this.getMetrics(name);
    
    if (data.length === 0) {
      return null;
    }

    // 应用时间窗口过滤
    let filteredData = data;
    if (timeWindow) {
      const cutoffTime = new Date(Date.now() - timeWindow);
      filteredData = data.filter(metric => metric.timestamp >= cutoffTime);
    }

    if (filteredData.length === 0) {
      return null;
    }

    const values = filteredData.map(metric => metric.value);

    switch (aggregation) {
      case 'sum':
        return values.reduce((sum, value) => sum + value, 0);
      case 'avg':
        return values.reduce((sum, value) => sum + value, 0) / values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'count':
        return values.length;
      default:
        return null;
    }
  }

  /**
   * 获取所有指标名称
   */
  public getMetricNames(): string[] {
    return Array.from(this.timeSeries.keys());
  }

  /**
   * 获取指标统计信息
   */
  public getMetricStatistics(name: string, timeWindow?: number): MetricStatistics | null {
    const data = this.getMetrics(name);
    
    if (data.length === 0) {
      return null;
    }

    // 应用时间窗口过滤
    let filteredData = data;
    if (timeWindow) {
      const cutoffTime = new Date(Date.now() - timeWindow);
      filteredData = data.filter(metric => metric.timestamp >= cutoffTime);
    }

    if (filteredData.length === 0) {
      return null;
    }

    const values = filteredData.map(metric => metric.value);
    const sum = values.reduce((acc, val) => acc + val, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      count: values.length,
      sum,
      avg,
      min,
      max,
      latest: values[values.length - 1],
      timestamp: filteredData[filteredData.length - 1].timestamp
    };
  }

  /**
   * 清除指标数据
   */
  public clearMetrics(name?: string): void {
    if (name) {
      this.timeSeries.delete(name);
      this.logger.info('清除指标数据', { name });
    } else {
      this.timeSeries.clear();
      this.logger.info('清除所有指标数据');
    }
  }

  /**
   * 导出指标数据
   */
  public exportMetrics(format: 'json' | 'csv' = 'json'): string {
    const allMetrics: Record<string, any> = {};

    for (const [name, timeSeries] of this.timeSeries.entries()) {
      allMetrics[name] = {
        ...timeSeries,
        data: timeSeries.data.map(metric => ({
          timestamp: metric.timestamp.toISOString(),
          value: metric.value,
          tags: metric.tags
        }))
      };
    }

    if (format === 'json') {
      return JSON.stringify(allMetrics, null, 2);
    } else {
      // CSV格式
      const lines: string[] = [];
      lines.push('metric,timestamp,value,tags');
      
      for (const [name, timeSeries] of this.timeSeries.entries()) {
        for (const metric of timeSeries.data) {
          const tags = metric.tags ? JSON.stringify(metric.tags) : '';
          lines.push(`${name},${metric.timestamp.toISOString()},${metric.value},${tags}`);
        }
      }
      
      return lines.join('\n');
    }
  }

  /**
   * 关闭指标收集器
   */
  public shutdown(): void {
    this.logger.info('关闭指标收集器');

    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.removeAllListeners();
    this.timeSeries.clear();

    this.logger.info('指标收集器已关闭');
  }

  private startAggregation(): void {
    this.aggregationTimer = setInterval(() => {
      this.performAggregation();
    }, this.config.aggregationInterval);
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.config.retentionPeriod / 10); // 每个保留期的1/10时间清理一次
  }

  private performAggregation(): void {
    const now = new Date();
    const aggregationWindow = this.config.aggregationInterval;

    for (const [name, timeSeries] of this.timeSeries.entries()) {
      const cutoffTime = new Date(now.getTime() - aggregationWindow);
      const recentData = timeSeries.data.filter(metric => metric.timestamp >= cutoffTime);

      if (recentData.length > 0) {
        const values = recentData.map(metric => metric.value);
        const aggregatedValue = values.reduce((sum, value) => sum + value, 0) / values.length;

        // 发出聚合事件
        this.emit('aggregated', {
          name,
          value: aggregatedValue,
          count: values.length,
          window: aggregationWindow,
          timestamp: now
        });
      }
    }
  }

  private performCleanup(): void {
    const cutoffTime = new Date(Date.now() - this.config.retentionPeriod);
    let removedCount = 0;

    for (const [name, timeSeries] of this.timeSeries.entries()) {
      const originalLength = timeSeries.data.length;
      timeSeries.data = timeSeries.data.filter(metric => metric.timestamp >= cutoffTime);
      removedCount += originalLength - timeSeries.data.length;
    }

    if (removedCount > 0) {
      this.logger.debug('清理过期指标数据', { removedCount });
    }
  }
}

/**
 * 指标统计信息接口
 */
export interface MetricStatistics {
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  latest: number;
  timestamp: Date;
}