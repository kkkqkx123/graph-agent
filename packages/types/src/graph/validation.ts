/**
 * 图验证相关类型定义
 */

import type { ID } from '../common';
import { NodeType } from '../node';
import type { EdgeType } from '../edge';

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