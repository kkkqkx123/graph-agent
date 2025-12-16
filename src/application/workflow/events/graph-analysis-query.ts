/**
 * 获取图依赖关系查询
 */
export interface GetGraphDependenciesQuery {
  /** 图ID */
  graphId: string;
  /** 依赖类型 */
  dependencyType?: 'nodes' | 'edges' | 'execution' | 'all';
  /** 分析深度 */
  depth?: number;
}

/**
 * 获取图性能指标查询
 */
export interface GetGraphPerformanceMetricsQuery {
  /** 图ID */
  graphId: string;
  /** 时间范围 */
  timeRange?: {
    /** 开始时间 */
    startTime: string;
    /** 结束时间 */
    endTime: string;
  };
  /** 指标类型 */
  metricTypes?: Array<'execution_time' | 'success_rate' | 'resource_usage' | 'throughput'>;
}

/**
 * 获取图版本历史查询
 */
export interface GetGraphVersionHistoryQuery {
  /** 图ID */
  graphId: string;
  /** 分页参数 */
  pagination?: {
    /** 页码 */
    page: number;
    /** 每页大小 */
    size: number;
  };
  /** 是否包含差异对比 */
  includeDifferences?: boolean;
}
