/**
 * 工作流管理服务
 *
 * 负责工作流的查询、列表、搜索、更新和标签管理等管理功能
 * 支持子工作流加载、验证和合并
 */

import { injectable, inject } from 'inversify';
import { Workflow, IWorkflowRepository, WorkflowType, WorkflowQueryFilter, PaginationParams } from '../../domain/workflow';
import { ID, ILogger } from '../../domain/common';
import { BaseService } from '../common/base-service';
import { WorkflowDTO, mapWorkflowToDTO, mapWorkflowsToDTOs } from './dtos/workflow-dto';
import { WorkflowMerger } from './workflow-merger';
import { SubWorkflowValidator, SubWorkflowValidationResult } from './validators/subworkflow-validator';
import { SubWorkflowType } from '../../domain/workflow/value-objects/subworkflow-type';
import { WorkflowReference } from '../../domain/workflow/value-objects/workflow-reference';
import { NodeId } from '../../domain/workflow/value-objects/node/node-id';
import { NodeType, NodeContextTypeValue } from '../../domain/workflow/value-objects/node/node-type';
import { EdgeId, EdgeType } from '../../domain/workflow/value-objects/edge';
import { WorkflowConfig } from '../../domain/workflow/value-objects/workflow-config';
import { ErrorHandlingStrategy } from '../../domain/workflow/value-objects/error-handling-strategy';
import { ExecutionStrategy } from '../../domain/workflow/value-objects/execution/execution-strategy';
import { WorkflowStatus } from '../../domain/workflow/value-objects/workflow-status';
import { Version } from '../../domain/common/value-objects/version';
import { Timestamp } from '../../domain/common/value-objects/timestamp';

/**
 * 更新工作流参数
 */
export interface UpdateWorkflowParams {
  workflowId: string;
  name?: string;
  description?: string;
  config?: any;
  metadata?: Record<string, unknown>;
  userId?: string;
}

/**
 * 添加工作流标签参数
 */
export interface AddWorkflowTagParams {
  workflowId: string;
  tag: string;
  userId?: string;
}

/**
 * 移除工作流标签参数
 */
export interface RemoveWorkflowTagParams {
  workflowId: string;
  tag: string;
  userId?: string;
}

/**
 * 批量更新工作流状态参数
 */
export interface BatchUpdateWorkflowStatusParams {
  workflowIds: string[];
  status: string;
  userId?: string;
  reason?: string;
}

/**
 * 创建工作流参数
 */
export interface CreateWorkflowParams {
  name: string;
  description?: string;
  type?: string;
  config?: Record<string, any>;
  metadata?: Record<string, unknown>;
  tags?: string[];
  createdBy?: string;
}

/**
 * 删除工作流参数
 */
export interface DeleteWorkflowParams {
  workflowId: string;
  userId?: string;
  permanent?: boolean;
}

/**
 * 复制工作流参数
 */
export interface DuplicateWorkflowParams {
  workflowId: string;
  newName?: string;
  userId?: string;
}

/**
 * 获取工作流参数
 */
export interface GetWorkflowParams {
  workflowId: string;
}

/**
 * 列出工作流参数
 */
