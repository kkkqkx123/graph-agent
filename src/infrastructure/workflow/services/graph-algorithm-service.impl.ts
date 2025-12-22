import { injectable } from 'inversify';
import { GraphAlgorithmService, GraphComplexity } from '../../../domain/workflow/interfaces/graph-algorithm-service.interface';
import { WorkflowGraph } from '../../../domain/workflow/entities/workflow-graph';
import { Node } from '../../../domain/workflow/entities/nodes/base/node';
import { Edge } from '../../../domain/workflow/entities/edges/base/edge';
import { ID } from '../../../domain/common/value-objects/id';

/**
 * 图算法服务实现
 * 
 * 基础设施层实现，提供具体的图算法功能：
 * 1. 拓扑排序
 * 2. 循环检测
 * 3. 连通分量分析
 * 4. 路径查找
 * 5. 图复杂度分析
 * 
 * 此实现可以替换为其他算法实现（如性能优化版本、并行版本等）。
 */
@injectable()
export class GraphAlgorithmServiceImpl implements GraphAlgorithmService {
  /**
   * 获取图的拓扑排序
   * @param graph 工作流图
   * @returns 拓扑排序的节点列表
   */
  getTopologicalOrder(graph: WorkflowGraph): Node[] {
    const visited = new Set<string>();
    const result: Node[] = [];

    const visit = (nodeId: ID) => {
      const nodeIdStr = nodeId.toString();
      if (visited.has(nodeIdStr)) return;
      visited.add(nodeIdStr);

      // 先访问所有依赖节点
      const incomingEdges = graph.getIncomingEdges(nodeId);
      for (const edge of incomingEdges) {
        visit(edge.fromNodeId);
      }

      // 然后访问当前节点
      const node = graph.getNode(nodeId);
      if (node) {
        result.push(node);
      }
    };

    // 从所有节点开始
    for (const node of graph.nodes.values()) {
      visit(node.nodeId);
    }

    return result;
  }

  /**
   * 检查图是否包含循环
   * @param graph 工作流图
   * @returns 是否包含循环
   */
  hasCycle(graph: WorkflowGraph): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycleDFS = (nodeId: ID): boolean => {
      const nodeIdStr = nodeId.toString();
      
      if (recursionStack.has(nodeIdStr)) {
        return true; // 发现循环
      }
      
      if (visited.has(nodeIdStr)) {
        return false;
      }
      
      visited.add(nodeIdStr);
      recursionStack.add(nodeIdStr);
      
      const outgoingEdges = graph.getOutgoingEdges(nodeId);
      for (const edge of outgoingEdges) {
        if (hasCycleDFS(edge.toNodeId)) {
          return true;
        }
      }
      
      recursionStack.delete(nodeIdStr);
      return false;
    };

