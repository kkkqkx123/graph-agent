/**
 * 图数据结构（GraphData）
 *
 * 设计说明：
 * - GraphData 是Graph接口的实现类
 * - 提供图的基本数据存储和查询功能
 * - 作为核心实体，放在core/entities目录
 *
 * 核心职责：
 * - 存储图的节点、边及邻接关系
 * - 提供图的查询和遍历方法
 * - 作为无状态数据结构，不包含状态管理逻辑
 *
 * 使用场景：
 * - 工作流定义的图结构表示
 * - Thread 执行时的图数据（不可变）
 * - 图验证和分析
 *
 * 注意事项：
 * - GraphData 是无状态的数据结构，构建完成后不应被修改
 * - 图的构建由 GraphBuilder 负责
 * - 运行时通过 GraphRegistry 管理，确保不可变性
 */

import { ConfigurationError } from '@modular-agent/types';
import type {
  GraphNode,
  GraphEdge,
  AdjacencyList,
  ReverseAdjacencyList,
  NodeMap,
  EdgeMap,
  Graph,
} from '@modular-agent/types';
import type { ID } from '@modular-agent/types';

/**
 * 图数据结构类
 * 核心职责：存储和管理图的节点、边及邻接关系
 * 不包含复杂算法，仅提供基础的图操作
 */
export class GraphData implements Graph {
  /** 节点集合 */
  public nodes: NodeMap;
  /** 边集合 */
  public edges: EdgeMap;
  /** 正向邻接表 */
  public adjacencyList: AdjacencyList;
  /** 反向邻接表 */
  public reverseAdjacencyList: ReverseAdjacencyList;
  /** 起始节点ID */
  public startNodeId?: ID;
  /** 结束节点ID集合 */
  public endNodeIds: Set<ID>;

  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
    this.adjacencyList = new Map();
    this.reverseAdjacencyList = new Map();
    this.endNodeIds = new Set();
  }

  /**
   * 添加节点
   * 注意：此方法仅用于构建阶段，运行时不应调用
   */
  addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
    // 初始化邻接表
    if (!this.adjacencyList.has(node.id)) {
      this.adjacencyList.set(node.id, new Set());
    }
    if (!this.reverseAdjacencyList.has(node.id)) {
      this.reverseAdjacencyList.set(node.id, new Set());
    }
  }

  /**
   * 添加边
   * 注意：此方法仅用于构建阶段，运行时不应调用
   */
  addEdge(edge: GraphEdge): void {
    this.edges.set(edge.id, edge);
    // 更新正向邻接表
    if (!this.adjacencyList.has(edge.sourceNodeId)) {
      this.adjacencyList.set(edge.sourceNodeId, new Set());
    }
    this.adjacencyList.get(edge.sourceNodeId)!.add(edge.targetNodeId);

    // 更新反向邻接表
    if (!this.reverseAdjacencyList.has(edge.targetNodeId)) {
      this.reverseAdjacencyList.set(edge.targetNodeId, new Set());
    }
    this.reverseAdjacencyList.get(edge.targetNodeId)!.add(edge.sourceNodeId);
  }

  /**
   * 获取节点
   */
  getNode(nodeId: ID): GraphNode | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * 获取边
   */
  getEdge(edgeId: ID): GraphEdge | undefined {
    return this.edges.get(edgeId);
  }

  /**
   * 获取节点的出边邻居
   */
  getOutgoingNeighbors(nodeId: ID): Set<ID> {
    return this.adjacencyList.get(nodeId) || new Set();
  }

  /**
   * 获取节点的入边邻居
   */
  getIncomingNeighbors(nodeId: ID): Set<ID> {
    return this.reverseAdjacencyList.get(nodeId) || new Set();
  }

  /**
   * 获取节点的出边
   */
  getOutgoingEdges(nodeId: ID): GraphEdge[] {
    const neighbors = this.getOutgoingNeighbors(nodeId);
    const edges: GraphEdge[] = [];
    for (const edge of this.edges.values()) {
      if (edge.sourceNodeId === nodeId && neighbors.has(edge.targetNodeId)) {
        edges.push(edge);
      }
    }
    return edges;
  }

  /**
   * 获取节点的入边
   */
  getIncomingEdges(nodeId: ID): GraphEdge[] {
    const neighbors = this.getIncomingNeighbors(nodeId);
    const edges: GraphEdge[] = [];
    for (const edge of this.edges.values()) {
      if (edge.targetNodeId === nodeId && neighbors.has(edge.sourceNodeId)) {
        edges.push(edge);
      }
    }
    return edges;
  }

  /**
   * 获取两个节点之间的边
   */
  getEdgeBetween(sourceNodeId: ID, targetNodeId: ID): GraphEdge | undefined {
    for (const edge of this.edges.values()) {
      if (edge.sourceNodeId === sourceNodeId && edge.targetNodeId === targetNodeId) {
        return edge;
      }
    }
    return undefined;
  }

  /**
   * 检查节点是否存在
   */
  hasNode(nodeId: ID): boolean {
    return this.nodes.has(nodeId);
  }

  /**
   * 检查边是否存在
   */
  hasEdge(edgeId: ID): boolean {
    return this.edges.has(edgeId);
  }

  /**
   * 检查两个节点之间是否有边
   */
  hasEdgeBetween(sourceNodeId: ID, targetNodeId: ID): boolean {
    const neighbors = this.adjacencyList.get(sourceNodeId);
    return neighbors ? neighbors.has(targetNodeId) : false;
  }

  /**
   * 获取所有节点ID
   */
  getAllNodeIds(): ID[] {
    return Array.from(this.nodes.keys());
  }

  /**
   * 获取所有边ID
   */
  getAllEdgeIds(): ID[] {
    return Array.from(this.edges.keys());
  }

  /**
   * 获取节点数量
   */
  getNodeCount(): number {
    return this.nodes.size;
  }

  /**
   * 获取边数量
   */
  getEdgeCount(): number {
    return this.edges.size;
  }

  /**
   * 获取入度为0的节点
   */
  getSourceNodes(): GraphNode[] {
    const sources: GraphNode[] = [];
    for (const [nodeId, neighbors] of this.reverseAdjacencyList) {
      if (neighbors.size === 0) {
        const node = this.nodes.get(nodeId);
        if (node) {
          sources.push(node);
        }
      }
    }
    return sources;
  }

  /**
   * 获取出度为0的节点
   */
  getSinkNodes(): GraphNode[] {
    const sinks: GraphNode[] = [];
    for (const [nodeId, neighbors] of this.adjacencyList) {
      if (neighbors.size === 0) {
        const node = this.nodes.get(nodeId);
        if (node) {
          sinks.push(node);
        }
      }
    }
    return sinks;
  }

  /**
   * 清空图
   */
  clear(): void {
    this.nodes.clear();
    this.edges.clear();
    this.adjacencyList.clear();
    this.reverseAdjacencyList.clear();
    this.endNodeIds.clear();
    this.startNodeId = undefined;
  }

}