export interface ListWorkflowsParams {
  filters?: {
    status?: string;
    type?: string;
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
 * 搜索工作流参数
 */
export interface SearchWorkflowsParams {
  keyword: string;
  searchIn?: 'name' | 'description' | 'all';
  pagination?: {
    page?: number;
    size?: number;
  };
}

/**
 * 获取工作流状态参数
 */
export interface GetWorkflowStatusParams {
  workflowId: string;
}

/**
 * 工作流列表结果
 */
export interface WorkflowListResult {
  workflows: WorkflowDTO[];
  total: number;
  page: number;
  size: number;
}

/**
 * 工作流管理服务
 */
@injectable()
export class WorkflowManagement extends BaseService {
  constructor(
    @inject('WorkflowRepository') private readonly workflowRepository: IWorkflowRepository,
    @inject('WorkflowMerger') private readonly workflowMerger: WorkflowMerger,
    @inject('SubWorkflowValidator') private readonly subWorkflowValidator: SubWorkflowValidator,
    @inject('Logger') logger: ILogger
  ) {
    super(logger);
  }

  /**
   * 获取服务名称
   */
  protected getServiceName(): string {
    return '工作流管理服务';
  }

  /**
   * 创建工作流
   * @param params 创建工作流参数
   * @returns 创建的工作流DTO
   */
  async createWorkflow(params: CreateWorkflowParams): Promise<WorkflowDTO> {
    return this.executeCreateOperation(
      '工作流',
      async () => {
        const createdBy = this.parseOptionalId(params.createdBy, '创建者ID');
        
        const workflow = Workflow.create(
          params.name,
          params.description,
          params.type ? this.parseWorkflowType(params.type) : undefined,
          params.config ? this.parseWorkflowConfig(params.config) : undefined,
          createdBy
        );

        // 添加标签
        if (params.tags) {
          for (const tag of params.tags) {
            workflow = workflow.addTag(tag, createdBy);
          }
        }

        // 更新元数据
        if (params.metadata) {
          workflow = workflow.updateMetadata(params.metadata, createdBy);
        }

        const savedWorkflow = await this.workflowRepository.save(workflow);
        
        this.logger.info('工作流创建成功', {
          workflowId: savedWorkflow.workflowId.toString(),
          name: savedWorkflow.name
        });

        return mapWorkflowToDTO(savedWorkflow);
      },
      { name: params.name }
    );
  }

  /**
   * 更新工作流
   * @param params 更新工作流参数
   * @returns 更新后的工作流DTO
   */
  async updateWorkflow(params: UpdateWorkflowParams): Promise<WorkflowDTO> {
    return this.executeUpdateOperation(
      '工作流',
      async () => {
        const workflowId = this.parseId(params.workflowId, '工作流ID');
        const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

        if (!workflow.status.canEdit()) {
          throw new Error('只能编辑草稿状态的工作流');
        }

        const userId = this.parseOptionalId(params.userId, '用户ID');

        // 更新名称
        if (params.name !== undefined) {
          workflow = workflow.updateName(params.name, userId);
        }

        // 更新描述
        if (params.description !== undefined) {
          workflow = workflow.updateDescription(params.description, userId);
        }

        // 更新配置
        if (params.config !== undefined) {
          const config = this.parseWorkflowConfig(params.config);
          workflow = workflow.updateConfig(config, userId);
        }

        // 更新元数据
        if (params.metadata !== undefined) {
          workflow = workflow.updateMetadata(params.metadata, userId);
        }

        // 保存工作流
        const updatedWorkflow = await this.workflowRepository.save(workflow);

        return mapWorkflowToDTO(updatedWorkflow);
      },
      { workflowId: params.workflowId }
    );
  }

  /**
   * 删除工作流
   * @param params 删除工作流参数
   * @returns 删除是否成功
   */
  async deleteWorkflow(params: DeleteWorkflowParams): Promise<boolean> {
    return this.executeDeleteOperation(
      '工作流',
      async () => {
        const workflowId = this.parseId(params.workflowId, '工作流ID');
        const userId = this.parseOptionalId(params.userId, '用户ID');

        const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

        if (params.permanent) {
          // 硬删除
          await this.workflowRepository.delete(workflowId);
          this.logger.warn('工作流已永久删除', { workflowId: workflowId.toString() });
        } else {
          // 软删除
          const deletedWorkflow = workflow.markAsDeleted();
          await this.workflowRepository.save(deletedWorkflow);
          this.logger.info('工作流已软删除', { workflowId: workflowId.toString() });
        }

        return true;
      },
      { workflowId: params.workflowId, permanent: params.permanent }
    );
  }

  /**
   * 复制工作流
   * @param params 复制工作流参数
   * @returns 复制后的工作流DTO
   */
  async duplicateWorkflow(params: DuplicateWorkflowParams): Promise<WorkflowDTO> {
    return this.executeCreateOperation(
      '工作流副本',
      async () => {
        const workflowId = this.parseId(params.workflowId, '工作流ID');
        const userId = this.parseOptionalId(params.userId, '用户ID');
        
        const originalWorkflow = await this.workflowRepository.findByIdOrFail(workflowId);

        let duplicatedWorkflow = Workflow.create(
          params.newName || `${originalWorkflow.name} (副本)`,
          originalWorkflow.description,
          originalWorkflow.type,
          originalWorkflow.config,
          userId
        );

        // 复制节点
        for (const node of originalWorkflow.getNodes().values()) {
          duplicatedWorkflow = duplicatedWorkflow.addNode(node, userId);
        }

        // 复制边
        for (const edge of originalWorkflow.getEdges().values()) {
          duplicatedWorkflow = duplicatedWorkflow.addEdge(
            edge.id,
            edge.type,
            edge.fromNodeId,
            edge.toNodeId,
            edge.condition,
            edge.weight,
            edge.properties,
            userId
          );
        }

        // 复制子工作流引用
        for (const reference of originalWorkflow.getSubWorkflowReferences().values()) {
          duplicatedWorkflow = duplicatedWorkflow.addSubWorkflowReference(reference, userId);
        }

        // 复制标签
        for (const tag of originalWorkflow.tags) {
          duplicatedWorkflow = duplicatedWorkflow.addTag(tag, userId);
        }
        
        // 复制元数据
        duplicatedWorkflow = duplicatedWorkflow.updateMetadata(originalWorkflow.metadata, userId);

        const savedWorkflow = await this.workflowRepository.save(duplicatedWorkflow);
        
        this.logger.info('工作流复制成功', {
          originalId: params.workflowId,
          newId: savedWorkflow.workflowId.toString()
        });

        return mapWorkflowToDTO(savedWorkflow);
      },
      { originalWorkflowId: params.workflowId, newName: params.newName }
    );
  }

  /**
   * 添加工作流标签
   * @param params 添加工作流标签参数
   * @returns 更新后的工作流DTO
   */
  async addWorkflowTag(params: AddWorkflowTagParams): Promise<WorkflowDTO> {
    return this.executeUpdateOperation(
      '工作流',
      async () => {
        const workflowId = this.parseId(params.workflowId, '工作流ID');
        const userId = this.parseOptionalId(params.userId, '用户ID');

        const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

        // 添加标签
        const updatedWorkflow = workflow.addTag(params.tag, userId);

        // 保存工作流
        const savedWorkflow = await this.workflowRepository.save(updatedWorkflow);

        return mapWorkflowToDTO(savedWorkflow);
      },
      { workflowId: params.workflowId, tag: params.tag }
    );
  }

  /**
   * 移除工作流标签
   * @param params 移除工作流标签参数
   * @returns 更新后的工作流DTO
   */
  async removeWorkflowTag(params: RemoveWorkflowTagParams): Promise<WorkflowDTO> {
    return this.executeUpdateOperation(
      '工作流',
      async () => {
        const workflowId = this.parseId(params.workflowId, '工作流ID');
        const userId = this.parseOptionalId(params.userId, '用户ID');

        const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

        // 移除标签
        const updatedWorkflow = workflow.removeTag(params.tag, userId);

        // 保存工作流
        const savedWorkflow = await this.workflowRepository.save(updatedWorkflow);

        return mapWorkflowToDTO(savedWorkflow);
      },
      { workflowId: params.workflowId, tag: params.tag }
    );
  }

  /**
   * 批量更新工作流状态
   * @param params 批量更新工作流状态参数
   * @returns 更新的工作流数量
   */
  async batchUpdateWorkflowStatus(params: BatchUpdateWorkflowStatusParams): Promise<number> {
    return this.executeBusinessOperation(
      '工作流',
      async () => {
        const workflowIds = params.workflowIds.map((id: string) => this.parseId(id, '工作流ID'));
        const status = this.parseWorkflowStatus(params.status);
        const userId = this.parseOptionalId(params.userId, '用户ID');

        // 批量更新状态
        const updatedCount = await this.workflowRepository.batchUpdateStatus(
          workflowIds,
          status,
          userId,
          params.reason
        );

        return updatedCount;
      },
      { workflowIds: params.workflowIds, status: params.status }
    );
  }

  /**
   * 获取工作流
   * @param params 获取工作流参数
   * @returns 工作流DTO或null
   */
  async getWorkflow(params: GetWorkflowParams): Promise<WorkflowDTO | null> {
    return this.executeGetOperation(
      '工作流',
      async () => {
        const workflowId = this.parseId(params.workflowId, '工作流ID');
        const workflow = await this.workflowRepository.findById(workflowId);

        if (!workflow) {
          return null;
        }

        return mapWorkflowToDTO(workflow);
      },
      { workflowId: params.workflowId }
    );
  }

  /**
   * 列出工作流
   * @param params 列出工作流参数
   * @returns 工作流列表结果
   */
  async listWorkflows(params: ListWorkflowsParams): Promise<WorkflowListResult> {
    return this.executeQueryOperation(
      '工作流列表',
      async () => {
        // 构建查询过滤器
        const filter: WorkflowQueryFilter = {};

        if (params.filters?.status) {
          filter.status = this.parseWorkflowStatus(params.filters.status);
        }

        if (params.filters?.type) {
          filter.type = this.parseWorkflowType(params.filters.type);
        }

        if (params.filters?.createdBy) {
          filter.createdBy = this.parseId(params.filters.createdBy, '创建者ID');
        }

        if (params.filters?.name) {
          filter.nameKeyword = params.filters.name;
        }

        if (params.filters?.tags && params.filters.tags.length > 0) {
          filter.tags = params.filters.tags;
        }

        // 构建分页参数
        const page = params.pagination?.page || 1;
        const size = params.pagination?.size || 20;
        const pagination: PaginationParams = { page, size };

        // 使用仓储层的复合查询方法
        const paginatedResult = await this.workflowRepository.queryWithFilter(filter, pagination);

        return {
          workflows: mapWorkflowsToDTOs(paginatedResult.items),
          total: paginatedResult.total,
          page: paginatedResult.page,
          size: paginatedResult.size,
        };
      },
      { filters: params.filters, pagination: params.pagination }
    );
  }

  /**
   * 获取工作流状态
   * @param params 获取工作流状态参数
   * @returns 工作流状态
   */
  async getWorkflowStatus(params: GetWorkflowStatusParams): Promise<string> {
    return this.executeQueryOperation(
      '工作流状态',
      async () => {
        const workflowId = this.parseId(params.workflowId, '工作流ID');
        const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

        return workflow.status.toString();
      },
      { workflowId: params.workflowId }
    );
  }

  /**
   * 搜索工作流
   * @param params 搜索工作流参数
   * @returns 工作流列表结果
   */
  async searchWorkflows(params: SearchWorkflowsParams): Promise<WorkflowListResult> {
    return this.executeQueryOperation(
      '工作流搜索',
      async () => {
        // 使用仓储层的搜索能力
        let workflows: Workflow[] = [];
        
        switch (params.searchIn) {
          case 'name':
            workflows = await this.workflowRepository.searchByName(params.keyword);
            break;
          case 'description':
            workflows = await this.workflowRepository.searchByDescription(params.keyword);
            break;
          case 'all':
          default:
            // 并行搜索名称和描述
            const [nameResults, descResults] = await Promise.all([
              this.workflowRepository.searchByName(params.keyword),
              this.workflowRepository.searchByDescription(params.keyword)
            ]);
            
            // 使用 Map 去重，比 filter 更高效
            const workflowMap = new Map<string, Workflow>();
            [...nameResults, ...descResults].forEach(wf => {
              workflowMap.set(wf.workflowId.toString(), wf);
            });
            workflows = Array.from(workflowMap.values());
            break;
        }

        // 应用分页
        const page = params.pagination?.page || 1;
        const size = params.pagination?.size || 20;
        const startIndex = (page - 1) * size;
        const endIndex = startIndex + size;
        const paginatedWorkflows = workflows.slice(startIndex, endIndex);

        return {
          workflows: mapWorkflowsToDTOs(paginatedWorkflows),
          total: workflows.length,
          page,
          size: paginatedWorkflows.length
        };
      },
      { keyword: params.keyword, searchIn: params.searchIn }
    );
  }

  /**
   * 验证子工作流标准
   * @param workflowId 工作流ID
   * @returns 验证结果
   */
  async validateSubWorkflowStandards(workflowId: string): Promise<SubWorkflowValidationResult> {
    return this.executeBusinessOperation(
      '子工作流验证',
      async () => {
        this.logger.info('开始验证子工作流标准', { workflowId });

        // 1. 获取工作流
        const id = this.parseId(workflowId, '工作流ID');
        const workflow = await this.workflowRepository.findByIdOrFail(id);

        // 2. 验证子工作流标准
        const validationResult = await this.subWorkflowValidator.validate(workflow);

        this.logger.info('子工作流验证完成', {
          workflowId,
          isValid: validationResult.isValid,
          subWorkflowType: validationResult.subWorkflowType?.toString(),
          errorCount: validationResult.errors.length,
          warningCount: validationResult.warnings.length
        });

        return validationResult;
      },
      { workflowId }
    );
  }

  /**
   * 解析工作流状态
   */
  private parseWorkflowStatus(status: string): WorkflowStatus {
    return WorkflowStatus.fromString(status);
  }

  /**
   * 解析工作流类型
   */
  private parseWorkflowType(type: string): WorkflowType {
    return WorkflowType.fromString(type);
  }

  /**
   * 解析工作流配置
   */
  private parseWorkflowConfig(config: Record<string, any>): WorkflowConfig {
    return WorkflowConfig.create(config);
  }
}