    for (const node of graph.nodes.values()) {
      if (!visited.has(node.nodeId.toString())) {
        if (hasCycleDFS(node.nodeId)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 获取图的连通分量
   * @param graph 工作流图
   * @returns 连通分量列表
   */
  getConnectedComponents(graph: WorkflowGraph): Node[][] {
    const visited = new Set<string>();
    const components: Node[][] = [];

    const dfs = (nodeId: ID, component: Node[]): void => {
      const nodeIdStr = nodeId.toString();
      if (visited.has(nodeIdStr)) return;
      
      visited.add(nodeIdStr);
      const node = graph.getNode(nodeId);
      if (node) {
        component.push(node);
      }
      
      // 访问相邻节点
      const adjacentNodes = this.getAdjacentNodes(graph, nodeId);
      for (const adjacentNode of adjacentNodes) {
        dfs(adjacentNode.nodeId, component);
      }
    };

    for (const node of graph.nodes.values()) {
      const nodeIdStr = node.nodeId.toString();
      if (!visited.has(nodeIdStr)) {
        const component: Node[] = [];
        dfs(node.nodeId, component);
        components.push(component);
      }
    }

    return components;
  }

  /**
   * 查找两个节点之间的路径
   * @param graph 工作流图
   * @param startNodeId 起始节点ID
   * @param endNodeId 结束节点ID
   * @returns 路径节点列表，如果不存在路径则返回空数组
   */
  findPath(graph: WorkflowGraph, startNodeId: ID, endNodeId: ID): Node[] {
    const visited = new Set<string>();
    const path: Node[] = [];
    
    const dfs = (currentNodeId: ID): boolean => {
      const currentNodeIdStr = currentNodeId.toString();
      if (visited.has(currentNodeIdStr)) return false;
      
      visited.add(currentNodeIdStr);
      const currentNode = graph.getNode(currentNodeId);
      if (!currentNode) return false;
      
      path.push(currentNode);
      
      if (currentNodeId.equals(endNodeId)) {
        return true; // 找到路径
      }
      
      // 深度优先搜索
      const outgoingEdges = graph.getOutgoingEdges(currentNodeId);
      for (const edge of outgoingEdges) {
        if (dfs(edge.toNodeId)) {
          return true;
        }
      }
      
      // 回溯
      path.pop();
      return false;
    };
    
    if (dfs(startNodeId)) {
      return path;
    }
    
    return [];
  }

  /**
   * 查找两个节点之间的所有路径
   * @param graph 工作流图
   * @param startNodeId 起始节点ID
   * @param endNodeId 结束节点ID
   * @returns 所有路径的节点列表
   */
  findAllPaths(graph: WorkflowGraph, startNodeId: ID, endNodeId: ID): Node[][] {
    const visited = new Set<string>();
    const allPaths: Node[][] = [];
    const currentPath: Node[] = [];
    
    const dfs = (currentNodeId: ID): void => {
      const currentNodeIdStr = currentNodeId.toString();
      if (visited.has(currentNodeIdStr)) return;
      
      visited.add(currentNodeIdStr);
      const currentNode = graph.getNode(currentNodeId);
      if (!currentNode) return;
      
      currentPath.push(currentNode);
      
      if (currentNodeId.equals(endNodeId)) {
        allPaths.push([...currentPath]); // 找到一条路径
      } else {
        // 继续搜索
        const outgoingEdges = graph.getOutgoingEdges(currentNodeId);
        for (const edge of outgoingEdges) {
          dfs(edge.toNodeId);
        }
      }
      
      // 回溯
      currentPath.pop();
      visited.delete(currentNodeIdStr);
    };
    
    dfs(startNodeId);
    return allPaths;
  }

  /**
   * 获取节点的相邻节点
   * @param graph 工作流图
   * @param nodeId 节点ID
   * @returns 相邻节点列表
   */
  getAdjacentNodes(graph: WorkflowGraph, nodeId: ID): Node[] {
    const adjacentNodes: Node[] = [];
    const visited = new Set<string>();

    // 获取出边指向的节点
    for (const edge of graph.getOutgoingEdges(nodeId)) {
      const targetNode = graph.getNode(edge.toNodeId);
      if (targetNode && !visited.has(targetNode.nodeId.toString())) {
        adjacentNodes.push(targetNode);
        visited.add(targetNode.nodeId.toString());
      }
    }

    // 获取入边来源的节点
    for (const edge of graph.getIncomingEdges(nodeId)) {
      const sourceNode = graph.getNode(edge.fromNodeId);
      if (sourceNode && !visited.has(sourceNode.nodeId.toString())) {
        adjacentNodes.push(sourceNode);
        visited.add(sourceNode.nodeId.toString());
      }
    }

    return adjacentNodes;
  }

  /**
   * 分析图的复杂度
   * @param graph 工作流图
   * @returns 图复杂度分析结果
   */
  analyzeGraphComplexity(graph: WorkflowGraph): GraphComplexity {
    const nodeCount = graph.getNodeCount();
    const edgeCount = graph.getEdgeCount();
    
    // 计算度统计
    const inDegreeStats = this.getInDegreeStatistics(graph);
    const outDegreeStats = this.getOutDegreeStatistics(graph);
    
    let totalDegree = 0;
    let maxInDegree = 0;
    let maxOutDegree = 0;
    
    for (const [nodeId, inDegree] of inDegreeStats) {
      totalDegree += inDegree;
      maxInDegree = Math.max(maxInDegree, inDegree);
    }
    
    for (const outDegree of outDegreeStats.values()) {
      maxOutDegree = Math.max(maxOutDegree, outDegree);
    }
    
    const averageDegree = nodeCount > 0 ? totalDegree / nodeCount : 0;
    
    // 获取连通分量
    const components = this.getConnectedComponents(graph);
    const connectedComponentCount = components.length;
    
    // 检查循环
    const hasCycle = this.hasCycle(graph);
    
    // 计算深度（最长路径长度）
    let depth = 0;
    if (nodeCount > 0) {
      // 简化实现：使用拓扑排序的长度作为深度估计
      const topologicalOrder = this.getTopologicalOrder(graph);
      depth = topologicalOrder.length;
    }
    
    // 计算宽度（最大并行分支数）
    let width = 0;
    if (nodeCount > 0) {
      // 简化实现：使用最大出度作为宽度估计
      width = maxOutDegree;
    }
    
    // 计算复杂度评分（0-100）
    let complexityScore = 0;
    if (nodeCount > 0) {
      // 基于节点数、边数、循环、连通分量等因素计算
      const nodeFactor = Math.min(nodeCount / 50, 1); // 最多50个节点
      const edgeFactor = Math.min(edgeCount / 100, 1); // 最多100条边
      const cycleFactor = hasCycle ? 0.3 : 0;
      const componentFactor = Math.min((connectedComponentCount - 1) / 5, 0.2); // 最多5个分量
      
      complexityScore = Math.round(
        (nodeFactor * 40 + edgeFactor * 30 + cycleFactor * 20 + componentFactor * 10) * 100
      );
      complexityScore = Math.min(complexityScore, 100);
    }
    
    return {
      nodeCount,
      edgeCount,
      averageDegree,
      maxInDegree,
      maxOutDegree,
      connectedComponentCount,
      hasCycle,
      depth,
      width,
      complexityScore
    };
  }

  /**
   * 获取图的入度统计
   * @param graph 工作流图
   * @returns 节点入度映射
   */
  getInDegreeStatistics(graph: WorkflowGraph): Map<string, number> {
    const inDegreeMap = new Map<string, number>();
    
    // 初始化所有节点的入度为0
    for (const node of graph.nodes.values()) {
      inDegreeMap.set(node.nodeId.toString(), 0);
    }
    
    // 统计每条边对目标节点的入度贡献
    for (const edge of graph.edges.values()) {
      const targetNodeId = edge.toNodeId.toString();
      const currentInDegree = inDegreeMap.get(targetNodeId) || 0;
      inDegreeMap.set(targetNodeId, currentInDegree + 1);
    }
    
    return inDegreeMap;
  }

  /**
   * 获取图的出度统计
   * @param graph 工作流图
   * @returns 节点出度映射
   */
  getOutDegreeStatistics(graph: WorkflowGraph): Map<string, number> {
    const outDegreeMap = new Map<string, number>();
    
    // 初始化所有节点的出度为0
    for (const node of graph.nodes.values()) {
      outDegreeMap.set(node.nodeId.toString(), 0);
    }
    
    // 统计每条边对源节点的出度贡献
    for (const edge of graph.edges.values()) {
      const sourceNodeId = edge.fromNodeId.toString();
      const currentOutDegree = outDegreeMap.get(sourceNodeId) || 0;
      outDegreeMap.set(sourceNodeId, currentOutDegree + 1);
    }
    
    return outDegreeMap;
  }
}