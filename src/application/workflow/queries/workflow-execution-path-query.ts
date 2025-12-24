/**
 * 获取工作流执行路径查询
 */
export interface GetWorkflowExecutionPathQuery {
  /** 工作流ID */
  workflowId: string;
  /** 执行ID */
  executionId?: string;
}