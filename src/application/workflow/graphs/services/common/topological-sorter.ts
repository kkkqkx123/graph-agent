import { injectable, inject } from 'inversify';
import { Graph } from '../../../../../domain/workflow/graph/entities/graph';
import { ID } from '../../../../../domain/common/value-objects/id';
import { DomainError } from '../../../../../domain/common/errors/domain-error';
import { ILogger } from '@shared/types/logger';

/**
 * 拓扑排序器
 * 
 * 专门负责对有向无环图进行拓扑排序
 */
@injectable()
export class TopologicalSorter {
  constructor(@inject('Logger') private readonly logger: ILogger) {}

  /**
   * 拓扑排序
   * @param graph 图
   * @returns 拓扑排序结果
   */
  topologicalSort(graph: Graph): string[] {
    this.logger.debug('正在进行拓扑排序', {
      graphId: graph.graphId.toString(),
      nodeCount: graph.getNodeCount(),
      edgeCount: graph.getEdgeCount()
    });

    const inDegree = new Map<string, number>();
    const result: string[] = [];
    const queue: string[] = [];
    
    // 计算每个节点的入度
    for (const node of graph.nodes.values()) {
      const nodeIdStr = node.nodeId.toString();
      inDegree.set(nodeIdStr, 0);
    }
    
    for (const edge of graph.edges.values()) {
      const toNodeIdStr = edge.toNodeId.toString();
      inDegree.set(toNodeIdStr, (inDegree.get(toNodeIdStr) || 0) + 1);
    }
    
    // 找到入度为0的节点
    for (const [nodeIdStr, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(nodeIdStr);
      }
    }
    
    // 拓扑排序
    while (queue.length > 0) {
      const nodeIdStr = queue.shift()!;
      result.push(nodeIdStr);
      
      const node = graph.getNode(ID.fromString(nodeIdStr));
      if (node) {
        const outgoingEdges = graph.getOutgoingEdges(node.nodeId);
        for (const edge of outgoingEdges) {
          const toNodeIdStr = edge.toNodeId.toString();
          const newInDegree = (inDegree.get(toNodeIdStr) || 0) - 1;
          inDegree.set(toNodeIdStr, newInDegree);
          
          if (newInDegree === 0) {
            queue.push(toNodeIdStr);
          }
        }
      }
    }
    
    // 检查是否有环
    if (result.length !== graph.nodes.size) {
      throw new DomainError('图中存在循环，无法进行拓扑排序');
    }

    this.logger.debug('拓扑排序完成', {
      graphId: graph.graphId.toString(),
      sortedNodeCount: result.length
    });

    return result;
  }

