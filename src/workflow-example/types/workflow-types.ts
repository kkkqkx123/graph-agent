/**
 * 图工作流示例 - 类型定义
 *
 * 本文件定义了图工作流示例中使用的所有核心类型
 */

// ============================================================================
// 节点相关类型
// ============================================================================

/**
 * 节点ID类型
 * 使用品牌类型确保类型安全
 */
export type NodeId = string & { readonly _brand: 'NodeId' };

/**
 * 创建节点ID
 */
export function createNodeId(value: string): NodeId {
  return value as NodeId;
}

/**
 * 节点类型枚举
 */
export enum NodeType {
  LLM = 'llm',
  TOOL = 'tool',
  CONDITION = 'condition',
  TRANSFORM = 'transform',
  START = 'start',
  END = 'end',
}

/**
 * 节点状态枚举
 */
export enum NodeStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

/**
 * 节点配置接口
 */
export interface NodeConfig {
  [key: string]: any;
}

/**
 * 节点输入接口
 */
export interface NodeInput {
  [key: string]: any;
}

/**
 * 节点输出接口
 */
export interface NodeOutput {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// 边相关类型
// ============================================================================

/**
 * 边ID类型
 */
export type EdgeId = string & { readonly _brand: 'EdgeId' };

/**
 * 创建边ID
 */
export function createEdgeId(value: string): EdgeId {
  return value as EdgeId;
}

/**
 * 边类型枚举
 */
export enum EdgeType {
  DIRECT = 'direct',
  CONDITIONAL = 'conditional',
}

/**
 * 条件运算符枚举
 */
export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_EQUALS = 'greater_equals',
  LESS_EQUALS = 'less_equals',
  EXISTS = 'exists',
  NOT_EXISTS = 'not_exists',
}

/**
 * 边条件接口
 */
export interface EdgeCondition {
  expression: string;
  operator: ConditionOperator;
  expectedValue?: any;
}

// ============================================================================
// 触发器相关类型
// ============================================================================

/**
 * 触发器ID类型
 */
export type TriggerId = string & { readonly _brand: 'TriggerId' };

/**
 * 创建触发器ID
 */
export function createTriggerId(value: string): TriggerId {
  return value as TriggerId;
}

/**
 * 触发器类型枚举
 */
export enum TriggerType {
  TIME = 'time',
  EVENT = 'event',
  STATE = 'state',
}

/**
 * 触发器动作枚举
 */
export enum TriggerAction {
  START = 'start',
  STOP = 'stop',
  PAUSE = 'pause',
  RESUME = 'resume',
  SKIP_NODE = 'skip_node',
}

/**
 * 触发器状态枚举
 */
export enum TriggerStatus {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  TRIGGERED = 'triggered',
}

/**
 * 时间触发器配置
 */
export interface TimeTriggerConfig {
  delay?: number;
  interval?: number;
  cron?: string;
}

/**
 * 事件触发器配置
 */
export interface EventTriggerConfig {
  eventType: string;
  eventDataPattern?: Record<string, any>;
}

/**
 * 状态触发器配置
 */
export interface StateTriggerConfig {
  statePath: string;
  expectedValue: any;
}

/**
 * 触发器配置联合类型
 */
export type TriggerConfig = TimeTriggerConfig | EventTriggerConfig | StateTriggerConfig;

// ============================================================================
// 工作流相关类型
// ============================================================================

/**
 * 工作流状态枚举
 */
export enum WorkflowStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * 执行策略枚举
 */
export enum ExecutionStrategy {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
}

/**
 * 执行结果接口
 */
export interface ExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    executionTime: number;
    executedNodes: string[];
    skippedNodes: string[];
    failedNodes: string[];
  };
}

/**
 * 执行历史记录接口
 */
export interface ExecutionHistory {
  nodeId: string;
  status: NodeStatus;
  startTime: number;
  endTime?: number;
  output?: NodeOutput;
  error?: string;
}

// ============================================================================
// 函数类型
// ============================================================================

/**
 * 节点函数类型
 */
export type NodeFunction = (
  input: NodeInput,
  config: NodeConfig,
  context: ExecutionContext
) => Promise<NodeOutput>;

/**
 * 边函数类型
 */
export type EdgeFunction = (
  input: EdgeInput,
  config: EdgeConfig,
  context: ExecutionContext
) => Promise<EdgeOutput>;

