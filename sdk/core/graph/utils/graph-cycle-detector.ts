/**
 * 图环检测工具函数
 * 提供图的环检测算法
 */

import type { ID, CycleDetectionResult } from '../../../types';
import type { GraphData } from '../graph-data';

/**
 * 检测图中的环（使用DFS）
 * @param graph - 要检测的图数据
 * @returns 环检测结果
 */
export function detectCycles(graph: GraphData): CycleDetectionResult {
  const visited = new Set<ID>();
  const recursionStack = new Set<ID>();
  const cycleNodes: ID[] = [];
  const cycleEdges: ID[] = [];
  let hasCycle = false;

  const dfs = (nodeId: ID, path: ID[]): boolean => {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const neighbors = graph.getOutgoingNeighbors(nodeId);
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        if (dfs(neighborId, path)) {
          return true;
        }
      } else if (recursionStack.has(neighborId)) {
        // 发现环
        hasCycle = true;
        const cycleStartIndex = path.indexOf(neighborId);
        cycleNodes.push(...path.slice(cycleStartIndex));

        // 找到环中的边
        for (let i = 0; i < cycleNodes.length - 1; i++) {
          const node1 = cycleNodes[i];
          const node2 = cycleNodes[i + 1];
          if (node1 && node2) {
            const edge = graph.getEdgeBetween(node1, node2);
            if (edge) {
              cycleEdges.push(edge.id);
            }
          }
        }
        // 添加最后一条边（从最后一个节点回到第一个节点）
        const lastNode = cycleNodes[cycleNodes.length - 1];
        const firstNode = cycleNodes[0];
        if (lastNode && firstNode) {
          const lastEdge = graph.getEdgeBetween(lastNode, firstNode);
          if (lastEdge) {
            cycleEdges.push(lastEdge.id);
          }
        }

        return true;
      }
    }

    recursionStack.delete(nodeId);
    path.pop();
    return false;
  };

  // 从每个未访问的节点开始DFS
  for (const nodeId of graph.getAllNodeIds()) {
    if (!visited.has(nodeId)) {
      if (dfs(nodeId, [])) {
        break;
      }
    }
  }

  return {
    hasCycle,
    cycleNodes: hasCycle ? cycleNodes : undefined,
    cycleEdges: hasCycle ? cycleEdges : undefined,
  };
}