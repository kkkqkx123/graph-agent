/**
 * 工作流管理服务
 *
 * 负责工作流的查询、列表、搜索、更新和标签管理等管理功能
 * 支持子工作流加载、验证和合并
 */

import { injectable, inject } from 'inversify';
import { Workflow, IWorkflowRepository } from '../../domain/workflow';
import { ID, ILogger } from '../../domain/common';
import { BaseService } from '../common/base-service';
import { WorkflowDTO, mapWorkflowToDTO, mapWorkflowsToDTOs } from './dtos/workflow-dto';
import { WorkflowConfigLoader } from '../../infrastructure/config/loading/workflow-config-loader';
import { WorkflowMerger } from './workflow-merger';
import { SubWorkflowValidator, SubWorkflowValidationResult } from './validators/subworkflow-validator';
import { LLMNode } from './nodes/llm-node';
import { ToolCallNode } from './nodes/tool-call-node';
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
    @inject('WorkflowConfigLoader') private readonly configLoader: WorkflowConfigLoader,
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
          workflow.updateName(params.name, userId);
        }

        // 更新描述
        if (params.description !== undefined) {
          workflow.updateDescription(params.description, userId);
        }

        // 更新配置
        if (params.config !== undefined) {
          const config = params.config as any;
          workflow.updateConfig(config, userId);
        }

        // 更新元数据
        if (params.metadata !== undefined) {
          workflow.updateMetadata(params.metadata, userId);
        }

        // 保存工作流
        const updatedWorkflow = await this.workflowRepository.save(workflow);

        return mapWorkflowToDTO(updatedWorkflow);
      },
      { workflowId: params.workflowId }
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
        workflow.addTag(params.tag, userId);

        // 保存工作流
        const savedWorkflow = await this.workflowRepository.save(workflow);

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
        workflow.removeTag(params.tag, userId);

        // 保存工作流
        const savedWorkflow = await this.workflowRepository.save(workflow);

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
        // 获取所有工作流
        const allWorkflows = await this.workflowRepository.findAll();

        // 应用过滤条件
        let filteredWorkflows = allWorkflows;

        if (params.filters?.status) {
          const status = this.parseWorkflowStatus(params.filters.status);
          filteredWorkflows = allWorkflows.filter(wf => wf.status.equals(status));
        }

        if (params.filters?.type) {
          const type = this.parseWorkflowType(params.filters.type);
          filteredWorkflows = filteredWorkflows.filter(wf => wf.type.equals(type));
        }

        if (params.filters?.createdBy) {
          const createdBy = this.parseId(params.filters.createdBy, '创建者ID');
          filteredWorkflows = filteredWorkflows.filter(wf => wf.createdBy?.equals(createdBy));
        }

        if (params.filters?.name) {
          filteredWorkflows = filteredWorkflows.filter(wf =>
            wf.name.toLowerCase().includes(params.filters!.name!.toLowerCase())
          );
        }

        if (params.filters?.tags && params.filters.tags.length > 0) {
          filteredWorkflows = filteredWorkflows.filter(wf =>
            params.filters!.tags!.some((tag: string) => wf.tags.includes(tag))
          );
        }

        // 应用分页
        const page = params.pagination?.page || 1;
        const size = params.pagination?.size || 20;
        const startIndex = (page - 1) * size;
        const endIndex = startIndex + size;
        const paginatedWorkflows = filteredWorkflows.slice(startIndex, endIndex);

        const result: WorkflowListResult = {
          workflows: mapWorkflowsToDTOs(paginatedWorkflows),
          total: filteredWorkflows.length,
          page,
          size: paginatedWorkflows.length,
        };

        return result;
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
        // 根据搜索范围构建查询
        let workflows: Workflow[] = [];

        if (params.searchIn === 'name' || params.searchIn === 'all') {
          const nameResults = await this.workflowRepository.searchByName(params.keyword);
          workflows = workflows.concat(nameResults);
        }

        if (params.searchIn === 'description' || params.searchIn === 'all') {
          const descResults = await this.workflowRepository.searchByDescription(params.keyword);
          workflows = workflows.concat(descResults);
        }

        // 去重
        const uniqueWorkflows = workflows.filter(
          (workflow, index, self) =>
            index === self.findIndex(w => w.workflowId.equals(workflow.workflowId))
        );

        // 应用分页
        const page = params.pagination?.page || 1;
        const size = params.pagination?.size || 20;
        const startIndex = (page - 1) * size;
        const endIndex = startIndex + size;
        const paginatedWorkflows = uniqueWorkflows.slice(startIndex, endIndex);

        const result: WorkflowListResult = {
          workflows: mapWorkflowsToDTOs(paginatedWorkflows),
          total: uniqueWorkflows.length,
          page,
          size: paginatedWorkflows.length,
        };

        return result;
      },
      { keyword: params.keyword, searchIn: params.searchIn }
    );
  }

  /**
   * 加载工作流（包括子工作流合并）
   * @param workflowId 工作流ID
   * @param parameters 参数值（可选）
   * @returns 工作流实例
   */
  async loadWorkflow(workflowId: string, parameters?: Record<string, any>): Promise<Workflow> {
    return this.executeBusinessOperation(
      '工作流加载',
      async () => {
        this.logger.info('开始加载工作流', { workflowId, parameters: parameters ? Object.keys(parameters) : [] });

        // 1. 加载工作流配置
        const config = await this.configLoader.loadWorkflowConfig(workflowId, parameters);
        this.logger.debug('工作流配置加载完成', { workflowId });

        // 2. 转换为Workflow对象
        const workflow = this.convertConfigToWorkflow(config);
        this.logger.debug('工作流对象创建完成', { workflowId });

        // 3. 检查是否有子工作流引用
        const subWorkflowRefs = workflow.getSubWorkflowReferences();

        if (subWorkflowRefs.size > 0) {
          this.logger.info('工作流包含子工作流引用，开始合并', {
            workflowId,
            subWorkflowCount: subWorkflowRefs.size
          });

          // 4. 递归合并子工作流
          const mergeResult = await this.workflowMerger.mergeWorkflow(workflow);
          this.logger.info('子工作流合并完成', { workflowId });

          return mergeResult.mergedWorkflow;
        }

        this.logger.info('工作流加载完成（无子工作流）', { workflowId });
        return workflow;
      },
      { workflowId, hasParameters: !!parameters }
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

        // 1. 加载工作流
        const workflow = await this.loadWorkflow(workflowId);
        this.logger.debug('工作流加载完成', { workflowId });

        // 2. 验证子工作流标准
        const validationResult = await this.subWorkflowValidator.validateSubWorkflow(workflow);

        this.logger.info('子工作流验证完成', {
          workflowId,
          isValid: validationResult.isValid,
          workflowType: validationResult.workflowType,
          errorCount: validationResult.errors.length,
          warningCount: validationResult.warnings.length
        });

        return validationResult;
      },
      { workflowId }
    );
  }

  /**
   * 将配置转换为Workflow对象
   * @param config 工作流配置
   * @returns Workflow实例
   */
  private convertConfigToWorkflow(config: any): Workflow {
    try {
      const workflowConfig = config.workflow;

      // 1. 创建Workflow实例
      const workflow = Workflow.create(
        workflowConfig.name,
        workflowConfig.description
      );

      // 2. 添加节点
      for (const nodeConfig of workflowConfig.nodes || []) {
        const node = this.createNodeFromConfig(nodeConfig);
        workflow.addNode(node);
      }

      // 3. 添加边
      for (const edgeConfig of workflowConfig.edges || []) {
        const edgeId = EdgeId.fromString(`${edgeConfig.from}_${edgeConfig.to}`);
        const edgeType = EdgeType.default();
        const fromNodeId = NodeId.fromString(edgeConfig.from);
        const toNodeId = NodeId.fromString(edgeConfig.to);

        // 构建条件对象
        let condition;
        if (edgeConfig.condition) {
          condition = {
            type: 'function' as const,
            functionId: edgeConfig.condition
          };
        }

        workflow.addEdge(
          edgeId,
          edgeType,
          fromNodeId,
          toNodeId,
          condition,
          edgeConfig.weight,
          edgeConfig.properties
        );
      }

      this.logger.debug('配置转换为Workflow对象完成', {
        workflowId: workflowConfig.id,
        nodeCount: workflowConfig.nodes?.length || 0,
        edgeCount: workflowConfig.edges?.length || 0
      });

      return workflow;
    } catch (error) {
      this.logger.error('配置转换失败', error as Error);
      throw new Error(`配置转换为Workflow对象失败: ${(error as Error).message}`);
    }
  }

  /**
   * 根据配置创建节点
   * @param nodeConfig 节点配置
   * @returns Node实例
   */
  private createNodeFromConfig(nodeConfig: any): any {
    const nodeId = NodeId.fromString(nodeConfig.id);
    const nodeType = nodeConfig.type;
    const config = nodeConfig.config || {};

    switch (nodeType) {
      case 'llm':
        return new LLMNode(
          nodeId,
          config.wrapper_name || 'openai',
          config.prompt || { type: 'direct', content: '' },
          config.system_prompt,
          config.context_processor_name || 'llm',
          config.temperature,
          config.max_tokens,
          config.stream || false,
          nodeConfig.name,
          nodeConfig.description,
          nodeConfig.position
        );

      case 'tool':
        return new ToolCallNode(
          nodeId,
          config.tool_name || '',
          config.tool_parameters || {},
          config.timeout || 30000,
          nodeConfig.name,
          nodeConfig.description,
          nodeConfig.position
        );

      default:
        // 对于其他节点类型，创建通用节点
        const { Node } = require('../../domain/workflow/entities/node');
        const nodeTypeVO = NodeType.fromString(nodeType, NodeContextTypeValue.PASS_THROUGH);

        return Node.create(
          nodeId,
          nodeTypeVO,
          nodeConfig.name || nodeType,
          nodeConfig.description || '',
          config
        );
    }
  }

  /**
   * 解析工作流状态
   */
  private parseWorkflowStatus(status: string) {
    const { WorkflowStatus } = require('../../domain/workflow');
    return WorkflowStatus.fromString(status);
  }

  /**
   * 解析工作流类型
   */
  private parseWorkflowType(type: string) {
    const { WorkflowType } = require('../../domain/workflow');
    return WorkflowType.fromString(type);
  }
}