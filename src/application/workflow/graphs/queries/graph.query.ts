/**
 * 获取图查询
 */
export interface GetGraphQuery {
  /** 图ID */
  graphId: string;
  /** 是否包含节点和边 */
  includeNodesAndEdges?: boolean;
  /** 是否包含统计信息 */
  includeStatistics?: boolean;
  /** 是否包含执行历史 */
  includeExecutionHistory?: boolean;
}

/**
 * 列出图查询
 */
export interface ListGraphsQuery {
  /** 过滤条件 */
  filters?: {
    /** 名称过滤 */
    name?: string;
    /** 创建者过滤 */
    createdBy?: string;
    /** 创建时间范围过滤 */
    createdAfter?: string;
    createdBefore?: string;
    /** 最小节点数量 */
    minNodeCount?: number;
    /** 最大节点数量 */
    maxNodeCount?: number;
    /** 最小边数量 */
    minEdgeCount?: number;
    /** 最大边数量 */
    maxEdgeCount?: number;
    /** 是否包含已删除的图 */
    includeDeleted?: boolean;
  };
  /** 排序条件 */
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'nodeCount' | 'edgeCount';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
  /** 分页参数 */
  pagination?: {
    /** 页码 */
    page: number;
    /** 每页大小 */
    size: number;
  };
  /** 是否包含摘要信息 */
  includeSummary?: boolean;
}

/**
 * 获取图执行路径查询
 */
export interface GetExecutionPathQuery {
  /** 图ID */
  graphId: string;
  /** 起始节点ID（可选） */
  startNodeId?: string;
  /** 结束节点ID（可选） */
  endNodeId?: string;
  /** 路径类型 */
  pathType?: 'all' | 'shortest' | 'longest' | 'critical';
}

/**
 * 获取图统计信息查询
 */
export interface GetGraphStatisticsQuery {
  /** 图ID */
  graphId: string;
  /** 统计类型 */
  statisticsType?: 'basic' | 'detailed' | 'execution' | 'performance' | 'all';
}

/**
 * 获取节点查询
 */
export interface GetNodeQuery {
  /** 图ID */
  graphId: string;
  /** 节点ID */
  nodeId: string;
  /** 是否包含输入输出连接 */
  includeConnections?: boolean;
  /** 是否包含执行历史 */
  includeExecutionHistory?: boolean;
}

/**
 * 列出节点查询
 */
export interface ListNodesQuery {
  /** 图ID */
  graphId: string;
  /** 过滤条件 */
  filters?: {
    /** 节点类型过滤 */
    nodeType?: string;
    /** 节点名称过滤 */
    nodeName?: string;
    /** 创建时间范围过滤 */
    createdAfter?: string;
    createdBefore?: string;
    /** 是否包含已删除的节点 */
    includeDeleted?: boolean;
  };
  /** 排序条件 */
  sortBy?: 'name' | 'type' | 'createdAt' | 'updatedAt';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
  /** 分页参数 */
  pagination?: {
    /** 页码 */
    page: number;
    /** 每页大小 */
    size: number;
  };
}

/**
 * 获取边查询
 */
export interface GetEdgeQuery {
  /** 图ID */
  graphId: string;
  /** 边ID */
  edgeId: string;
  /** 是否包含源节点和目标节点信息 */
  includeSourceAndTarget?: boolean;
}

/**
 * 列出边查询
 */
export interface ListEdgesQuery {
  /** 图ID */
  graphId: string;
  /** 过滤条件 */
  filters?: {
    /** 边类型过滤 */
    edgeType?: string;
    /** 源节点ID过滤 */
    fromNodeId?: string;
    /** 目标节点ID过滤 */
    toNodeId?: string;
    /** 创建时间范围过滤 */
    createdAfter?: string;
    createdBefore?: string;
    /** 是否包含已删除的边 */
    includeDeleted?: boolean;
  };
  /** 排序条件 */
  sortBy?: 'type' | 'weight' | 'createdAt' | 'updatedAt';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
  /** 分页参数 */
  pagination?: {
    /** 页码 */
    page: number;
    /** 每页大小 */
    size: number;
  };
}

/**
 * 获取图执行状态查询
 */
export interface GetGraphExecutionStatusQuery {
  /** 图ID */
  graphId: string;
  /** 执行ID */
  executionId?: string;
  /** 是否包含节点状态 */
  includeNodeStatuses?: boolean;
  /** 是否包含执行日志 */
  includeLogs?: boolean;
}

/**
 * 获取执行计划查询
 */
export interface GetExecutionPlanQuery {
  /** 图ID */
  graphId: string;
  /** 执行模式 */
  executionMode?: 'sequential' | 'parallel' | 'conditional';
  /** 优化选项 */
  optimizationOptions?: {
    /** 是否优化执行顺序 */
    optimizeOrder: boolean;
    /** 是否并行化独立节点 */
    parallelizeIndependent: boolean;
    /** 是否预加载资源 */
    preloadResources: boolean;
  };
}

/**
 * 搜索图查询
 */
export interface SearchGraphsQuery {
  /** 搜索关键词 */
  keyword: string;
  /** 搜索范围 */
  searchIn?: 'name' | 'description' | 'metadata' | 'all';
  /** 过滤条件 */
  filters?: {
    /** 创建者过滤 */
    createdBy?: string;
    /** 节点数量范围 */
    nodeCountRange?: {
      min?: number;
      max?: number;
    };
    /** 边数量范围 */
    edgeCountRange?: {
      min?: number;
      max?: number;
    };
  };
  /** 排序条件 */
  sortBy?: 'relevance' | 'name' | 'createdAt' | 'updatedAt' | 'nodeCount' | 'edgeCount';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
  /** 分页参数 */
  pagination?: {
    /** 页码 */
    page: number;
    /** 每页大小 */
    size: number;
  };
}

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