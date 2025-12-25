import { injectable, inject } from 'inversify';
import { Workflow } from '../../../domain/workflow/entities/workflow';
import { WorkflowRepository } from '../../../domain/workflow/repositories/workflow-repository';
import { WorkflowDomainService } from '../../../domain/workflow/services/domain-service';
import { ID } from '../../../domain/common/value-objects/id';
import { WorkflowStatus } from '../../../domain/workflow/value-objects/workflow-status';
import { WorkflowType } from '../../../domain/workflow/value-objects/workflow-type';
import { WorkflowConfig } from '../../../domain/workflow/value-objects/workflow-config';
import { ILogger } from '../../../domain/common/types/logger-types';
import { NodeId } from '../../../domain/workflow/value-objects/node-id';
import { NodeType } from '../../../domain/workflow/value-objects/node-type';
import { EdgeId } from '../../../domain/workflow/value-objects/edge-id';
import { EdgeType } from '../../../domain/workflow/value-objects/edge-type';

// DTOs
import {
  WorkflowDto,
  WorkflowSummaryDto
} from '../dtos/workflow.dto';
import { WorkflowExecutionResultDto } from '../dtos/workflow-execution.dto';
import { WorkflowStatisticsDto } from '../dtos/workflow-statistics.dto';

// Commands
import {
  CreateWorkflowCommand,
  ActivateWorkflowCommand,
  DeactivateWorkflowCommand,
  ArchiveWorkflowCommand,
  UpdateWorkflowCommand,
  DeleteWorkflowCommand
} from '../commands/workflow-lifecycle.command';
import { ExecuteWorkflowCommand } from '../commands/workflow-execution.command';
import {
  AddWorkflowTagCommand,
  RemoveWorkflowTagCommand
} from '../commands/workflow-tag.command';
import { BatchUpdateWorkflowStatusCommand } from '../commands/workflow-batch.command';

// Queries
import {
  GetWorkflowQuery,
  ListWorkflowsQuery,
  GetWorkflowStatusQuery,
  SearchWorkflowsQuery
} from '../queries';
import { GetWorkflowStatisticsQuery } from '../queries/workflow-statistics-query';
import { GetWorkflowTagStatsQuery } from '../queries/workflow-tag-stats-query';

/**
 * 工作流应用服务
 * 
 * 负责工作流相关的业务流程编排和协调
 * 处理复杂查询和统计逻辑
 */
@injectable()
export class WorkflowService {
  constructor(
    @inject('WorkflowRepository') private readonly workflowRepository: WorkflowRepository,
    @inject('WorkflowDomainService') private readonly workflowDomainService: WorkflowDomainService,
    @inject('Logger') private readonly logger: ILogger
  ) {}

  /**
   * 创建工作流
   * @param command 创建工作流命令
   * @returns 创建的工作流DTO
   */
  async createWorkflow(command: CreateWorkflowCommand): Promise<WorkflowDto> {
    try {
      this.logger.info('正在创建工作流', {
        name: command.name,
        type: command.type,
        workflowId: command.workflowId
      });

      // 转换命令参数
      const type = command.type ? WorkflowType.fromString(command.type) : undefined;
      const config = command.config ? command.config as any : undefined;
      const createdBy = command.createdBy ? ID.fromString(command.createdBy) : undefined;

      // 验证创建条件
      await this.workflowDomainService.validateWorkflowCreation(command.name, config, createdBy);

      // 创建工作流
      const workflow = Workflow.create(
        command.name,
        command.description,
        type,
        config,
        createdBy
      );

      // 保存工作流
      const savedWorkflow = await this.workflowRepository.save(workflow);

      this.logger.info('工作流创建成功', { workflowId: savedWorkflow.workflowId.toString() });

      return this.toWorkflowDto(savedWorkflow);
    } catch (error) {
      this.logger.error('创建工作流失败', error as Error);
      throw error;
    }
  }

  /**
   * 激活工作流
   * @param command 激活工作流命令
   * @returns 激活后的工作流DTO
   */
  async activateWorkflow(command: ActivateWorkflowCommand): Promise<WorkflowDto> {
    try {
      this.logger.info('正在激活工作流', { workflowId: command.workflowId });

      const workflowId = ID.fromString(command.workflowId);
      const userId = command.userId ? ID.fromString(command.userId) : undefined;

      const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

      // 验证状态转换
      this.workflowDomainService.validateStatusTransition(workflow, WorkflowStatus.active());

      // 激活工作流
      workflow.changeStatus(WorkflowStatus.active(), userId, command.reason);

      // 保存工作流
      const savedWorkflow = await this.workflowRepository.save(workflow);

      this.logger.info('工作流激活成功', { workflowId: command.workflowId });

      return this.toWorkflowDto(savedWorkflow);
    } catch (error) {
      this.logger.error('激活工作流失败', error as Error);
      throw error;
    }
  }

