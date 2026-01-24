import { injectable, inject } from 'inversify';
import { EdgeValueObject } from '../../domain/workflow/value-objects/edge/edge-value-object';
import { ThreadWorkflowState } from '../../domain/threads/value-objects/thread-workflow-state';
import { FunctionRegistry } from '../workflow/functions/function-registry';
import { WorkflowExecutionContext } from '../workflow/functions/types';
import { TYPES } from '../../di/service-keys';

/**
 * 路由结果接口
 */
export interface RoutingResult {
  /** 目标节点ID */
  readonly targetNodeId: string;
  /** 使用的边ID */
  readonly edgeId: string;
  /** 条件评估结果 */
  readonly conditionResult?: boolean;
  /** 路由元数据 */
  readonly metadata?: Record<string, any>;
}

/**
 * 边评估详情接口
 */
export interface EdgeEvaluationDetails {
  /** 边ID */
  readonly edgeId: string;
  /** 边类型 */
  readonly edgeType: string;
  /** 条件表达式 */
  readonly condition?: string;
  /** 评估时间（毫秒） */
  readonly evaluationTime: number;
  /** 时间戳 */
  readonly timestamp: string;
  /** 错误信息（如果有） */
  readonly error?: string;
}

/**
 * 路由决策日志接口
 */
export interface RoutingDecisionLog {
  /** 工作流ID */
  readonly workflowId: string;
  /** 当前节点ID */
  readonly currentNodeId?: string;
  /** 评估的边数量 */
  readonly evaluatedEdgesCount: number;
  /** 匹配的边数量 */
  readonly matchedEdgesCount: number;
  /** 评估详情 */
  readonly evaluations: EdgeEvaluationDetails[];
  /** 选中的路由结果 */
  readonly selectedRoutes: RoutingResult[];
  /** 时间戳 */
  readonly timestamp: string;
}

/**
 * 路由选项接口
 */
export interface RoutingOptions {
  /** 是否使用默认边 */
  useDefaultEdge?: boolean;
  /** 是否记录路由历史 */
  recordHistory?: boolean;
  /** 自定义上下文 */
  customContext?: Record<string, any>;
  /** 是否记录详细评估日志 */
  verboseLogging?: boolean;
}

/**
 * 线程条件路由器
 *
 * 职责：
 * - 基于边的条件表达式进行路由决策
 * - 支持无条件边和条件边
 * - 支持默认边
 * - 支持路由历史记录
 *
 * 特性：
 * - 使用表达式评估器评估条件
 * - 支持复杂的条件表达式
 * - 支持边权重和优先级
 * - 支持路由结果缓存
 */
@injectable()
export class ThreadConditionalRouter {
  private readonly functionRegistry: FunctionRegistry;
  private routingHistory: Map<string, RoutingResult[]>;
  private decisionLogs: Map<string, RoutingDecisionLog[]>;

  constructor(@inject(TYPES.FunctionRegistry) functionRegistry: FunctionRegistry) {
    this.functionRegistry = functionRegistry;
    this.routingHistory = new Map();
    this.decisionLogs = new Map();
  }

  /**
   * 路由到下一个节点（单路路由）
   * @param edges 边列表
   * @param state 线程状态
   * @param options 路由选项
   * @returns 路由结果，如果没有可用的边则返回 null
   */
  async route(
    edges: EdgeValueObject[],
    state: ThreadWorkflowState,
    options: RoutingOptions = {}
  ): Promise<RoutingResult | null> {
    const context = this.buildContext(state, options.customContext);
    const evaluations: EdgeEvaluationDetails[] = [];

    // 评估每条边
    for (const edge of edges) {
      const evaluation = await this.evaluateEdgeWithLogging(edge, context);
      evaluations.push(evaluation.details);

      if (evaluation.matched) {
        const routingResult: RoutingResult = {
          targetNodeId: edge.toNodeId.value,
          edgeId: edge.id.value,
          conditionResult: evaluation.conditionResult,
          metadata: {
            edgeType: edge.type.value,
            edgeWeight: edge.weight,
            evaluatedAt: Date.now(),
            evaluationDetails: evaluation.details,
          },
        };

        // 记录路由历史
        if (options.recordHistory) {
          this.recordRouting(state.workflowId.value, routingResult);
        }

        // 记录决策日志
        if (options.verboseLogging) {
          this.recordDecisionLog(state.workflowId.value, state.currentNodeId?.value, evaluations, [
            routingResult,
          ]);
        }

        return routingResult;
      }
    }

    // 如果没有匹配的边，检查是否使用默认边
    if (options.useDefaultEdge) {
      const defaultEdge = edges.find(edge => edge.isDefault());
      if (defaultEdge) {
        const routingResult: RoutingResult = {
          targetNodeId: defaultEdge.toNodeId.value,
          edgeId: defaultEdge.id.value,
          conditionResult: true,
          metadata: {
            edgeType: defaultEdge.type.value,
            isDefault: true,
            evaluatedAt: Date.now(),
          },
        };

        if (options.recordHistory) {
          this.recordRouting(state.workflowId.value, routingResult);
        }

        if (options.verboseLogging) {
          this.recordDecisionLog(state.workflowId.value, state.currentNodeId?.value, evaluations, [
            routingResult,
          ]);
        }

        return routingResult;
      }
    }

    // 记录决策日志（即使没有匹配的边）
    if (options.verboseLogging) {
      this.recordDecisionLog(state.workflowId.value, state.currentNodeId?.value, evaluations, []);
    }

    return null;
  }

