/**
 * 图导航器
 * 用于在执行时导航图的节点，确定下一个要执行的节点
 */

import type {
  ID,
  NodeType,
  Condition,
  Edge,
} from '../../types';
import type { GraphData } from './graph-data';
import { GraphAnalyzer } from './graph-analyzer';

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
  private analyzer: GraphAnalyzer;
  private currentNodeId?: ID;

  constructor(graph: GraphData) {
    this.graph = graph;
    this.analyzer = new GraphAnalyzer(graph);
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

    const reachableNodes = this.analyzer.getReachableNodes(this.currentNodeId);
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