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
  /** 工作流配置 */
  config?: Record<string, unknown>;
  /** 图ID */
  workflowId?: string;
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
  /** 新图ID */
  workflowId?: string;
  /** 新标签 */
  tags?: string[];
  /** 新元数据 */
  metadata?: Record<string, unknown>;
  /** 操作用户ID */
  userId?: string;
}

/**
 * 执行工作流命令
 */
export interface ExecuteWorkflowCommand {
  /** 工作流ID */
  workflowId: string;
  /** 输入数据 */
  inputData: Record<string, unknown>;
  /** 执行参数 */
  parameters?: Record<string, unknown>;
  /** 执行模式 */
  executionMode?: 'sequential' | 'parallel' | 'conditional';
  /** 执行优先级 */
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  /** 超时时间（秒） */
  timeout?: number;
  /** 是否异步执行 */
  async?: boolean;
  /** 操作用户ID */
  userId?: string;
}

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

/**
 * 批量操作工作流命令
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