import { Workflow } from '../../../domain/workflow/entities/workflow';
import { NodeId } from '../../../domain/workflow/value-objects';

/**
 * 节点路由器
 *
 * 负责工作流图中的节点路由逻辑，包括：
 * - 识别起始节点和结束节点
 * - 判断节点类型
 * - 提供节点遍历支持
 *
 * 属于基础设施层，提供技术性的路由决策支持
 */
export class NodeRouter {
  /**
   * 获取起始节点
   * 起始节点是指没有入边的节点
   *
   * @param workflow 工作流
   * @returns 起始节点ID列表
   */
  public getStartNodes(workflow: Workflow): NodeId[] {
    const nodeIdsWithIncomingEdges = new Set<string>();

    // 收集所有有入边的节点ID
    for (const edge of workflow.getEdges().values()) {
      nodeIdsWithIncomingEdges.add(edge.toNodeId.toString());
    }

    // 找出没有入边的节点
    const startNodes: NodeId[] = [];
    for (const node of workflow.getNodes().values()) {
      if (!nodeIdsWithIncomingEdges.has(node.nodeId.toString())) {
        startNodes.push(node.nodeId);
      }
    }

    return startNodes;
  }

  /**
   * 获取结束节点
   * 结束节点是指没有出边的节点
   *
   * @param workflow 工作流
   * @returns 结束节点ID列表
   */
  public getEndNodes(workflow: Workflow): NodeId[] {
    const nodeIdsWithOutgoingEdges = new Set<string>();

    // 收集所有有出边的节点ID
    for (const edge of workflow.getEdges().values()) {
      nodeIdsWithOutgoingEdges.add(edge.fromNodeId.toString());
    }

    // 找出没有出边的节点
    const endNodes: NodeId[] = [];
    for (const node of workflow.getNodes().values()) {
      if (!nodeIdsWithOutgoingEdges.has(node.nodeId.toString())) {
        endNodes.push(node.nodeId);
      }
    }

    return endNodes;
  }

  /**
   * 检查是否为结束节点
   *
   * @param workflow 工作流
   * @param nodeId 节点ID
   * @returns 是否为结束节点
   */
  public isEndNode(workflow: Workflow, nodeId: NodeId): boolean {
    return workflow.getOutgoingEdges(nodeId).length === 0;
  }

  /**
   * 检查是否为起始节点
   *
   * @param workflow 工作流
   * @param nodeId 节点ID
   * @returns 是否为起始节点
   */
  public isStartNode(workflow: Workflow, nodeId: NodeId): boolean {
    return workflow.getIncomingEdges(nodeId).length === 0;
  }

  /**
   * 检查是否为孤立节点
   * 孤立节点是指既没有入边也没有出边的节点
   *
   * @param workflow 工作流
   * @param nodeId 节点ID
   * @returns 是否为孤立节点
   */
  public isIsolatedNode(workflow: Workflow, nodeId: NodeId): boolean {
    return this.isStartNode(workflow, nodeId) && this.isEndNode(workflow, nodeId);
  }

  /**
   * 获取节点的后继节点
   *
   * @param workflow 工作流
   * @param nodeId 节点ID
   * @returns 后继节点ID列表
   */
  public getSuccessorNodes(workflow: Workflow, nodeId: NodeId): NodeId[] {
    const outgoingEdges = workflow.getOutgoingEdges(nodeId);
    return outgoingEdges.map(edge => edge.toNodeId);
  }

  /**
   * 获取节点的前驱节点
   *
   * @param workflow 工作流
   * @param nodeId 节点ID
   * @returns 前驱节点ID列表
   */
  public getPredecessorNodes(workflow: Workflow, nodeId: NodeId): NodeId[] {
    const incomingEdges = workflow.getIncomingEdges(nodeId);
    return incomingEdges.map(edge => edge.fromNodeId);
  }

