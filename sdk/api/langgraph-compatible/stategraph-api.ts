/**
 * StateGraph API - 提供类似LangGraph的API
 * 与现有API并行，不修改现有功能
 */

import { SDK } from '../core/sdk';
import { WorkflowDefinition, Node, Edge, EdgeType, NodeType, Condition } from '../../types';
import { ThreadExecutorAPI } from '../core/thread-executor-api';
import { WorkflowRegistryAPI } from '../registry/workflow-registry-api';
import { VariableManagerAPI } from '../management/variable-manager-api';

// 定义END符号，表示结束节点
export const END = Symbol('END');

// 节点函数类型
export type NodeFunction<StateType> = (state: StateType) => Partial<StateType> | Promise<Partial<StateType>>;

// 条件边配置
export interface ConditionalEdgeConfig<StateType> {
  condition: (state: StateType) => string | symbol;
  mapping: Record<string, string | typeof END>;
}

// 状态模式
export interface StateSchema<StateType> {
  // 可以包含状态验证信息等
}

// 调用选项
export interface InvokeOptions {
  maxSteps?: number;
  timeout?: number;
  enableCheckpoints?: boolean;
}

// 流式选项
export interface StreamOptions extends InvokeOptions {
  chunkSize?: number;
}

// 结果类型
export interface InvokeResult<StateType> {
  state: StateType;
  threadId: string;
  executionTime: number;
  success: boolean;
  error?: Error;
}

// 流式块
export interface StreamChunk<StateType> {
  state: StateType;
  step: number;
  nodeId: string;
  timestamp: number;
}

/**
 * 编译后的工作流
 * 提供执行接口
 */
export class CompiledGraph<StateType = any> {
  constructor(
    private workflowDef: WorkflowDefinition,
    private sdk: SDK
  ) { }

