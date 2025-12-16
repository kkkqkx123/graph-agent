import { injectable, inject } from 'inversify';
import { Graph } from '@domain/workflow/entities/graph';
import { Edge } from '@domain/workflow/entities/edges';
import { ID } from '@domain/common/value-objects/id';
import { ILogger } from '@shared/types/logger';

/**
 * 路径分析器
 * 
 * 专门负责分析图中的路径，包括关键路径、条件路径等
 */
@injectable()
export class PathAnalyzer {
  constructor(@inject('Logger') private readonly logger: ILogger) {}

  /**
   * 找到关键路径
   * @param graph 图
   * @param startNodeId 起始节点ID
   * @param nodeLevels 节点层级
   * @returns 关键路径
   */
  findCriticalPath(
    graph: Graph,
    startNodeId: ID,
    nodeLevels: Map<string, number>
  ): string[] {
    this.logger.debug('正在查找关键路径', {
      graphId: graph.graphId.toString(),
      startNodeId: startNodeId.toString()
    });

    // 使用动态规划找到最长路径
    const longestPath = new Map<string, string[]>();
    const visited = new Set<string>();
    
    const dfs = (nodeId: ID): string[] => {
      const nodeIdStr = nodeId.toString();
      
      if (visited.has(nodeIdStr)) {
        return longestPath.get(nodeIdStr) || [];
      }
      
      visited.add(nodeIdStr);
      
      let maxSubPath: string[] = [];
      const outgoingEdges = graph.getOutgoingEdges(nodeId);
      
      for (const edge of outgoingEdges) {
        const subPath = dfs(edge.toNodeId);
        if (subPath.length > maxSubPath.length) {
          maxSubPath = subPath;
        }
      }
      
      const path = [nodeIdStr, ...maxSubPath];
      longestPath.set(nodeIdStr, path);
      return path;
    };
    
    const criticalPath = dfs(startNodeId);
    
    this.logger.debug('关键路径查找完成', {
      graphId: graph.graphId.toString(),
      pathLength: criticalPath.length
    });

    return criticalPath;
  }

  /**
   * 识别条件路径
   * @param graph 图
   * @returns 条件路径列表
   */
  identifyConditionalPaths(graph: Graph): string[][] {
    this.logger.debug('正在识别条件路径', {
      graphId: graph.graphId.toString()
    });

    const conditionalPaths: string[][] = [];
    const conditionalEdges = Array.from(graph.edges.values()).filter(
      (edge: any) => edge.type.toString() === 'conditional'
    );
    
    for (const edge of conditionalEdges) {
      // 找到从条件边出发的所有路径
      const path = this.findPathFromEdge(graph, edge);
      if (path.length > 0) {
        conditionalPaths.push(path);
      }
    }

    this.logger.debug('条件路径识别完成', {
      graphId: graph.graphId.toString(),
      pathCount: conditionalPaths.length
    });

    return conditionalPaths;
  }

  /**
   * 从边出发找到路径
   * @param graph 图
   * @param startEdge 起始边
   * @returns 路径
   */
  findPathFromEdge(graph: Graph, startEdge: Edge): string[] {
    const path: string[] = [];
    const visited = new Set<string>();
    const queue = [startEdge.toNodeId];
    
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const nodeIdStr = nodeId.toString();
      
      if (visited.has(nodeIdStr)) {
        continue;
      }
      
      visited.add(nodeIdStr);
      path.push(nodeIdStr);
      
      const outgoingEdges = graph.getOutgoingEdges(nodeId);
      for (const edge of outgoingEdges) {
        if (!visited.has(edge.toNodeId.toString())) {
          queue.push(edge.toNodeId);
        }
      }
    }
    
    return path;
  }

  /**
   * 检查是否存在从一个节点到另一个节点的路径
   * @param graph 图
   * @param fromNodeId 起始节点ID
   * @param toNodeId 目标节点ID
   * @returns 是否存在路径
   */
  hasPath(graph: Graph, fromNodeId: ID, toNodeId: ID): boolean {
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

  /**
   * 查找两个节点之间的所有路径
   * @param graph 图
   * @param fromNodeId 起始节点ID
   * @param toNodeId 目标节点ID
   * @param maxPaths 最大路径数量（防止无限循环）
   * @returns 所有路径列表
   */
  findAllPaths(
    graph: Graph,
    fromNodeId: ID,
    toNodeId: ID,
    maxPaths: number = 100
  ): string[][] {
    const allPaths: string[][] = [];
    const currentPath: string[] = [];
    const visited = new Set<string>();
    
    const dfs = (nodeId: ID) => {
      const nodeIdStr = nodeId.toString();
      
      // 检查是否达到目标节点
      if (nodeId.equals(toNodeId)) {
        allPaths.push([...currentPath, nodeIdStr]);
        return;
      }
      
      // 检查是否已访问或达到最大路径数
      if (visited.has(nodeIdStr) || allPaths.length >= maxPaths) {
        return;
      }
      
      visited.add(nodeIdStr);
      currentPath.push(nodeIdStr);
      
      // 遍历所有出边
      const outgoingEdges = graph.getOutgoingEdges(nodeId);
      for (const edge of outgoingEdges) {
        dfs(edge.toNodeId);
      }
      
      // 回溯
      visited.delete(nodeIdStr);
      currentPath.pop();
    };
    
    dfs(fromNodeId);
    
    return allPaths;
  }

  /**
   * 计算最短路径
   * @param graph 图
   * @param fromNodeId 起始节点ID
   * @param toNodeId 目标节点ID
   * @returns 最短路径，如果不存在则返回null
   */
  findShortestPath(
    graph: Graph,
    fromNodeId: ID,
    toNodeId: ID
  ): string[] | null {
    const visited = new Set<string>();
    const queue: Array<{ nodeId: ID; path: string[] }> = [
      { nodeId: fromNodeId, path: [fromNodeId.toString()] }
    ];
    
    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()!;
      const nodeIdStr = nodeId.toString();
      
      if (nodeId.equals(toNodeId)) {
        return path;
      }
      
      if (visited.has(nodeIdStr)) {
        continue;
      }
      
      visited.add(nodeIdStr);
      
      const outgoingEdges = graph.getOutgoingEdges(nodeId);
      for (const edge of outgoingEdges) {
        if (!visited.has(edge.toNodeId.toString())) {
          queue.push({
            nodeId: edge.toNodeId,
            path: [...path, edge.toNodeId.toString()]
          });
        }
      }
    }
    
    return null;
  }
}