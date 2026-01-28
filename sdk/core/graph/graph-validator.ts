/**
 * 图验证器
 * 提供图的各种验证算法，包括环检测、可达性分析、拓扑排序等
 */

import type {
  ID,
  NodeType,
  EdgeType,
  CycleDetectionResult,
  ReachabilityResult,
  TopologicalSortResult,
  ForkJoinValidationResult,
  GraphValidationOptions,
  GraphAnalysisResult,
} from '../../types';
import { ValidationError } from '../../types';
import type { ValidationResult } from '../../types';
import type { GraphData } from './graph-data';
import { GraphAnalyzer } from './graph-analyzer';

/**
 * 图验证器类
 */
export class GraphValidator {
  /**
   * 验证图结构
   */
  static validate(
    graph: GraphData,
    options: GraphValidationOptions = {}
  ): ValidationResult {
    const errorList: ValidationError[] = [];
    const warningList: ValidationError[] = [];

    const opts = {
      checkCycles: true,
      checkReachability: true,
      checkForkJoin: true,
      checkStartEnd: true,
      checkIsolatedNodes: true,
      ...options,
    };

    // 检查START/END节点
    if (opts.checkStartEnd) {
      const startEndErrors = this.validateStartEndNodes(graph);
      errorList.push(...startEndErrors);
    }

    // 检查孤立节点
    if (opts.checkIsolatedNodes) {
      const isolatedErrors = this.validateIsolatedNodes(graph);
      errorList.push(...isolatedErrors);
    }

    // 检测环
    if (opts.checkCycles) {
      const cycleResult = this.detectCycles(graph);
      if (cycleResult.hasCycle) {
        errorList.push(
          new ValidationError('工作流中存在循环依赖', undefined, undefined, {
            code: 'CYCLE_DETECTED',
            cycleNodes: cycleResult.cycleNodes,
            cycleEdges: cycleResult.cycleEdges,
          })
        );
      }
    }

    // 可达性分析
    if (opts.checkReachability) {
      const reachabilityResult = this.analyzeReachability(graph);
      
      // 不可达节点
      for (const nodeId of reachabilityResult.unreachableNodes) {
        errorList.push(
          new ValidationError(`节点(${nodeId})从START节点不可达`, undefined, undefined, {
            code: 'UNREACHABLE_NODE',
            nodeId,
          })
        );
      }

      // 死节点
      for (const nodeId of reachabilityResult.deadEndNodes) {
        errorList.push(
          new ValidationError(`节点(${nodeId})无法到达END节点`, undefined, undefined, {
            code: 'DEAD_END_NODE',
            nodeId,
          })
        );
      }
    }

    // FORK/JOIN配对验证
    if (opts.checkForkJoin) {
      const forkJoinResult = this.validateForkJoinPairs(graph);
      if (!forkJoinResult.isValid) {
        for (const forkId of forkJoinResult.unpairedForks) {
          errorList.push(
            new ValidationError(`FORK节点(${forkId})没有配对的JOIN节点`, undefined, undefined, {
              code: 'UNPAIRED_FORK',
              nodeId: forkId,
            })
          );
        }
        for (const joinId of forkJoinResult.unpairedJoins) {
          errorList.push(
            new ValidationError(`JOIN节点(${joinId})没有配对的FORK节点`, undefined, undefined, {
              code: 'UNPAIRED_JOIN',
              nodeId: joinId,
            })
          );
        }
      }
    }

    return {
      valid: errorList.length === 0,
      errors: errorList,
      warnings: warningList,
    };
  }

