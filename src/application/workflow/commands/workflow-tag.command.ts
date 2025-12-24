/**
 * 添加工作流标签命令
 */
export interface AddWorkflowTagCommand {
  /** 工作流ID */
  workflowId: string;
  /** 标签 */
  tag: string;
  /** 操作用户ID */
  userId?: string;
}

/**
 * 移除工作流标签命令
 */
export interface RemoveWorkflowTagCommand {
  /** 工作流ID */
  workflowId: string;
  /** 标签 */
  tag: string;
  /** 操作用户ID */
  userId?: string;
}