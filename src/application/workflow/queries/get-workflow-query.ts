/**
 * 获取工作流查询
 */
export interface GetWorkflowQuery {
  /** 工作流ID */
  workflowId: string;
  /** 是否包含详细信息 */
  includeDetails?: boolean;
  /** 是否包含执行统计 */
  includeExecutionStats?: boolean;
}

/**
 * 获取工作流状态查询
 */
export interface GetWorkflowStatusQuery {
  /** 工作流ID */
  workflowId: string;
}
