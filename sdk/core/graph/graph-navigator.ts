/**
 * 图导航器
 * 用于在执行时导航图的节点，确定下一个要执行的节点
 *
 * 设计原则：
 * - 无状态执行：不缓存执行流程状态（如currentNodeId），所有方法通过参数传递所需数据
 * - 有状态定义：持有不变的工作流定义（GraphData），由上级容器（ThreadContext）管理生命周期
 * - 纯函数：所有方法都是纯函数，不产生副作用
 *
 * 创建方式：由ThreadContext统一创建并缓存GraphNavigator实例，使用Thread中的graph对象初始化
 */

import type {
  ID,
  NodeType,
  Condition,
  Edge,
  Graph,
} from '@modular-agent/types';
import { getReachableNodes } from './utils/graph-traversal';

/**
 * 导航结果
 */
export interface NavigationResult {
  /** 下一个节点ID */
  nextNodeId?: ID;
  /** 是否到达结束节点 */
  isEnd: boolean;
  /** 是否有多个可能的下一个节点（需要路由决策） */
  hasMultiplePaths: boolean;
  /** 所有可能的下一个节点ID */
  possibleNextNodeIds: ID[];
}

/**
 * 路由决策结果
 */
export interface RoutingDecision {
  /** 选中的节点ID */
  selectedNodeId: ID;
  /** 使用的边ID */
  edgeId: ID;
  /** 决策原因 */
  reason: string;
}

/**
 * 图导航器类
 */
export class GraphNavigator {
  private graph: Graph;

  constructor(graph: Graph) {
    this.graph = graph;
  }

  /**
   * 获取下一个节点（简单导航，不考虑条件）
   * @param currentNodeId 当前节点ID，如果为undefined则返回START节点
   * @returns 导航结果
   */
  getNextNode(currentNodeId?: ID): NavigationResult {
    if (!currentNodeId) {
      // 如果没有当前节点，返回START节点
      if (this.graph.startNodeId) {
        return {
          nextNodeId: this.graph.startNodeId,
          isEnd: false,
          hasMultiplePaths: false,
          possibleNextNodeIds: [this.graph.startNodeId],
        };
      }
      return {
        isEnd: true,
        hasMultiplePaths: false,
        possibleNextNodeIds: [],
      };
    }

    const outgoingEdges = this.graph.getOutgoingEdges(currentNodeId);

    if (outgoingEdges.length === 0) {
      // 没有出边，说明到达结束节点
      return {
        isEnd: true,
        hasMultiplePaths: false,
        possibleNextNodeIds: [],
      };
    }

    const possibleNextNodeIds = outgoingEdges.map((edge: { targetNodeId: any; }) => edge.targetNodeId);

    if (outgoingEdges.length === 1) {
      // 只有一条出边，直接返回
      const edge = outgoingEdges[0];
      if (!edge) {
        return {
          isEnd: true,
          hasMultiplePaths: false,
          possibleNextNodeIds: [],
        };
      }
      return {
        nextNodeId: edge.targetNodeId,
        isEnd: this.graph.endNodeIds.has(edge.targetNodeId),
        hasMultiplePaths: false,
        possibleNextNodeIds,
      };
    }

    // 多条出边，需要路由决策
    return {
      isEnd: false,
      hasMultiplePaths: true,
      possibleNextNodeIds,
    };
  }

  /**
   * 根据条件评估选择下一个节点
   * @param currentNodeId 当前节点ID
   * @param conditionEvaluator 条件评估函数
   * @returns 路由决策结果，如果没有满足条件的边则返回null
   */
  routeNextNode(
    currentNodeId: ID,
    conditionEvaluator: (condition: Condition) => boolean
  ): RoutingDecision | null {
    const outgoingEdges = this.graph.getOutgoingEdges(currentNodeId);

    if (outgoingEdges.length === 0) {
      return null;
    }

    // 按权重排序（权重高的优先）
    const sortedEdges = [...outgoingEdges].sort((a, b) => {
      return (b.weight || 0) - (a.weight || 0);
    });

    // 遍历所有边，找到第一个满足条件的边
    for (const edge of sortedEdges) {
      if (edge.type === 'DEFAULT') {
        // 默认边，总是可以通过
        return {
          selectedNodeId: edge.targetNodeId,
          edgeId: edge.id,
          reason: 'DEFAULT_EDGE',
        };
      } else if (edge.type === 'CONDITIONAL') {
        // 条件边，评估条件
        const condition = edge.originalEdge?.condition;
        if (condition && conditionEvaluator(condition)) {
          return {
            selectedNodeId: edge.targetNodeId,
            edgeId: edge.id,
            reason: 'CONDITION_MATCHED',
          };
        }
      }
    }

    // 没有边满足条件
    return null;
  }