  /**
   * 停用工作流
   * @param command 停用工作流命令
   * @returns 停用后的工作流DTO
   */
  async deactivateWorkflow(command: DeactivateWorkflowCommand): Promise<WorkflowDto> {
    try {
      this.logger.info('正在停用工作流', { workflowId: command.workflowId });

      const workflowId = ID.fromString(command.workflowId);
      const userId = command.userId ? ID.fromString(command.userId) : undefined;

      const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

      // 验证状态转换
      this.workflowDomainService.validateStatusTransition(workflow, WorkflowStatus.inactive());

      // 停用工作流
      workflow.changeStatus(WorkflowStatus.inactive(), userId, command.reason);

      // 保存工作流
      const savedWorkflow = await this.workflowRepository.save(workflow);

      this.logger.info('工作流停用成功', { workflowId: command.workflowId });

      return this.toWorkflowDto(savedWorkflow);
    } catch (error) {
      this.logger.error('停用工作流失败', error as Error);
      throw error;
    }
  }

  /**
   * 归档工作流
   * @param command 归档工作流命令
   * @returns 归档后的工作流DTO
   */
  async archiveWorkflow(command: ArchiveWorkflowCommand): Promise<WorkflowDto> {
    try {
      this.logger.info('正在归档工作流', { workflowId: command.workflowId });

      const workflowId = ID.fromString(command.workflowId);
      const userId = command.userId ? ID.fromString(command.userId) : undefined;

      const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

      // 验证状态转换
      this.workflowDomainService.validateStatusTransition(workflow, WorkflowStatus.archived());

      // 归档工作流
      workflow.changeStatus(WorkflowStatus.archived(), userId, command.reason);

      // 保存工作流
      const savedWorkflow = await this.workflowRepository.save(workflow);

      this.logger.info('工作流归档成功', { workflowId: command.workflowId });

      return this.toWorkflowDto(savedWorkflow);
    } catch (error) {
      this.logger.error('归档工作流失败', error as Error);
      throw error;
    }
  }

  /**
   * 更新工作流
   * @param command 更新工作流命令
   * @returns 更新后的工作流DTO
   */
  async updateWorkflow(command: UpdateWorkflowCommand): Promise<WorkflowDto> {
    try {
      this.logger.info('正在更新工作流', { workflowId: command.workflowId });

      const workflowId = ID.fromString(command.workflowId);
      const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

      if (!workflow.status.canEdit()) {
        throw new Error('只能编辑草稿状态的工作流');
      }

      const userId = command.userId ? ID.fromString(command.userId) : undefined;

      // 更新名称
      if (command.name !== undefined) {
        workflow.updateName(command.name, userId);
      }

      // 更新描述
      if (command.description !== undefined) {
        workflow.updateDescription(command.description, userId);
      }

      // 更新配置
      if (command.config !== undefined) {
        const config = command.config as any;
        workflow.updateConfig(config, userId);
      }

      // 更新元数据
      if (command.metadata !== undefined) {
        workflow.updateMetadata(command.metadata, userId);
      }

      // 保存工作流
      const updatedWorkflow = await this.workflowRepository.save(workflow);

      this.logger.info('工作流更新成功', { workflowId: command.workflowId });

      return this.toWorkflowDto(updatedWorkflow);
    } catch (error) {
      this.logger.error('更新工作流失败', error as Error);
      throw error;
    }
  }

  /**
   * 执行工作流
   * @param command 执行工作流命令
   * @returns 执行结果DTO
   */
  async executeWorkflow(command: ExecuteWorkflowCommand): Promise<WorkflowExecutionResultDto> {
    try {
      this.logger.info('正在执行工作流', {
        workflowId: command.workflowId,
        executionMode: command.executionMode,
        async: command.async
      });

      const workflowId = ID.fromString(command.workflowId);
      const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

      // 验证执行条件
      this.workflowDomainService.validateExecutionEligibility(workflow);

      // 生成执行ID
      const executionId = `exec_${workflowId.toString()}_${Date.now()}`;

      // 记录执行开始
      const startTime = new Date();

      // 这里应该调用工作流编排器来执行工作流
      // 简化实现，直接返回一个模拟的执行结果
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // 计算执行路径
      const executionPath = this.calculateExecutionPath(workflow);

      const result: WorkflowExecutionResultDto = {
        executionId,
        workflowId: command.workflowId,
        status: 'completed' as const,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration,
        output: command.inputData,
        logs: [],
        statistics: {
          executedNodes: executionPath.length,
          totalNodes: workflow.getNodeCount(),
          executedEdges: executionPath.length - 1,
          totalEdges: workflow.getEdgeCount(),
          executionPath: executionPath.map(nodeId => nodeId.toString())
        },
        metadata: {}
      };

      this.logger.info('工作流执行成功', {
        workflowId: command.workflowId,
        executionId,
        duration
      });

      return result;
    } catch (error) {
      this.logger.error('执行工作流失败', error as Error);
      throw error;
    }
  }

