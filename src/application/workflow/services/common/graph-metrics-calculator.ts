import { injectable, inject } from 'inversify';
import { Workflow as Graph } from '@domain/workflow/entities/workflow';
import { ID } from '@domain/common/value-objects/id';
import { ILogger } from '@shared/types/logger';

/**
 * 图指标计算器
 * 
 * 专门负责计算图的各种指标，如密度、连通性、中心性等
 */
@injectable()
export class GraphMetricsCalculator {
  constructor(@inject('Logger') private readonly logger: ILogger) {}

  /**
   * 计算图指标
   * @param graph 图
   * @returns 图指标
   */
  calculateGraphMetrics(graph: Graph): {
    density: number;
    connectivity: number;
    centrality: Map<string, number>;
    clustering: number;
    averagePathLength: number;
    diameter: number;
  } {
    this.logger.debug('正在计算图指标', {
      graphId: graph.graphId.toString(),
      nodeCount: graph.getNodeCount(),
      edgeCount: graph.getEdgeCount()
    });

    const nodeCount = graph.nodes.size;
    const edgeCount = graph.edges.size;
    
    // 计算图密度
    const density = this.calculateDensity(nodeCount, edgeCount);
    
    // 计算连通性
    const connectivity = this.calculateConnectivity(graph);
    
    // 计算中心性
    const centrality = this.calculateCentrality(graph);
    
    // 计算聚类系数
    const clustering = this.calculateClusteringCoefficient(graph);
    
    // 计算平均路径长度
    const averagePathLength = this.calculateAveragePathLength(graph);
    
    // 计算图的直径
    const diameter = this.calculateDiameter(graph);

    const metrics = {
      density,
      connectivity,
      centrality,
      clustering,
      averagePathLength,
      diameter
    };

    this.logger.debug('图指标计算完成', {
      graphId: graph.graphId.toString(),
      density,
      connectivity,
      clustering
    });

    return metrics;
  }

  /**
   * 计算图密度
   * @param nodeCount 节点数量
   * @param edgeCount 边数量
   * @returns 图密度
   */
  calculateDensity(nodeCount: number, edgeCount: number): number {
    if (nodeCount < 2) {
      return 0;
    }
    
    // 对于有向图，最大可能边数为 n*(n-1)
    const maxPossibleEdges = nodeCount * (nodeCount - 1);
    return edgeCount / maxPossibleEdges;
  }

  /**
   * 计算连通性
   * @param graph 图
   * @returns 连通性指标
   */
  calculateConnectivity(graph: Graph): number {
    // 简化实现：计算连通分量的数量
    const visited = new Set<string>();
    let componentCount = 0;
    
    const dfs = (nodeId: ID) => {
      const nodeIdStr = nodeId.toString();
      
      if (visited.has(nodeIdStr)) {
        return;
      }
      
      visited.add(nodeIdStr);
      
      const outgoingEdges = graph.getOutgoingEdges(nodeId);
      for (const edge of outgoingEdges) {
        dfs(edge.toNodeId);
      }
      
      // 对于无向图，还需要检查入边
      const incomingEdges = graph.getIncomingEdges(nodeId);
      for (const edge of incomingEdges) {
        dfs(edge.fromNodeId);
      }
    };
    
    for (const node of graph.nodes.values()) {
      if (!visited.has(node.nodeId.toString())) {
        componentCount++;
        dfs(node.nodeId);
      }
    }
    
    // 连通性 = 1 / 连通分量数量
    return componentCount > 0 ? 1 / componentCount : 0;
  }

  /**
   * 计算中心性
   * @param graph 图
   * @returns 节点中心性映射
   */
  calculateCentrality(graph: Graph): Map<string, number> {
    const centrality = new Map<string, number>();
    
    // 使用度中心性
    for (const node of graph.nodes.values()) {
      const nodeIdStr = node.nodeId.toString();
      const outgoingEdges = graph.getOutgoingEdges(node.nodeId);
      const incomingEdges = graph.getIncomingEdges(node.nodeId);
      const degree = outgoingEdges.length + incomingEdges.length;
      
      // 归一化中心性
      const maxPossibleDegree = graph.nodes.size - 1;
      const normalizedCentrality = maxPossibleDegree > 0 ? degree / maxPossibleDegree : 0;
      
      centrality.set(nodeIdStr, normalizedCentrality);
    }
    
    return centrality;
  }

  /**
   * 计算聚类系数
   * @param graph 图
   * @returns 聚类系数
   */
  calculateClusteringCoefficient(graph: Graph): number {
    let totalClustering = 0;
    let nodeCount = 0;
    
    for (const node of graph.nodes.values()) {
      const clustering = this.calculateNodeClusteringCoefficient(graph, node.nodeId);
      totalClustering += clustering;
      nodeCount++;
    }
    
    return nodeCount > 0 ? totalClustering / nodeCount : 0;
  }

