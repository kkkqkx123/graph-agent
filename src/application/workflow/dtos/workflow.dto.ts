/**
 * 工作流DTO
 */
export interface WorkflowDto {
  /** 工作流ID */
  id: string;
  /** 工作流名称 */
  name: string;
  /** 工作流描述 */
  description?: string;
  /** 工作流状态 */
  status: string;
  /** 工作流类型 */
  type: string;
  /** 工作流配置 */
  config: Record<string, unknown>;
  /** 图ID */
  graphId?: string;
  /** 工作流版本 */
  version: string;
  /** 执行次数 */
  executionCount: number;
  /** 成功次数 */
  successCount: number;
  /** 失败次数 */
  failureCount: number;
  /** 平均执行时间（秒） */
  averageExecutionTime?: number;
  /** 最后执行时间 */
  lastExecutedAt?: string;
  /** 标签 */
  tags: string[];
  /** 元数据 */
  metadata: Record<string, unknown>;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
  /** 创建者ID */
  createdBy?: string;
  /** 更新者ID */
  updatedBy?: string;
}

/**
 * 工作流摘要DTO
 */
export interface WorkflowSummaryDto {
  /** 工作流ID */
  id: string;
  /** 工作流名称 */
  name: string;
  /** 工作流状态 */
  status: string;
  /** 工作流类型 */
  type: string;
  /** 执行次数 */
  executionCount: number;
  /** 成功率 */
  successRate: number;
  /** 平均执行时间（秒） */
  averageExecutionTime?: number;
  /** 最后执行时间 */
  lastExecutedAt?: string;
  /** 标签 */
  tags: string[];
  /** 创建时间 */
  createdAt: string;
}

/**
 * 工作流执行结果DTO
 */
export interface WorkflowExecutionResultDto {
  /** 执行ID */
  executionId: string;
  /** 工作流ID */
  workflowId: string;
  /** 执行状态 */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  /** 开始时间 */
  startTime: string;
  /** 结束时间 */
  endTime?: string;
  /** 执行持续时间（毫秒） */
  duration?: number;
  /** 执行输出 */
  output: Record<string, unknown>;
  /** 执行错误 */
  error?: string;
  /** 执行日志 */
  logs: Array<{
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    timestamp: string;
    nodeId?: string;
    edgeId?: string;
  }>;
  /** 执行统计信息 */
  statistics: {
    /** 执行节点数 */
    executedNodes: number;
    /** 总节点数 */
    totalNodes: number;
    /** 执行边数 */
    executedEdges: number;
    /** 总边数 */
    totalEdges: number;
    /** 执行路径 */
    executionPath: string[];
  };
  /** 执行元数据 */
  metadata: Record<string, unknown>;
}

/**
 * 工作流统计信息DTO
 */
export interface WorkflowStatisticsDto {
  /** 总工作流数 */
  totalWorkflows: number;
  /** 草稿工作流数 */
  draftWorkflows: number;
  /** 活跃工作流数 */
  activeWorkflows: number;
  /** 非活跃工作流数 */
  inactiveWorkflows: number;
  /** 归档工作流数 */
  archivedWorkflows: number;
  /** 总执行次数 */
  totalExecutions: number;
  /** 总成功次数 */
  totalSuccesses: number;
  /** 总失败次数 */
  totalFailures: number;
  /** 平均成功率 */
  averageSuccessRate: number;
  /** 平均执行时间（秒） */
  averageExecutionTime: number;
  /** 按状态分组的工作流数 */
  workflowsByStatus: Record<string, number>;
  /** 按类型分组的工作流数 */
  workflowsByType: Record<string, number>;
  /** 标签统计 */
  tagStatistics: Record<string, number>;
}