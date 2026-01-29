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
  if (!graph.startNodeId) {
    return {
      reachableFromStart: new Set(),
      reachableToEnd: new Set(),
      unreachableNodes: new Set(),
      deadEndNodes: new Set(),
    };
  }

  // 从START节点正向遍历
  const reachableFromStart = getReachableNodes(graph, graph.startNodeId);

  // 从END节点反向遍历
  const reachableToEnd = new Set<ID>();
  for (const endNodeId of graph.endNodeIds) {
    const reachingNodes = getNodesReachingTo(graph, endNodeId);
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