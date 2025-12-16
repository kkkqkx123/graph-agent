import { injectable, inject } from 'inversify';
import { Workflow } from '../../../domain/workflow/entities/workflow';
import { WorkflowRepository } from '../../../domain/workflow/repositories/workflow-repository';
import { GraphRepository } from '../../../domain/workflow/graph/repositories/graph-repository';
import { WorkflowDomainService } from '../../../domain/workflow/services/workflow-domain-service';
import { ID } from '../../../domain/common/value-objects/id';
import { WorkflowStatus } from '../../../domain/workflow/value-objects/workflow-status';
import { WorkflowType } from '../../../domain/workflow/value-objects/workflow-type';
import { WorkflowConfig } from '../../../domain/workflow/value-objects/workflow-config';
import { DomainError } from '../../../domain/common/errors/domain-error';
import { ILogger } from '@shared/types/logger';

// DTOs
import { 
  WorkflowDto, 
  WorkflowSummaryDto, 
  WorkflowExecutionResultDto, 
  WorkflowStatisticsDto 
} from '../dtos/workflow.dto';

// Commands
import {
  CreateWorkflowCommand,
  ActivateWorkflowCommand,
  DeactivateWorkflowCommand,
  ArchiveWorkflowCommand,
  UpdateWorkflowCommand,
  ExecuteWorkflowCommand,
  AddWorkflowTagCommand,
  RemoveWorkflowTagCommand,
  BatchUpdateWorkflowStatusCommand,
  DeleteWorkflowCommand
} from '../commands/create-workflow.command';

// Queries
import {
  GetWorkflowQuery,
  ListWorkflowsQuery,
  GetWorkflowStatusQuery,
  GetWorkflowExecutionHistoryQuery,
  GetWorkflowStatisticsQuery,
  SearchWorkflowsQuery,
  GetWorkflowExecutionPathQuery,
  GetWorkflowTagStatsQuery
} from '../queries/workflow.query';

/**
 * 工作流应用服务
 * 
 * 负责工作流相关的业务逻辑编排和协调
 */
