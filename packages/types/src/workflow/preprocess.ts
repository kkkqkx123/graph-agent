/**
 * 工作流预处理相关类型定义
 */

import type { ID, Timestamp } from '../common';
import type { WorkflowDefinition } from './definition';
import type { WorkflowTrigger } from '../trigger';
import type { GraphAnalysisResult, Graph } from '../graph';
import type { IdMapping, SubgraphRelationship } from './id-mapping';

/**
 * 子工作流合并日志类型
 * 记录SUBGRAPH节点合并过程
 */
export interface SubgraphMergeLog {
  /** 子工作流ID */
  subworkflowId: ID;
  /** 子工作流名称 */
  subworkflowName: string;
  /** SUBGRAPH节点ID */
  subgraphNodeId: ID;
  /** 合并的节点ID映射（原始ID -> 新ID） */
  nodeIdMapping: Map<ID, ID>;
  /** 合并的边ID映射（原始ID -> 新ID） */
  edgeIdMapping: Map<ID, ID>;
  /** 合并时间戳 */
  mergedAt: Timestamp;
}

/**
 * 预处理验证结果类型
 */
export interface PreprocessValidationResult {
  /** 是否验证通过 */
  isValid: boolean;
  /** 验证错误列表 */
  errors: string[];
  /** 验证警告列表 */
  warnings: string[];
  /** 验证时间戳 */
  validatedAt: Timestamp;
}