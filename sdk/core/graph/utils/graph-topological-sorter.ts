/**
 * 图拓扑排序工具函数
 * 提供图的拓扑排序算法（Kahn算法）
 */

import type { ID, TopologicalSortResult, Graph } from '../../../types';
import { detectCycles } from './graph-cycle-detector';

/**
 * 拓扑排序（Kahn算法）
 * @param graph - 要排序的图数据
 * @returns 拓扑排序结果
 */
export function topologicalSort(graph: Graph): TopologicalSortResult {
  const sortedNodes: ID[] = [];
  const inDegree = new Map<ID, number>();
  const queue: ID[] = [];

  // 计算每个节点的入度
  for (const nodeId of graph.getAllNodeIds()) {
    inDegree.set(nodeId, graph.getIncomingEdges(nodeId).length);
  }

  // 将入度为0的节点加入队列
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  // 处理队列
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    sortedNodes.push(nodeId);

    // 减少邻居节点的入度
    const neighbors = graph.getOutgoingNeighbors(nodeId);
    for (const neighborId of neighbors) {
      const newDegree = inDegree.get(neighborId)! - 1;
      inDegree.set(neighborId, newDegree);
      if (newDegree === 0) {
        queue.push(neighborId);
      }
    }
  }

  // 检查是否所有节点都已排序
  const hasCycle = sortedNodes.length !== graph.getNodeCount();

  return {
    success: !hasCycle,
    sortedNodes,
    cycleNodes: hasCycle ? findCycleNodes(graph) : undefined,
  };
}

/**
 * 找出环中的节点（用于拓扑排序失败时）
 * @param graph - 图数据
 * @returns 环中的节点ID列表
 */
function findCycleNodes(graph: Graph): ID[] {
  const cycleResult = detectCycles(graph);
  return cycleResult.cycleNodes || [];
}