@injectable()
export class WorkflowService {
  constructor(
    @inject('WorkflowRepository') private readonly workflowRepository: WorkflowRepository,
    @inject('GraphRepository') private readonly graphRepository: GraphRepository,
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
        graphId: command.graphId
      });

      // 验证图是否存在
      if (command.graphId) {
        const graphId = ID.fromString(command.graphId);
        const graphExists = await this.graphRepository.exists(graphId);
        if (!graphExists) {
          throw new DomainError(`图不存在: ${command.graphId}`);
        }
      }

      // 转换命令参数
      const type = command.type ? WorkflowType.fromString(command.type) : undefined;
      const config = command.config ? WorkflowConfig.fromObject(command.config) : undefined;
      const graphId = command.graphId ? ID.fromString(command.graphId) : undefined;
      const createdBy = command.createdBy ? ID.fromString(command.createdBy) : undefined;

      // 调用领域服务创建工作流
      const workflow = await this.workflowDomainService.createWorkflow(
        command.name,
        command.description,
        type,
        config,
        graphId,
        command.tags,
        command.metadata,
        createdBy
      );

      this.logger.info('工作流创建成功', { workflowId: workflow.workflowId.toString() });

      return this.toWorkflowDto(workflow);
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

      const workflow = await this.workflowDomainService.activateWorkflow(workflowId, userId);

      this.logger.info('工作流激活成功', { workflowId: command.workflowId });

      return this.toWorkflowDto(workflow);
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

      const workflow = await this.workflowDomainService.deactivateWorkflow(
        workflowId,
        userId,
        command.reason
      );

      this.logger.info('工作流停用成功', { workflowId: command.workflowId });

      return this.toWorkflowDto(workflow);
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

      const workflow = await this.workflowDomainService.archiveWorkflow(
        workflowId,
        userId,
        command.reason
      );

      this.logger.info('工作流归档成功', { workflowId: command.workflowId });

      return this.toWorkflowDto(workflow);
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
        throw new DomainError('只能编辑草稿状态的工作流');
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
        const config = WorkflowConfig.fromObject(command.config);
        workflow.updateConfig(config, userId);
      }

      // 更新图ID
      if (command.graphId !== undefined) {
        const graphId = ID.fromString(command.graphId);
        workflow.updateGraphId(graphId, userId);
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

      // 验证工作流是否可以执行
      const canExecute = await this.workflowDomainService.canExecuteWorkflow(workflowId);
      if (!canExecute) {
        throw new DomainError('工作流不能执行');
      }

      // 生成执行ID
      const executionId = `exec_${workflowId.toString()}_${Date.now()}`;

      // 记录执行开始
      const startTime = new Date();

      // 这里应该调用工作流编排器来执行工作流
      // 简化实现，直接返回一个模拟的执行结果
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // 记录执行结果
      await this.workflowDomainService.recordWorkflowExecution(
        workflowId,
        true,
        duration / 1000 // 转换为秒
      );

      const result: WorkflowExecutionResultDto = {
        executionId,
        workflowId: command.workflowId,
        status: 'completed',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration,
        output: command.inputData,
        logs: [],
        statistics: {
          executedNodes: 0,
          totalNodes: 0,
          executedEdges: 0,
          totalEdges: 0,
          executionPath: []
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
      
      // 记录执行失败
      try {
        const workflowId = ID.fromString(command.workflowId);
        await this.workflowDomainService.recordWorkflowExecution(workflowId, false, 0);
      } catch (recordError) {
        this.logger.error('记录工作流执行失败', recordError as Error);
      }

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

      const workflow = await this.workflowDomainService.addWorkflowTag(workflowId, command.tag, userId);

      this.logger.info('工作流标签添加成功', {
        workflowId: command.workflowId,
        tag: command.tag
      });

      return this.toWorkflowDto(workflow);
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

      const workflow = await this.workflowDomainService.removeWorkflowTag(workflowId, command.tag, userId);

      this.logger.info('工作流标签移除成功', {
        workflowId: command.workflowId,
        tag: command.tag
      });

      return this.toWorkflowDto(workflow);
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

      const updatedCount = await this.workflowDomainService.batchActivateWorkflows(
        workflowIds,
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
        throw new DomainError('无法删除活跃状态的工作流');
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
      // 构建查询选项
      const options: any = {
        filters: query.filters || {},
        sortBy: query.sortBy || 'createdAt',
        sortOrder: query.sortOrder || 'desc',
        pagination: query.pagination || { page: 1, size: 20 }
      };

      const result = await this.workflowRepository.findWithPagination(options);

      const workflows = query.includeSummary
        ? result.items.map(wf => this.toWorkflowSummaryDto(wf))
        : result.items.map(wf => this.toWorkflowDto(wf));

      return {
        workflows,
        total: result.total,
        page: result.page,
        size: result.size
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
      const stats = await this.workflowDomainService.getWorkflowExecutionStats(query.filters);

      return {
        totalWorkflows: stats.total,
        draftWorkflows: stats.draft,
        activeWorkflows: stats.active,
        inactiveWorkflows: stats.inactive,
        archivedWorkflows: stats.archived,
        totalExecutions: stats.totalExecutions,
        totalSuccesses: stats.totalSuccesses,
        totalFailures: stats.totalFailures,
        averageSuccessRate: stats.averageSuccessRate,
        averageExecutionTime: 0, // 需要从领域服务获取
        workflowsByStatus: {},
        workflowsByType: {},
        tagStatistics: {}
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
        const nameResults = await this.workflowRepository.searchByName(query.keyword, {
          filters: query.filters,
          sortBy: query.sortBy || 'relevance',
          sortOrder: query.sortOrder || 'desc',
          pagination: query.pagination
        });
        workflows = workflows.concat(nameResults);
      }

      if (query.searchIn === 'description' || query.searchIn === 'all') {
        const descResults = await this.workflowRepository.searchByDescription(query.keyword, {
          filters: query.filters,
          sortBy: query.sortBy || 'relevance',
          sortOrder: query.sortOrder || 'desc',
          pagination: query.pagination
        });
        workflows = workflows.concat(descResults);
      }

      // 去重
      const uniqueWorkflows = workflows.filter((workflow, index, self) =>
        index === self.findIndex(w => w.workflowId.equals(workflow.workflowId))
      );

      return {
        workflows: uniqueWorkflows.map(wf => this.toWorkflowDto(wf)),
        total: uniqueWorkflows.length,
        page: query.pagination?.page || 1,
        size: query.pagination?.size || 20
      };
    } catch (error) {
      this.logger.error('搜索工作流失败', error as Error);
      throw error;
    }
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
      graphId: workflow.graphId?.toString(),
      version: workflow.version.toString(),
      executionCount: workflow.executionCount,
      successCount: workflow.successCount,
      failureCount: workflow.failureCount,
      averageExecutionTime: workflow.averageExecutionTime,
      lastExecutedAt: workflow.lastExecutedAt?.toISOString(),
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
      executionCount: workflow.executionCount,
      successRate: workflow.getSuccessRate(),
      averageExecutionTime: workflow.averageExecutionTime,
      lastExecutedAt: workflow.lastExecutedAt?.toISOString(),
      tags: workflow.tags,
      createdAt: workflow.createdAt.toISOString()
    };
  }
}