  /**
   * 计算单个节点的聚类系数
   * @param graph 图
   * @param nodeId 节点ID
   * @returns 节点聚类系数
   */
  calculateNodeClusteringCoefficient(graph: Graph, nodeId: ID): number {
    const neighbors = this.getNodeNeighbors(graph, nodeId);
    const neighborCount = neighbors.length;
    
    if (neighborCount < 2) {
      return 0;
    }
    
    // 计算邻居之间的连接数
    let connectionCount = 0;
    for (let i = 0; i < neighborCount; i++) {
      for (let j = i + 1; j < neighborCount; j++) {
        const neighbor1 = neighbors[i];
        const neighbor2 = neighbors[j];
        if (neighbor1 && neighbor2 && this.hasEdgeBetween(graph, neighbor1, neighbor2)) {
          connectionCount++;
        }
      }
    }
    
    // 聚类系数 = 实际连接数 / 可能的最大连接数
    const maxPossibleConnections = neighborCount * (neighborCount - 1) / 2;
    return connectionCount / maxPossibleConnections;
  }

  /**
   * 获取节点的邻居
   * @param graph 图
   * @param nodeId 节点ID
   * @returns 邻居节点ID列表
   */
  private getNodeNeighbors(graph: Graph, nodeId: ID): ID[] {
    const neighbors: ID[] = [];
    
    // 获取出边指向的节点
    const outgoingEdges = graph.getOutgoingEdges(nodeId);
    for (const edge of outgoingEdges) {
      neighbors.push(edge.toNodeId);
    }
    
    // 获取入边来源的节点
    const incomingEdges = graph.getIncomingEdges(nodeId);
    for (const edge of incomingEdges) {
      neighbors.push(edge.fromNodeId);
    }
    
    // 去重
    const uniqueNeighbors = new Set<string>();
    const result: ID[] = [];
    
    for (const neighbor of neighbors) {
      const neighborStr = neighbor.toString();
      if (!uniqueNeighbors.has(neighborStr)) {
        uniqueNeighbors.add(neighborStr);
        result.push(neighbor);
      }
    }
    
    return result;
  }

  /**
   * 检查两个节点之间是否有边
   * @param graph 图
   * @param nodeId1 节点1 ID
   * @param nodeId2 节点2 ID
   * @returns 是否有边
   */
  private hasEdgeBetween(graph: Graph, nodeId1: ID, nodeId2: ID): boolean {
    // 检查从nodeId1到nodeId2的边
    const outgoingEdges = graph.getOutgoingEdges(nodeId1);
    for (const edge of outgoingEdges) {
      if (edge.toNodeId.equals(nodeId2)) {
        return true;
      }
    }
    
    // 检查从nodeId2到nodeId1的边
    const outgoingEdges2 = graph.getOutgoingEdges(nodeId2);
    for (const edge of outgoingEdges2) {
      if (edge.toNodeId.equals(nodeId1)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 计算平均路径长度
   * @param graph 图
   * @returns 平均路径长度
   */
  calculateAveragePathLength(graph: Graph): number {
    const nodes = Array.from(graph.nodes.values());
    let totalPathLength = 0;
    let pathCount = 0;
    
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeId1 = (nodes[i] as any)?.nodeId;
        const nodeId2 = (nodes[j] as any)?.nodeId;
        if (nodeId1 && nodeId2) {
          const pathLength = this.calculateShortestPathLength(graph, nodeId1, nodeId2);
          if (pathLength > 0) {
            totalPathLength += pathLength;
            pathCount++;
          }
        }
      }
    }
    
    return pathCount > 0 ? totalPathLength / pathCount : 0;
  }

  /**
   * 计算两个节点之间的最短路径长度
   * @param graph 图
   * @param fromNodeId 起始节点ID
   * @param toNodeId 目标节点ID
   * @returns 最短路径长度，如果不连通则返回0
   */
  calculateShortestPathLength(graph: Graph, fromNodeId: ID, toNodeId: ID): number {
    const visited = new Set<string>();
    const queue: Array<{ nodeId: ID; distance: number }> = [
      { nodeId: fromNodeId, distance: 0 }
    ];
    
    while (queue.length > 0) {
      const { nodeId, distance } = queue.shift()!;
      const nodeIdStr = nodeId.toString();
      
      if (nodeId.equals(toNodeId)) {
        return distance;
      }
      
      if (visited.has(nodeIdStr)) {
        continue;
      }
      
      visited.add(nodeIdStr);
      
      const outgoingEdges = graph.getOutgoingEdges(nodeId);
      for (const edge of outgoingEdges) {
        if (!visited.has(edge.toNodeId.toString())) {
          queue.push({ nodeId: edge.toNodeId, distance: distance + 1 });
        }
      }
    }
    
    return 0; // 不连通
  }

  /**
   * 计算图的直径
   * @param graph 图
   * @returns 图的直径
   */
  calculateDiameter(graph: Graph): number {
    const nodes = Array.from(graph.nodes.values());
    let maxPathLength = 0;
    
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeId1 = (nodes[i] as any)?.nodeId;
        const nodeId2 = (nodes[j] as any)?.nodeId;
        if (nodeId1 && nodeId2) {
          const pathLength = this.calculateShortestPathLength(graph, nodeId1, nodeId2);
          if (pathLength > maxPathLength) {
            maxPathLength = pathLength;
          }
        }
      }
    }
    
