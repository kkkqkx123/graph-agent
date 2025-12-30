import { injectable, inject } from 'inversify';
import { Workflow, WorkflowStatus, WorkflowType, WorkflowConfig, NodeId, NodeType, EdgeId, EdgeType, WorkflowRepository } from '../../../domain/workflow';
import { ID, Timestamp, ILogger } from '../../../domain/common';

// 参数类型定义
export interface CreateWorkflowParams {
  name: string;
  description?: string;
  type?: string;
  config?: any;
  createdBy?: string;
  workflowId?: string;
}

export interface ActivateWorkflowParams {
  workflowId: string;
  userId?: string;
  reason?: string;
}

export interface DeactivateWorkflowParams {
  workflowId: string;
  userId?: string;
  reason?: string;
}

export interface ArchiveWorkflowParams {
  workflowId: string;
  userId?: string;
  reason?: string;
}

export interface UpdateWorkflowParams {
  workflowId: string;
  name?: string;
  description?: string;
  config?: any;
  metadata?: Record<string, unknown>;
  userId?: string;
}

export interface DeleteWorkflowParams {
  workflowId: string;
}

export interface ExecuteWorkflowParams {
  workflowId: string;
  inputData?: unknown;
  executionMode?: string;
  async?: boolean;
}

export interface AddWorkflowTagParams {
  workflowId: string;
  tag: string;
  userId?: string;
}

export interface RemoveWorkflowTagParams {
  workflowId: string;
  tag: string;
  userId?: string;
}

export interface BatchUpdateWorkflowStatusParams {
  workflowIds: string[];
  status: string;
  userId?: string;
  reason?: string;
}

export interface GetWorkflowParams {
  workflowId: string;
}

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

export interface GetWorkflowStatusParams {
  workflowId: string;
}

export interface GetWorkflowStatisticsParams {
  // 可以添加过滤参数
}

