/**
 * 子工作流合并相关类型定义
 */

import type { ID } from '../common';

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
 * 子工作流合并选项
 */
export interface SubgraphMergeOptions {
  /** 节点ID命名空间前缀 */
  nodeIdPrefix?: string;
  /** 边ID命名空间前缀 */
  edgeIdPrefix?: string;
  /** 是否保留原始ID映射 */
  preserveIdMapping?: boolean;
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