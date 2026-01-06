/**
 * Workflow模块DTO定义
 * 简化后的DTO实现，使用简单接口和映射函数
 */

import { Workflow } from '../../../domain/workflow';

// ==================== DTO接口定义 ====================

/**
 * 工作流状态DTO
 */
export type WorkflowStatusDTO = 'draft' | 'active' | 'inactive' | 'archived';

/**
 * 工作流类型DTO
 */
export type WorkflowTypeDTO = 'sequential' | 'parallel' | 'conditional' | 'hybrid';

/**
 * 工作流DTO
 */
export interface WorkflowDTO {
  workflowId: string;
  name: string;
  description?: string;
  status: string;
  type: string;
  config?: any;
  metadata?: Record<string, unknown>;
  tags: string[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

/**
 * 工作流创建DTO
 */
export interface WorkflowCreateDTO {
  name: string;
  description?: string;
  type?: WorkflowTypeDTO;
  config?: any;
  createdBy?: string;
}

/**
 * 工作流更新DTO
 */
export interface WorkflowUpdateDTO {
  name?: string;
  description?: string;
  config?: any;
  metadata?: Record<string, unknown>;
  userId?: string;
}

/**
 * 工作流状态变更DTO
 */
export interface WorkflowStatusChangeDTO {
  workflowId: string;
  status: WorkflowStatusDTO;
  userId?: string;
  reason?: string;
}

/**
 * 工作流标签操作DTO
 */
export interface WorkflowTagOperationDTO {
  workflowId: string;
  tag: string;
  userId?: string;
}

/**
 * 工作流批量状态更新DTO
 */
export interface WorkflowBatchStatusUpdateDTO {
  workflowIds: string[];
  status: WorkflowStatusDTO;
  userId?: string;
  reason?: string;
}

/**
 * 工作流查询DTO
 */
export interface WorkflowQueryDTO {
  workflowId: string;
}

/**
 * 工作流列表查询DTO
 */
export interface WorkflowListQueryDTO {
  filters?: {
    status?: WorkflowStatusDTO;
    type?: WorkflowTypeDTO;
    createdBy?: string;
    name?: string;
    tags?: string[];
  };
  pagination?: {
    page?: number;
    size?: number;
  };
  includeSummary?: boolean;
}

/**
 * 工作流搜索DTO
 */
export interface WorkflowSearchDTO {
  keyword: string;
  searchIn?: 'name' | 'description' | 'all';
  pagination?: {
    page?: number;
    size?: number;
  };
}

/**
 * 工作流执行DTO
 */
export interface WorkflowExecutionDTO {
  workflowId: string;
  inputData?: unknown;
  executionMode?: string;
  async?: boolean;
}

/**
 * 工作流统计信息DTO
 */
export interface WorkflowStatisticsDTO {
  totalWorkflows: number;
  draftWorkflows: number;
  activeWorkflows: number;
  inactiveWorkflows: number;
  archivedWorkflows: number;
  totalExecutions: number;
  totalSuccesses: number;
  totalFailures: number;
  averageSuccessRate: number;
  averageExecutionTime: number;
  workflowsByStatus: Record<string, number>;
  workflowsByType: Record<string, number>;
  tagStatistics: Record<string, number>;
}

/**
 * 工作流执行结果DTO
 */
export interface WorkflowExecutionResultDTO {
  executionId: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  startTime: string;
  endTime?: string;
  duration?: number;
  output: Record<string, unknown>;
  logs: Array<{
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    timestamp: string;
    nodeId?: string;
    edgeId?: string;
  }>;
  statistics: {
    executedNodes: number;
    totalNodes: number;
    executedEdges: number;
    totalEdges: number;
    executionPath: string[];
  };
  metadata: Record<string, unknown>;
}

/**
 * 工作流列表结果DTO
 */
export interface WorkflowListResultDTO {
  workflows: WorkflowDTO[];
  total: number;
  page: number;
  size: number;
}

// ==================== 映射函数 ====================

/**
 * 将Workflow领域对象转换为WorkflowDTO
 */
export const mapWorkflowToDTO = (workflow: Workflow): WorkflowDTO => {
  return {
    workflowId: workflow.workflowId.toString(),
    name: workflow.name,
    description: workflow.description,
    status: workflow.status.toString(),
    type: workflow.type.toString(),
    config: workflow.config,
    metadata: workflow.metadata,
    tags: workflow.tags,
    createdBy: workflow.createdBy?.toString(),
    createdAt: workflow.createdAt.toISOString(),
    updatedAt: workflow.updatedAt.toISOString(),
    isDeleted: workflow.isDeleted(),
  };
};

/**
 * 批量将Workflow领域对象转换为WorkflowDTO
 */
export const mapWorkflowsToDTOs = (workflows: Workflow[]): WorkflowDTO[] => {
  return workflows.map(mapWorkflowToDTO);
};
