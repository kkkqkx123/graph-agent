/**
 * 图分析结果类型定义
 */

import type { ID } from '../common';
import { NodeType } from '../node';
import type { EdgeType } from '../edge';
import type { CycleDetectionResult, ReachabilityResult, TopologicalSortResult, ForkJoinValidationResult } from './validation';

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