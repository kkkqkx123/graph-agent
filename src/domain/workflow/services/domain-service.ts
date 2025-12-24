import { Workflow } from '../entities/workflow';
import { WorkflowRepository } from '../repositories/workflow-repository';
import { ID } from '../../common/value-objects/id';
import { WorkflowStatus } from '../value-objects/workflow-status';
import { WorkflowType } from '../value-objects/workflow-type';
import { WorkflowConfig } from '../value-objects/workflow-config';
import { DomainError } from '../../common/errors/domain-error';
import { NodeId } from '../value-objects/node-id';
import { NodeType } from '../value-objects/node-type';
import { EdgeId } from '../value-objects/edge-id';
import { EdgeType } from '../value-objects/edge-type';
import { Timestamp } from '../../common/value-objects/timestamp';

/**
 * 工作流领域服务
 * 
 * 专注于核心业务逻辑和规则，不包含应用层逻辑
 */
export class WorkflowDomainService {
  /**
   * 构造函数
   * @param workflowRepository 工作流仓储
   */
  constructor(private readonly workflowRepository: WorkflowRepository) {}

  /**
   * 验证工作流创建的业务规则
   * @param name 工作流名称
   * @param config 工作流配置
   * @param createdBy 创建者ID
   */
  async validateWorkflowCreation(name: string, config?: WorkflowConfig, createdBy?: ID): Promise<void> {
    // 验证工作流名称是否已存在
    const exists = await this.workflowRepository.existsByName(name);
    if (exists) {
      throw new DomainError(`工作流名称 "${name}" 已存在`);
    }

    // 验证配置
    if (config) {
      config.validate();
    }
  }

  /**
   * 验证工作流状态转换的业务规则
   * @param workflow 工作流
   * @param newStatus 新状态
   */
  validateStatusTransition(workflow: Workflow, newStatus: WorkflowStatus): void {
    const currentStatus = workflow.status;

    // 已归档的工作流不能变更到其他状态
    if (currentStatus.isArchived() && !newStatus.isArchived()) {
      throw new DomainError('已归档的工作流不能变更到其他状态');
    }

    // 草稿状态只能激活或归档
    if (currentStatus.isDraft() &&
        !newStatus.isActive() &&
        !newStatus.isArchived()) {
      throw new DomainError('草稿状态的工作流只能激活或归档');
    }

    // 活跃状态只能变为非活跃或归档
    if (currentStatus.isActive() &&
        !newStatus.isInactive() &&
        !newStatus.isArchived()) {
      throw new DomainError('活跃状态的工作流只能变为非活跃或归档');
    }

    // 非活跃状态只能变为活跃或归档
    if (currentStatus.isInactive() &&
        !newStatus.isActive() &&
        !newStatus.isArchived()) {
      throw new DomainError('非活跃状态的工作流只能变为活跃或归档');
    }
  }

  /**
   * 验证工作流是否可以执行
   * @param workflow 工作流
   */
  validateExecutionEligibility(workflow: Workflow): void {
    if (!workflow.status.isActive()) {
      throw new DomainError('只有活跃状态的工作流才能执行');
    }

    if (workflow.isDeleted()) {
      throw new DomainError('已删除的工作流不能执行');
    }

    if (workflow.isEmpty()) {
      throw new DomainError('空工作流不能执行');
    }
  }

  /**
   * 验证节点添加的业务规则
   * @param workflow 工作流
   * @param nodeId 节点ID
   * @param nodeType 节点类型
   */
  validateNodeAddition(workflow: Workflow, nodeId: NodeId, nodeType: NodeType): void {
    if (!workflow.status.canEdit()) {
      throw new DomainError('只能编辑草稿状态工作流的节点');
    }

    if (workflow.hasNode(nodeId)) {
      throw new DomainError('节点已存在');
    }

    // 验证节点类型的业务规则
    this.validateNodeType(nodeType);
  }

  /**
   * 验证节点移除的业务规则
   * @param workflow 工作流
   * @param nodeId 节点ID
   */
  validateNodeRemoval(workflow: Workflow, nodeId: NodeId): void {
    if (!workflow.status.canEdit()) {
      throw new DomainError('只能编辑草稿状态工作流的节点');
    }

    if (!workflow.hasNode(nodeId)) {
      throw new DomainError('节点不存在');
    }

    // 检查是否有边连接到此节点
    const connectedEdges = workflow.getIncomingEdges(nodeId).concat(workflow.getOutgoingEdges(nodeId));
    if (connectedEdges.length > 0) {
      throw new DomainError('无法移除有边连接的节点');
    }
  }

