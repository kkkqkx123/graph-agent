/**
 * 指标收集器单元测试
 */

import { MetricsCollector, MetricType, MetricConfig, MetricsCollectorConfig } from '../metrics-collector';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    const config: MetricsCollectorConfig = {
      autoFlushInterval: 1000,
      maxDataPointsPerMetric: 1000,
      enableAggregation: true
    };
    collector = new MetricsCollector(config);
  });

  afterEach(() => {
    collector.destroy();
  });

  describe('构造函数', () => {
    test('应该使用默认配置创建收集器', () => {
      const defaultCollector = new MetricsCollector();
      expect(defaultCollector).toBeDefined();
    });

    test('应该使用自定义配置创建收集器', () => {
      const config: MetricsCollectorConfig = {
        autoFlushInterval: 5000,
        maxDataPointsPerMetric: 500,
        enableAggregation: false
      };
      const customCollector = new MetricsCollector(config);
      expect(customCollector).toBeDefined();
    });
  });

  describe('registerMetric 方法', () => {
    test('应该注册计数器指标', () => {
      const config: MetricConfig = {
        type: MetricType.COUNTER,
        name: 'test_counter',
        description: '测试计数器'
      };
      
      collector.registerMetric(config);
      
      const metrics = collector.exportMetrics();
      expect(metrics['test_counter']).toBeDefined();
      expect(metrics['test_counter']!.config.type).toBe(MetricType.COUNTER);
    });

    test('应该注册仪表指标', () => {
      const config: MetricConfig = {
        type: MetricType.GAUGE,
        name: 'test_gauge',
        description: '测试仪表'
      };
      
      collector.registerMetric(config);
      
      const metrics = collector.exportMetrics();
      expect(metrics['test_gauge']).toBeDefined();
      expect(metrics['test_gauge']!.config.type).toBe(MetricType.GAUGE);
    });

    test('应该注册直方图指标', () => {
      const config: MetricConfig = {
        type: MetricType.HISTOGRAM,
        name: 'test_histogram',
        description: '测试直方图',
        buckets: [10, 50, 100]
      };
      
      collector.registerMetric(config);
      
      const metrics = collector.exportMetrics();
      expect(metrics['test_histogram']).toBeDefined();
      expect(metrics['test_histogram']!.config.type).toBe(MetricType.HISTOGRAM);
    });

    test('应该注册摘要指标', () => {
      const config: MetricConfig = {
        type: MetricType.SUMMARY,
        name: 'test_summary',
        description: '测试摘要',
        quantiles: [0.5, 0.95, 0.99]
      };
      
      collector.registerMetric(config);
      
      const metrics = collector.exportMetrics();
      expect(metrics['test_summary']).toBeDefined();
      expect(metrics['test_summary']!.config.type).toBe(MetricType.SUMMARY);
    });
  });

  describe('incrementCounter 方法', () => {
    test('应该增加计数器值', () => {
      const config: MetricConfig = {
        type: MetricType.COUNTER,
        name: 'test_counter'
      };
      collector.registerMetric(config);
      
      collector.incrementCounter('test_counter', 5);
      
      const statistics = collector.getMetricStatistics('test_counter');
      expect(statistics).toBeDefined();
      expect(statistics?.sum).toBe(5);
      expect(statistics?.count).toBe(1);
    });

    test('应该累计计数器值', () => {
      const config: MetricConfig = {
        type: MetricType.COUNTER,
        name: 'test_counter'
      };
      collector.registerMetric(config);
      
      collector.incrementCounter('test_counter', 1);
      collector.incrementCounter('test_counter', 2);
      collector.incrementCounter('test_counter', 3);
      
      const statistics = collector.getMetricStatistics('test_counter');
      expect(statistics?.sum).toBe(6);
      expect(statistics?.count).toBe(3);
    });

    test('应该支持标签', () => {
      const config: MetricConfig = {
        type: MetricType.COUNTER,
        name: 'test_counter',
        labels: ['environment', 'service']
      };
      collector.registerMetric(config);
      
      collector.incrementCounter('test_counter', 1, { environment: 'test', service: 'api' });
      
      const dataPoints = collector.getDataPoints('test_counter');
      expect(dataPoints[0]!.labels).toEqual({ environment: 'test', service: 'api' });
    });
  });

  describe('setGauge 方法', () => {
    test('应该设置仪表值', () => {
      const config: MetricConfig = {
        type: MetricType.GAUGE,
        name: 'test_gauge'
      };
      collector.registerMetric(config);
      
      collector.setGauge('test_gauge', 42.5);
      
      const statistics = collector.getMetricStatistics('test_gauge');
      expect(statistics?.avg).toBe(42.5);
      expect(statistics?.count).toBe(1);
    });

    test('应该记录多个仪表值', () => {
      const config: MetricConfig = {
        type: MetricType.GAUGE,
        name: 'test_gauge'
      };
      collector.registerMetric(config);
      
      collector.setGauge('test_gauge', 10);
      collector.setGauge('test_gauge', 20);
      collector.setGauge('test_gauge', 30);
      
      const statistics = collector.getMetricStatistics('test_gauge');
      expect(statistics?.sum).toBe(60);
      expect(statistics?.count).toBe(3);
      expect(statistics?.avg).toBe(20);
    });
  });

  describe('observeHistogram 方法', () => {
    test('应该记录直方图值', () => {
      const config: MetricConfig = {
        type: MetricType.HISTOGRAM,
        name: 'test_histogram'
      };
      collector.registerMetric(config);
      
      collector.observeHistogram('test_histogram', 100);
      
      const statistics = collector.getMetricStatistics('test_histogram');
      expect(statistics?.avg).toBe(100);
      expect(statistics?.count).toBe(1);
    });

    test('应该记录多个直方图值', () => {
      const config: MetricConfig = {
        type: MetricType.HISTOGRAM,
        name: 'test_histogram'
      };
      collector.registerMetric(config);
      
      collector.observeHistogram('test_histogram', 50);
      collector.observeHistogram('test_histogram', 75);
      collector.observeHistogram('test_histogram', 100);
      
      const statistics = collector.getMetricStatistics('test_histogram');
      expect(statistics?.sum).toBe(225);
      expect(statistics?.count).toBe(3);
      expect(statistics?.avg).toBe(75);
    });
  });

  describe('observeSummary 方法', () => {
    test('应该记录摘要值', () => {
      const config: MetricConfig = {
        type: MetricType.SUMMARY,
        name: 'test_summary'
      };
      collector.registerMetric(config);
      
      collector.observeSummary('test_summary', 1000);
      
      const statistics = collector.getMetricStatistics('test_summary');
      expect(statistics?.avg).toBe(1000);
      expect(statistics?.count).toBe(1);
    });

    test('应该记录多个摘要值', () => {
      const config: MetricConfig = {
        type: MetricType.SUMMARY,
        name: 'test_summary'
      };
      collector.registerMetric(config);
      
      collector.observeSummary('test_summary', 500);
      collector.observeSummary('test_summary', 1000);
      collector.observeSummary('test_summary', 1500);
      
      const statistics = collector.getMetricStatistics('test_summary');
      expect(statistics?.sum).toBe(3000);
      expect(statistics?.count).toBe(3);
      expect(statistics?.avg).toBe(1000);
    });
  });

  describe('getMetricStatistics 方法', () => {
    test('应该返回指标统计信息', () => {
      const config: MetricConfig = {
        type: MetricType.COUNTER,
        name: 'test_counter'
      };
      collector.registerMetric(config);
      
      collector.incrementCounter('test_counter', 1);
      collector.incrementCounter('test_counter', 2);
      collector.incrementCounter('test_counter', 3);
      
      const statistics = collector.getMetricStatistics('test_counter');
      expect(statistics).toBeDefined();
      expect(statistics?.count).toBe(3);
      expect(statistics?.sum).toBe(6);
      expect(statistics?.min).toBe(1);
      expect(statistics?.max).toBe(3);
      expect(statistics?.avg).toBe(2);
    });

    test('应该返回 null 对于不存在的指标', () => {
      expect(collector.getMetricStatistics('nonexistent')).toBeNull();
    });

    test('应该处理单个值', () => {
      const config: MetricConfig = {
        type: MetricType.COUNTER,
        name: 'single_counter'
      };
      collector.registerMetric(config);
      
      collector.incrementCounter('single_counter', 5);
      
      const statistics = collector.getMetricStatistics('single_counter');
      expect(statistics?.count).toBe(1);
      expect(statistics?.sum).toBe(5);
      expect(statistics?.min).toBe(5);
      expect(statistics?.max).toBe(5);
      expect(statistics?.avg).toBe(5);
    });

    test('应该支持时间窗口过滤', async () => {
      const config: MetricConfig = {
        type: MetricType.COUNTER,
        name: 'time_filtered'
      };
      collector.registerMetric(config);
      
      collector.incrementCounter('time_filtered', 1);
      
      // 等待一段时间
      await new Promise(resolve => setTimeout(resolve, 100));
      
      collector.incrementCounter('time_filtered', 2);
      
      const recentStats = collector.getMetricStatistics('time_filtered', 50);
      expect(recentStats?.count).toBe(1); // 只包含最近的数据点
      expect(recentStats?.sum).toBe(2);
    });
  });

  describe('getAllStatistics 方法', () => {
    test('应该返回所有指标统计信息', () => {
      collector.registerMetric({ type: MetricType.COUNTER, name: 'counter1' });
      collector.registerMetric({ type: MetricType.GAUGE, name: 'gauge1' });
      
      collector.incrementCounter('counter1', 1);
      collector.setGauge('gauge1', 2.5);
      
      const allStats = collector.getAllStatistics();
      expect(allStats['counter1']).toBeDefined();
      expect(allStats['gauge1']).toBeDefined();
      expect(allStats['counter1']!.sum).toBe(1);
      expect(allStats['gauge1']!.avg).toBe(2.5);
    });

    test('应该返回空对象对于空收集器', () => {
      expect(collector.getAllStatistics()).toEqual({});
    });
  });

  describe('clearAll 方法', () => {
    test('应该清除所有指标数据', () => {
      collector.registerMetric({ type: MetricType.COUNTER, name: 'counter1' });
      collector.registerMetric({ type: MetricType.GAUGE, name: 'gauge1' });
      
      collector.incrementCounter('counter1', 1);
      collector.setGauge('gauge1', 2.5);
      
      expect(collector.getMetricStatistics('counter1')).toBeDefined();
      expect(collector.getMetricStatistics('gauge1')).toBeDefined();
      
      collector.clearAll();
      
      expect(collector.getMetricStatistics('counter1')).toBeNull();
      expect(collector.getMetricStatistics('gauge1')).toBeNull();
    });

    test('清除后可以重新记录', () => {
      collector.registerMetric({ type: MetricType.COUNTER, name: 'counter1' });
      collector.incrementCounter('counter1', 1);
      collector.clearAll();
      collector.incrementCounter('counter1', 2);
      
      const statistics = collector.getMetricStatistics('counter1');
      expect(statistics?.sum).toBe(2);
      expect(statistics?.count).toBe(1);
    });
  });

  describe('exportMetrics 方法', () => {
    test('应该导出所有指标数据', () => {
      collector.registerMetric({ 
        type: MetricType.COUNTER, 
        name: 'test_counter',
        description: '测试计数器'
      });
      collector.incrementCounter('test_counter', 1);
      
      const exported = collector.exportMetrics();
      expect(exported['test_counter']).toBeDefined();
      expect(exported['test_counter']!.config.name).toBe('test_counter');
      expect(exported['test_counter']!.dataPoints).toHaveLength(1);
      expect(exported['test_counter']!.statistics).toBeDefined();
    });

    test('应该返回空对象对于空收集器', () => {
      expect(collector.exportMetrics()).toEqual({});
    });
  });

  describe('数据点限制', () => {
    test('应该限制每个指标的数据点数量', () => {
      const config: MetricsCollectorConfig = {
        maxDataPointsPerMetric: 3
      };
      const limitedCollector = new MetricsCollector(config);
      
      limitedCollector.registerMetric({ type: MetricType.COUNTER, name: 'limited_counter' });
      
      // 记录超过限制的数据点
      limitedCollector.incrementCounter('limited_counter', 1);
      limitedCollector.incrementCounter('limited_counter', 2);
      limitedCollector.incrementCounter('limited_counter', 3);
      limitedCollector.incrementCounter('limited_counter', 4);
      
      const dataPoints = limitedCollector.getDataPoints('limited_counter');
      expect(dataPoints).toHaveLength(3); // 应该只保留最新的3个
      expect(dataPoints[0]!.value).toBe(2); // 最旧的数据点被移除
      expect(dataPoints[2]!.value).toBe(4); // 最新的数据点
      
      limitedCollector.destroy();
    });
  });

  describe('静态方法', () => {
    test('create 方法应该创建收集器', () => {
      const collector = MetricsCollector.create();
      expect(collector).toBeDefined();
      collector.destroy();
    });

    test('createExecutorMetrics 方法应该创建预配置的执行器收集器', () => {
      const executorCollector = MetricsCollector.createExecutorMetrics();
      expect(executorCollector).toBeDefined();
      
      const metrics = executorCollector.exportMetrics();
      expect(metrics['execution_total']).toBeDefined();
      expect(metrics['execution_duration']).toBeDefined();
      expect(metrics['execution_concurrent']).toBeDefined();
      expect(metrics['execution_errors']).toBeDefined();
      
      executorCollector.destroy();
    });
  });

  describe('性能测试', () => {
    test('应该高效处理大量指标', () => {
      const startTime = performance.now();
      
      // 注册和记录100个指标
      for (let i = 0; i < 100; i++) {
        collector.registerMetric({ 
          type: MetricType.COUNTER, 
          name: `counter_${i}` 
        });
        collector.incrementCounter(`counter_${i}`, i);
      }
      
      const allStats = collector.getAllStatistics();
      expect(Object.keys(allStats)).toHaveLength(100);
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
    });
  });

  describe('错误处理', () => {
    test('应该拒绝未注册的指标', () => {
      expect(() => {
        collector.incrementCounter('unregistered_counter', 1);
      }).toThrow('指标未注册: unregistered_counter');
    });

    test('应该正确处理无效配置', () => {
      expect(() => {
        collector.registerMetric({} as MetricConfig);
      }).toThrow();
    });
  });
});