export interface SearchWorkflowsParams {
  keyword: string;
  searchIn?: 'name' | 'description' | 'all';
  pagination?: {
    page?: number;
    size?: number;
  };
}

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
    @inject('Logger') private readonly logger: ILogger
  ) { }

  /**
   * 创建工作流
   * @param command 创建工作流命令
   * @returns 创建的工作流领域对象
   */
  async createWorkflow(params: CreateWorkflowParams): Promise<Workflow> {
    try {
      this.logger.info('正在创建工作流', {
        name: params.name,
        type: params.type,
        workflowId: params.workflowId
      });

      // 转换命令参数
      const type = params.type ? WorkflowType.fromString(params.type) : undefined;
      const config = params.config ? params.config as any : undefined;
      const createdBy = params.createdBy ? ID.fromString(params.createdBy) : undefined;

      // 验证创建条件
      await this.validateWorkflowCreation(params.name, config, createdBy);

      // 创建工作流
      const workflow = Workflow.create(
        params.name,
        params.description,
        type,
        config,
        createdBy
      );

      // 保存工作流
      const savedWorkflow = await this.workflowRepository.save(workflow);

      this.logger.info('工作流创建成功', { workflowId: savedWorkflow.workflowId.toString() });

      return savedWorkflow;
    } catch (error) {
      this.logger.error('创建工作流失败', error as Error);
      throw error;
    }
  }

  /**
   * 激活工作流
   * @param command 激活工作流命令
   * @returns 激活后的工作流领域对象
   */
  async activateWorkflow(params: ActivateWorkflowParams): Promise<Workflow> {
    try {
      this.logger.info('正在激活工作流', { workflowId: params.workflowId });

      const workflowId = ID.fromString(params.workflowId);
      const userId = params.userId ? ID.fromString(params.userId) : undefined;

      const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

      // 验证状态转换
      this.validateStatusTransition(workflow, WorkflowStatus.active());

      // 激活工作流
      workflow.changeStatus(WorkflowStatus.active(), userId, params.reason);

      // 保存工作流
      const savedWorkflow = await this.workflowRepository.save(workflow);

      this.logger.info('工作流激活成功', { workflowId: params.workflowId });

      return savedWorkflow;
    } catch (error) {
      this.logger.error('激活工作流失败', error as Error);
      throw error;
    }
  }

  /**
   * 停用工作流
   * @param command 停用工作流命令
   * @returns 停用后的工作流领域对象
   */
  async deactivateWorkflow(params: DeactivateWorkflowParams): Promise<Workflow> {
    try {
      this.logger.info('正在停用工作流', { workflowId: params.workflowId });

      const workflowId = ID.fromString(params.workflowId);
      const userId = params.userId ? ID.fromString(params.userId) : undefined;

      const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

      // 验证状态转换
      this.validateStatusTransition(workflow, WorkflowStatus.inactive());

      // 停用工作流
      workflow.changeStatus(WorkflowStatus.inactive(), userId, params.reason);

      // 保存工作流
      const savedWorkflow = await this.workflowRepository.save(workflow);

      this.logger.info('工作流停用成功', { workflowId: params.workflowId });

      return savedWorkflow;
    } catch (error) {
      this.logger.error('停用工作流失败', error as Error);
      throw error;
    }
  }

  /**
   * 归档工作流
   * @param command 归档工作流命令
   * @returns 归档后的工作流领域对象
   */
  async archiveWorkflow(params: ArchiveWorkflowParams): Promise<Workflow> {
    try {
      this.logger.info('正在归档工作流', { workflowId: params.workflowId });

      const workflowId = ID.fromString(params.workflowId);
      const userId = params.userId ? ID.fromString(params.userId) : undefined;

      const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

      // 验证状态转换
      this.validateStatusTransition(workflow, WorkflowStatus.archived());

      // 归档工作流
      workflow.changeStatus(WorkflowStatus.archived(), userId, params.reason);

      // 保存工作流
      const savedWorkflow = await this.workflowRepository.save(workflow);

      this.logger.info('工作流归档成功', { workflowId: params.workflowId });

      return savedWorkflow;
    } catch (error) {
      this.logger.error('归档工作流失败', error as Error);
      throw error;
    }
  }

  /**
   * 更新工作流
   * @param command 更新工作流命令
   * @returns 更新后的工作流领域对象
   */
  async updateWorkflow(params: UpdateWorkflowParams): Promise<Workflow> {
    try {
      this.logger.info('正在更新工作流', { workflowId: params.workflowId });

      const workflowId = ID.fromString(params.workflowId);
      const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

      if (!workflow.status.canEdit()) {
        throw new Error('只能编辑草稿状态的工作流');
      }

      const userId = params.userId ? ID.fromString(params.userId) : undefined;

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

      this.logger.info('工作流更新成功', { workflowId: params.workflowId });

      return updatedWorkflow;
    } catch (error) {
      this.logger.error('更新工作流失败', error as Error);
      throw error;
    }
  }

  /**
   * 执行工作流
   * @param command 执行工作流命令
   * @returns 执行结果
   */
  async executeWorkflow(params: ExecuteWorkflowParams): Promise<{
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
  }> {
    try {
      this.logger.info('正在执行工作流', {
        workflowId: params.workflowId,
        executionMode: params.executionMode,
        async: params.async
      });

      const workflowId = ID.fromString(params.workflowId);
      const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

      // 验证执行条件
      this.validateExecutionEligibility(workflow);

      // 生成执行ID
      const executionId = `exec_${workflowId.toString()}_${Timestamp.now().getMilliseconds()}`;

      // 记录执行开始
      const startTime = Timestamp.now();

      // 这里应该调用工作流编排器来执行工作流
      // 简化实现，直接返回一个模拟的执行结果
      const endTime = Timestamp.now();
      const duration = endTime.getMilliseconds() - startTime.getMilliseconds();

      // 计算执行路径
      const executionPath = this.calculateExecutionPath(workflow);

      const result = {
        executionId,
        workflowId: params.workflowId,
        status: 'completed' as const,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration,
        output: params.inputData as Record<string, unknown>,
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
        workflowId: params.workflowId,
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
   * @returns 更新后的工作流领域对象
   */
  async addWorkflowTag(params: AddWorkflowTagParams): Promise<Workflow> {
    try {
      this.logger.info('正在添加工作流标签', {
        workflowId: params.workflowId,
        tag: params.tag
      });

      const workflowId = ID.fromString(params.workflowId);
      const userId = params.userId ? ID.fromString(params.userId) : undefined;

      const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

      // 添加标签
      workflow.addTag(params.tag, userId);

      // 保存工作流
      const savedWorkflow = await this.workflowRepository.save(workflow);

      this.logger.info('工作流标签添加成功', {
        workflowId: params.workflowId,
        tag: params.tag
      });

      return savedWorkflow;
    } catch (error) {
      this.logger.error('添加工作流标签失败', error as Error);
      throw error;
    }
  }

  /**
   * 移除工作流标签
   * @param command 移除工作流标签命令
   * @returns 更新后的工作流领域对象
   */
  async removeWorkflowTag(params: RemoveWorkflowTagParams): Promise<Workflow> {
    try {
      this.logger.info('正在移除工作流标签', {
        workflowId: params.workflowId,
        tag: params.tag
      });

      const workflowId = ID.fromString(params.workflowId);
      const userId = params.userId ? ID.fromString(params.userId) : undefined;

      const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

      // 移除标签
      workflow.removeTag(params.tag, userId);

      // 保存工作流
      const savedWorkflow = await this.workflowRepository.save(workflow);

      this.logger.info('工作流标签移除成功', {
        workflowId: params.workflowId,
        tag: params.tag
      });

      return savedWorkflow;
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
  async batchUpdateWorkflowStatus(params: BatchUpdateWorkflowStatusParams): Promise<number> {
    try {
      this.logger.info('正在批量更新工作流状态', {
        workflowIds: params.workflowIds,
        status: params.status
      });

      const workflowIds = params.workflowIds.map((id: string) => ID.fromString(id));
      const status = WorkflowStatus.fromString(params.status);
      const userId = params.userId ? ID.fromString(params.userId) : undefined;

      // 批量更新状态
      const updatedCount = await this.workflowRepository.batchUpdateStatus(
        workflowIds,
        status,
        userId,
        params.reason
      );

      this.logger.info('工作流状态批量更新成功', {
        workflowIds: params.workflowIds,
        status: params.status,
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
  async deleteWorkflow(params: DeleteWorkflowParams): Promise<boolean> {
    try {
      this.logger.info('正在删除工作流', { workflowId: params.workflowId });

      const workflowId = ID.fromString(params.workflowId);
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

      this.logger.info('工作流删除成功', { workflowId: params.workflowId });

      return true;
    } catch (error) {
      this.logger.error('删除工作流失败', error as Error);
      throw error;
    }
  }

  /**
   * 获取工作流
   * @param query 获取工作流查询
   * @returns 工作流领域对象或null
   */
  async getWorkflow(params: GetWorkflowParams): Promise<Workflow | null> {
    try {
      const workflowId = ID.fromString(params.workflowId);
      const workflow = await this.workflowRepository.findById(workflowId);

      if (!workflow) {
        return null;
      }

      return workflow;
    } catch (error) {
      this.logger.error('获取工作流失败', error as Error);
      throw error;
    }
  }

  /**
   * 列出工作流
   * @param query 列出工作流查询
   * @returns 工作流领域对象列表
   */
  async listWorkflows(params: ListWorkflowsParams): Promise<{
    workflows: Workflow[];
    total: number;
    page: number;
    size: number;
  }> {
    try {
      // 获取所有工作流
      const allWorkflows = await this.workflowRepository.findAll();

      // 应用过滤条件
      let filteredWorkflows = allWorkflows;

      if (params.filters?.status) {
        const status = WorkflowStatus.fromString(params.filters.status);
        filteredWorkflows = allWorkflows.filter(wf => wf.status.equals(status));
      }

      if (params.filters?.type) {
        const type = WorkflowType.fromString(params.filters.type);
        filteredWorkflows = filteredWorkflows.filter(wf => wf.type.equals(type));
      }

      if (params.filters?.createdBy) {
        const createdBy = ID.fromString(params.filters.createdBy);
        filteredWorkflows = filteredWorkflows.filter(wf =>
          wf.createdBy?.equals(createdBy)
        );
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

      return {
        workflows: paginatedWorkflows,
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
  async getWorkflowStatus(params: GetWorkflowStatusParams): Promise<string> {
    try {
      const workflowId = ID.fromString(params.workflowId);
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
   * @returns 工作流统计信息
   */
  async getWorkflowStatistics(params: GetWorkflowStatisticsParams): Promise<{
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
  }> {
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
  async searchWorkflows(params: SearchWorkflowsParams): Promise<{
    workflows: Workflow[];
    total: number;
    page: number;
    size: number;
  }> {
    try {
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
      const uniqueWorkflows = workflows.filter((workflow, index, self) =>
        index === self.findIndex(w => w.workflowId.equals(workflow.workflowId))
      );

      // 应用分页
      const page = params.pagination?.page || 1;
      const size = params.pagination?.size || 20;
      const startIndex = (page - 1) * size;
      const endIndex = startIndex + size;
      const paginatedWorkflows = uniqueWorkflows.slice(startIndex, endIndex);

      return {
        workflows: paginatedWorkflows,
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
  private calculateWorkflowStatistics(workflows: Workflow[]): {
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
  } {
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
      currentNodeId = this.getNextExecutionNode(workflow, currentNodeId);
      iterations++;
    }

    return executionPath;
  }

  /**
   * 验证工作流创建的业务规则
   */
  private async validateWorkflowCreation(name: string, config?: WorkflowConfig, createdBy?: ID): Promise<void> {
    // 验证工作流名称是否已存在
    const exists = await this.workflowRepository.existsByName(name);
    if (exists) {
      throw new Error(`工作流名称 "${name}" 已存在`);
    }

    // 验证配置
    if (config) {
      config.validate();
    }
  }

  /**
   * 验证工作流状态转换的业务规则
   */
  private validateStatusTransition(workflow: Workflow, newStatus: WorkflowStatus): void {
    const currentStatus = workflow.status;

    // 已归档的工作流不能变更到其他状态
    if (currentStatus.isArchived() && !newStatus.isArchived()) {
      throw new Error('已归档的工作流不能变更到其他状态');
    }

    // 草稿状态只能激活或归档
    if (currentStatus.isDraft() &&
      !newStatus.isActive() &&
      !newStatus.isArchived()) {
      throw new Error('草稿状态的工作流只能激活或归档');
    }

    // 活跃状态只能变为非活跃或归档
    if (currentStatus.isActive() &&
      !newStatus.isInactive() &&
      !newStatus.isArchived()) {
      throw new Error('活跃状态的工作流只能变为非活跃或归档');
    }

    // 非活跃状态只能变为活跃或归档
    if (currentStatus.isInactive() &&
      !newStatus.isActive() &&
      !newStatus.isArchived()) {
      throw new Error('非活跃状态的工作流只能变为活跃或归档');
    }
  }

  /**
   * 验证工作流是否可以执行
   */
  private validateExecutionEligibility(workflow: Workflow): void {
    if (!workflow.status.isActive()) {
      throw new Error('只有活跃状态的工作流才能执行');
    }

    if (workflow.isDeleted()) {
      throw new Error('已删除的工作流不能执行');
    }

    if (workflow.isEmpty()) {
      throw new Error('空工作流不能执行');
    }
  }

  /**
   * 获取工作流的下一个执行节点
   */
  private getNextExecutionNode(workflow: Workflow, currentNodeId?: NodeId): NodeId | null {
    if (!currentNodeId) {
      // 返回第一个节点
      const nodes = workflow.getNodes();
      if (nodes.size === 0) return null;
      const firstNode = Array.from(nodes.values())[0];
      return firstNode ? firstNode.id : null;
    }

    // 获取当前节点的出边
    const outgoingEdges = workflow.getOutgoingEdges(currentNodeId);
    if (outgoingEdges.length === 0) return null;

    // 简单实现：返回第一个出边的目标节点
    if (outgoingEdges.length === 0) return null;
    const firstEdge = outgoingEdges[0];
    return firstEdge ? firstEdge.toNodeId : null;
  }
}