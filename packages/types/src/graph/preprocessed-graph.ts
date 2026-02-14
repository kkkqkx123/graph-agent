/**
 * 预处理后的图接口
 * 扩展Graph接口，添加预处理相关的元数据
 */

import type { Graph } from './structure';
import type { ID, Timestamp, Version } from '../common';
import type { IdMapping, SubgraphRelationship } from '../workflow/id-mapping';
import type { GraphAnalysisResult } from './analysis';
import type { PreprocessValidationResult, SubgraphMergeLog } from '../workflow/preprocess';
import type { WorkflowTrigger } from '../trigger';
import type { WorkflowVariable } from '../workflow/variables';

/**
 * 预处理后的图接口
 * 扩展Graph接口，包含所有预处理相关的信息
 */
export interface PreprocessedGraph extends Graph {
  // ========== ID映射相关 ==========
  /** ID映射表（构建阶段临时数据） */
  idMapping: IdMapping;
  
  /** 预处理后的节点配置（已更新ID引用） */
  nodeConfigs: Map<ID, any>;
  
  /** 预处理后的触发器配置（已更新ID引用） */
  triggerConfigs: Map<ID, any>;
  
  /** 子工作流关系 */
  subgraphRelationships: SubgraphRelationship[];
  
  // ========== 预处理元数据 ==========
  /** 图分析结果 */
  graphAnalysis: GraphAnalysisResult;
  
  /** 预处理验证结果 */
  validationResult: PreprocessValidationResult;
  
  /** 拓扑排序后的节点ID列表 */
  topologicalOrder: ID[];
  
  /** 子工作流合并日志 */
  subgraphMergeLogs: SubgraphMergeLog[];
  
  /** 预处理时间戳 */
  processedAt: Timestamp;
  
  // ========== 工作流元数据 ==========
  /** 工作流ID */
  workflowId: ID;
  
  /** 工作流版本 */
  workflowVersion: Version;
  
  /** 触发器（已展开，不包含引用） */
  triggers?: WorkflowTrigger[];
  
  /** 工作流变量定义 */
  variables?: WorkflowVariable[];
  
  /** 是否包含子工作流 */
  hasSubgraphs: boolean;
  
  /** 子工作流ID集合 */
  subworkflowIds: Set<ID>;
  
  /** 可用工具配置 */
  availableTools?: {
    /** 初始可用工具集合（工具ID或名称） */
    initial: Set<string>;
  };
}