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