  /**
   * 添加工作流标签
   * @param command 添加工作流标签命令
   * @returns 更新后的工作流DTO
   */
  async addWorkflowTag(command: AddWorkflowTagCommand): Promise<WorkflowDto> {
    try {
      this.logger.info('正在添加工作流标签', {
        workflowId: command.workflowId,
        tag: command.tag
      });

      const workflowId = ID.fromString(command.workflowId);
      const userId = command.userId ? ID.fromString(command.userId) : undefined;

      const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

      // 添加标签
      workflow.addTag(command.tag, userId);

      // 保存工作流
      const savedWorkflow = await this.workflowRepository.save(workflow);

      this.logger.info('工作流标签添加成功', {
        workflowId: command.workflowId,
        tag: command.tag
      });

      return this.toWorkflowDto(savedWorkflow);
    } catch (error) {
      this.logger.error('添加工作流标签失败', error as Error);
      throw error;
    }
  }

  /**
   * 移除工作流标签
   * @param command 移除工作流标签命令
   * @returns 更新后的工作流DTO
   */
  async removeWorkflowTag(command: RemoveWorkflowTagCommand): Promise<WorkflowDto> {
    try {
      this.logger.info('正在移除工作流标签', {
        workflowId: command.workflowId,
        tag: command.tag
      });

      const workflowId = ID.fromString(command.workflowId);
      const userId = command.userId ? ID.fromString(command.userId) : undefined;

      const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

      // 移除标签
      workflow.removeTag(command.tag, userId);

      // 保存工作流
      const savedWorkflow = await this.workflowRepository.save(workflow);

      this.logger.info('工作流标签移除成功', {
        workflowId: command.workflowId,
        tag: command.tag
      });

      return this.toWorkflowDto(savedWorkflow);
    } catch (error) {
      this.logger.error('移除工作流标签失败', error as Error);
      throw error;
    }
  }

  /**
   * 批量更新工作流状态
   * @param command 批量更新工作流状态命令
   * @returns 更新的工作流数量
   */
  async batchUpdateWorkflowStatus(command: BatchUpdateWorkflowStatusCommand): Promise<number> {
    try {
      this.logger.info('正在批量更新工作流状态', {
        workflowIds: command.workflowIds,
        status: command.status
      });

      const workflowIds = command.workflowIds.map(id => ID.fromString(id));
      const status = WorkflowStatus.fromString(command.status);
      const userId = command.userId ? ID.fromString(command.userId) : undefined;

      // 批量更新状态
      const updatedCount = await this.workflowRepository.batchUpdateStatus(
        workflowIds,
        status,
        userId,
        command.reason
      );

      this.logger.info('工作流状态批量更新成功', {
        workflowIds: command.workflowIds,
        status: command.status,
        updatedCount
      });

      return updatedCount;
    } catch (error) {
      this.logger.error('批量更新工作流状态失败', error as Error);
      throw error;
    }
  }

  /**
   * 删除工作流
   * @param command 删除工作流命令
   * @returns 删除是否成功
   */
  async deleteWorkflow(command: DeleteWorkflowCommand): Promise<boolean> {
    try {
      this.logger.info('正在删除工作流', { workflowId: command.workflowId });

      const workflowId = ID.fromString(command.workflowId);
      const workflow = await this.workflowRepository.findById(workflowId);

      if (!workflow) {
        return false;
      }

      // 检查工作流状态是否允许删除
      if (workflow.status.isActive()) {
        throw new Error('无法删除活跃状态的工作流');
      }

      // 标记工作流为已删除
      workflow.markAsDeleted();
      await this.workflowRepository.save(workflow);

      this.logger.info('工作流删除成功', { workflowId: command.workflowId });

      return true;
    } catch (error) {
      this.logger.error('删除工作流失败', error as Error);
      throw error;
    }
  }