/**
 * 边输入接口
 */
export interface EdgeInput {
  fromNodeId: string;
  toNodeId: string;
  [key: string]: any;
}

/**
 * 边配置接口
 */
export interface EdgeConfig {
  expression?: string;
  operator?: string;
  expectedValue?: any;
  weight?: number;
  [key: string]: any;
}

/**
 * 边输出接口
 */
export interface EdgeOutput {
  canTraverse: boolean;
  reason: string;
  metadata?: Record<string, any>;
}

/**
 * 触发器函数类型
 */
export type TriggerFunction = (
  input: TriggerInput,
  config: TriggerConfig,
  context: ExecutionContext
) => Promise<TriggerOutput>;

/**
 * 触发器输入接口
 */
export interface TriggerInput {
  triggerId: string;
  [key: string]: any;
}

/**
 * 触发器输出接口
 */
export interface TriggerOutput {
  shouldTrigger: boolean;
  reason: string;
  metadata?: Record<string, any>;
}

/**
 * 条件评估函数类型
 */
export type ConditionEvaluator = (
  expression: string,
  context: ExecutionContext
) => Promise<boolean>;

/**
 * 表达式求值函数类型
 */
export type ExpressionEvaluator = (expression: string, data: Record<string, any>) => any;

/**
 * 触发器评估函数类型
 */
export type TriggerEvaluator = (
  config: TriggerConfig,
  context: ExecutionContext
) => Promise<boolean>;

/**
 * 触发器动作执行函数类型
 */
export type TriggerActionExecutor = (
  action: TriggerAction,
  target: string | undefined,
  engine: WorkflowEngine
) => Promise<void>;

// ============================================================================
// 执行上下文接口
// ============================================================================

/**
 * 执行上下文接口
 */
export interface ExecutionContext {
  workflowId: string;
  executionId: string;

  setVariable(path: string, value: any): void;
  getVariable(path: string): any;
  getAllData(): Record<string, any>;

  setNodeResult(nodeId: string, result: NodeOutput): void;
  getNodeResult(nodeId: string): NodeOutput | undefined;

  getRecentEvent(eventType: string): any;
  setRecentEvent(eventType: string, event: any): void;
}

// ============================================================================
// 工作流引擎接口
// ============================================================================

/**
 * 工作流引擎接口
 */
export interface WorkflowEngine {
  execute(workflow: WorkflowGraph, input: any): Promise<ExecutionResult>;
  pause(): void;
  resume(): void;
  stop(): void;
  getStatus(): WorkflowStatus;
  getCurrentNode(): Node | undefined;
  getExecutionHistory(): ExecutionHistory[];
}

// ============================================================================
// 实体接口
// ============================================================================

/**
 * 节点实体接口
 */
export interface Node {
  id: NodeId;
  type: NodeType;
  name: string;
  description?: string;
  config: NodeConfig;
  status: NodeStatus;

  updateStatus(status: NodeStatus): void;
  getInputSchema(): Record<string, any>;
  getOutputSchema(): Record<string, any>;
}

/**
 * 边实体接口
 */
export interface Edge {
  id: EdgeId;
  type: EdgeType;
  fromNodeId: string;
  toNodeId: string;
  condition?: EdgeCondition;
  weight: number;

  evaluateCondition(context: ExecutionContext): Promise<boolean>;
  getConditionExpression(): string | undefined;
}

/**
 * 触发器实体接口
 */
export interface Trigger {
  id: TriggerId;
  type: TriggerType;
  name: string;
  config: TriggerConfig;
  action: TriggerAction;
  targetNodeId?: string;
  status: TriggerStatus;

  evaluate(context: ExecutionContext): Promise<boolean>;
  executeAction(engine: WorkflowEngine): Promise<void>;
  enable(): void;
  disable(): void;
}

/**
 * 工作流图接口
 */
export interface WorkflowGraph {
  id: string;
  nodes: Map<string, Node>;
  edges: Map<string, Edge>;
  triggers: Trigger[];

  addNode(node: Node): void;
  addEdge(edge: Edge): void;
  addTrigger(trigger: Trigger): void;

  getNode(nodeId: string): Node | undefined;
  getEdgesFrom(nodeId: string): Edge[];
  getEdgesTo(nodeId: string): Edge[];

  getReadyNodes(executedNodes: Set<string>): Node[];
  hasCycle(): boolean;
}
