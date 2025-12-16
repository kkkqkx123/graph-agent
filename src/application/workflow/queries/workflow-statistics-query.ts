/**
 * 获取工作流统计信息查询
 */
export interface GetWorkflowStatisticsQuery {
  /** 过滤条件 */
  filters?: {
    /** 状态过滤 */
    status?: string;
    /** 类型过滤 */
    type?: string;
    /** 创建者过滤 */
    createdBy?: string;
    /** 创建时间范围过滤 */
    createdAfter?: string;
    createdBefore?: string;
  };
  /** 统计类型 */
  statisticsType?: 'basic' | 'detailed' | 'execution' | 'all';
}

/**
 * 获取工作流标签统计查询
 */
export interface GetWorkflowTagStatsQuery {
  /** 过滤条件 */
  filters?: {
    /** 状态过滤 */
    status?: string;
    /** 类型过滤 */
    type?: string;
    /** 创建者过滤 */
    createdBy?: string;
  };
}
