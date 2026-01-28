/**
 * 图分析器
 * 提供图的完整分析功能，整合所有分析算法
 */

import type { ID, NodeType, EdgeType, GraphAnalysisResult, ForkJoinValidationResult } from '../../types';
import type { GraphData } from './graph-data';
import { GraphTraversal } from './graph-traversal';
import { GraphCycleDetector } from './graph-cycle-detector';
import { GraphReachabilityAnalyzer } from './graph-reachability-analyzer';
import { GraphTopologicalSorter } from './graph-topological-sorter';

/**
 * 图分析器类
 * 核心职责：提供图的完整分析功能
 * 整合遍历、环检测、可达性分析、拓扑排序等功能
 */
export class GraphAnalyzer {
  private traversal: GraphTraversal;
  private cycleDetector: GraphCycleDetector;
  private reachabilityAnalyzer: GraphReachabilityAnalyzer;
  private topologicalSorter: GraphTopologicalSorter;

  /**
   * 构造函数
   * @param graph - 要分析的图数据
   */
  constructor(graph: GraphData) {
    this.traversal = new GraphTraversal(graph);
    this.cycleDetector = new GraphCycleDetector(graph);
    this.reachabilityAnalyzer = new GraphReachabilityAnalyzer(graph);
    this.topologicalSorter = new GraphTopologicalSorter(graph);
  }

  /**
   * 完整的图分析
   * @returns 图分析结果
   */
  analyze(): GraphAnalysisResult {
    // 环检测
    const cycleDetection = this.cycleDetector.detect();

    // 可达性分析
    const reachability = this.reachabilityAnalyzer.analyze();

    // 拓扑排序
    const topologicalSort = this.topologicalSorter.sort();

    // FORK/JOIN配对验证（仅收集配对信息，不进行验证）
    const forkJoinValidation = this.collectForkJoinPairs();

    // 节点统计
    const nodeStats = {
      total: this.traversal.getGraph().getNodeCount(),
      byType: new Map<NodeType, number>(),
    };
    for (const node of this.traversal.getGraph().nodes.values()) {
      const count = nodeStats.byType.get(node.type) || 0;
      nodeStats.byType.set(node.type, count + 1);
    }

    // 边统计
    const edgeStats = {
      total: this.traversal.getGraph().getEdgeCount(),
      byType: new Map<EdgeType, number>(),
    };
    for (const edge of this.traversal.getGraph().edges.values()) {
      const count = edgeStats.byType.get(edge.type) || 0;
      edgeStats.byType.set(edge.type, count + 1);
    }

    return {
      cycleDetection,
      reachability,
      topologicalSort,
      forkJoinValidation,
      nodeStats,
      edgeStats,
    };
  }

  /**
   * 深度优先遍历
   * @param startNodeId - 起始节点ID
   * @param visitor - 访问函数，在访问每个节点时调用
   */
  dfs(startNodeId: ID, visitor: (nodeId: ID) => void): void {
    this.traversal.dfs(startNodeId, visitor);
  }

  /**
   * 广度优先遍历
   * @param startNodeId - 起始节点ID
   * @param visitor - 访问函数，在访问每个节点时调用
   */
  bfs(startNodeId: ID, visitor: (nodeId: ID) => void): void {
    this.traversal.bfs(startNodeId, visitor);
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
   * 检测图中的环
   * @returns 环检测结果
   */
  detectCycles() {
    return this.cycleDetector.detect();
  }

  /**
   * 分析图的可达性
   * @returns 可达性分析结果
   */
  analyzeReachability() {
    return this.reachabilityAnalyzer.analyze();
  }

  /**
   * 拓扑排序
   * @returns 拓扑排序结果
   */
  topologicalSort() {
    return this.topologicalSorter.sort();
  }

  /**
   * 收集FORK/JOIN配对信息（仅收集，不验证）
   * @returns FORK/JOIN配对信息
   */
  private collectForkJoinPairs(): ForkJoinValidationResult {
    const forkNodes = new Map<ID, ID>(); // forkId -> nodeId
    const joinNodes = new Map<ID, ID>(); // joinId -> nodeId
    const pairs = new Map<ID, ID>();

    // 收集所有FORK和JOIN节点
    for (const node of this.traversal.getGraph().nodes.values()) {
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

  /**
   * 获取图的引用
   * @returns 图数据实例
   */
  getGraph(): GraphData {
    return this.traversal.getGraph();
  }
}