  /**
   * 执行工作流
   */
  async invoke(input: StateType, options?: InvokeOptions): Promise<InvokeResult<StateType>> {
    try {
      // 注册工作流
      await this.sdk.workflows.registerWorkflow(this.workflowDef);

      // 准备执行选项，将初始状态设置为变量
      const executionOptions = {
        input: {}, // 输入为空，因为我们通过变量传递状态
        variables: { currentState: input }, // 将初始状态设置为变量
        maxSteps: options?.maxSteps,
        timeout: options?.timeout,
        enableCheckpoints: options?.enableCheckpoints
      };

      // 执行工作流
      const result = await this.sdk.executor.executeWorkflow(this.workflowDef.id, executionOptions);

      // 从变量中提取最终状态
      const finalState = result.output?.['variables']?.currentState ||
        (result as any)?.thread?.variableValues?.currentState ||
        input;

      return {
        state: finalState,
        threadId: result.threadId,
        executionTime: result.executionTime,
        success: result.success,
        error: result.error
      };
    } catch (error) {
      return {
        state: input,
        threadId: '',
        executionTime: 0,
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * 流式执行工作流
   */
  async *stream(input: StateType, options?: StreamOptions): AsyncGenerator<StreamChunk<StateType>, void, unknown> {
    // 当前实现简单返回最终结果，实际实现需要更复杂的流式处理
    const result = await this.invoke(input, options);

    yield {
      state: result.state,
      step: 1,
      nodeId: 'final',
      timestamp: Date.now()
    };
  }

  /**
   * 获取当前状态
   */
  async get_state(threadId: string): Promise<StateType> {
    // 通过变量管理器获取当前状态
    // 这里是简化实现，实际可能需要更复杂的逻辑
    const variables = await this.sdk.variables.getVariables(threadId);
    return variables as StateType;
  }

  /**
   * 更新状态
   */
  async update_state(threadId: string, stateUpdate: Partial<StateType>): Promise<void> {
    // 通过变量管理器更新状态
    await this.sdk.variables.updateVariables(threadId, stateUpdate as Record<string, any>);
  }
}

/**
 * StateGraph - 状态图类
 * 提供类似LangGraph的API，用于构建状态驱动的工作流
 */
export class StateGraph<StateType = any> {
  private nodes: Map<string, NodeFunction<StateType>> = new Map();
  private edges: Map<string, Set<string>> = new Map(); // 普通边
  private conditionalEdges: Map<string, ConditionalEdgeConfig<StateType>> = new Map(); // 条件边
  private entryPoint: string = 'start';
  private workflowId: string;
  private workflowName: string;

  constructor(
    private stateSchema: StateSchema<StateType>,
    workflowName: string = 'stateful-workflow'
  ) {
    this.workflowId = `stategraph_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.workflowName = workflowName;
  }

  /**
   * 添加节点
   * @param nodeName 节点名称
   * @param nodeFunction 节点函数，接收状态并返回状态更新
   */
  add_node(nodeName: string, nodeFunction: NodeFunction<StateType>): void {
    this.nodes.set(nodeName, nodeFunction);
  }

  /**
   * 添加条件边
   * @param source 起始节点
   * @param condition 条件函数，从状态中提取路由键
   * @param mapping 条件值到目标节点的映射
   */
  add_conditional_edges(
    source: string,
    condition: (state: StateType) => string | symbol,
    mapping: Record<string, string | typeof END>
  ): void {
    this.conditionalEdges.set(source, { condition, mapping });
  }

  /**
   * 添加普通边
   * @param source 起始节点
   * @param target 目标节点
   */
  add_edge(source: string, target: string): void {
    if (!this.edges.has(source)) {
      this.edges.set(source, new Set());
    }
    this.edges.get(source)!.add(target);
  }

  /**
   * 设置入口点
   * @param nodeName 入口节点名称
   */
  set_entry_point(nodeName: string): void {
    this.entryPoint = nodeName;
  }

  /**
   * 编译工作流
   * 将高级API转换为底层的WorkflowDefinition
   */
  compile(sdk: SDK): CompiledGraph<StateType> {
    const workflowDef = this.buildWorkflowDefinition();
    return new CompiledGraph<StateType>(workflowDef, sdk);
  }

  /**
   * 构建工作流定义
   * 将高级API调用转换为标准的WorkflowDefinition
   */
  private buildWorkflowDefinition(): WorkflowDefinition {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const nodeIdCounter: { count: number } = { count: 0 };

    // 创建起始节点
    nodes.push({
      id: 'start',
      type: NodeType.START,
      name: 'Start',
      config: {},
      outgoingEdgeIds: [this.entryPoint],
      incomingEdgeIds: []
    });

    // 添加所有功能节点
    for (const [nodeName, nodeFunction] of this.nodes) {
      nodes.push(createNode(nodeName, nodeName, nodeFunction, nodeIdCounter));
    }

    // 处理条件边 - 创建路由节点
    for (const [sourceNode, config] of this.conditionalEdges) {
      const routerNodeId = `${sourceNode}_router`;

      // 为每个映射项创建对应的条件边
      const routeConditions: Array<{
        condition: string;
        targetNodeId: string;
        priority?: number;
      }> = [];

      for (const [conditionValue, target] of Object.entries(config.mapping)) {
        let targetNodeId = target as string;

        if (target === END) {
          // 如果目标是END，创建一个真正的结束节点
          targetNodeId = `${sourceNode}_end`;
          nodes.push({
            id: targetNodeId,
            type: NodeType.END,
            name: 'End',
            config: {},
            outgoingEdgeIds: [],
            incomingEdgeIds: [routerNodeId]
          });
        }

        routeConditions.push({
          condition: `variables.lastConditionResult === "${conditionValue}"`,
          targetNodeId: targetNodeId,
          priority: 1
        });
      }

      // 创建路由节点
      const routeNode: Node = {
        id: routerNodeId,
        type: NodeType.ROUTE,
        name: `${sourceNode} Router`,
        config: {
          routes: routeConditions
        },
        outgoingEdgeIds: routeConditions.map(r => r.targetNodeId),
        incomingEdgeIds: [sourceNode]  // 路由节点接收来自源节点的输入
      };

      nodes.push(routeNode);

      // 连接源节点到路由节点
      edges.push(createEdge(sourceNode, routerNodeId, EdgeType.DEFAULT, nodeIdCounter));
    }

    // 处理普通边
    for (const [source, targets] of this.edges) {
      for (const target of targets) {
        edges.push(createEdge(source, target, EdgeType.DEFAULT, nodeIdCounter));
      }
    }

    // 连接起始点
    if (this.entryPoint && this.entryPoint !== 'start') {
      edges.push(createEdge('start', this.entryPoint, EdgeType.DEFAULT, nodeIdCounter));
    }

    return {
      id: this.workflowId,
      name: this.workflowName,
      version: '1.0.0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      nodes,
      edges
    };
  }
}

/**
 * 便捷的节点创建函数
 */
export function createNode<StateType>(
  id: string,
  name: string,
  func: NodeFunction<StateType>,
  counter?: { count: number }
): Node {
  // 将函数转换为可执行的代码字符串
  // 由于VariableHandler不直接支持函数执行，我们使用CODE节点
  const funcStr = func.toString();

  return {
    id,
    type: NodeType.CODE,  // 使用CODE节点来执行复杂逻辑
    name,
    config: {
      scriptName: `
        // 获取当前状态
        const currentState = variables.currentState || {};
        // 执行节点函数
        const nodeFunc = ${funcStr};
        const updates = nodeFunc(currentState);
        
        // 将更新合并到当前状态
        variables.currentState = { ...currentState, ...updates };
        
        // 如果有nextAgent，也更新到变量中便于路由使用
        if (updates.nextAgent !== undefined) {
          variables.lastConditionResult = updates.nextAgent;
        }
        
        // 返回更新后的状态
        variables.currentState;
      `,
      scriptType: 'javascript',
      risk: 'none'
    },
    outgoingEdgeIds: [],
    incomingEdgeIds: []
  };
}

/**
 * 便捷的路由节点创建函数
 */
export function createRouteNode<StateType>(
  id: string,
  name: string,
  routes: Array<{
    condition: string;
    targetNodeId: string;
    priority?: number;
  }>,
  counter?: { count: number }
): Node {
  return {
    id,
    type: NodeType.ROUTE,
    name,
    config: { routes },
    outgoingEdgeIds: routes.map(r => r.targetNodeId),
    incomingEdgeIds: []
  };
}

/**
 * 便捷的边创建函数
 */
export function createEdge(
  sourceNodeId: string,
  targetNodeId: string,
  type: EdgeType = EdgeType.DEFAULT,
  counter?: { count: number },
  condition?: Condition
): Edge {
  const id = `edge_${counter ? counter.count++ : Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

  const edge: Edge = {
    id,
    sourceNodeId,
    targetNodeId,
    type,
    condition
  };

  // 更新节点的边引用
  // 注意：实际实现中，这些会在WorkflowDefinition中统一处理

  return edge;
}

/**
 * 为条件值创建条件表达式
 */
function createConditionForValue<StateType>(
  conditionValue: string,
  config: ConditionalEdgeConfig<StateType>
): string {
  // 这里需要更准确地生成条件表达式
  // 在实际使用中，我们会在路由节点中处理条件评估
  return `variables.lastConditionResult === "${conditionValue}"`;
}