  /**
   * 基于Thread上下文选择下一个节点
   * @param currentNodeId 当前节点ID
   * @param thread Thread实例，提供变量、输入、输出等上下文信息
   * @param currentNodeType 当前节点类型，用于处理ROUTE节点的特殊逻辑
   * @param lastNodeResult 最后一个节点的执行结果，用于ROUTE节点的决策
   * @returns 下一个节点ID，如果没有可用的路由则返回null
   */
  selectNextNodeWithContext(
    currentNodeId: ID,
    thread: any,
    currentNodeType: NodeType,
    lastNodeResult?: any
  ): string | null {
    // 处理ROUTE节点的特殊逻辑
    if (currentNodeType === 'ROUTE' as NodeType) {
      // ROUTE节点使用自己的路由决策，从处理器返回的输出中获取selectedNode
      // 路由处理器返回: { status: 'COMPLETED', selectedNode: nodeId }
      if (lastNodeResult && lastNodeResult.nodeId === currentNodeId &&
        typeof lastNodeResult.selectedNode === 'string') {
        return lastNodeResult.selectedNode;
      }
      return null;
    }

    const outgoingEdges = this.graph.getOutgoingEdges(currentNodeId);

    if (outgoingEdges.length === 0) {
      return null;
    }

    // 过滤满足条件的边
    const satisfiedEdges = this.filterEdgesWithContext(outgoingEdges, thread);

    // 如果没有满足条件的边，选择默认边
    if (satisfiedEdges.length === 0) {
      const defaultEdge = outgoingEdges.find(e => e.type === 'DEFAULT');
      return defaultEdge ? defaultEdge.targetNodeId : null;
    }

    // 按权重排序边
    const sortedEdges = this.sortEdges(satisfiedEdges);

    // 选择第一个边
    const nextEdge = sortedEdges[0];
    return nextEdge ? nextEdge.targetNodeId : null;
  }

  /**
   * 基于Thread上下文过滤满足条件的边
   * @param edges 边数组
   * @param thread Thread实例
   * @returns 满足条件的边数组
   */
  private filterEdgesWithContext(edges: Edge[], thread: any): Edge[] {
    return edges.filter(edge => this.evaluateEdgeConditionWithContext(edge, thread));
  }

  /**
   * 基于Thread上下文评估边的条件
   * @param edge 边
   * @param thread Thread实例
   * @returns 条件是否满足
   */
  private evaluateEdgeConditionWithContext(edge: Edge, thread: any): boolean {
    // 默认边总是满足
    if (edge.type === 'DEFAULT') {
      return true;
    }

    // 条件边必须有条件
    if (!edge.condition) {
      return false;
    }

    // 构建评估上下文
    const context = {
      variables: thread.variableScopes.thread,
      input: thread.input,
      output: thread.output
    };

    // 动态导入conditionEvaluator以避免循环依赖
    const { conditionEvaluator } = require('../../utils/condition-evaluator');
    return conditionEvaluator.evaluate(edge.condition, context);
  }

  /**
   * 排序边
   * @param edges 边数组
   * @returns 排序后的边数组
   */
  private sortEdges(edges: Edge[]): Edge[] {
    return [...edges].sort((a, b) => {
      // 按权重降序排序（权重高的优先）
      const weightA = a.weight || 0;
      const weightB = b.weight || 0;

      if (weightA !== weightB) {
        return weightB - weightA;
      }

      // 如果权重相同，按id升序排序（保证确定性）
      return a.id.localeCompare(b.id);
    });
  }

