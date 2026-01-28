/**
 * 图拓扑排序器
 * 提供图的拓扑排序算法（Kahn算法）
 */

import type { ID, TopologicalSortResult } from '../../types';
import type { GraphData } from './graph-data';
import { GraphCycleDetector } from './graph-cycle-detector';

/**
 * 图拓扑排序器类
 * 核心职责：对图进行拓扑排序
 */
export class GraphTopologicalSorter {
  /**
   * 构造函数
   * @param graph - 要排序的图数据
   */
  constructor(private graph: GraphData) {}

  /**
   * 拓扑排序（Kahn算法）
   * @returns 拓扑排序结果
   */
  sort(): TopologicalSortResult {
    const sortedNodes: ID[] = [];
    const inDegree = new Map<ID, number>();
    const queue: ID[] = [];

    // 计算每个节点的入度
    for (const nodeId of this.graph.getAllNodeIds()) {
      inDegree.set(nodeId, this.graph.getIncomingEdges(nodeId).length);
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
      const neighbors = this.graph.getOutgoingNeighbors(nodeId);
      for (const neighborId of neighbors) {
        const newDegree = inDegree.get(neighborId)! - 1;
        inDegree.set(neighborId, newDegree);
        if (newDegree === 0) {
          queue.push(neighborId);
        }
      }
    }

    // 检查是否所有节点都已排序
    const hasCycle = sortedNodes.length !== this.graph.getNodeCount();

    return {
      success: !hasCycle,
      sortedNodes,
      cycleNodes: hasCycle ? this.findCycleNodes() : undefined,
    };
  }

  /**
   * 找出环中的节点（用于拓扑排序失败时）
   * @returns 环中的节点ID列表
   */
  private findCycleNodes(): ID[] {
    const cycleDetector = new GraphCycleDetector(this.graph);
    const cycleResult = cycleDetector.detect();
    return cycleResult.cycleNodes || [];
  }

  /**
   * 获取图的引用
   * @returns 图数据实例
   */
  getGraph(): GraphData {
    return this.graph;
  }
}