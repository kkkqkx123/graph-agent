/**
 * 图分析工具函数
 * 提供图的完整分析功能，整合所有分析算法
 */

import type { ID, NodeType, EdgeType, GraphAnalysisResult, ForkJoinValidationResult, Graph } from '../../../types';
import { detectCycles } from './graph-cycle-detector';
import { analyzeReachability } from './graph-reachability-analyzer';
import { topologicalSort } from './graph-topological-sorter';

/**
 * 完整的图分析
 * @param graph - 要分析的图数据
 * @returns 图分析结果
 */
export function analyzeGraph(graph: Graph): GraphAnalysisResult {
  // 环检测
  const cycleDetection = detectCycles(graph);

  // 可达性分析
  const reachability = analyzeReachability(graph);

  // 拓扑排序
  const topologicalSortResult = topologicalSort(graph);

  // FORK/JOIN配对验证（仅收集配对信息，不进行验证）
  const forkJoinValidation = collectForkJoinPairs(graph);

  // 节点统计
  const nodeStats = {
    total: graph.getNodeCount(),
    byType: new Map<NodeType, number>(),
  };
  for (const node of graph.nodes.values()) {
    const count = nodeStats.byType.get(node.type) || 0;
    nodeStats.byType.set(node.type, count + 1);
  }

  // 边统计
  const edgeStats = {
    total: graph.getEdgeCount(),
    byType: new Map<EdgeType, number>(),
  };
  for (const edge of graph.edges.values()) {
    const count = edgeStats.byType.get(edge.type) || 0;
    edgeStats.byType.set(edge.type, count + 1);
  }

  return {
    cycleDetection,
    reachability,
    topologicalSort: topologicalSortResult,
    forkJoinValidation,
    nodeStats,
    edgeStats,
  };
}

/**
 * 收集FORK/JOIN配对信息（仅收集，不验证）
 * @param graph - 图数据
 * @returns FORK/JOIN配对信息
 */
export function collectForkJoinPairs(graph: Graph): ForkJoinValidationResult {
  const forkNodes = new Map<ID, ID>(); // forkId -> nodeId
  const joinNodes = new Map<ID, ID>(); // joinId -> nodeId
  const pairs = new Map<ID, ID>();

  // 收集所有FORK和JOIN节点
  for (const node of graph.nodes.values()) {
    if (node.type === 'FORK' as NodeType) {
      const forkId = (node.originalNode?.config as any)?.forkId;
      if (forkId) {
        forkNodes.set(forkId, node.id);
      }
    } else if (node.type === 'JOIN' as NodeType) {
      const joinId = (node.originalNode?.config as any)?.joinId;
      if (joinId) {
        joinNodes.set(joinId, node.id);
      }
    }
  }

  // 检查配对
  const unpairedForks: ID[] = [];
  const unpairedJoins: ID[] = [];

  for (const [forkId, forkNodeId] of forkNodes) {
    if (joinNodes.has(forkId)) {
      pairs.set(forkNodeId, joinNodes.get(forkId)!);
    } else {
      unpairedForks.push(forkNodeId);
    }
  }

  for (const [joinId, joinNodeId] of joinNodes) {
    if (!forkNodes.has(joinId)) {
      unpairedJoins.push(joinNodeId);
    }
  }

  return {
    isValid: unpairedForks.length === 0 && unpairedJoins.length === 0,
    unpairedForks,
    unpairedJoins,
    pairs,
  };
}