  /**
   * 批量路由（支持多路分支）
   * @param edges 边列表
   * @param state 线程状态
   * @param options 路由选项
   * @returns 路由结果数组
   */
  async routeMultiple(
    edges: EdgeValueObject[],
    state: ThreadWorkflowState,
    options: RoutingOptions = {}
  ): Promise<RoutingResult[]> {
    const context = this.buildContext(state, options.customContext);
    const results: RoutingResult[] = [];
    const evaluations: EdgeEvaluationDetails[] = [];

    for (const edge of edges) {
      const evaluation = await this.evaluateEdgeWithLogging(edge, context);
      evaluations.push(evaluation.details);

      if (evaluation.matched) {
        const routingResult: RoutingResult = {
          targetNodeId: edge.toNodeId.value,
          edgeId: edge.id.value,
          conditionResult: evaluation.conditionResult,
          metadata: {
            edgeType: edge.type.value,
            edgeWeight: edge.weight,
            evaluatedAt: Date.now(),
            evaluationDetails: evaluation.details,
          },
        };

        results.push(routingResult);
      }
    }

    // 记录路由历史
    if (options.recordHistory && results.length > 0) {
      for (const result of results) {
        this.recordRouting(state.workflowId.value, result);
      }
    }

    // 记录决策日志
    if (options.verboseLogging) {
      this.recordDecisionLog(
        state.workflowId.value,
        state.currentNodeId?.value,
        evaluations,
        results
      );
    }

    return results;
  }

  /**
   * 获取路由历史
   * @param workflowId 工作流ID
   * @returns 路由历史数组
   */
  getRoutingHistory(workflowId: string): RoutingResult[] {
    return this.routingHistory.get(workflowId) || [];
  }

  /**
   * 清除路由历史
   * @param workflowId 工作流ID（可选，如果不提供则清除所有历史）
   */
  clearRoutingHistory(workflowId?: string): void {
    if (workflowId) {
      this.routingHistory.delete(workflowId);
    } else {
      this.routingHistory.clear();
    }
  }

  /**
   * 评估边（私有方法）
   * @param edge 边
   * @param context 评估上下文
   * @returns 评估结果
   */
  private async evaluateEdge(
    edge: EdgeValueObject,
    context: Record<string, any>
  ): Promise<{ matched: boolean; conditionResult?: boolean }> {
    // 无条件边直接匹配
    if (!edge.condition) {
      return { matched: true };
    }

    // 获取条件函数引用
    const condition = edge.condition;
    if (!condition) {
      return { matched: true };
    }

    // 获取条件函数
    const conditionFunc = this.functionRegistry.getConditionFunction(condition.functionId);
    if (!conditionFunc) {
      console.error(`条件函数不存在: ${condition.functionId}`);
      return { matched: false };
    }

    // 执行条件函数
    try {
      // 将 Record<string, any> 转换为 WorkflowExecutionContext
      const workflowContext = this.convertToWorkflowExecutionContext(context);
      const result = await conditionFunc.execute(workflowContext, condition.config || {});
      return {
        matched: Boolean(result),
        conditionResult: Boolean(result),
      };
    } catch (error) {
      console.error(`条件函数执行失败: ${error instanceof Error ? error.message : String(error)}`);
      return { matched: false };
    }
  }

  /**
   * 构建评估上下文（私有方法）
   * @param state 线程状态
   * @param customContext 自定义上下文
   * @returns 评估上下文
   */
  private buildContext(
    state: ThreadWorkflowState,
    customContext?: Record<string, any>
  ): Record<string, any> {
    return {
      state: {
        ...state.data,
        currentNodeId: state.currentNodeId?.value,
        workflowId: state.workflowId.value,
      },
      ...customContext,
    };
  }

