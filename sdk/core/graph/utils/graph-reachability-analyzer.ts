/**
 * 图可达性分析工具函数
 * 提供图的可达性分析算法
 */

import type { ID, ReachabilityResult, Graph } from '../../../types';
import { getReachableNodes, getNodesReachingTo } from './graph-traversal';

/**
 * 分析图的可达性
 * @param graph - 要分析的图数据
 * @returns 可达性分析结果
 */
export function analyzeReachability(graph: Graph): ReachabilityResult {
  // 从START节点正向遍历（如果存在）
  const reachableFromStart = graph.startNodeId
    ? getReachableNodes(graph, graph.startNodeId)
    : new Set<ID>();

  // 从END节点反向遍历
  const reachableToEnd = new Set<ID>();
  for (const endNodeId of graph.endNodeIds) {
    const reachingNodes = getNodesReachingTo(graph, endNodeId);
    for (const nodeId of reachingNodes) {
      reachableToEnd.add(nodeId);
    }
  }

  // 找出不可达节点（从START无法到达的节点）
  const unreachableNodes = new Set<ID>();
  for (const nodeId of graph.getAllNodeIds()) {
    if (!reachableFromStart.has(nodeId)) {
      unreachableNodes.add(nodeId);
    }
  }

  // 找出死节点（从START可达但无法到达END的节点）
  const deadEndNodes = new Set<ID>();
  for (const nodeId of graph.getAllNodeIds()) {
    if (reachableFromStart.has(nodeId) && !reachableToEnd.has(nodeId)) {
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