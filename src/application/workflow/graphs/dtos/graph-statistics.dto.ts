/**
 * 图统计信息DTO
 */
export interface GraphStatisticsDto {
  /** 图ID */
  graphId: string;
  /** 节点统计 */
  nodeStatistics: {
    /** 总节点数 */
    total: number;
    /** 按类型分组的节点数 */
    byType: Record<string, number>;
    /** 按状态分组的节点数 */
    byStatus: Record<string, number>;
  };
  /** 边统计 */
  edgeStatistics: {
    /** 总边数 */
    total: number;
    /** 按类型分组的边数 */
    byType: Record<string, number>;
    /** 按条件分组的边数 */
    byCondition: Record<string, number>;
  };
  /** 执行统计 */
  executionStatistics: {
    /** 总执行次数 */
    totalExecutions: number;
    /** 成功执行次数 */
    successfulExecutions: number;
    /** 失败执行次数 */
    failedExecutions: number;
    /** 平均执行时间（毫秒） */
    averageExecutionTime: number;
    /** 最长执行时间（毫秒） */
    maxExecutionTime: number;
    /** 最短执行时间（毫秒） */
    minExecutionTime: number;
  };
  /** 路径统计 */
  pathStatistics: {
    /** 总路径数 */
    totalPaths: number;
    /** 最短路径长度 */
    shortestPathLength: number;
    /** 最长路径长度 */
    longestPathLength: number;
    /** 平均路径长度 */
    averagePathLength: number;
  };
  /** 复杂度指标 */
  complexityMetrics: {
    /** 循环复杂度 */
    cyclomaticComplexity: number;
    /** 节点连接度 */
    nodeConnectivity: number;
    /** 图密度 */
    graphDensity: number;
  };
}