  /**
   * 获取从指定节点到目标节点的路径
   * @param fromNodeId 起始节点ID
   * @param targetNodeId 目标节点ID
   * @returns 路径数组，如果不可达则返回null
   */
  getPathTo(fromNodeId: ID, targetNodeId: ID): ID[] | null {
    if (fromNodeId === targetNodeId) {
      return [fromNodeId];
    }

    // 使用BFS查找最短路径
    const visited = new Set<ID>();
    const queue: { nodeId: ID; path: ID[] }[] = [
      { nodeId: fromNodeId, path: [fromNodeId] },
    ];
    visited.add(fromNodeId);

    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()!;

      const neighbors = this.graph.getOutgoingNeighbors(nodeId);
      for (const neighborId of neighbors) {
        if (neighborId === targetNodeId) {
          return [...path, neighborId];
        }

        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push({
            nodeId: neighborId,
            path: [...path, neighborId],
          });
        }
      }
    }

    return null;
  }

  /**
   * 检查是否可以从起始节点到达目标节点
   * @param fromNodeId 起始节点ID
   * @param targetNodeId 目标节点ID
   * @returns 是否可达
   */
  canReach(fromNodeId: ID, targetNodeId: ID): boolean {
    const reachableNodes = getReachableNodes(this.graph, fromNodeId);
    return reachableNodes.has(targetNodeId);
  }

  /**
   * 获取所有可能的执行路径（从指定节点到所有END节点）
   * @param fromNodeId 起始节点ID
   * @returns 所有可能的路径数组
   */
  getAllExecutionPaths(fromNodeId: ID): ID[][] {
    const paths: ID[][] = [];
    const visited = new Set<ID>();

    const dfs = (nodeId: ID, path: ID[]): void => {
      // 防止无限循环
      if (path.length > 1000) {
        return;
      }

      const newPath = [...path, nodeId];

      // 如果到达END节点，记录路径
      if (this.graph.endNodeIds.has(nodeId)) {
        paths.push(newPath);
        return;
      }

      // 避免重复访问（简单处理，不适用于所有情况）
      if (visited.has(nodeId)) {
        return;
      }
      visited.add(nodeId);

      // 递归访问所有邻居
      const neighbors = this.graph.getOutgoingNeighbors(nodeId);
      for (const neighborId of neighbors) {
        dfs(neighborId, newPath);
      }

      visited.delete(nodeId);
    };

    dfs(fromNodeId, []);
    return paths;
  }

  /**
   * 获取指定节点的所有前驱节点
   * @param nodeId 节点ID
   * @returns 前驱节点ID数组
   */
  getPredecessors(nodeId: ID): ID[] {
    return Array.from(this.graph.getIncomingNeighbors(nodeId));
  }

  /**
   * 获取指定节点的所有后继节点
   * @param nodeId 节点ID
   * @returns 后继节点ID数组
   */
  getSuccessors(nodeId: ID): ID[] {
    return Array.from(this.graph.getOutgoingNeighbors(nodeId));
  }

  /**
   * 检查指定节点是否是FORK节点
   * @param nodeId 节点ID
   * @returns 是否是FORK节点
   */
  isForkNode(nodeId: ID): boolean {
    const node = this.graph.getNode(nodeId);
    return node?.type === 'FORK' as NodeType;
  }

  /**
   * 检查指定节点是否是JOIN节点
   * @param nodeId 节点ID
   * @returns 是否是JOIN节点
   */
  isJoinNode(nodeId: ID): boolean {
    const node = this.graph.getNode(nodeId);
    return node?.type === 'JOIN' as NodeType;
  }

  /**
   * 检查指定节点是否是ROUTE节点
   * @param nodeId 节点ID
   * @returns 是否是ROUTE节点
   */
  isRouteNode(nodeId: ID): boolean {
    const node = this.graph.getNode(nodeId);
    return node?.type === 'ROUTE' as NodeType;
  }

  /**
   * 检查指定节点是否是END节点
   * @param nodeId 节点ID
   * @returns 是否是END节点
   */
  isEndNode(nodeId: ID): boolean {
    return this.graph.endNodeIds.has(nodeId);
  }

  /**
   * 检查指定节点是否是START节点
   * @param nodeId 节点ID
   * @returns 是否是START节点
   */
  isStartNode(nodeId: ID): boolean {
    return this.graph.startNodeId === nodeId;
  }

  /**
   * 获取图的引用
   */
  getGraph(): Graph {
    return this.graph;
  }
}