  /**
   * 将 Record<string, any> 转换为 WorkflowExecutionContext
   * @param context 评估上下文
   * @returns 工作流执行上下文
   */
  private convertToWorkflowExecutionContext(context: Record<string, any>): WorkflowExecutionContext {
    return {
      getVariable: (key: string) => {
        // 从 state 中获取变量
        const state = context['state'];
        if (state && key in state) {
          return state[key];
        }
        // 从顶层获取变量
        if (key in context) {
          return context[key];
        }
        return undefined;
      },
      setVariable: (key: string, value: any) => {
        // 简单实现：设置到 context 中
        context[key] = value;
      },
      getAllVariables: () => {
        // 返回所有变量
        const state = context['state'];
        return {
          ...state,
          ...context,
        };
      },
      getExecutionId: () => {
        const state = context['state'];
        return state?.executionId || '';
      },
      getWorkflowId: () => {
        const state = context['state'];
        return state?.workflowId || '';
      },
      getNodeResult: (nodeId: string) => {
        // 从 state 中获取节点结果
        const state = context['state'];
        if (state?.nodeResults && nodeId in state.nodeResults) {
          return state.nodeResults[nodeId];
        }
        return undefined;
      },
      setNodeResult: (nodeId: string, result: any) => {
        // 简单实现：设置到 state 中
        let state = context['state'];
        if (!state) {
          state = {};
          context['state'] = state;
        }
        if (!state.nodeResults) {
          state.nodeResults = {};
        }
        state.nodeResults[nodeId] = result;
      },
      getService: <T>(serviceName: string): T => {
        // 简单实现：从 context 中获取服务
        return context[serviceName] as T;
      },
      localVariables: new Map<string, any>(),
    };
  }

  /**
   * 记录路由历史（私有方法）
   * @param workflowId 工作流ID
   * @param result 路由结果
   */
  private recordRouting(workflowId: string, result: RoutingResult): void {
    if (!this.routingHistory.has(workflowId)) {
      this.routingHistory.set(workflowId, []);
    }

    const history = this.routingHistory.get(workflowId)!;
    history.push(result);

    // 限制历史记录数量
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * 带日志的边评估（私有方法）
   * @param edge 边
   * @param context 评估上下文
   * @returns 评估结果和详情
   */
  private async evaluateEdgeWithLogging(
    edge: EdgeValueObject,
    context: Record<string, any>
  ): Promise<{
    matched: boolean;
    conditionResult?: boolean;
    details: EdgeEvaluationDetails;
  }> {
    const startTime = Date.now();

    try {
      const result = await this.evaluateEdge(edge, context);

      return {
        ...result,
        details: {
          edgeId: edge.id.value,
          edgeType: edge.type.toString(),
          condition: edge.condition ? JSON.stringify(edge.condition) : undefined,
          evaluationTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        matched: false,
        details: {
          edgeId: edge.id.value,
          edgeType: edge.type.toString(),
          condition: edge.condition ? JSON.stringify(edge.condition) : undefined,
          evaluationTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * 记录决策日志（私有方法）
   * @param workflowId 工作流ID
   * @param currentNodeId 当前节点ID
   * @param evaluations 边评估详情
   * @param selectedRoutes 选中的路由
   */
  private recordDecisionLog(
    workflowId: string,
    currentNodeId: string | undefined,
    evaluations: EdgeEvaluationDetails[],
    selectedRoutes: RoutingResult[]
  ): void {
    if (!this.decisionLogs.has(workflowId)) {
      this.decisionLogs.set(workflowId, []);
    }

    const logs = this.decisionLogs.get(workflowId)!;
    const log: RoutingDecisionLog = {
      workflowId,
      currentNodeId,
      evaluatedEdgesCount: evaluations.length,
      matchedEdgesCount: selectedRoutes.length,
      evaluations,
      selectedRoutes,
      timestamp: new Date().toISOString(),
    };

    logs.push(log);

    // 限制日志数量
    if (logs.length > 100) {
      logs.shift();
    }
  }

  /**
   * 获取决策日志
   * @param workflowId 工作流ID
   * @returns 决策日志数组
   */
  getDecisionLogs(workflowId: string): RoutingDecisionLog[] {
    return this.decisionLogs.get(workflowId) || [];
  }

  /**
   * 清除决策日志
   * @param workflowId 工作流ID（可选，如果不提供则清除所有日志）
   */
  clearDecisionLogs(workflowId?: string): void {
    if (workflowId) {
      this.decisionLogs.delete(workflowId);
    } else {
      this.decisionLogs.clear();
    }
  }
}