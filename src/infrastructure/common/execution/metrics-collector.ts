import { injectable } from 'inversify';

/**
 * 指标类型定义
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary'
}

/**
 * 指标配置
 */
export interface MetricConfig {
  type: MetricType;
  name: string;
  description?: string;
  labels?: string[];
  buckets?: number[]; // 用于直方图
  quantiles?: number[]; // 用于摘要
}

/**
 * 指标数据点
 */
export interface MetricDataPoint {
  value: number;
  timestamp: Date;
  labels?: Record<string, string>;
}

/**
 * 指标统计
 */
export interface MetricStatistics {
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50?: number;
  p95?: number;
  p99?: number;
}

/**
 * 指标收集器配置
 */
export interface MetricsCollectorConfig {
  autoFlushInterval?: number; // 自动刷新间隔（毫秒）
  maxDataPointsPerMetric?: number; // 每个指标最大数据点数
  enableAggregation?: boolean; // 是否启用聚合
}

/**
 * 通用指标收集器
 */
@injectable()
export class MetricsCollector {
  private metrics: Map<string, MetricConfig> = new Map();
  private dataPoints: Map<string, MetricDataPoint[]> = new Map();
  private config: MetricsCollectorConfig;
  private flushInterval?: NodeJS.Timeout;

  constructor(config: MetricsCollectorConfig = {}) {
    this.config = {
      autoFlushInterval: config.autoFlushInterval ?? 60000, // 默认1分钟
      maxDataPointsPerMetric: config.maxDataPointsPerMetric ?? 1000,
      enableAggregation: config.enableAggregation ?? true,
      ...config
    };

    // 启动自动刷新
    if (this.config.autoFlushInterval) {
      this.startAutoFlush();
    }
  }

  /**
   * 注册指标
   */
  registerMetric(config: MetricConfig): void {
    this.metrics.set(config.name, config);
    this.dataPoints.set(config.name, []);
  }

  /**
   * 记录指标值
   */
  recordMetric(name: string, value: number, labels?: Record<string, string>): void {
    const metricConfig = this.metrics.get(name);
    if (!metricConfig) {
      throw new Error(`指标未注册: ${name}`);
    }

    const dataPoint: MetricDataPoint = {
      value,
      timestamp: new Date(),
      labels
    };

    const dataPoints = this.dataPoints.get(name) || [];
    dataPoints.push(dataPoint);

    // 限制数据点数量
    if (dataPoints.length > (this.config.maxDataPointsPerMetric ?? 1000)) {
      dataPoints.shift();
    }

    this.dataPoints.set(name, dataPoints);
  }

  /**
   * 增加计数器
   */
  incrementCounter(name: string, value: number = 1, labels?: Record<string, string>): void {
    this.recordMetric(name, value, labels);
  }

  /**
   * 设置仪表值
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    this.recordMetric(name, value, labels);
  }

  /**
   * 记录直方图值
   */
  observeHistogram(name: string, value: number, labels?: Record<string, string>): void {
    this.recordMetric(name, value, labels);
  }

  /**
   * 记录摘要值
   */
  observeSummary(name: string, value: number, labels?: Record<string, string>): void {
    this.recordMetric(name, value, labels);
  }

