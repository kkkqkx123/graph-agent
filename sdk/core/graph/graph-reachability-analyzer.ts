/**
 * 图可达性分析器
 * 提供图的可达性分析算法
 */

import type { ID, ReachabilityResult } from '../../types';
import type { GraphData } from './graph-data';
import { GraphTraversal } from './graph-traversal';

/**
 * 图可达性分析器类
 * 核心职责：分析图中节点的可达性
 */
export class GraphReachabilityAnalyzer {
  private traversal: GraphTraversal;

  /**
   * 构造函数
   * @param graph - 要分析的图数据
   */
  constructor(graph: GraphData) {
    this.traversal = new GraphTraversal(graph);
  }

  /**
   * 分析图的可达性
   * @returns 可达性分析结果
   */
  analyze(): ReachabilityResult {
    const graph = this.traversal.getGraph();

    if (!graph.startNodeId) {
      return {
        reachableFromStart: new Set(),
        reachableToEnd: new Set(),
        unreachableNodes: new Set(),
        deadEndNodes: new Set(),
      };
    }

    // 从START节点正向遍历
    const reachableFromStart = this.traversal.getReachableNodes(graph.startNodeId);

    // 从END节点反向遍历
    const reachableToEnd = new Set<ID>();
    for (const endNodeId of graph.endNodeIds) {
      const reachingNodes = this.traversal.getNodesReachingTo(endNodeId);
      for (const nodeId of reachingNodes) {
        reachableToEnd.add(nodeId);
      }
    }

    // 找出不可达节点
    const unreachableNodes = new Set<ID>();
    for (const nodeId of graph.getAllNodeIds()) {
      if (!reachableFromStart.has(nodeId)) {
        unreachableNodes.add(nodeId);
      }
    }

    // 找出死节点
    const deadEndNodes = new Set<ID>();
    for (const nodeId of graph.getAllNodeIds()) {
      if (!reachableToEnd.has(nodeId)) {
        deadEndNodes.add(nodeId);
      }
    }

    return {
      reachableFromStart,
      reachableToEnd,
      unreachableNodes,
      deadEndNodes,
    };
  }

  /**
   * 获取从指定节点可达的所有节点
   * @param startNodeId - 起始节点ID
   * @returns 可达节点的ID集合
   */
  getReachableNodes(startNodeId: ID): Set<ID> {
    return this.traversal.getReachableNodes(startNodeId);
  }

  /**
   * 获取能到达指定节点的所有节点
   * @param targetNodeId - 目标节点ID
   * @returns 能到达目标节点的节点ID集合
   */
  getNodesReachingTo(targetNodeId: ID): Set<ID> {
    return this.traversal.getNodesReachingTo(targetNodeId);
  }

  /**
   * 获取图的引用
   * @returns 图数据实例
   */
  getGraph(): GraphData {
    return this.traversal.getGraph();
  }
}