    return maxPathLength;
  }

  /**
   * 计算节点的度分布
   * @param graph 图
   * @returns 度分布映射
   */
  calculateDegreeDistribution(graph: Graph): Map<number, number> {
    const degreeDistribution = new Map<number, number>();
    
    for (const node of graph.nodes.values()) {
      const outgoingEdges = graph.getOutgoingEdges(node.nodeId);
      const incomingEdges = graph.getIncomingEdges(node.nodeId);
      const degree = outgoingEdges.length + incomingEdges.length;
      
      degreeDistribution.set(degree, (degreeDistribution.get(degree) || 0) + 1);
    }
    
    return degreeDistribution;
  }

  /**
   * 计算图的复杂度指标
   * @param graph 图
   * @returns 复杂度指标
   */
  calculateComplexityMetrics(graph: Graph): {
    cyclomaticComplexity: number;
    cognitiveComplexity: number;
    structuralComplexity: number;
  } {
    // 计算圈复杂度 = 边数 - 节点数 + 2 * 连通分量数
    const edgeCount = graph.edges.size;
    const nodeCount = graph.nodes.size;
    const componentCount = this.calculateComponentCount(graph);
    const cyclomaticComplexity = edgeCount - nodeCount + 2 * componentCount;
    
    // 计算认知复杂度（简化实现）
    const cognitiveComplexity = this.calculateCognitiveComplexity(graph);
    
    // 计算结构复杂度（基于嵌套深度和分支数）
    const structuralComplexity = this.calculateStructuralComplexity(graph);
    
    return {
      cyclomaticComplexity,
      cognitiveComplexity,
      structuralComplexity
    };
  }

  /**
   * 计算连通分量数
   * @param graph 图
   * @returns 连通分量数
   */
  private calculateComponentCount(graph: Graph): number {
    const visited = new Set<string>();
    let componentCount = 0;
    
    const dfs = (nodeId: ID) => {
      const nodeIdStr = nodeId.toString();
      
      if (visited.has(nodeIdStr)) {
        return;
      }
      
      visited.add(nodeIdStr);
      
      const outgoingEdges = graph.getOutgoingEdges(nodeId);
      for (const edge of outgoingEdges) {
        dfs(edge.toNodeId);
      }
    };
    
    for (const node of graph.nodes.values()) {
      if (!visited.has(node.nodeId.toString())) {
        componentCount++;
        dfs(node.nodeId);
      }
    }
    
    return componentCount;
  }

  /**
   * 计算认知复杂度
   * @param graph 图
   * @returns 认知复杂度
   */
  private calculateCognitiveComplexity(graph: Graph): number {
    // 简化实现：基于条件节点和循环的数量
    let complexity = 0;
    
    for (const node of graph.nodes.values()) {
      const nodeType = node.type.toString();
      
      if (nodeType === 'condition') {
        complexity += 1;
      } else if (nodeType === 'loop') {
        complexity += 2;
      }
    }
    
    return complexity;
  }

  /**
   * 计算结构复杂度
   * @param graph 图
   * @returns 结构复杂度
   */
  private calculateStructuralComplexity(graph: Graph): number {
    // 简化实现：基于平均出度和最大路径长度
    let totalOutDegree = 0;
    
    for (const node of graph.nodes.values()) {
      const outgoingEdges = graph.getOutgoingEdges(node.nodeId);
      totalOutDegree += outgoingEdges.length;
    }
    
    const averageOutDegree = graph.nodes.size > 0 ? totalOutDegree / graph.nodes.size : 0;
    const maxPathLength = this.calculateDiameter(graph);
    
    return averageOutDegree * maxPathLength;
  }
}