  /**
   * 验证START和END节点
   */
  private static validateStartEndNodes(graph: GraphData): ValidationError[] {
    const errors: ValidationError[] = [];

    // 检查START节点
    if (!graph.startNodeId) {
      errors.push(
        new ValidationError('工作流必须包含一个START节点', undefined, undefined, {
          code: 'MISSING_START_NODE',
        })
      );
    } else {
      // 检查START节点的入度
      const incomingEdges = graph.getIncomingEdges(graph.startNodeId);
      if (incomingEdges.length > 0) {
        errors.push(
          new ValidationError('START节点不能有入边', undefined, undefined, {
            code: 'START_NODE_HAS_INCOMING_EDGES',
            nodeId: graph.startNodeId,
          })
        );
      }
    }

    // 检查END节点
    if (graph.endNodeIds.size === 0) {
      errors.push(
        new ValidationError('工作流必须包含至少一个END节点', undefined, undefined, {
          code: 'MISSING_END_NODE',
        })
      );
    } else {
      // 检查END节点的出度
      for (const endNodeId of graph.endNodeIds) {
        const outgoingEdges = graph.getOutgoingEdges(endNodeId);
        if (outgoingEdges.length > 0) {
          errors.push(
            new ValidationError(`END节点(${endNodeId})不能有出边`, undefined, undefined, {
              code: 'END_NODE_HAS_OUTGOING_EDGES',
              nodeId: endNodeId,
            })
          );
        }
      }
    }

    // 检查START节点是否唯一
    let startNodeCount = 0;
    for (const node of graph.nodes.values()) {
      if (node.type === 'START' as NodeType) {
        startNodeCount++;
      }
    }
    if (startNodeCount > 1) {
      errors.push(
        new ValidationError('工作流只能包含一个START节点', undefined, undefined, {
          code: 'MULTIPLE_START_NODES',
        })
      );
    }

    return errors;
  }

  /**
   * 验证孤立节点
   */
  private static validateIsolatedNodes(graph: GraphData): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const node of graph.nodes.values()) {
      const incomingEdges = graph.getIncomingEdges(node.id);
      const outgoingEdges = graph.getOutgoingEdges(node.id);

      // START和END节点不算孤立节点
      if (node.type === 'START' as NodeType || node.type === 'END' as NodeType) {
        continue;
      }

      if (incomingEdges.length === 0 && outgoingEdges.length === 0) {
        errors.push(
          new ValidationError(`节点(${node.id})是孤立节点，既没有入边也没有出边`, undefined, undefined, {
            code: 'ISOLATED_NODE',
            nodeId: node.id,
          })
        );
      }
    }

    return errors;
  }

  /**
   * 环检测（使用DFS）
   */
  static detectCycles(graph: GraphData): CycleDetectionResult {
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

  /**
   * 可达性分析
   */
  static analyzeReachability(graph: GraphData): ReachabilityResult {
    if (!graph.startNodeId) {
      return {
        reachableFromStart: new Set(),
        reachableToEnd: new Set(),
        unreachableNodes: new Set(),
        deadEndNodes: new Set(),
      };
    }

    // 从START节点正向遍历
    const analyzer = new GraphAnalyzer(graph);
    const reachableFromStart = analyzer.getReachableNodes(graph.startNodeId);

    // 从END节点反向遍历
    const reachableToEnd = new Set<ID>();
    for (const endNodeId of graph.endNodeIds) {
      const reachingNodes = analyzer.getNodesReachingTo(endNodeId);
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
   * 拓扑排序（Kahn算法）
   */
  static topologicalSort(graph: GraphData): TopologicalSortResult {
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
      cycleNodes: hasCycle ? this.findCycleNodes(graph) : undefined,
    };
  }

  /**
   * 找出环中的节点（用于拓扑排序失败时）
   */
  private static findCycleNodes(graph: GraphData): ID[] {
    const cycleResult = this.detectCycles(graph);
    return cycleResult.cycleNodes || [];
  }

  /**
   * FORK/JOIN配对验证
   */
  static validateForkJoinPairs(graph: GraphData): ForkJoinValidationResult {
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

  /**
   * 完整的图分析
   */
  static analyze(graph: GraphData): GraphAnalysisResult {
    // 环检测
    const cycleDetection = this.detectCycles(graph);

    // 可达性分析
    const reachability = this.analyzeReachability(graph);

    // 拓扑排序
    const topologicalSort = this.topologicalSort(graph);

    // FORK/JOIN配对验证
    const forkJoinValidation = this.validateForkJoinPairs(graph);

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
      topologicalSort,
      forkJoinValidation,
      nodeStats,
      edgeStats,
    };
  }
}