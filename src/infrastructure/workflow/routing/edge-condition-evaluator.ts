import { ID } from '@domain/common/value-objects/id';
import { EdgeId } from '@domain/workflow/value-objects/edge-id';
import { NodeId } from '@domain/workflow/value-objects/node-id';
import { EdgeValueObject } from '@domain/workflow/value-objects/edge-value-object';
import { ExecutionState } from '@domain/workflow/entities/execution-state';
import { NodeExecutionState } from '@domain/workflow/entities/node-execution-state';
import { ExpressionEvaluator } from '../functions/common/expression-evaluator';

/**
 * 边条件评估结果接口
 */
export interface EdgeEvaluationResult {
  /** 边ID */
  edgeId: EdgeId;
  /** 是否满足条件 */
  satisfied: boolean;
  /** 评估错误 */
  error?: string;
  /** 评估元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 路由函数接口
 */
export interface RoutingFunction {
  /** 函数名称 */
  name: string;
  /** 函数描述 */
  description: string;
  /** 执行函数 */
  execute: (context: RoutingContext) => boolean | Promise<boolean>;
}

/**
 * 路由上下文接口
 */
export interface RoutingContext {
  /** 执行状态 */
  executionState: ExecutionState;
  /** 当前节点ID */
  currentNodeId: NodeId;
  /** 当前节点状态 */
  currentNodeState: NodeExecutionState;
  /** 边数据 */
  edge: EdgeValueObject;
  /** 所有节点状态 */
  nodeStates: Map<string, NodeExecutionState>;
  /** 执行变量 */
  variables: Map<string, unknown>;
}

/**
 * 边条件评估器
 *
 * 负责评估边的条件，决定是否可以沿着该边继续执行
 */
export class EdgeConditionEvaluator {
  private readonly expressionEvaluator: ExpressionEvaluator;
  private readonly routingFunctions: Map<string, RoutingFunction>;

  /**
   * 构造函数
   */
  constructor() {
    this.expressionEvaluator = new ExpressionEvaluator();
    this.routingFunctions = new Map();
    this.registerBuiltinRoutingFunctions();
  }

  /**
   * 注册内置路由函数
   */
  private registerBuiltinRoutingFunctions(): void {
    // 注册节点成功路由函数
    this.registerRoutingFunction({
      name: 'nodeSuccess',
      description: '检查节点是否执行成功',
      execute: (context) => {
        const nodeId = context.edge.fromNodeId.toString();
        const nodeState = context.nodeStates.get(nodeId);
        return nodeState?.status.isSuccess() ?? false;
      }
    });

    // 注册节点失败路由函数
    this.registerRoutingFunction({
      name: 'nodeFailed',
      description: '检查节点是否执行失败',
      execute: (context) => {
        const nodeId = context.edge.fromNodeId.toString();
        const nodeState = context.nodeStates.get(nodeId);
        return nodeState?.status.isFailed() ?? false;
      }
    });

    // 注册变量存在路由函数
    this.registerRoutingFunction({
      name: 'variableExists',
      description: '检查变量是否存在',
      execute: (context) => {
        const variableName = context.edge.properties['variableName'] as string;
        return variableName ? context.variables.has(variableName) : false;
      }
    });

    // 注册变量值路由函数
    this.registerRoutingFunction({
      name: 'variableEquals',
      description: '检查变量值是否等于指定值',
      execute: (context) => {
        const variableName = context.edge.properties['variableName'] as string;
        const expectedValue = context.edge.properties['expectedValue'];
        if (!variableName) return false;
        const actualValue = context.variables.get(variableName);
        return actualValue === expectedValue;
      }
    });

    // 注册重试次数路由函数
    this.registerRoutingFunction({
      name: 'retryCount',
      description: '检查重试次数是否达到指定值',
      execute: (context) => {
        const maxRetries = (context.edge.properties['maxRetries'] as number) ?? 3;
        return context.currentNodeState.retryCount >= maxRetries;
      }
    });

    // 注册执行时长路由函数
    this.registerRoutingFunction({
      name: 'executionTimeout',
      description: '检查执行时长是否超过指定时间',
      execute: (context) => {
        const timeoutMs = (context.edge.properties['timeoutMs'] as number) ?? 30000;
        const duration = context.currentNodeState.duration ?? 0;
        return duration >= timeoutMs;
      }
    });

    // 注册进度路由函数
    this.registerRoutingFunction({
      name: 'progressReached',
      description: '检查工作流进度是否达到指定值',
      execute: (context) => {
        const targetProgress = (context.edge.properties['targetProgress'] as number) ?? 100;
        return context.executionState.workflowState.progress >= targetProgress;
      }
    });

    // 注册所有节点完成路由函数
    this.registerRoutingFunction({
      name: 'allNodesCompleted',
      description: '检查所有节点是否已完成',
      execute: (context) => {
        const totalNodes = context.executionState.workflowState.totalNodes;
        const completedNodes = context.executionState.workflowState.completedNodes;
        return completedNodes >= totalNodes;
      }
    });
  }

