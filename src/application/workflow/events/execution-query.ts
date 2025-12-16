/**
 * 获取图执行路径查询
 */
export interface GetExecutionPathQuery {
  /** 图ID */
  workflowId: string;
  /** 起始节点ID（可选） */
  startNodeId?: string;
  /** 结束节点ID（可选） */
  endNodeId?: string;
  /** 路径类型 */
  pathType?: 'all' | 'shortest' | 'longest' | 'critical';
}

/**
 * 获取图执行状态查询
 */
export interface GetWorkflowExecutionStatusQuery {
  /** 图ID */
  workflowId: string;
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
  workflowId: string;
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
