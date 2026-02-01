/**
 * Graph类型定义
 * 定义工作流图验证和分析所需的数据结构
 */

import type { ID, Metadata } from './common';
import type { Node, NodeType } from './node';
import type { Edge, EdgeType } from './edge';

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
  /** 可选的元数据 */
  metadata?: Metadata;
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
  /** 可选的元数据 */
  metadata?: Metadata;
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

/**
 * 环检测结果
 */
export interface CycleDetectionResult {
  /** 是否存在环 */
  hasCycle: boolean;
  /** 环中的节点ID列表（如果有环） */
  cycleNodes?: ID[];
  /** 环中的边ID列表（如果有环） */
  cycleEdges?: ID[];
}

/**
 * 可达性分析结果
 */
export interface ReachabilityResult {
  /** 从START节点可达的节点集合 */
  reachableFromStart: Set<ID>;
  /** 能到达END节点的节点集合 */
  reachableToEnd: Set<ID>;
  /** 不可达节点（从START无法到达） */
  unreachableNodes: Set<ID>;
  /** 死节点（无法到达END） */
  deadEndNodes: Set<ID>;
}

/**
 * 拓扑排序结果
 */
export interface TopologicalSortResult {
  /** 是否成功排序（无环） */
  success: boolean;
  /** 拓扑排序后的节点ID列表 */
  sortedNodes: ID[];
  /** 如果有环，环中的节点 */
  cycleNodes?: ID[];
}

/**
 * FORK/JOIN配对验证结果
 */
export interface ForkJoinValidationResult {
  /** 是否验证通过 */
  isValid: boolean;
  /** 未配对的FORK节点 */
  unpairedForks: ID[];
  /** 未配对的JOIN节点 */
  unpairedJoins: ID[];
  /** 配对详情 */
  pairs: Map<ID, ID>;
}

/**
 * 图分析结果
 * 包含所有图分析算法的结果
 */
export interface GraphAnalysisResult {
  /** 环检测结果 */
  cycleDetection: CycleDetectionResult;
  /** 可达性分析结果 */
  reachability: ReachabilityResult;
  /** 拓扑排序结果 */
  topologicalSort: TopologicalSortResult;
  /** FORK/JOIN配对验证结果 */
  forkJoinValidation: ForkJoinValidationResult;
  /** 节点统计信息 */
  nodeStats: {
    /** 总节点数 */
    total: number;
    /** 按类型分组的节点数 */
    byType: Map<NodeType, number>;
  };
  /** 边统计信息 */
  edgeStats: {
    /** 总边数 */
    total: number;
    /** 按类型分组的边数 */
    byType: Map<EdgeType, number>;
  };
}

/**
 * 图构建选项
 */
export interface GraphBuildOptions {
  /** 是否验证图结构 */
  validate?: boolean;
  /** 是否计算拓扑排序 */
  computeTopologicalOrder?: boolean;
  /** 是否检测环 */
  detectCycles?: boolean;
  /** 是否分析可达性 */
  analyzeReachability?: boolean;
  /** 最大递归深度 */
  maxRecursionDepth?: number;
  /** 当前递归深度（内部使用） */
  currentDepth?: number;
  /** 工作流注册器引用（用于查询子工作流） */
  workflowRegistry?: any;
}

/**
 * 图验证选项
 */
export interface GraphValidationOptions {
  /** 是否检测环 */
  checkCycles?: boolean;
  /** 是否检查可达性 */
  checkReachability?: boolean;
  /** 是否检查FORK/JOIN配对 */
  checkForkJoin?: boolean;
  /** 是否检查START/END节点 */
  checkStartEnd?: boolean;
  /** 是否检查孤立节点 */
  checkIsolatedNodes?: boolean;
  /** 是否检查子工作流存在性 */
  checkSubgraphExistence?: boolean;
  /** 是否检查子工作流接口兼容性 */
  checkSubgraphCompatibility?: boolean;
}

/**
 * 子工作流合并选项
 */
export interface SubgraphMergeOptions {
  /** 节点ID命名空间前缀 */
  nodeIdPrefix?: string;
  /** 边ID命名空间前缀 */
  edgeIdPrefix?: string;
  /** 是否保留原始ID映射 */
  preserveIdMapping?: boolean;
  /** 输入变量映射 */
  inputMapping?: Map<string, string>;
  /** 输出变量映射 */
  outputMapping?: Map<string, string>;
}

/**
 * 子工作流合并结果
 */
export interface SubgraphMergeResult {
  /** 是否合并成功 */
  success: boolean;
  /** 合并后的节点ID映射 */
  nodeIdMapping: Map<ID, ID>;
  /** 合并后的边ID映射 */
  edgeIdMapping: Map<ID, ID>;
  /** 新增的节点ID列表 */
  addedNodeIds: ID[];
  /** 新增的边ID列表 */
  addedEdgeIds: ID[];
  /** 移除的节点ID列表（SUBGRAPH节点） */
  removedNodeIds: ID[];
  /** 移除的边ID列表 */
  removedEdgeIds: ID[];
  /** 错误信息 */
  errors: string[];
  /** 合并的子工作流ID列表 */
  subworkflowIds: ID[];
}