/**
 * 图遍历工具函数
 * 提供图的深度优先和广度优先遍历算法
 */

import type { ID, Graph } from '@modular-agent/types';

/**
 * 深度优先遍历
 * @param graph - 要遍历的图数据
 * @param startNodeId - 起始节点ID
 * @param visitor - 访问函数，在访问每个节点时调用
 */
export function dfs(graph: Graph, startNodeId: ID, visitor: (nodeId: ID) => void): void {
  // 检查起始节点是否存在
  if (!graph.hasNode(startNodeId)) {
    return;
  }

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
    const neighbors = graph.getOutgoingNeighbors(nodeId);
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        stack.push(neighborId);
      }
    }
  }
}

/**
 * 广度优先遍历
 * @param graph - 要遍历的图数据
 * @param startNodeId - 起始节点ID
 * @param visitor - 访问函数，在访问每个节点时调用
 */
export function bfs(graph: Graph, startNodeId: ID, visitor: (nodeId: ID) => void): void {
  // 检查起始节点是否存在
  if (!graph.hasNode(startNodeId)) {
    return;
  }

  const visited = new Set<ID>();
  const queue: ID[] = [startNodeId];
  visited.add(startNodeId);

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    visitor(nodeId);

    // 将未访问的邻居节点加入队列
    const neighbors = graph.getOutgoingNeighbors(nodeId);
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
 * @param graph - 图数据
 * @param startNodeId - 起始节点ID
 * @returns 可达节点的ID集合
 */
export function getReachableNodes(graph: Graph, startNodeId: ID): Set<ID> {
  const reachable = new Set<ID>();
  dfs(graph, startNodeId, (nodeId) => {
    reachable.add(nodeId);
  });
  return reachable;
}

/**
 * 获取能到达指定节点的所有节点
 * @param graph - 图数据
 * @param targetNodeId - 目标节点ID
 * @returns 能到达目标节点的节点ID集合
 */
export function getNodesReachingTo(graph: Graph, targetNodeId: ID): Set<ID> {
  // 检查目标节点是否存在
  if (!graph.hasNode(targetNodeId)) {
    return new Set<ID>();
  }

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
    const neighbors = graph.getIncomingNeighbors(nodeId);
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        stack.push(neighborId);
      }
    }
  }

  return reaching;
}