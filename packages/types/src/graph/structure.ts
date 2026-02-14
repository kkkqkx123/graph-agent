/**
 * 图结构类型定义
 */

import type { ID, Metadata } from '../common';
import type { Node } from '../node';
import { NodeType } from '../node';
import type { Edge, EdgeType } from '../edge';

/**
 * 图节点类型
 * 用于图验证和分析的节点表示
 */
export interface GraphNode {
  /** 节点唯一标识符 */
  id: ID;
  /** 节点类型 */
  type: NodeType;
  /** 节点名称 */
  name: string;
  /** 可选的节点描述 */
  description?: string;
  /** 内部元数据（系统内部使用，用户不可设置，避免数据注入漏洞）【在node定义中不存在，仅在graph阶段才存在】 */
  internalMetadata?: Metadata;
  /** 原始节点引用（用于访问完整节点配置） */
  originalNode?: Node;
  /** 节点所属的原始工作流ID */
  workflowId: ID;
  /** 父工作流ID（如果是子图展开的节点） */
  parentWorkflowId?: ID;
}

/**
 * 图边类型
 * 用于图验证和分析的边表示
 */
export interface GraphEdge {
  /** 边唯一标识符 */
  id: ID;
  /** 源节点ID */
  sourceNodeId: ID;
  /** 目标节点ID */
  targetNodeId: ID;
  /** 边类型 */
  type: EdgeType;
  /** 可选的边标签 */
  label?: string;
  /** 可选的边描述 */
  description?: string;
  /** 边权重，用于多条条件边同时满足时的排序 */
  weight?: number;
  /** 原始边引用（用于访问完整边配置） */
  originalEdge?: Edge;
}

/**
 * 邻接表类型
 * 记录每个节点的出边邻居节点列表
 */
export type AdjacencyList = Map<ID, Set<ID>>;

/**
 * 反向邻接表类型
 * 记录每个节点的入边邻居节点列表
 */
export type ReverseAdjacencyList = Map<ID, Set<ID>>;

/**
 * 节点映射表类型
 * 建立节点ID到节点对象的映射关系
 */
export type NodeMap = Map<ID, GraphNode>;

/**
 * 边映射表类型
 * 建立边ID到边对象的映射关系
 */
export type EdgeMap = Map<ID, GraphEdge>;

/**
 * 图数据接口（Graph）
 *
 * 设计说明：
 * - 定义图数据结构的接口规范
 * - GraphData类在core层实现此接口
 * - Thread等类型使用此接口引用图数据
 * - 提供图的基本操作和查询功能
 */
export interface Graph {
  /** 节点集合 */
  nodes: NodeMap;
  /** 边集合 */
  edges: EdgeMap;
  /** 正向邻接表：记录每个节点的出边邻居 */
  adjacencyList: AdjacencyList;
  /** 反向邻接表：记录每个节点的入边邻居 */
  reverseAdjacencyList: ReverseAdjacencyList;
  /** 起始节点ID */
  startNodeId?: ID;
  /** 结束节点ID集合（可能有多个END节点） */
  endNodeIds: Set<ID>;

  /** 获取节点 */
  getNode(nodeId: ID): GraphNode | undefined;
  /** 获取边 */
  getEdge(edgeId: ID): GraphEdge | undefined;
  /** 获取节点的出边邻居 */
  getOutgoingNeighbors(nodeId: ID): Set<ID>;
  /** 获取节点的入边邻居 */
  getIncomingNeighbors(nodeId: ID): Set<ID>;
  /** 获取节点的出边 */
  getOutgoingEdges(nodeId: ID): GraphEdge[];
  /** 获取节点的入边 */
  getIncomingEdges(nodeId: ID): GraphEdge[];
  /** 获取两个节点之间的边 */
  getEdgeBetween(sourceNodeId: ID, targetNodeId: ID): GraphEdge | undefined;
  /** 检查节点是否存在 */
  hasNode(nodeId: ID): boolean;
  /** 检查边是否存在 */
  hasEdge(edgeId: ID): boolean;
  /** 检查两个节点之间是否有边 */
  hasEdgeBetween(sourceNodeId: ID, targetNodeId: ID): boolean;
  /** 获取所有节点ID */
  getAllNodeIds(): ID[];
  /** 获取所有边ID */
  getAllEdgeIds(): ID[];
  /** 获取节点数量 */
  getNodeCount(): number;
  /** 获取边数量 */
  getEdgeCount(): number;
  /** 获取入度为0的节点 */
  getSourceNodes(): GraphNode[];
  /** 获取出度为0的节点 */
  getSinkNodes(): GraphNode[];
}