import { Workflow } from '../entities/workflow';
import { WorkflowRepository } from '../repositories/workflow-repository';
import { ID } from '../../common/value-objects/id';
import { WorkflowStatus } from '../value-objects/workflow-status';
import { WorkflowType } from '../value-objects/workflow-type';
import { WorkflowConfig } from '../value-objects/workflow-config';
import { DomainError } from '../../common/errors/domain-error';
import { Node } from '../graph/entities/nodes/base/node';
import { Edge } from '../graph/entities/edges/base/edge';
import { NodeType } from '../value-objects/node-type';
import { EdgeType } from '../value-objects/edge-type';

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
   * @param nodes 节点列表
   * @param edges 边列表
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
    nodes?: Node[],
    edges?: Edge[],
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
      nodes,
      edges,
      type,
      config,
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

    // 验证工作流是否有关联的节点和边
    if (workflow.nodes.size === 0) {
      throw new DomainError('工作流没有节点，无法激活');
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
   * 添加节点到工作流
   * @param workflowId 工作流ID
   * @param node 节点
   * @param userId 操作用户ID
   * @returns 更新后的工作流
   */
  async addNodeToWorkflow(
    workflowId: ID,
    node: Node,
    userId?: ID
  ): Promise<Workflow> {
    const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

    if (!workflow.status.canEdit()) {
      throw new DomainError('只能编辑草稿状态工作流的节点');
    }

    // 添加节点
    workflow.addNode(node, userId);

    return await this.workflowRepository.save(workflow);
  }

  /**
   * 从工作流中移除节点
   * @param workflowId 工作流ID
   * @param nodeId 节点ID
   * @param userId 操作用户ID
   * @returns 更新后的工作流
   */
  async removeNodeFromWorkflow(
    workflowId: ID,
    nodeId: ID,
    userId?: ID
  ): Promise<Workflow> {
    const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

    if (!workflow.status.canEdit()) {
      throw new DomainError('只能编辑草稿状态工作流的节点');
    }

    // 移除节点
    workflow.removeNode(nodeId, userId);

    return await this.workflowRepository.save(workflow);
  }

  /**
   * 添加边到工作流
   * @param workflowId 工作流ID
   * @param edge 边
   * @param userId 操作用户ID
   * @returns 更新后的工作流
   */
  async addEdgeToWorkflow(
    workflowId: ID,
    edge: Edge,
    userId?: ID
  ): Promise<Workflow> {
    const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

    if (!workflow.status.canEdit()) {
      throw new DomainError('只能编辑草稿状态工作流的边');
    }

    // 添加边
    workflow.addEdge(edge, userId);

    return await this.workflowRepository.save(workflow);
  }

  /**
   * 从工作流中移除边
   * @param workflowId 工作流ID
   * @param edgeId 边ID
   * @param userId 操作用户ID
   * @returns 更新后的工作流
   */
  async removeEdgeFromWorkflow(
    workflowId: ID,
    edgeId: ID,
    userId?: ID
  ): Promise<Workflow> {
    const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

    if (!workflow.status.canEdit()) {
      throw new DomainError('只能编辑草稿状态工作流的边');
    }

    // 移除边
    workflow.removeEdge(edgeId, userId);

    return await this.workflowRepository.save(workflow);
  }

  /**
   * 根据节点类型查找工作流
   * @param nodeType 节点类型
   * @param options 查询选项
   * @returns 工作流列表
   */
  async findWorkflowsByNodeType(
    nodeType: NodeType,
    options?: any
  ): Promise<Workflow[]> {
    return await this.workflowRepository.findByNodeType(nodeType, options);
  }

  /**
   * 根据边类型查找工作流
   * @param edgeType 边类型
   * @param options 查询选项
   * @returns 工作流列表
   */
  async findWorkflowsByEdgeType(
    edgeType: EdgeType,
    options?: any
  ): Promise<Workflow[]> {
    return await this.workflowRepository.findByEdgeType(edgeType, options);
  }

  /**
   * 获取最复杂的工作流
   * @param limit 限制数量
   * @param options 查询选项
   * @returns 最复杂的工作流列表
   */
  async getMostComplexWorkflows(
    limit: number,
    options?: any
  ): Promise<Workflow[]> {
    return await this.workflowRepository.getMostComplexWorkflows(limit, options);
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