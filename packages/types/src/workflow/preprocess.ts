/**
 * 工作流预处理相关类型定义
 */

import type { ID, Timestamp } from '../common';
import type { WorkflowDefinition } from './definition';
import type { WorkflowTrigger } from '../trigger';
import type { GraphAnalysisResult, Graph } from '../graph';

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

/**
 * 处理后的工作流定义类型
 * 包装WorkflowDefinition，添加预处理相关的元数据
 * 包含完整的、合并后的图结构，无需依赖外部GraphRegistry
 */
export class ProcessedWorkflowDefinition {
  // 原始工作流定义
  private readonly workflow: WorkflowDefinition;

  /** 工作流类型 */
  readonly type: any;
  /** 触发器（已展开，不包含引用） */
  readonly triggers?: WorkflowTrigger[];
  /** 图分析结果 */
  readonly graphAnalysis: GraphAnalysisResult;
  /** 预处理验证结果 */
  readonly validationResult: PreprocessValidationResult;
  /** 子工作流合并日志 */
  readonly subgraphMergeLogs: SubgraphMergeLog[];
  /** 预处理时间戳 */
  readonly processedAt: Timestamp;
  /** 是否包含子工作流 */
  readonly hasSubgraphs: boolean;
  /** 子工作流ID集合 */
  readonly subworkflowIds: Set<ID>;
  /** 拓扑排序后的节点ID列表 */
  readonly topologicalOrder: ID[];
  /** 完整的、合并后的图结构 */
  readonly graph: Graph;

  constructor(workflow: WorkflowDefinition, processedData: {
    triggers?: WorkflowTrigger[];
    graphAnalysis: GraphAnalysisResult;
    validationResult: PreprocessValidationResult;
    subgraphMergeLogs: SubgraphMergeLog[];
    processedAt: Timestamp;
    hasSubgraphs: boolean;
    subworkflowIds: Set<ID>;
    topologicalOrder: ID[];
    graph: Graph;
  }) {
    this.workflow = workflow;
    this.type = workflow.type;
    this.triggers = processedData.triggers;
    this.graphAnalysis = processedData.graphAnalysis;
    this.validationResult = processedData.validationResult;
    this.subgraphMergeLogs = processedData.subgraphMergeLogs;
    this.processedAt = processedData.processedAt;
    this.hasSubgraphs = processedData.hasSubgraphs;
    this.subworkflowIds = processedData.subworkflowIds;
    this.topologicalOrder = processedData.topologicalOrder;
    this.graph = processedData.graph;
  }

  // 代理访问原始workflow的所有字段
  get id(): ID { return this.workflow.id; }
  get name(): string { return this.workflow.name; }
  get description(): string | undefined { return this.workflow.description; }
  get nodes(): any[] { return this.workflow.nodes; }
  get edges(): any[] { return this.workflow.edges; }
  get variables(): any[] | undefined { return this.workflow.variables; }
  get triggeredSubworkflowConfig(): any | undefined { return this.workflow.triggeredSubworkflowConfig; }
  get config(): any | undefined { return this.workflow.config; }
  get metadata(): any | undefined { return this.workflow.metadata; }
  get version(): any { return this.workflow.version; }
  get createdAt(): Timestamp { return this.workflow.createdAt; }
  get updatedAt(): Timestamp { return this.workflow.updatedAt; }
  get availableTools(): { initial: Set<string> } | undefined { return this.workflow.availableTools; }
}