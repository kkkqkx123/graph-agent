import { injectable, inject } from 'inversify';
import { EdgeId } from '../../../domain/workflow/value-objects/edge-id';
import { EdgeValueObject } from '../../../domain/workflow/value-objects/edge-value-object';
import { ExecutionState } from '../../../domain/workflow/entities/execution-state';
import { ValueObjectExecutor, FunctionExecutionContext } from '../functions/executors/value-object-executor';
import { FunctionRegistry } from '../functions/registry/function-registry';
import { ILogger } from '../../../domain/common/types/logger-types';

/**
 * 边评估结果接口
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
 * 边评估器
 * 使用统一的 ValueObjectExecutor 执行边值对象
 */
@injectable()
export class EdgeEvaluator {
  constructor(
    @inject('ValueObjectExecutor') private readonly valueObjectExecutor: ValueObjectExecutor,
    @inject('FunctionRegistry') private readonly functionRegistry: FunctionRegistry,
    @inject('Logger') private readonly logger: ILogger
  ) {}

  /**
   * 评估边条件
   * @param edgeId 边ID
   * @param edge 边数据
   * @param executionState 执行状态
   * @returns 评估结果
   */
  async evaluate(
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

      // 构建执行上下文
      const context = this.buildExecutionContext(edge, executionState);

      // 检查是否使用路由函数
      const functionName = edge.properties['routingFunction'] as string;
      if (functionName) {
        return await this.evaluateWithRoutingFunction(
          edgeId,
          functionName,
          edge,
          context
        );
      }

      // 使用表达式评估
      return await this.evaluateWithExpression(edgeId, edge.condition, context);

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
   * @param edge 边数据
   * @param context 执行上下文
   * @returns 评估结果
   */
  private async evaluateWithRoutingFunction(
    edgeId: EdgeId,
    functionName: string,
    edge: EdgeValueObject,
    context: FunctionExecutionContext
  ): Promise<EdgeEvaluationResult> {
    const func = this.functionRegistry.getFunctionByName(functionName);

    if (!func) {
      return {
        edgeId,
        satisfied: false,
        error: `路由函数不存在: ${functionName}`
      };
    }

    try {
      const result = await func.execute(context, {
        edge,
        executionState: context.variables.get('executionState'),
        currentNodeState: context.variables.get('currentNodeState'),
        nodeStates: context.variables.get('nodeStates'),
        variables: context.variables
      });

      return {
        edgeId,
        satisfied: Boolean(result),
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
   * @param context 执行上下文
   * @returns 评估结果
   */
  private async evaluateWithExpression(
    edgeId: EdgeId,
    condition: string,
    context: FunctionExecutionContext
  ): Promise<EdgeEvaluationResult> {
    try {
      // 简化的表达式评估
      // 实际实现应该使用表达式评估器
      const evalContext = this.buildEvalContext(context);
      const result = this.evaluateExpression(condition, evalContext);

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
   * 批量评估边条件
   * @param edges 边数组
   * @param executionState 执行状态
   * @returns 评估结果数组
   */
  async evaluateBatch(
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
  async getSatisfiedEdges(
    edges: EdgeValueObject[],
    executionState: ExecutionState
  ): Promise<EdgeValueObject[]> {
    const results = await this.evaluateBatch(edges, executionState);
    return edges.filter((edge, index) => results[index]?.satisfied ?? false);
  }

  /**
   * 构建执行上下文
   * @param edge 边数据
   * @param executionState 执行状态
   * @returns 执行上下文
   */
  private buildExecutionContext(
    edge: EdgeValueObject,
    executionState: ExecutionState
  ): FunctionExecutionContext {
    const currentNodeId = edge.fromNodeId;
    const currentNodeState = executionState.getNodeState(currentNodeId);

    return {
      workflowId: executionState.workflowId.toString(),
      executionId: executionState.executionId.toString(),
      variables: new Map([
        ['executionState', executionState],
        ['currentNodeId', currentNodeId],
        ['currentNodeState', currentNodeState],
        ['edge', edge],
        ['nodeStates', executionState.nodeStates],
        ['variables', executionState.variables]
      ]),
      getVariable: (key: string) => executionState.variables.get(key),
      setVariable: (key: string, value: any) => executionState.variables.set(key, value),
      getNodeResult: (nodeId: string) => {
        const state = executionState.getNodeState(nodeId);
        return state?.result;
      },
      setNodeResult: (nodeId: string, result: any) => {
        // 实现设置节点结果的逻辑
      }
    };
  }

  /**
   * 构建表达式评估上下文
   * @param context 执行上下文
   * @returns 表达式评估上下文
   */
  private buildEvalContext(context: FunctionExecutionContext): any {
    const executionState = context.variables.get('executionState');
    const currentNodeState = context.variables.get('currentNodeState');
    const edge = context.variables.get('edge');
    const nodeStates = context.variables.get('nodeStates');
    const variables = context.variables.get('variables');

    return {
      // 执行状态
      executionId: executionState?.executionId?.toString(),
      workflowId: executionState?.workflowId?.toString(),
      status: executionState?.status?.toString(),
      startTime: executionState?.startTime?.toISOString(),
      endTime: executionState?.endTime?.toISOString(),
      duration: executionState?.duration,

      // 工作流状态
      workflowStatus: executionState?.workflowState?.status?.toString(),
      progress: executionState?.workflowState?.progress,
      completedNodes: executionState?.workflowState?.completedNodes,
      totalNodes: executionState?.workflowState?.totalNodes,

      // 当前节点状态
      currentNodeId: context.variables.get('currentNodeId')?.toString(),
      currentNodeStatus: currentNodeState?.status?.toString(),
      currentNodeResult: currentNodeState?.result,
      currentNodeError: currentNodeState?.error?.message,
      currentNodeRetryCount: currentNodeState?.retryCount,
      currentNodeDuration: currentNodeState?.duration,

      // 边属性
      edgeId: edge?.id?.toString(),
      edgeType: edge?.type?.toString(),
      edgeWeight: edge?.weight,

      // 变量
      variables: variables ? Object.fromEntries(variables) : {},

      // 节点状态
      nodeStates: nodeStates ? Object.fromEntries(
        Array.from(nodeStates.entries()).map(([nodeId, state]: [any, any]) => [
          nodeId,
          {
            status: state.status?.toString(),
            result: state.result,
            error: state.error?.message,
            retryCount: state.retryCount,
            duration: state.duration
          }
        ]) as Array<[PropertyKey, any]>
      ) : {}
    };
  }

  /**
   * 评估表达式
   * @param expression 表达式
   * @param context 上下文
   * @returns 评估结果
   */
  private evaluateExpression(expression: string, context: any): any {
    // 简化的表达式评估
    // 实际实现应该使用表达式评估器
    try {
      const func = new Function('context', `with(context) { return ${expression} }`);
      return func(context);
    } catch (error) {
      throw new Error(`表达式评估错误: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}