/**
 * 获取工作流执行历史查询
 */
export interface GetWorkflowExecutionHistoryQuery {
  /** 工作流ID */
  workflowId: string;
  /** 分页参数 */
  pagination?: {
    /** 页码 */
    page: number;
    /** 每页大小 */
    size: number;
  };
  /** 过滤条件 */
  filters?: {
    /** 执行状态过滤 */
    status?: string;
    /** 开始时间范围过滤 */
    startedAfter?: string;
    startedBefore?: string;
    /** 结束时间范围过滤 */
    endedAfter?: string;
    endedBefore?: string;
  };
  /** 排序条件 */
  sortBy?: 'startTime' | 'endTime' | 'duration';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 获取工作流执行路径查询
 */
export interface GetWorkflowExecutionPathQuery {
  /** 工作流ID */
  workflowId: string;
  /** 执行ID */
  executionId?: string;
}