  /**
   * 检查节点是否可达
   * 从起始节点开始，检查是否可以到达指定节点
   *
   * @param workflow 工作流
   * @param nodeId 节点ID
   * @returns 是否可达
   */
  public isNodeReachable(workflow: Workflow, nodeId: NodeId): boolean {
    const startNodes = this.getStartNodes(workflow);
    const visited = new Set<string>();

    // 从每个起始节点开始遍历
    for (const startNode of startNodes) {
      if (this.canReachNode(workflow, startNode, nodeId, visited)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 检查是否可以到达目标节点（深度优先搜索）
   *
   * @param workflow 工作流
   * @param currentNodeId 当前节点ID
   * @param targetNodeId 目标节点ID
   * @param visited 已访问节点集合
   * @returns 是否可以到达
   */
  private canReachNode(
    workflow: Workflow,
    currentNodeId: NodeId,
    targetNodeId: NodeId,
    visited: Set<string>
  ): boolean {
    const currentNodeIdStr = currentNodeId.toString();

    // 如果已经访问过，避免循环
    if (visited.has(currentNodeIdStr)) {
      return false;
    }

    // 标记为已访问
    visited.add(currentNodeIdStr);

    // 如果找到目标节点
    if (currentNodeId.equals(targetNodeId)) {
      return true;
    }

    // 递归检查后继节点
    const successors = this.getSuccessorNodes(workflow, currentNodeId);
    for (const successor of successors) {
      if (this.canReachNode(workflow, successor, targetNodeId, visited)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 获取从起始节点到指定节点的路径
   *
   * @param workflow 工作流
   * @param nodeId 节点ID
   * @returns 路径节点ID列表，如果不可达则返回空数组
   */
  public getPathToNode(workflow: Workflow, nodeId: NodeId): NodeId[] {
    const startNodes = this.getStartNodes(workflow);

    // 从每个起始节点开始寻找路径
    for (const startNode of startNodes) {
      const path = this.findPath(workflow, startNode, nodeId, new Set<string>());
      if (path.length > 0) {
        return path;
      }
    }

    return [];
  }

  /**
   * 查找路径（深度优先搜索）
   *
   * @param workflow 工作流
   * @param currentNodeId 当前节点ID
   * @param targetNodeId 目标节点ID
   * @param visited 已访问节点集合
   * @returns 路径节点ID列表
   */
  private findPath(
    workflow: Workflow,
    currentNodeId: NodeId,
    targetNodeId: NodeId,
    visited: Set<string>
  ): NodeId[] {
    const currentNodeIdStr = currentNodeId.toString();

    // 如果已经访问过，避免循环
    if (visited.has(currentNodeIdStr)) {
      return [];
    }

    // 标记为已访问
    visited.add(currentNodeIdStr);

    // 如果找到目标节点
    if (currentNodeId.equals(targetNodeId)) {
      return [currentNodeId];
    }

    // 递归查找后继节点
    const successors = this.getSuccessorNodes(workflow, currentNodeId);
    for (const successor of successors) {
      const path = this.findPath(workflow, successor, targetNodeId, visited);
      if (path.length > 0) {
        return [currentNodeId, ...path];
      }
    }

    return [];
  }

  /**
   * 获取所有可达节点
   *
   * @param workflow 工作流
   * @param nodeId 起始节点ID
   * @returns 可达节点ID列表
   */
  public getReachableNodes(workflow: Workflow, nodeId: NodeId): NodeId[] {
    const reachableNodes: NodeId[] = [];
    const visited = new Set<string>();

    this.collectReachableNodes(workflow, nodeId, visited, reachableNodes);

    return reachableNodes;
  }

  /**
   * 收集可达节点（广度优先搜索）
   *
   * @param workflow 工作流
   * @param currentNodeId 当前节点ID
   * @param visited 已访问节点集合
   * @param reachableNodes 可达节点列表
   */
  private collectReachableNodes(
    workflow: Workflow,
    currentNodeId: NodeId,
    visited: Set<string>,
    reachableNodes: NodeId[]
  ): void {
    const currentNodeIdStr = currentNodeId.toString();

    // 如果已经访问过，避免重复
    if (visited.has(currentNodeIdStr)) {
      return;
    }

    // 标记为已访问
    visited.add(currentNodeIdStr);
    reachableNodes.push(currentNodeId);

    // 递归收集后继节点
    const successors = this.getSuccessorNodes(workflow, currentNodeId);
    for (const successor of successors) {
      this.collectReachableNodes(workflow, successor, visited, reachableNodes);
    }
  }
}
