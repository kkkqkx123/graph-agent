/**
 * Workflow类型定义
 * 定义工作流的完整结构，包括节点和边
 */

// 导入类型定义
import type { Node } from './node';
import type { Edge } from './edge';
import type { ID, Timestamp, Version, Metadata, VariableScope } from './common';
import type { GraphAnalysisResult, Graph } from './graph';
import type { WorkflowTrigger } from './trigger';
import type { TriggerReference } from './trigger-template';
import type { CheckpointMetadata } from './checkpoint';
import type { ErrorHandlingConfig } from './thread';

/**
 * 工作流状态枚举
 */
export enum WorkflowStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE'
}

/**
 * 工具审批配置
 * 定义工作流中工具调用的审批策略
 */
export interface ToolApprovalConfig {
  /**
   * 自动批准的工具列表（白名单）
   * 工具ID或名称数组，这些工具调用无需人工审批
   */
  autoApprovedTools: string[];
}

/**
 * 检查点配置类型
 * 定义检查点的创建策略和行为
 */
export interface CheckpointConfig {
  /** 是否启用检查点（全局开关） */
  enabled?: boolean;
  /** 是否在节点执行前创建检查点（全局默认行为） */
  checkpointBeforeNode?: boolean;
  /** 是否在节点执行后创建检查点（全局默认行为） */
  checkpointAfterNode?: boolean;
  /** 默认检查点元数据 */
  defaultMetadata?: CheckpointMetadata;
}

/**
 * 工作流配置类型
 * 定义工作流执行时的行为选项
 */
export interface WorkflowConfig {
  /** 执行超时时间（毫秒） */
  timeout?: number;
  /** 最大执行步数 */
  maxSteps?: number;
  /** 是否启用检查点（保留向后兼容） */
  enableCheckpoints?: boolean;
  /** 检查点配置（新增） */
  checkpointConfig?: CheckpointConfig;
  /** 重试策略配置 */
  retryPolicy?: {
    maxRetries?: number;
    retryDelay?: number;
    backoffMultiplier?: number;
  };
  /** 错误处理策略 */
  errorHandling?: ErrorHandlingConfig;
  /** 工具审批配置 */
  toolApproval?: ToolApprovalConfig;
}

/**
 * 工作流元数据类型
 * 用于存储扩展信息
 */
export interface WorkflowMetadata {
  /** 作者信息 */
  author?: string;
  /** 标签数组 */
  tags?: string[];
  /** 分类 */
  category?: string;
}

/**
 * 工作流变量定义类型
 * 用于在工作流定义阶段声明变量，提供类型安全和初始值
 *
 * 说明：
 * - 在工作流定义时声明变量，提供类型信息和默认值
 * - 执行时转换为 ThreadVariable，存储在 Thread.variableScopes.thread 中
 * - 通过 VARIABLE 节点修改，通过表达式访问（{{variableName}}）
 *
 * 与 inputMapping/outputMapping 的关系：
 * - WorkflowVariable: 定义工作流内部的变量存储
 * - inputMapping/outputMapping: 定义跨工作流的数据传递规则
 * - 两者互补，不重复
 *
 * 示例：
 * ```typescript
 * workflow.variables = [
 *   { name: 'userName', type: 'string', defaultValue: 'Alice' },
 *   { name: 'userAge', type: 'number', defaultValue: 25 }
 * ]
 *
 * // 执行时
 * thread.variableScopes.thread = {
 *   userName: 'Alice',
 *   userAge: 25
 * }
 *
 * // 在表达式中访问
 * {{userName}}  // 'Alice'
 * {{userAge}}  // 25
 * ```
 */
export interface WorkflowVariable {
  /** 变量名称 */
  name: string;
  /** 变量类型 */
  type: 'number' | 'string' | 'boolean' | 'array' | 'object';
  /** 变量初始值 */
  defaultValue?: any;
  /** 变量描述 */
  description?: string;
  /** 是否必需 */
  required?: boolean;
  /** 是否只读 */
  readonly?: boolean;
  /** 变量作用域 */
  scope?: VariableScope;
}

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
  /**
   * 输入映射关系
   *
   * 说明：记录子工作流合并时的输入变量映射
   * - 键：变量名
   * - 值：对应的节点ID
   *
   * 用途：运行时审计和调试，追踪子工作流的数据来源
   */
  inputMapping: Map<string, ID>;
  /**
   * 输出映射关系
   *
   * 说明：记录子工作流合并时的输出变量映射
   * - 键：变量名
   * - 值：对应的节点ID
   *
   * 用途：运行时审计和调试，追踪子工作流的数据去向
   */
  outputMapping: Map<string, ID>;
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
  get nodes(): Node[] { return this.workflow.nodes; }
  get edges(): Edge[] { return this.workflow.edges; }
  get variables(): WorkflowVariable[] | undefined { return this.workflow.variables; }
  get config(): WorkflowConfig | undefined { return this.workflow.config; }
  get metadata(): WorkflowMetadata | undefined { return this.workflow.metadata; }
  get version(): Version { return this.workflow.version; }
  get createdAt(): Timestamp { return this.workflow.createdAt; }
  get updatedAt(): Timestamp { return this.workflow.updatedAt; }
  get availableTools(): { initial: Set<string> } | undefined { return this.workflow.availableTools; }
}

/**
 * 工作流定义类型
 * 包含工作流的基本信息和结构
 */
export interface WorkflowDefinition {
  /** 工作流唯一标识符 */
  id: ID;
  /** 工作流名称 */
  name: string;
  /** 可选的工作流描述 */
  description?: string;
  /** 节点数组，定义工作流的所有节点 */
  nodes: Node[];
  /** 边数组，定义节点之间的连接关系 */
  edges: Edge[];
  /** 工作流变量定义数组，用于声明工作流执行所需的变量 */
  variables?: WorkflowVariable[];
  /** 工作流触发器定义数组，用于声明工作流级别的触发器 */
  triggers?: (WorkflowTrigger | TriggerReference)[];
  /** 可选的工作流配置 */
  config?: WorkflowConfig;
  /** 可选的元数据信息 */
  metadata?: WorkflowMetadata;
  /** 工作流版本号 */
  version: Version;
  /** 创建时间 */
  createdAt: Timestamp;
  /** 更新时间 */
  updatedAt: Timestamp;
  /** 可用工具配置 */
  availableTools?: {
    /** 初始可用工具集合（工具ID或名称） */
    initial: Set<string>;
  };
}

/**
 * 工作流关系信息
 * 用于维护工作流间的父子关系链
 */
export interface WorkflowRelationship {
  /** 工作流ID */
  workflowId: ID;
  /** 父工作流ID（如果有） */
  parentWorkflowId?: ID;
  /** 子工作流ID列表 */
  childWorkflowIds: Set<ID>;
  /** 引用此工作流的SUBGRAPH节点ID映射 */
  referencedBy: Map<ID, ID>; // key: SUBGRAPH节点ID, value: 父工作流ID
  /** 关系深度 */
  depth: number;
}

/**
 * 工作流层次结构信息
 */
export interface WorkflowHierarchy {
  /** 祖先链（从根到父） */
  ancestors: ID[];
  /** 后代链（从子到孙） */
  descendants: ID[];
  /** 在层次结构中的深度 */
  depth: number;
  /** 根工作流ID */
  rootWorkflowId: ID;
}