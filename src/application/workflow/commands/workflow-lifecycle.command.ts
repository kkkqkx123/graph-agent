/**
 * 创建工作流命令
 */
export interface CreateWorkflowCommand {
  /** 工作流名称 */
  name: string;
  /** 工作流描述 */
  description?: string;
  /** 工作流类型 */
  type?: string;
  /** 工作流ID */
  workflowId?: string;
  /** 工作流配置 */
  config?: Record<string, unknown>;
  /** 标签 */
  tags?: string[];
  /** 元数据 */
  metadata?: Record<string, unknown>;
  /** 创建者ID */
  createdBy?: string;
}

/**
 * 激活工作流命令
 */
export interface ActivateWorkflowCommand {
  /** 工作流ID */
  workflowId: string;
  /** 操作用户ID */
  userId?: string;
  /** 激活原因 */
  reason?: string;
}

/**
 * 停用工作流命令
 */
export interface DeactivateWorkflowCommand {
  /** 工作流ID */
  workflowId: string;
  /** 操作用户ID */
  userId?: string;
  /** 停用原因 */
  reason?: string;
}

/**
 * 归档工作流命令
 */
export interface ArchiveWorkflowCommand {
  /** 工作流ID */
  workflowId: string;
  /** 操作用户ID */
  userId?: string;
  /** 归档原因 */
  reason?: string;
}

/**
 * 更新工作流命令
 */
export interface UpdateWorkflowCommand {
  /** 工作流ID */
  workflowId: string;
  /** 新名称 */
  name?: string;
  /** 新描述 */
  description?: string;
  /** 新配置 */
  config?: Record<string, unknown>;
  /** 新标签 */
  tags?: string[];
  /** 新元数据 */
  metadata?: Record<string, unknown>;
  /** 操作用户ID */
  userId?: string;
}

/**
 * 删除工作流命令
 */
export interface DeleteWorkflowCommand {
  /** 工作流ID */
  workflowId: string;
  /** 操作用户ID */
  userId?: string;
  /** 删除原因 */
  reason?: string;
}