  /**
   * 注册路由函数
   * @param routingFunction 路由函数
   */
  public registerRoutingFunction(routingFunction: RoutingFunction): void {
    this.routingFunctions.set(routingFunction.name, routingFunction);
  }

  /**
   * 获取路由函数
   * @param name 函数名称
   * @returns 路由函数
   */
  public getRoutingFunction(name: string): RoutingFunction | undefined {
    return this.routingFunctions.get(name);
  }

  /**
   * 获取所有路由函数
   * @returns 路由函数映射
   */
  public getAllRoutingFunctions(): Map<string, RoutingFunction> {
    return new Map(this.routingFunctions);
  }

  /**
   * 评估边条件
   * @param edgeId 边ID
   * @param edge 边数据
   * @param executionState 执行状态
   * @returns 评估结果
   */
  public async evaluate(
    edgeId: EdgeId,
    edge: EdgeValueObject,
    executionState: ExecutionState
  ): Promise<EdgeEvaluationResult> {
    try {
      // 如果没有条件，默认满足
      if (!edge.condition) {
        return {
          edgeId,
          satisfied: true,
          metadata: { reason: 'no_condition' }
        };
      }

      // 获取当前节点状态
      const currentNodeId = edge.fromNodeId;
      const currentNodeState = executionState.getNodeState(currentNodeId);

      if (!currentNodeState) {
        return {
          edgeId,
          satisfied: false,
          error: `节点状态不存在: ${currentNodeId.toString()}`
        };
      }

      // 构建路由上下文
      const routingContext: RoutingContext = {
        executionState,
        currentNodeId,
        currentNodeState,
        edge,
        nodeStates: executionState.nodeStates,
        variables: executionState.variables
      };

      // 检查是否使用路由函数
      const functionName = edge.properties['routingFunction'] as string;
      if (functionName) {
        return await this.evaluateWithRoutingFunction(
          edgeId,
          functionName,
          routingContext
        );
      }

      // 使用表达式评估
      return await this.evaluateWithExpression(edgeId, edge.condition, routingContext);

    } catch (error) {
      return {
        edgeId,
        satisfied: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 使用路由函数评估
   * @param edgeId 边ID
   * @param functionName 函数名称
   * @param context 路由上下文
   * @returns 评估结果
   */
  private async evaluateWithRoutingFunction(
    edgeId: EdgeId,
    functionName: string,
    context: RoutingContext
  ): Promise<EdgeEvaluationResult> {
    const routingFunction = this.routingFunctions.get(functionName);

    if (!routingFunction) {
      return {
        edgeId,
        satisfied: false,
        error: `路由函数不存在: ${functionName}`
      };
    }

    try {
      const result = await routingFunction.execute(context);
      return {
        edgeId,
        satisfied: result,
        metadata: {
          routingFunction: functionName,
          result
        }
      };
    } catch (error) {
      return {
        edgeId,
        satisfied: false,
        error: `路由函数执行失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * 使用表达式评估
   * @param edgeId 边ID
   * @param condition 条件表达式
   * @param context 路由上下文
   * @returns 评估结果
   */
  private async evaluateWithExpression(
    edgeId: EdgeId,
    condition: string,
    context: RoutingContext
  ): Promise<EdgeEvaluationResult> {
    try {
      // 构建表达式评估上下文
      const evalContext = this.buildEvalContext(context);

      // 评估表达式
      const result = await ExpressionEvaluator.evaluate(condition, evalContext);

      return {
        edgeId,
        satisfied: Boolean(result),
        metadata: {
          expression: condition,
          result
        }
      };
    } catch (error) {
      return {
        edgeId,
        satisfied: false,
        error: `表达式评估失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * 构建表达式评估上下文
   * @param routingContext 路由上下文
   * @returns 表达式评估上下文
   */
  private buildEvalContext(routingContext: RoutingContext): any {
    return {
      // 执行状态
      executionId: routingContext.executionState.executionId.toString(),
      workflowId: routingContext.executionState.workflowId.toString(),
      threadId: routingContext.executionState.threadId.toString(),
      status: routingContext.executionState.status.toString(),
      startTime: routingContext.executionState.startTime?.toISOString(),
      endTime: routingContext.executionState.endTime?.toISOString(),
      duration: routingContext.executionState.duration,

      // 工作流状态
      workflowStatus: routingContext.executionState.workflowState.status.toString(),
      progress: routingContext.executionState.workflowState.progress,
      workflowCurrentNodeId: routingContext.executionState.workflowState.currentNodeId?.toString(),
      completedNodes: routingContext.executionState.workflowState.completedNodes,
      totalNodes: routingContext.executionState.workflowState.totalNodes,
      failedNodes: routingContext.executionState.workflowState.failedNodes,
      skippedNodes: routingContext.executionState.workflowState.skippedNodes,

      // 当前节点状态
      currentNodeId: routingContext.currentNodeId.toString(),
      currentNodeStatus: routingContext.currentNodeState.status.toString(),
      currentNodeResult: routingContext.currentNodeState.result,
      currentNodeError: routingContext.currentNodeState.error?.message,
      currentNodeRetryCount: routingContext.currentNodeState.retryCount,
      currentNodeDuration: routingContext.currentNodeState.duration,

      // 边属性
      edgeId: routingContext.edge.id.toString(),
      edgeType: routingContext.edge.type.toString(),
      edgeWeight: routingContext.edge.weight,

      // 变量
      variables: Object.fromEntries(routingContext.variables),

      // 节点状态
      nodeStates: Object.fromEntries(
        Array.from(routingContext.nodeStates.entries()).map(([nodeId, state]) => [
          nodeId,
          {
            status: state.status.toString(),
            result: state.result,
            error: state.error?.message,
            retryCount: state.retryCount,
            duration: state.duration
          }
        ])
      )
    };
  }

  /**
   * 批量评估边条件
   * @param edges 边数组
   * @param executionState 执行状态
   * @returns 评估结果数组
   */
  public async evaluateBatch(
    edges: EdgeValueObject[],
    executionState: ExecutionState
  ): Promise<EdgeEvaluationResult[]> {
    const results: EdgeEvaluationResult[] = [];

    for (const edge of edges) {
      const result = await this.evaluate(edge.id, edge, executionState);
      results.push(result);
    }

    return results;
  }

  /**
   * 获取满足条件的边
   * @param edges 边数组
   * @param executionState 执行状态
   * @returns 满足条件的边数组
   */
  public async getSatisfiedEdges(
    edges: EdgeValueObject[],
    executionState: ExecutionState
  ): Promise<EdgeValueObject[]> {
    const results = await this.evaluateBatch(edges, executionState);
    return edges.filter((edge, index) => results[index]?.satisfied ?? false);
  }

  /**
   * 验证边条件
   * @param edge 边数据
   * @returns 验证结果
   */
  public async validate(edge: EdgeValueObject): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // 如果没有条件，则有效
    if (!edge.condition) {
      return { valid: true, errors };
    }

    // 检查是否使用路由函数
    const functionName = edge.properties['routingFunction'] as string;
    if (functionName) {
      if (!this.routingFunctions.has(functionName)) {
        errors.push(`路由函数不存在: ${functionName}`);
      }
    } else {
      // 验证表达式
      const validation = await ExpressionEvaluator.validate(edge.condition);
      if (!validation.valid) {
        errors.push(...validation.errors);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}