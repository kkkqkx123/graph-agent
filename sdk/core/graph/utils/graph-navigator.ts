/**
 * 图导航器
 * 用于在执行时导航图的节点，确定下一个要执行的节点
 * 无状态设计，所有方法都通过参数传递所需数据
 */

import type {
  ID,
  NodeType,
  Condition,
  Edge,
} from '../../../types';
import type { GraphData } from '../graph-data';
import { getReachableNodes } from './graph-traversal';

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
  private graph: GraphData;
  private currentNodeId?: ID;

  constructor(graph: GraphData) {
    this.graph = graph;
  }

  /**
   * 设置当前节点
   */
  setCurrentNode(nodeId: ID): void {
    this.currentNodeId = nodeId;
  }

  /**
   * 获取当前节点
   */
  getCurrentNode(): ID | undefined {
    return this.currentNodeId;
  }

  /**
   * 获取下一个节点（简单导航，不考虑条件）
   */
  getNextNode(): NavigationResult {
    if (!this.currentNodeId) {
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

    const outgoingEdges = this.graph.getOutgoingEdges(this.currentNodeId);

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
   */
  routeNextNode(
    conditionEvaluator: (condition: Condition) => boolean
  ): RoutingDecision | null {
    if (!this.currentNodeId) {
      throw new Error('当前节点未设置');
    }

    const outgoingEdges = this.graph.getOutgoingEdges(this.currentNodeId);

    if (outgoingEdges.length === 0) {
      throw new Error('当前节点没有出边');
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
   * @param thread Thread实例，提供变量、输入、输出等上下文信息
   * @param currentNodeType 当前节点类型，用于处理ROUTE节点的特殊逻辑
   * @param lastNodeResult 最后一个节点的执行结果，用于ROUTE节点的决策
   * @returns 下一个节点ID，如果没有可用的路由则返回null
   */
  selectNextNodeWithContext(
    thread: any,
    currentNodeType: NodeType,
    lastNodeResult?: any
  ): string | null {
    if (!this.currentNodeId) {
      return null;
    }

    // 处理ROUTE节点的特殊逻辑
    if (currentNodeType === 'ROUTE' as NodeType) {
      // ROUTE节点使用自己的路由决策，从执行结果中获取selectedNode
      if (lastNodeResult && lastNodeResult.nodeId === this.currentNodeId &&
        lastNodeResult.output && typeof lastNodeResult.output === 'object' &&
        'selectedNode' in lastNodeResult.output) {
        return lastNodeResult.output.selectedNode as string;
      }
      return null;
    }

    const outgoingEdges = this.graph.getOutgoingEdges(this.currentNodeId);

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
      variables: thread.variableValues,
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
   * 获取从当前节点到指定节点的路径
   */
  getPathTo(targetNodeId: ID): ID[] | null {
    if (!this.currentNodeId) {
      return null;
    }

    if (this.currentNodeId === targetNodeId) {
      return [this.currentNodeId];
    }

    // 使用BFS查找最短路径
    const visited = new Set<ID>();
    const queue: { nodeId: ID; path: ID[] }[] = [
      { nodeId: this.currentNodeId, path: [this.currentNodeId] },
    ];
    visited.add(this.currentNodeId);

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
   * 检查是否可以到达指定节点
   */
  canReach(targetNodeId: ID): boolean {
    if (!this.currentNodeId) {
      return false;
    }

    const reachableNodes = getReachableNodes(this.graph, this.currentNodeId);
    return reachableNodes.has(targetNodeId);
  }

  /**
   * 获取所有可能的执行路径（从当前节点到所有END节点）
   */
  getAllExecutionPaths(): ID[][] {
    if (!this.currentNodeId) {
      return [];
    }

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

    dfs(this.currentNodeId, []);
    return paths;
  }

  /**
   * 获取当前节点的所有前驱节点
   */
  getPredecessors(): ID[] {
    if (!this.currentNodeId) {
      return [];
    }

    return Array.from(this.graph.getIncomingNeighbors(this.currentNodeId));
  }

  /**
   * 获取当前节点的所有后继节点
   */
  getSuccessors(): ID[] {
    if (!this.currentNodeId) {
      return [];
    }

    return Array.from(this.graph.getOutgoingNeighbors(this.currentNodeId));
  }

  /**
   * 检查当前节点是否是FORK节点
   */
  isForkNode(): boolean {
    if (!this.currentNodeId) {
      return false;
    }

    const node = this.graph.getNode(this.currentNodeId);
    return node?.type === 'FORK' as NodeType;
  }

  /**
   * 检查当前节点是否是JOIN节点
   */
  isJoinNode(): boolean {
    if (!this.currentNodeId) {
      return false;
    }

    const node = this.graph.getNode(this.currentNodeId);
    return node?.type === 'JOIN' as NodeType;
  }

  /**
   * 检查当前节点是否是ROUTE节点
   */
  isRouteNode(): boolean {
    if (!this.currentNodeId) {
      return false;
    }

    const node = this.graph.getNode(this.currentNodeId);
    return node?.type === 'ROUTE' as NodeType;
  }

  /**
   * 检查当前节点是否是END节点
   */
  isEndNode(): boolean {
    if (!this.currentNodeId) {
      return false;
    }

    return this.graph.endNodeIds.has(this.currentNodeId);
  }

  /**
   * 检查当前节点是否是START节点
   */
  isStartNode(): boolean {
    if (!this.currentNodeId) {
      return false;
    }

    return this.graph.startNodeId === this.currentNodeId;
  }

  /**
   * 重置导航器到START节点
   */
  reset(): void {
    this.currentNodeId = undefined;
  }

  /**
   * 获取图的引用
   */
  getGraph(): GraphData {
    return this.graph;
  }
}