  /**
   * 获取工作流
   * @param query 获取工作流查询
   * @returns 工作流DTO或null
   */
  async getWorkflow(query: GetWorkflowQuery): Promise<WorkflowDto | null> {
    try {
      const workflowId = ID.fromString(query.workflowId);
      const workflow = await this.workflowRepository.findById(workflowId);

      if (!workflow) {
        return null;
      }

      return this.toWorkflowDto(workflow);
    } catch (error) {
      this.logger.error('获取工作流失败', error as Error);
      throw error;
    }
  }

  /**
   * 列出工作流
   * @param query 列出工作流查询
   * @returns 工作流DTO列表
   */
  async listWorkflows(query: ListWorkflowsQuery): Promise<{
    workflows: WorkflowDto[] | WorkflowSummaryDto[];
    total: number;
    page: number;
    size: number;
  }> {
    try {
      // 获取所有工作流
      const allWorkflows = await this.workflowRepository.findAll();
      
      // 应用过滤条件
      let filteredWorkflows = allWorkflows;
      
      if (query.filters?.status) {
        const status = WorkflowStatus.fromString(query.filters.status);
        filteredWorkflows = allWorkflows.filter(wf => wf.status.equals(status));
      }
      
      if (query.filters?.type) {
        const type = WorkflowType.fromString(query.filters.type);
        filteredWorkflows = filteredWorkflows.filter(wf => wf.type.equals(type));
      }
      
      if (query.filters?.createdBy) {
        const createdBy = ID.fromString(query.filters.createdBy);
        filteredWorkflows = filteredWorkflows.filter(wf =>
          wf.createdBy?.equals(createdBy)
        );
      }
      
      if (query.filters?.name) {
        filteredWorkflows = filteredWorkflows.filter(wf =>
          wf.name.toLowerCase().includes(query.filters!.name!.toLowerCase())
        );
      }
      
      if (query.filters?.tags && query.filters.tags.length > 0) {
        filteredWorkflows = filteredWorkflows.filter(wf =>
          query.filters!.tags!.some(tag => wf.tags.includes(tag))
        );
      }

      // 应用分页
      const page = query.pagination?.page || 1;
      const size = query.pagination?.size || 20;
      const startIndex = (page - 1) * size;
      const endIndex = startIndex + size;
      const paginatedWorkflows = filteredWorkflows.slice(startIndex, endIndex);

      const workflows = query.includeSummary
        ? paginatedWorkflows.map(wf => this.toWorkflowSummaryDto(wf))
        : paginatedWorkflows.map(wf => this.toWorkflowDto(wf));

      return {
        workflows,
        total: filteredWorkflows.length,
        page,
        size: paginatedWorkflows.length
      };
    } catch (error) {
      this.logger.error('列出工作流失败', error as Error);
      throw error;
    }
  }

  /**
   * 获取工作流状态
   * @param query 获取工作流状态查询
   * @returns 工作流状态
   */
  async getWorkflowStatus(query: GetWorkflowStatusQuery): Promise<string> {
    try {
      const workflowId = ID.fromString(query.workflowId);
      const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

      return workflow.status.toString();
    } catch (error) {
      this.logger.error('获取工作流状态失败', error as Error);
      throw error;
    }
  }

  /**
   * 获取工作流统计信息
   * @param query 获取工作流统计信息查询
   * @returns 工作流统计信息DTO
   */
  async getWorkflowStatistics(query: GetWorkflowStatisticsQuery): Promise<WorkflowStatisticsDto> {
    try {
      // 获取所有工作流
      const allWorkflows = await this.workflowRepository.findAll();
      
      // 计算统计信息
      const stats = this.calculateWorkflowStatistics(allWorkflows);
      
      // 获取标签统计
      const tagStats = await this.workflowRepository.getWorkflowTagStats();

      return {
        ...stats,
        tagStatistics: tagStats
      };
    } catch (error) {
      this.logger.error('获取工作流统计信息失败', error as Error);
      throw error;
    }
  }

  /**
   * 搜索工作流
   * @param query 搜索工作流查询
   * @returns 搜索结果
   */
  async searchWorkflows(query: SearchWorkflowsQuery): Promise<{
    workflows: WorkflowDto[];
    total: number;
    page: number;
    size: number;
  }> {
    try {
      // 根据搜索范围构建查询
      let workflows: Workflow[] = [];

      if (query.searchIn === 'name' || query.searchIn === 'all') {
        const nameResults = await this.workflowRepository.searchByName(query.keyword);
        workflows = workflows.concat(nameResults);
      }

      if (query.searchIn === 'description' || query.searchIn === 'all') {
        const descResults = await this.workflowRepository.searchByDescription(query.keyword);
        workflows = workflows.concat(descResults);
      }

      // 去重
      const uniqueWorkflows = workflows.filter((workflow, index, self) =>
        index === self.findIndex(w => w.workflowId.equals(workflow.workflowId))
      );

      // 应用分页
      const page = query.pagination?.page || 1;
      const size = query.pagination?.size || 20;
      const startIndex = (page - 1) * size;
      const endIndex = startIndex + size;
      const paginatedWorkflows = uniqueWorkflows.slice(startIndex, endIndex);

      return {
        workflows: paginatedWorkflows.map(wf => this.toWorkflowDto(wf)),
        total: uniqueWorkflows.length,
        page,
        size: paginatedWorkflows.length
      };
    } catch (error) {
      this.logger.error('搜索工作流失败', error as Error);
      throw error;
    }
  }

