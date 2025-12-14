import { Workflow } from '../entities/workflow';
import { WorkflowRepository } from '../repositories/workflow-repository';
import { ID } from '../../common/value-objects/id';
import { WorkflowStatus } from '../value-objects/workflow-status';
import { WorkflowType } from '../value-objects/workflow-type';
import { WorkflowConfig } from '../value-objects/workflow-config';
import { DomainError } from '../../common/errors/domain-error';

/**
 * 工作流领域服务
 * 
 * 提供工作流相关的业务逻辑和规则
 */
export class WorkflowDomainService {
  /**
   * 构造函数
   * @param workflowRepository 工作流仓储
   */
  constructor(private readonly workflowRepository: WorkflowRepository) {}

  /**
   * 创建新工作流
   * @param name 工作流名称
   * @param description 工作流描述
   * @param type 工作流类型
   * @param config 工作流配置
   * @param graphId 图ID
   * @param tags 标签
   * @param metadata 元数据
   * @param createdBy 创建者ID
   * @returns 新工作流
   */
  async createWorkflow(
    name: string,
    description?: string,
    type?: WorkflowType,
    config?: WorkflowConfig,
    graphId?: ID,
    tags?: string[],
    metadata?: Record<string, unknown>,
    createdBy?: ID
  ): Promise<Workflow> {
    // 验证工作流名称是否已存在
    const exists = await this.workflowRepository.existsByName(name);
    if (exists) {
      throw new DomainError(`工作流名称 "${name}" 已存在`);
    }

    // 创建工作流
    const workflow = Workflow.create(
      name,
      description,
      type,
      config,
      graphId,
      tags,
      metadata,
      createdBy
    );

    // 保存工作流
    return await this.workflowRepository.save(workflow);
  }

  /**
   * 激活工作流
   * @param workflowId 工作流ID
   * @param userId 操作用户ID
   * @returns 激活后的工作流
   */
  async activateWorkflow(workflowId: ID, userId?: ID): Promise<Workflow> {
    const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

    if (workflow.status.isActive()) {
      return workflow; // 已经是活跃状态
    }

    if (!workflow.status.isDraft() && !workflow.status.isInactive()) {
      throw new DomainError('只能激活草稿或非活跃状态的工作流');
    }

    // 验证工作流是否有关联的图
    if (!workflow.graphId) {
      throw new DomainError('工作流没有关联的图，无法激活');
    }

    // 激活工作流
    workflow.changeStatus(WorkflowStatus.active(), userId, '激活工作流');

    return await this.workflowRepository.save(workflow);
  }

  /**
   * 停用工作流
   * @param workflowId 工作流ID
   * @param userId 操作用户ID
   * @param reason 停用原因
   * @returns 停用后的工作流
   */
  async deactivateWorkflow(
    workflowId: ID,
    userId?: ID,
    reason?: string
  ): Promise<Workflow> {
    const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

    if (workflow.status.isInactive()) {
      return workflow; // 已经是非活跃状态
    }

    if (!workflow.status.isActive()) {
      throw new DomainError('只能停用活跃状态的工作流');
    }

    // 停用工作流
    workflow.changeStatus(WorkflowStatus.inactive(), userId, reason);

    return await this.workflowRepository.save(workflow);
  }

  /**
   * 归档工作流
   * @param workflowId 工作流ID
   * @param userId 操作用户ID
   * @param reason 归档原因
   * @returns 归档后的工作流
   */
  async archiveWorkflow(
    workflowId: ID,
    userId?: ID,
    reason?: string
  ): Promise<Workflow> {
    const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

    if (workflow.status.isArchived()) {
      return workflow; // 已经是归档状态
    }

    // 归档工作流
    workflow.changeStatus(WorkflowStatus.archived(), userId, reason);

    return await this.workflowRepository.save(workflow);
  }

  /**
   * 更新工作流配置
   * @param workflowId 工作流ID
   * @param newConfig 新配置
   * @param userId 操作用户ID
   * @returns 更新后的工作流
   */
  async updateWorkflowConfig(
    workflowId: ID,
    newConfig: WorkflowConfig,
    userId?: ID
  ): Promise<Workflow> {
    const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

    if (!workflow.status.canEdit()) {
      throw new DomainError('只能编辑草稿状态工作流的配置');
    }

    // 更新配置
    workflow.updateConfig(newConfig, userId);

    return await this.workflowRepository.save(workflow);
  }

  /**
   * 更新工作流图
   * @param workflowId 工作流ID
   * @param graphId 新图ID
   * @param userId 操作用户ID
   * @returns 更新后的工作流
   */
  async updateWorkflowGraph(
    workflowId: ID,
    graphId: ID,
    userId?: ID
  ): Promise<Workflow> {
    const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

    if (!workflow.status.canEdit()) {
      throw new DomainError('只能编辑草稿状态工作流的图');
    }

    // 更新图ID
    workflow.updateGraphId(graphId, userId);

    return await this.workflowRepository.save(workflow);
  }

  /**
   * 添加工作流标签
   * @param workflowId 工作流ID
   * @param tag 标签
   * @param userId 操作用户ID
   * @returns 更新后的工作流
   */
  async addWorkflowTag(
    workflowId: ID,
    tag: string,
    userId?: ID
  ): Promise<Workflow> {
    const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

    if (workflow.isDeleted()) {
      throw new DomainError('无法为已删除的工作流添加标签');
    }

    // 添加标签
    workflow.addTag(tag, userId);

    return await this.workflowRepository.save(workflow);
  }