  /**
   * 验证边添加的业务规则
   * @param workflow 工作流
   * @param edgeId 边ID
   * @param edgeType 边类型
   * @param fromNodeId 源节点ID
   * @param toNodeId 目标节点ID
   */
  validateEdgeAddition(
    workflow: Workflow,
    edgeId: EdgeId,
    edgeType: EdgeType,
    fromNodeId: NodeId,
    toNodeId: NodeId
  ): void {
    if (!workflow.status.canEdit()) {
      throw new DomainError('只能编辑草稿状态工作流的边');
    }

    if (workflow.hasEdge(edgeId)) {
      throw new DomainError('边已存在');
    }

    // 检查源节点和目标节点是否存在
    if (!workflow.hasNode(fromNodeId)) {
      throw new DomainError('源节点不存在');
    }

    if (!workflow.hasNode(toNodeId)) {
      throw new DomainError('目标节点不存在');
    }

    // 验证边类型的业务规则
    this.validateEdgeType(edgeType);
  }

  /**
   * 验证边移除的业务规则
   * @param workflow 工作流
   * @param edgeId 边ID
   */
  validateEdgeRemoval(workflow: Workflow, edgeId: EdgeId): void {
    if (!workflow.status.canEdit()) {
      throw new DomainError('只能编辑草稿状态工作流的边');
    }

    if (!workflow.hasEdge(edgeId)) {
      throw new DomainError('边不存在');
    }
  }

  /**
   * 计算工作流超时时间
   * @param workflow 工作流
   * @returns 超时时间戳
   */
  calculateWorkflowTimeout(workflow: Workflow): Timestamp {
    // 简化实现，返回30分钟后的时间戳
    return Timestamp.now().addHours(0.5); // 30分钟 = 0.5小时
  }

  /**
   * 检查工作流是否需要清理
   * @param workflow 工作流
   * @returns 是否需要清理
   */
  needsCleanup(workflow: Workflow): boolean {
    // 检查是否超过超时时间
    const timeout = this.calculateWorkflowTimeout(workflow);
    return Timestamp.now().isAfter(timeout);
  }

  /**
   * 获取工作流的下一个执行节点
   * @param workflow 工作流
   * @param currentNodeId 当前节点ID
   * @returns 下一个节点ID或null
   */
  getNextExecutionNode(workflow: Workflow, currentNodeId?: NodeId): NodeId | null {
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
    // 实际业务逻辑可能更复杂，需要考虑条件边等
    if (outgoingEdges.length === 0) return null;
    const firstEdge = outgoingEdges[0];
    return firstEdge ? firstEdge.toNodeId : null;
  }

  /**
   * 检查工作流是否形成循环
   * @param workflow 工作流
   * @returns 是否有循环
   */
  hasCycle(workflow: Workflow): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const [nodeIdStr] of workflow.getNodes()) {
      if (this.hasCycleFromNode(workflow, nodeIdStr, visited, recursionStack)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 验证节点类型的业务规则
   * @param nodeType 节点类型
   */
  private validateNodeType(nodeType: NodeType): void {
    // 这里可以添加特定节点类型的验证规则
    // 例如：某些类型的工作流不能包含特定类型的节点
  }

  /**
   * 验证边类型的业务规则
   * @param edgeType 边类型
   */
  private validateEdgeType(edgeType: EdgeType): void {
    // 这里可以添加特定边类型的验证规则
    // 例如：条件边必须有条件表达式
    if (edgeType.isConditional()) {
      // 条件边的验证逻辑
    }
  }

  /**
   * 从指定节点开始检查是否有循环
   * @param workflow 工作流
   * @param nodeIdStr 节点ID字符串
   * @param visited 已访问节点
   * @param recursionStack 递归栈
   * @returns 是否有循环
   */
  private hasCycleFromNode(
    workflow: Workflow,
    nodeIdStr: string,
    visited: Set<string>,
    recursionStack: Set<string>
  ): boolean {
    if (recursionStack.has(nodeIdStr)) {
      return true; // 发现循环
    }

    if (visited.has(nodeIdStr)) {
      return false; // 已访问过，无循环
    }

    visited.add(nodeIdStr);
    recursionStack.add(nodeIdStr);

    const nodeId = NodeId.fromString(nodeIdStr);
    const outgoingEdges = workflow.getOutgoingEdges(nodeId);

    for (const edge of outgoingEdges) {
      const targetNodeIdStr = edge.toNodeId.toString();
      if (this.hasCycleFromNode(workflow, targetNodeIdStr, visited, recursionStack)) {
        return true;
      }
    }

    recursionStack.delete(nodeIdStr);
    return false;
  }
}