  /**
   * 检查图是否可以进行拓扑排序（即是否为有向无环图）
   * @param graph 图
   * @returns 是否可以进行拓扑排序
   */
  canTopologicalSort(graph: Graph): boolean {
    try {
      this.topologicalSort(graph);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取节点的拓扑层级
   * @param graph 图
   * @returns 节点层级映射
   */
  getNodeLevels(graph: Graph): Map<string, number> {
    this.logger.debug('正在计算节点拓扑层级', {
      graphId: graph.graphId.toString()
    });

    const nodeLevels = new Map<string, number>();
    const inDegree = new Map<string, number>();
    const queue: Array<{ nodeId: string; level: number }> = [];
    
    // 计算每个节点的入度
    for (const node of graph.nodes.values()) {
      const nodeIdStr = node.nodeId.toString();
      inDegree.set(nodeIdStr, 0);
    }
    
    for (const edge of graph.edges.values()) {
      const toNodeIdStr = edge.toNodeId.toString();
      inDegree.set(toNodeIdStr, (inDegree.get(toNodeIdStr) || 0) + 1);
    }
    
    // 找到入度为0的节点，作为第0层
    for (const [nodeIdStr, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push({ nodeId: nodeIdStr, level: 0 });
        nodeLevels.set(nodeIdStr, 0);
      }
    }
    
    // 按层级处理节点
    while (queue.length > 0) {
      const { nodeId, level } = queue.shift()!;
      
      const node = graph.getNode(ID.fromString(nodeId));
      if (node) {
        const outgoingEdges = graph.getOutgoingEdges(node.nodeId);
        for (const edge of outgoingEdges) {
          const toNodeIdStr = edge.toNodeId.toString();
          const newInDegree = (inDegree.get(toNodeIdStr) || 0) - 1;
          inDegree.set(toNodeIdStr, newInDegree);
          
          // 如果入度变为0，设置其层级
          if (newInDegree === 0) {
            const nextLevel = level + 1;
            queue.push({ nodeId: toNodeIdStr, level: nextLevel });
            nodeLevels.set(toNodeIdStr, nextLevel);
          }
        }
      }
    }

    this.logger.debug('节点拓扑层级计算完成', {
      graphId: graph.graphId.toString(),
      maxLevel: Math.max(...Array.from(nodeLevels.values()))
    });

    return nodeLevels;
  }

  /**
   * 获取指定层级的所有节点
   * @param graph 图
   * @param level 层级
   * @returns 该层级的节点列表
   */
  getNodesAtLevel(graph: Graph, level: number): string[] {
    const nodeLevels = this.getNodeLevels(graph);
    const nodesAtLevel: string[] = [];
    
    for (const [nodeIdStr, nodeLevel] of nodeLevels.entries()) {
      if (nodeLevel === level) {
        nodesAtLevel.push(nodeIdStr);
      }
    }
    
    return nodesAtLevel;
  }

  /**
   * 获取图的最大层级数
   * @param graph 图
   * @returns 最大层级数
   */
  getMaxLevel(graph: Graph): number {
    const nodeLevels = this.getNodeLevels(graph);
    if (nodeLevels.size === 0) {
      return 0;
    }
    
    return Math.max(...Array.from(nodeLevels.values()));
  }

  /**
   * 检查两个节点之间的依赖关系
   * @param graph 图
   * @param fromNodeId 起始节点ID
   * @param toNodeId 目标节点ID
   * @returns 是否存在依赖关系
   */
  hasDependency(graph: Graph, fromNodeId: ID, toNodeId: ID): boolean {
    const topologicalOrder = this.topologicalSort(graph);
    const fromIndex = topologicalOrder.indexOf(fromNodeId.toString());
    const toIndex = topologicalOrder.indexOf(toNodeId.toString());
    
    return fromIndex !== -1 && toIndex !== -1 && fromIndex < toIndex;
  }

  /**
   * 获取节点的所有前置节点
   * @param graph 图
   * @param nodeId 节点ID
   * @returns 前置节点列表
   */
  getPredecessors(graph: Graph, nodeId: ID): string[] {
    const topologicalOrder = this.topologicalSort(graph);
    const nodeIndex = topologicalOrder.indexOf(nodeId.toString());
    
    if (nodeIndex === -1) {
      return [];
    }
    
    const predecessors: string[] = [];
    const visited = new Set<string>();
    
    // 检查拓扑排序中在该节点之前的所有节点
    for (let i = 0; i < nodeIndex; i++) {
      const candidateNodeId = topologicalOrder[i];
      if (candidateNodeId && this.hasPath(graph, ID.fromString(candidateNodeId), nodeId)) {
        predecessors.push(candidateNodeId);
      }
    }
    
    return predecessors;
  }

  /**
   * 获取节点的所有后继节点
   * @param graph 图
   * @param nodeId 节点ID
   * @returns 后继节点列表
   */
  getSuccessors(graph: Graph, nodeId: ID): string[] {
    const topologicalOrder = this.topologicalSort(graph);
    const nodeIndex = topologicalOrder.indexOf(nodeId.toString());
    
    if (nodeIndex === -1) {
      return [];
    }
    
    const successors: string[] = [];
    
    // 检查拓扑排序中在该节点之后的所有节点
    for (let i = nodeIndex + 1; i < topologicalOrder.length; i++) {
      const candidateNodeId = topologicalOrder[i];
      if (candidateNodeId && this.hasPath(graph, nodeId, ID.fromString(candidateNodeId))) {
        successors.push(candidateNodeId);
      }
    }
    
    return successors;
  }

  /**
   * 检查是否存在从一个节点到另一个节点的路径
   * @param graph 图
   * @param fromNodeId 起始节点ID
   * @param toNodeId 目标节点ID
   * @returns 是否存在路径
   */
  private hasPath(graph: Graph, fromNodeId: ID, toNodeId: ID): boolean {
    const visited = new Set<string>();
    const queue = [fromNodeId];
    
    while (queue.length > 0) {
      const currentNodeId = queue.shift()!;
      const currentNodeIdStr = currentNodeId.toString();
      
      if (currentNodeId.equals(toNodeId)) {
        return true;
      }
      
      if (visited.has(currentNodeIdStr)) {
        continue;
      }
      
      visited.add(currentNodeIdStr);
      
      const outgoingEdges = graph.getOutgoingEdges(currentNodeId);
      for (const edge of outgoingEdges) {
        if (!visited.has(edge.toNodeId.toString())) {
          queue.push(edge.toNodeId);
        }
      }
    }
    
    return false;
  }
}