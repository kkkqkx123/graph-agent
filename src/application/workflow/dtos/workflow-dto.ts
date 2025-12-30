import { z } from 'zod';
import { BaseDto } from '../../common/dto/base-dto';
import { Workflow, WorkflowStatus, WorkflowType } from '../../../domain/workflow';

/**
 * 工作流状态Schema
 */
export const WorkflowStatusSchema = z.enum(['draft', 'active', 'inactive', 'archived']);

/**
 * 工作流类型Schema
 */
export const WorkflowTypeSchema = z.enum(['sequential', 'parallel', 'conditional', 'hybrid']);

/**
 * 工作流创建Schema
 */
export const WorkflowCreateSchema = z.object({
  name: z.string().min(1, '工作流名称不能为空'),
  description: z.string().optional(),
  type: WorkflowTypeSchema.optional(),
  config: z.any().optional(),
  createdBy: z.string().optional()
});

/**
 * 工作流更新Schema
 */
export const WorkflowUpdateSchema = z.object({
  name: z.string().min(1, '工作流名称不能为空').optional(),
  description: z.string().optional(),
  config: z.any().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  userId: z.string().optional()
});

/**
 * 工作流状态变更Schema
 */
export const WorkflowStatusChangeSchema = z.object({
  workflowId: z.string().min(1, '工作流ID不能为空'),
  status: WorkflowStatusSchema,
  userId: z.string().optional(),
  reason: z.string().optional()
});

/**
 * 工作流标签操作Schema
 */
export const WorkflowTagOperationSchema = z.object({
  workflowId: z.string().min(1, '工作流ID不能为空'),
  tag: z.string().min(1, '标签不能为空'),
  userId: z.string().optional()
});

/**
 * 工作流批量状态更新Schema
 */
export const WorkflowBatchStatusUpdateSchema = z.object({
  workflowIds: z.array(z.string().min(1, '工作流ID不能为空')).min(1, '至少需要一个工作流ID'),
  status: WorkflowStatusSchema,
  userId: z.string().optional(),
  reason: z.string().optional()
});

/**
 * 工作流查询Schema
 */
export const WorkflowQuerySchema = z.object({
  workflowId: z.string().min(1, '工作流ID不能为空')
});

/**
 * 工作流列表查询Schema
 */
export const WorkflowListQuerySchema = z.object({
  filters: z.object({
    status: WorkflowStatusSchema.optional(),
    type: WorkflowTypeSchema.optional(),
    createdBy: z.string().optional(),
    name: z.string().optional(),
    tags: z.array(z.string()).optional()
  }).optional(),
  pagination: z.object({
    page: z.number().int().positive().optional(),
    size: z.number().int().positive().optional()
  }).optional(),
  includeSummary: z.boolean().optional()
});

/**
 * 工作流搜索Schema
 */
export const WorkflowSearchSchema = z.object({
  keyword: z.string().min(1, '搜索关键词不能为空'),
  searchIn: z.enum(['name', 'description', 'all']).optional(),
  pagination: z.object({
    page: z.number().int().positive().optional(),
    size: z.number().int().positive().optional()
  }).optional()
});

/**
 * 工作流执行Schema
 */
export const WorkflowExecutionSchema = z.object({
  workflowId: z.string().min(1, '工作流ID不能为空'),
  inputData: z.unknown().optional(),
  executionMode: z.string().optional(),
  async: z.boolean().optional()
});

/**
 * 工作流统计信息Schema
 */
export const WorkflowStatisticsSchema = z.object({
  totalWorkflows: z.number().int().nonnegative(),
  draftWorkflows: z.number().int().nonnegative(),
  activeWorkflows: z.number().int().nonnegative(),
  inactiveWorkflows: z.number().int().nonnegative(),
  archivedWorkflows: z.number().int().nonnegative(),
  totalExecutions: z.number().int().nonnegative(),
  totalSuccesses: z.number().int().nonnegative(),
  totalFailures: z.number().int().nonnegative(),
  averageSuccessRate: z.number().nonnegative(),
  averageExecutionTime: z.number().nonnegative(),
  workflowsByStatus: z.record(z.string(), z.number().int().nonnegative()),
  workflowsByType: z.record(z.string(), z.number().int().nonnegative()),
  tagStatistics: z.record(z.string(), z.number().int().nonnegative())
});

/**
 * 工作流执行结果Schema
 */
export const WorkflowExecutionResultSchema = z.object({
  executionId: z.string(),
  workflowId: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled', 'paused']),
  startTime: z.string(),
  endTime: z.string().optional(),
  duration: z.number().nonnegative().optional(),
  output: z.record(z.string(), z.unknown()),
  logs: z.array(z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']),
    message: z.string(),
    timestamp: z.string(),
    nodeId: z.string().optional(),
    edgeId: z.string().optional()
  })),
  statistics: z.object({
    executedNodes: z.number().int().nonnegative(),
    totalNodes: z.number().int().nonnegative(),
    executedEdges: z.number().int().nonnegative(),
    totalEdges: z.number().int().nonnegative(),
    executionPath: z.array(z.string())
  }),
  metadata: z.record(z.string(), z.unknown())
});

/**
 * 工作流DTO
 */
export class WorkflowDTO {
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

