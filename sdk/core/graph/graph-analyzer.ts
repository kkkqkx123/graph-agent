/**
 * 图分析工具
 * 提供图的遍历、分析和查询算法
 */

import type { ID } from '../../types';
import type { GraphData } from './graph-data';

/**
 * 图分析器
 * 核心职责：提供图的遍历和分析算法
 * 通过依赖注入 GraphData 实例来操作图
 */
export class GraphAnalyzer {
  /**
   * 构造函数
   * @param graph - 要分析的图数据
   */
  constructor(private graph: GraphData) {}

  /**
   * 深度优先遍历
   * @param startNodeId - 起始节点ID
   * @param visitor - 访问函数，在访问每个节点时调用
   */
  dfs(startNodeId: ID, visitor: (nodeId: ID) => void): void {
    const visited = new Set<ID>();
    const stack = [startNodeId];

    while (stack.length > 0) {
      const nodeId = stack.pop()!;
      if (visited.has(nodeId)) {
        continue;
      }

      visited.add(nodeId);
      visitor(nodeId);

      // 将未访问的邻居节点加入栈
      const neighbors = this.graph.getOutgoingNeighbors(nodeId);
      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          stack.push(neighborId);
        }
      }
    }
  }

  /**
   * 广度优先遍历
   * @param startNodeId - 起始节点ID
   * @param visitor - 访问函数，在访问每个节点时调用
   */
  bfs(startNodeId: ID, visitor: (nodeId: ID) => void): void {
    const visited = new Set<ID>();
    const queue: ID[] = [startNodeId];
    visited.add(startNodeId);

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      visitor(nodeId);

      // 将未访问的邻居节点加入队列
      const neighbors = this.graph.getOutgoingNeighbors(nodeId);
      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push(neighborId);
        }
      }
    }
  }

  /**
   * 获取从指定节点可达的所有节点
   * @param startNodeId - 起始节点ID
   * @returns 可达节点的ID集合
   */
  getReachableNodes(startNodeId: ID): Set<ID> {
    const reachable = new Set<ID>();
    this.dfs(startNodeId, (nodeId) => {
      reachable.add(nodeId);
    });
    return reachable;
  }

  /**
   * 获取能到达指定节点的所有节点
   * @param targetNodeId - 目标节点ID
   * @returns 能到达目标节点的节点ID集合
   */
  getNodesReachingTo(targetNodeId: ID): Set<ID> {
    const reaching = new Set<ID>();
    const visited = new Set<ID>();
    const stack = [targetNodeId];

    while (stack.length > 0) {
      const nodeId = stack.pop()!;
      if (visited.has(nodeId)) {
        continue;
      }

      visited.add(nodeId);
      reaching.add(nodeId);

      // 在反向邻接表上遍历
      const neighbors = this.graph.getIncomingNeighbors(nodeId);
      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          stack.push(neighborId);
        }
      }
    }

    return reaching;
  }

  /**
   * 获取图的引用
   * @returns 图数据实例
   */
  getGraph(): GraphData {
    return this.graph;
  }
}