  /**
   * 获取指标统计
   */
  getMetricStatistics(name: string, timeWindowMs?: number): MetricStatistics | null {
    const dataPoints = this.getDataPoints(name, timeWindowMs);
    if (dataPoints.length === 0) {
      return null;
    }

    const values = dataPoints.map(dp => dp.value);
    const sortedValues = [...values].sort((a, b) => a - b);
    
    const count = values.length;
    const sum = values.reduce((acc, val) => acc + val, 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = sum / count;

    const statistics: MetricStatistics = {
      count,
      sum,
      min,
      max,
      avg
    };

    // 计算百分位数（如果数据足够）
    if (sortedValues.length >= 5) {
      statistics.p50 = this.calculatePercentile(sortedValues, 0.5);
      statistics.p95 = this.calculatePercentile(sortedValues, 0.95);
      statistics.p99 = this.calculatePercentile(sortedValues, 0.99);
    }

    return statistics;
  }

  /**
   * 获取所有指标统计
   */
  getAllStatistics(timeWindowMs?: number): Record<string, MetricStatistics> {
    const result: Record<string, MetricStatistics> = {};
    
    this.metrics.forEach((config, name) => {
      const statistics = this.getMetricStatistics(name, timeWindowMs);
      if (statistics) {
        result[name] = statistics;
      }
    });

    return result;
  }

  /**
   * 获取数据点
   */
  getDataPoints(name: string, timeWindowMs?: number): MetricDataPoint[] {
    const dataPoints = this.dataPoints.get(name) || [];
    
    if (!timeWindowMs) {
      return [...dataPoints];
    }

    const cutoffTime = new Date(Date.now() - timeWindowMs);
    return dataPoints.filter(dp => dp.timestamp >= cutoffTime);
  }

  /**
   * 清空指标数据
   */
  clearMetric(name: string): void {
    this.dataPoints.set(name, []);
  }

  /**
   * 清空所有指标数据
   */
  clearAll(): void {
    this.dataPoints.clear();
    this.metrics.forEach((config, name) => {
      this.dataPoints.set(name, []);
    });
  }

  /**
   * 导出指标数据
   */
  exportMetrics(): Record<string, {
    config: MetricConfig;
    dataPoints: MetricDataPoint[];
    statistics: MetricStatistics | null;
  }> {
    const result: Record<string, any> = {};
    
    this.metrics.forEach((config, name) => {
      const dataPoints = this.getDataPoints(name);
      const statistics = this.getMetricStatistics(name);
      
      result[name] = {
        config,
        dataPoints,
        statistics
      };
    });

    return result;
  }

  /**
   * 刷新指标（用于外部存储）
   */
  async flush(): Promise<void> {
    // 这里可以添加将指标数据发送到外部系统的逻辑
    // 例如：Prometheus、InfluxDB、日志文件等
    console.log('指标数据已刷新');
  }

  /**
   * 销毁收集器
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = undefined;
    }
  }

  /**
   * 启动自动刷新
   */
  private startAutoFlush(): void {
    if (this.config.autoFlushInterval) {
      this.flushInterval = setInterval(() => {
        this.flush().catch(error => {
          console.error('自动刷新指标失败:', error);
        });
      }, this.config.autoFlushInterval);
    }
  }

  /**
   * 计算百分位数
   */
  private calculatePercentile(sortedValues: number[], percentile: number): number {
    const index = Math.floor(sortedValues.length * percentile);
    return sortedValues[Math.min(index, sortedValues.length - 1)];
  }

  /**
   * 创建预配置的指标收集器
   */
  static create(config?: MetricsCollectorConfig): MetricsCollector {
    return new MetricsCollector(config);
  }

  /**
   * 创建执行器指标收集器
   */
  static createExecutorMetrics(): MetricsCollector {
    const collector = new MetricsCollector({
      autoFlushInterval: 30000, // 30秒刷新一次
      maxDataPointsPerMetric: 5000
    });

    // 注册常用执行器指标
    collector.registerMetric({
      type: MetricType.COUNTER,
      name: 'execution_total',
      description: '总执行次数',
      labels: ['executor_type', 'status']
    });

    collector.registerMetric({
      type: MetricType.HISTOGRAM,
      name: 'execution_duration',
      description: '执行耗时分布',
      labels: ['executor_type'],
      buckets: [10, 50, 100, 500, 1000, 5000, 10000] // 毫秒
    });

    collector.registerMetric({
      type: MetricType.GAUGE,
      name: 'execution_concurrent',
      description: '并发执行数',
      labels: ['executor_type']
    });

    collector.registerMetric({
      type: MetricType.COUNTER,
      name: 'execution_errors',
      description: '执行错误次数',
      labels: ['executor_type', 'error_type']
    });

    return collector;
  }
}