  /**
   * 移除工作流标签
   * @param workflowId 工作流ID
   * @param tag 标签
   * @param userId 操作用户ID
   * @returns 更新后的工作流
   */
  async removeWorkflowTag(
    workflowId: ID,
    tag: string,
    userId?: ID
  ): Promise<Workflow> {
    const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

    if (workflow.isDeleted()) {
      throw new DomainError('无法为已删除的工作流移除标签');
    }

    // 移除标签
    workflow.removeTag(tag, userId);

    return await this.workflowRepository.save(workflow);
  }

  /**
   * 记录工作流执行结果
   * @param workflowId 工作流ID
   * @param success 是否成功
   * @param executionTime 执行时间（秒）
   * @returns 更新后的工作流
   */
  async recordWorkflowExecution(
    workflowId: ID,
    success: boolean,
    executionTime: number
  ): Promise<Workflow> {
    const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

    if (workflow.isDeleted()) {
      throw new DomainError('无法记录已删除工作流的执行结果');
    }

    // 记录执行结果
    workflow.recordExecution(success, executionTime);

    return await this.workflowRepository.save(workflow);
  }

  /**
   * 获取工作流执行统计信息
   * @param options 查询选项
   * @returns 执行统计信息
   */
  async getWorkflowExecutionStats(options?: any): Promise<{
    total: number;
    draft: number;
    active: number;
    inactive: number;
    archived: number;
    totalExecutions: number;
    totalSuccesses: number;
    totalFailures: number;
    averageSuccessRate: number;
  }> {
    return await this.workflowRepository.getWorkflowExecutionStats(options);
  }

  /**
   * 获取最活跃的工作流
   * @param limit 限制数量
   * @param options 查询选项
   * @returns 最活跃的工作流列表
   */
  async getMostActiveWorkflows(
    limit: number,
    options?: any
  ): Promise<Workflow[]> {
    return await this.workflowRepository.getMostActiveWorkflows(limit, options);
  }

  /**
   * 获取成功率最高的工作流
   * @param limit 限制数量
   * @param minExecutionCount 最小执行次数
   * @param options 查询选项
   * @returns 成功率最高的工作流列表
   */
  async getMostSuccessfulWorkflows(
    limit: number,
    minExecutionCount: number,
    options?: any
  ): Promise<Workflow[]> {
    return await this.workflowRepository.getMostSuccessfulWorkflows(
      limit,
      minExecutionCount,
      options
    );
  }

  /**
   * 批量激活工作流
   * @param workflowIds 工作流ID列表
   * @param userId 操作用户ID
   * @param reason 激活原因
   * @returns 激活的工作流数量
   */
  async batchActivateWorkflows(
    workflowIds: ID[],
    userId?: ID,
    reason?: string
  ): Promise<number> {
    return await this.workflowRepository.batchUpdateStatus(
      workflowIds,
      WorkflowStatus.active(),
      userId,
      reason
    );
  }

  /**
   * 批量停用工作流
   * @param workflowIds 工作流ID列表
   * @param userId 操作用户ID
   * @param reason 停用原因
   * @returns 停用的工作流数量
   */
  async batchDeactivateWorkflows(
    workflowIds: ID[],
    userId?: ID,
    reason?: string
  ): Promise<number> {
    return await this.workflowRepository.batchUpdateStatus(
      workflowIds,
      WorkflowStatus.inactive(),
      userId,
      reason
    );
  }

  /**
   * 批量归档工作流
   * @param workflowIds 工作流ID列表
   * @param userId 操作用户ID
   * @param reason 归档原因
   * @returns 归档的工作流数量
   */
  async batchArchiveWorkflows(
    workflowIds: ID[],
    userId?: ID,
    reason?: string
  ): Promise<number> {
    return await this.workflowRepository.batchUpdateStatus(
      workflowIds,
      WorkflowStatus.archived(),
      userId,
      reason
    );
  }

  /**
   * 清理长时间未使用的工作流
   * @param daysThreshold 天数阈值
   * @param userId 操作用户ID
   * @returns 归档的工作流数量
   */
  async cleanupUnusedWorkflows(
    daysThreshold: number,
    userId?: ID
  ): Promise<number> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

    const inactiveWorkflows = await this.workflowRepository.findInactiveWorkflows({
      lastExecutedBefore: thresholdDate
    });

    let archivedCount = 0;
    for (const workflow of inactiveWorkflows) {
      try {
        workflow.changeStatus(
          WorkflowStatus.archived(),
          userId,
          `长时间未使用（超过${daysThreshold}天），自动归档`
        );
        await this.workflowRepository.save(workflow);
        archivedCount++;
      } catch (error) {
        console.error(`归档工作流失败: ${workflow.workflowId}`, error);
      }
    }

    return archivedCount;
  }

  /**
   * 验证工作流是否可以执行
   * @param workflowId 工作流ID
   * @returns 是否可以执行
   */
  async canExecuteWorkflow(workflowId: ID): Promise<boolean> {
    const workflow = await this.workflowRepository.findById(workflowId);
    
    if (!workflow) {
      return false;
    }

    if (workflow.isDeleted()) {
      return false;
    }

    return workflow.status.canExecute();
  }

  /**
   * 获取工作流标签统计信息
   * @param options 查询选项
   * @returns 标签统计信息
   */
  async getWorkflowTagStats(options?: any): Promise<Record<string, number>> {
    return await this.workflowRepository.getWorkflowTagStats(options);
  }
}