  /**
   * 计算工作流统计信息
   * @param workflows 工作流列表
   * @returns 统计信息
   */
  private calculateWorkflowStatistics(workflows: Workflow[]): Omit<WorkflowStatisticsDto, 'tagStatistics'> {
    const stats = {
      totalWorkflows: workflows.length,
      draftWorkflows: workflows.filter(wf => wf.status.isDraft()).length,
      activeWorkflows: workflows.filter(wf => wf.status.isActive()).length,
      inactiveWorkflows: workflows.filter(wf => wf.status.isInactive()).length,
      archivedWorkflows: workflows.filter(wf => wf.status.isArchived()).length,
      totalExecutions: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      averageSuccessRate: 0,
      averageExecutionTime: 0,
      workflowsByStatus: {} as Record<string, number>,
      workflowsByType: {} as Record<string, number>
    };

    // 按状态统计
    workflows.forEach(workflow => {
      const status = workflow.status.toString();
      stats.workflowsByStatus[status] = (stats.workflowsByStatus[status] || 0) + 1;
    });

    // 按类型统计
    workflows.forEach(workflow => {
      const type = workflow.type.toString();
      stats.workflowsByType[type] = (stats.workflowsByType[type] || 0) + 1;
    });

    return stats;
  }

  /**
   * 计算执行路径
   * @param workflow 工作流
   * @returns 执行路径节点ID列表
   */
  private calculateExecutionPath(workflow: Workflow): NodeId[] {
    const executionPath: NodeId[] = [];
    const visited = new Set<string>();
    
    // 简化实现：从第一个节点开始，沿着出边遍历
    let currentNodeId: NodeId | null = null;
    
    // 获取第一个节点
    const nodes = workflow.getNodes();
    if (nodes.size === 0) {
      return executionPath;
    }
    
    const firstNode = Array.from(nodes.values())[0];
    if (!firstNode) {
      return executionPath;
    }
    
    currentNodeId = firstNode.id;
    
    // 遍历图直到没有出边或形成循环
    const maxIterations = workflow.getNodeCount();
    let iterations = 0;
    
    while (currentNodeId && iterations < maxIterations) {
      const nodeIdStr = currentNodeId.toString();
      
      if (visited.has(nodeIdStr)) {
        // 检测到循环，停止遍历
        break;
      }
      
      visited.add(nodeIdStr);
      executionPath.push(currentNodeId);
      
      // 获取下一个节点
      currentNodeId = this.workflowDomainService.getNextExecutionNode(workflow, currentNodeId);
      iterations++;
    }
    
    return executionPath;
  }

  /**
   * 转换为工作流DTO
   * @param workflow 工作流实体
   * @returns 工作流DTO
   */
  private toWorkflowDto(workflow: Workflow): WorkflowDto {
    return {
      id: workflow.workflowId.toString(),
      name: workflow.name,
      description: workflow.description,
      status: workflow.status.toString(),
      type: workflow.type.toString(),
      config: workflow.config.value,
      workflowId: undefined,
      version: workflow.version.toString(),
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      averageExecutionTime: undefined,
      lastExecutedAt: undefined,
      tags: workflow.tags,
      metadata: workflow.metadata,
      createdAt: workflow.createdAt.toISOString(),
      updatedAt: workflow.updatedAt.toISOString(),
      createdBy: workflow.createdBy?.toString(),
      updatedBy: workflow.updatedBy?.toString()
    };
  }

  /**
   * 转换为工作流摘要DTO
   * @param workflow 工作流实体
   * @returns 工作流摘要DTO
   */
  private toWorkflowSummaryDto(workflow: Workflow): WorkflowSummaryDto {
    return {
      id: workflow.workflowId.toString(),
      name: workflow.name,
      status: workflow.status.toString(),
      type: workflow.type.toString(),
      executionCount: 0,
      successRate: 0,
      averageExecutionTime: undefined,
      lastExecutedAt: undefined,
      tags: workflow.tags,
      createdAt: workflow.createdAt.toISOString()
    };
  }
}