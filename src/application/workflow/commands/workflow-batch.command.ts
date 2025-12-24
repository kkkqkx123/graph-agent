/**
 * 批量更新工作流状态命令
 */
export interface BatchUpdateWorkflowStatusCommand {
  /** 工作流ID列表 */
  workflowIds: string[];
  /** 新状态 */
  status: string;
  /** 操作用户ID */
  userId?: string;
  /** 操作原因 */
  reason?: string;
}

/**
 * 批量操作命令
 */
export interface BatchOperationCommand {
  /** 工作流ID */
  workflowId: string;
  /** 操作类型 */
  operationType: 'add_nodes' | 'remove_nodes' | 'add_edges' | 'remove_edges';
  /** 操作数据 */
  operationData: any[];
  /** 操作用户ID */
  userId?: string;
}