  constructor(data: {
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
  }) {
    this.workflowId = data.workflowId;
    this.name = data.name;
    this.description = data.description;
    this.status = data.status;
    this.type = data.type;
    this.config = data.config;
    this.metadata = data.metadata;
    this.tags = data.tags;
    this.createdBy = data.createdBy;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.isDeleted = data.isDeleted;
  }
}

/**
 * 工作流创建DTO
 */
export class WorkflowCreateDTO extends BaseDto<typeof WorkflowCreateSchema> {
  name: string;
  description?: string;
  type?: string;
  config?: any;
  createdBy?: string;

  constructor(data: z.infer<typeof WorkflowCreateSchema>) {
    super(WorkflowCreateSchema);
    this.name = data.name;
    this.description = data.description;
    this.type = data.type;
    this.config = data.config;
    this.createdBy = data.createdBy;
  }
}

/**
 * 工作流更新DTO
 */
export class WorkflowUpdateDTO extends BaseDto<typeof WorkflowUpdateSchema> {
  name?: string;
  description?: string;
  config?: any;
  metadata?: Record<string, unknown>;
  userId?: string;

  constructor(data: z.infer<typeof WorkflowUpdateSchema>) {
    super(WorkflowUpdateSchema);
    this.name = data.name;
    this.description = data.description;
    this.config = data.config;
    this.metadata = data.metadata;
    this.userId = data.userId;
  }
}

/**
 * 工作流状态变更DTO
 */
export class WorkflowStatusChangeDTO extends BaseDto<typeof WorkflowStatusChangeSchema> {
  workflowId: string;
  status: string;
  userId?: string;
  reason?: string;

  constructor(data: z.infer<typeof WorkflowStatusChangeSchema>) {
    super(WorkflowStatusChangeSchema);
    this.workflowId = data.workflowId;
    this.status = data.status;
    this.userId = data.userId;
    this.reason = data.reason;
  }
}

/**
 * 工作流标签操作DTO
 */
export class WorkflowTagOperationDTO extends BaseDto<typeof WorkflowTagOperationSchema> {
  workflowId: string;
  tag: string;
  userId?: string;

  constructor(data: z.infer<typeof WorkflowTagOperationSchema>) {
    super(WorkflowTagOperationSchema);
    this.workflowId = data.workflowId;
    this.tag = data.tag;
    this.userId = data.userId;
  }
}

/**
 * 工作流批量状态更新DTO
 */
export class WorkflowBatchStatusUpdateDTO extends BaseDto<typeof WorkflowBatchStatusUpdateSchema> {
  workflowIds: string[];
  status: string;
  userId?: string;
  reason?: string;

  constructor(data: z.infer<typeof WorkflowBatchStatusUpdateSchema>) {
    super(WorkflowBatchStatusUpdateSchema);
    this.workflowIds = data.workflowIds;
    this.status = data.status;
    this.userId = data.userId;
    this.reason = data.reason;
  }
}

/**
 * 工作流统计信息DTO
 */
export class WorkflowStatisticsDTO extends BaseDto<typeof WorkflowStatisticsSchema> {
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

  constructor(data: z.infer<typeof WorkflowStatisticsSchema>) {
    super(WorkflowStatisticsSchema);
    this.totalWorkflows = data.totalWorkflows;
    this.draftWorkflows = data.draftWorkflows;
    this.activeWorkflows = data.activeWorkflows;
    this.inactiveWorkflows = data.inactiveWorkflows;
    this.archivedWorkflows = data.archivedWorkflows;
    this.totalExecutions = data.totalExecutions;
    this.totalSuccesses = data.totalSuccesses;
    this.totalFailures = data.totalFailures;
    this.averageSuccessRate = data.averageSuccessRate;
    this.averageExecutionTime = data.averageExecutionTime;
    this.workflowsByStatus = data.workflowsByStatus;
    this.workflowsByType = data.workflowsByType;
    this.tagStatistics = data.tagStatistics;
  }
}

/**
 * 工作流执行结果DTO
 */
export class WorkflowExecutionResultDTO extends BaseDto<typeof WorkflowExecutionResultSchema> {
  executionId: string;
  workflowId: string;
  status: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  output: Record<string, unknown>;
  logs: Array<{
    level: string;
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

  constructor(data: z.infer<typeof WorkflowExecutionResultSchema>) {
    super(WorkflowExecutionResultSchema);
    this.executionId = data.executionId;
    this.workflowId = data.workflowId;
    this.status = data.status;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.duration = data.duration;
    this.output = data.output;
    this.logs = data.logs;
    this.statistics = data.statistics;
    this.metadata = data.metadata;
  }
}

/**
 * 工作流列表结果DTO
 */
export class WorkflowListResultDTO {
  workflows: WorkflowDTO[];
  total: number;
  page: number;
  size: number;

  constructor(data: {
    workflows: WorkflowDTO[];
    total: number;
    page: number;
    size: number;
  }) {
    this.workflows = data.workflows;
    this.total = data.total;
    this.page = data.page;
    this.size = data.size;
  }
}

/**
 * 工作流转换器
 */
export class WorkflowConverter {
  /**
   * 将Workflow领域对象转换为DTO
   */
  static toDto(workflow: Workflow): WorkflowDTO {
    return new WorkflowDTO({
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
      isDeleted: workflow.isDeleted()
    });
  }

  /**
   * 将Workflow领域对象数组转换为DTO数组
   */
  static toDtoArray(workflows: Workflow[]): WorkflowDTO[] {
    return workflows.map(workflow => this.toDto(workflow));
  }
}