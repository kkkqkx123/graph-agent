import { EdgeValueObject } from '../value-objects/edge/edge-value-object';
import { NodeId } from '../value-objects/node/node-id';
import { WorkflowState } from '../value-objects/workflow-state';
import { ExpressionEvaluator } from './expression-evaluator';

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
 * 路由选项接口
 */
export interface RoutingOptions {
  /** 是否使用默认边 */
  useDefaultEdge?: boolean;
  /** 是否记录路由历史 */
  recordHistory?: boolean;
  /** 自定义上下文 */
  customContext?: Record<string, any>;
}

/**
 * 条件路由器
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
export class ConditionalRouter {
  private evaluator: ExpressionEvaluator;
  private routingHistory: Map<string, RoutingResult[]>;

  constructor(evaluator: ExpressionEvaluator) {
    this.evaluator = evaluator;
    this.routingHistory = new Map();
  }

  /**
   * 路由到下一个节点
   * @param edges 边列表
   * @param state 工作流状态
   * @param options 路由选项
   * @returns 路由结果，如果没有可用的边则返回 null
   */
  async route(
    edges: EdgeValueObject[],
    state: WorkflowState,
    options: RoutingOptions = {}
  ): Promise<RoutingResult | null> {
    // 构建评估上下文
    const context = this.buildContext(state, options.customContext);

    // 评估每条边
    for (const edge of edges) {
      const result = await this.evaluateEdge(edge, context);
      
      if (result.matched) {
        const routingResult: RoutingResult = {
          targetNodeId: edge.toNodeId.value,
          edgeId: edge.id.value,
          conditionResult: result.conditionResult,
          metadata: {
            edgeType: edge.type.value,
            edgeWeight: edge.weight,
            evaluatedAt: Date.now()
          }
        };

        // 记录路由历史
        if (options.recordHistory) {
          this.recordRouting(state.workflowId.value, routingResult);
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
            evaluatedAt: Date.now()
          }
        };

        if (options.recordHistory) {
          this.recordRouting(state.workflowId.value, routingResult);
        }

        return routingResult;
      }
    }

    return null;
  }

  /**
   * 批量路由（支持多路分支）
   * @param edges 边列表
   * @param state 工作流状态
   * @param options 路由选项
   * @returns 路由结果数组
   */
  async routeMultiple(
    edges: EdgeValueObject[],
    state: WorkflowState,
    options: RoutingOptions = {}
  ): Promise<RoutingResult[]> {
    const context = this.buildContext(state, options.customContext);
    const results: RoutingResult[] = [];

    for (const edge of edges) {
      const result = await this.evaluateEdge(edge, context);
      
      if (result.matched) {
        const routingResult: RoutingResult = {
          targetNodeId: edge.toNodeId.value,
          edgeId: edge.id.value,
          conditionResult: result.conditionResult,
          metadata: {
            edgeType: edge.type.value,
            edgeWeight: edge.weight,
            evaluatedAt: Date.now()
          }
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
    if (!edge.requiresConditionEvaluation()) {
      return { matched: true };
    }

    // 获取条件表达式
    const condition = edge.getConditionExpression();
    if (!condition) {
      return { matched: true };
    }

    // 评估条件表达式
    const evaluationResult = await this.evaluator.evaluate(condition, context);

    if (evaluationResult.success) {
      return {
        matched: Boolean(evaluationResult.value),
        conditionResult: Boolean(evaluationResult.value)
      };
    }

    // 条件评估失败，记录错误但不抛出异常
    console.error(`条件评估失败: ${evaluationResult.error}`);
    return { matched: false };
  }

  /**
   * 构建评估上下文（私有方法）
   * @param state 工作流状态
   * @param customContext 自定义上下文
   * @returns 评估上下文
   */
  private buildContext(
    state: WorkflowState,
    customContext?: Record<string, any>
  ): Record<string, any> {
    return {
      state: {
        ...state.data,
        currentNodeId: state.currentNodeId?.value,
        workflowId: state.workflowId.value
      },
      ...customContext
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
}