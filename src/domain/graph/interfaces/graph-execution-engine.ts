import { ID } from '../../common/value-objects/id';
import { Graph } from '../entities/graph';
import { WorkflowState } from '../entities/workflow-state';

/**
 * 图编译配置
 */
export interface GraphCompilationConfig {
  checkpointer?: any;
  interruptBefore?: string[];
  interruptAfter?: string[];
  debug?: boolean;
}

/**
 * 编译后的图
 */
export interface CompiledGraph {
  graphId: ID;
  entryPoint: string;
  nodes: Map<string, CompiledNode>;
  edges: Map<string, CompiledEdge>;
  stateSchema: any;
  compiledAt: Date;
}

/**
 * 编译后的节点
 */
export interface CompiledNode {
  nodeId: string;
  func: any;
  config: Record<string, unknown>;
}

/**
 * 编译后的边
 */
export interface CompiledEdge {
  edgeId: string;
  sourceNode: string;
  targetNode: string;
  condition?: string;
  type: string;
}

/**
 * 图执行输入
 */
export interface GraphExecutionInput {
  initialData: Record<string, unknown>;
  config?: Record<string, unknown>;
  threadId?: string;
  sessionId?: string;
}

/**
 * 图执行结果
 */
export interface GraphExecutionResult {
  success: boolean;
  finalState: WorkflowState;
  executionTime: number;
  nodeResults: NodeExecutionResult[];
  error?: Error;
  metadata: Record<string, unknown>;
}

/**
 * 节点执行结果
 */
export interface NodeExecutionResult {
  nodeId: string;
  success: boolean;
  state: WorkflowState;
  nextNodeId?: string;
  executionTime: number;
  error?: Error;
  metadata: Record<string, unknown>;
}

/**
 * 图执行事件
 */
export interface GraphExecutionEvent {
  type: 'node_started' | 'node_completed' | 'node_failed' | 'graph_completed' | 'graph_failed';
  nodeId?: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

/**
 * 引擎信息
 */
export interface EngineInfo {
  engineType: string;
  version: string;
  capabilities: string[];
  supportedNodeTypes: string[];
  supportedEdgeTypes: string[];
}

/**
 * 图执行引擎接口
 * 
 * 负责图的编译和执行，支持同步、异步和流式执行模式
 */
export interface IGraphExecutionEngine {
  /**
   * 编译图
   * 
   * @param graph 要编译的图
   * @param config 编译配置
   * @returns 编译后的图
   */
  compile(graph: Graph, config?: GraphCompilationConfig): Promise<CompiledGraph>;

  /**
   * 执行图（同步）
   * 
   * @param compiledGraph 编译后的图
   * @param input 执行输入
   * @returns 执行结果
   */
  execute(compiledGraph: CompiledGraph, input: GraphExecutionInput): Promise<GraphExecutionResult>;

  /**
   * 异步执行图
   * 
   * @param compiledGraph 编译后的图
   * @param input 执行输入
   * @returns 执行结果
   */
  executeAsync(compiledGraph: CompiledGraph, input: GraphExecutionInput): Promise<GraphExecutionResult>;

  /**
   * 流式执行图
   * 
   * @param compiledGraph 编译后的图
   * @param input 执行输入
   * @returns 执行事件流
   */
  stream(compiledGraph: CompiledGraph, input: GraphExecutionInput): AsyncIterable<GraphExecutionEvent>;

  /**
   * 获取下一个节点
   * 
   * @param currentNodeId 当前节点ID
   * @param state 当前状态
   * @returns 下一个节点ID列表
   */
  getNextNodes(currentNodeId: string, state: WorkflowState): string[];

  /**
   * 设置钩子系统
   * 
   * @param hookSystem 钩子系统
   */
  setHookSystem(hookSystem: any): void;

  /**
   * 获取引擎信息
   * 
   * @returns 引擎信息
   */
  getEngineInfo(): EngineInfo;

  /**
   * 销毁引擎，释放资源
   */
  destroy(): Promise<void>;
}