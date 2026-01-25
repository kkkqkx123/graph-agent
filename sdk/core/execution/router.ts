/**
 * Router - 条件路由器
 * 负责根据边的条件选择下一个节点
 */

import type { Edge, EdgeCondition } from '../../types/edge';
import { EdgeType, ConditionType } from '../../types/edge';
import type { Node } from '../../types/node';
import { NodeType } from '../../types/node';
import type { ExecutionContext } from '../../types/execution';

/**
 * Router - 条件路由器
 */
export class Router {
  /**
   * 选择下一个节点
   * @param currentNode 当前节点
   * @param edges 当前节点的所有出边
   * @param context 执行上下文
   * @returns 下一个节点ID，如果没有可用的路由则返回null
   */
  selectNextNode(
    currentNode: Node,
    edges: Edge[],
    context: ExecutionContext
  ): string | null {
    // 检查当前节点类型
    if (currentNode.type === NodeType.ROUTE) {
      // ROUTE节点使用自己的路由逻辑，跳过边评估
      return null;
    }

    // 如果没有出边，返回null
    if (edges.length === 0) {
      return null;
    }

    // 过滤满足条件的边
    const satisfiedEdges = this.filterEdges(edges, context);

    // 如果没有满足条件的边，选择默认边
    if (satisfiedEdges.length === 0) {
      const defaultEdge = edges.find(e => e.type === EdgeType.DEFAULT);
      return defaultEdge ? defaultEdge.targetNodeId : null;
    }

    // 按权重排序边
    const sortedEdges = this.sortEdges(satisfiedEdges);

    // 选择第一个边
    const nextEdge = sortedEdges[0];
    return nextEdge ? nextEdge.targetNodeId : null;
  }

  /**
   * 评估边的条件
   * @param edge 边
   * @param context 执行上下文
   * @returns 条件是否满足
   */
  evaluateEdgeCondition(edge: Edge, context: ExecutionContext): boolean {
    // 默认边总是满足
    if (edge.type === EdgeType.DEFAULT) {
      return true;
    }

    // 条件边必须有条件
    if (!edge.condition) {
      return false;
    }

    return this.evaluateCondition(edge.condition, context);
  }

  /**
   * 评估条件
   * @param condition 条件
   * @param context 执行上下文
   * @returns 条件是否满足
   */
  private evaluateCondition(condition: EdgeCondition, context: ExecutionContext): boolean {
    // 获取变量值
    const variableValue = this.getVariableValue(condition.variablePath, context);

    // 根据条件类型评估
    switch (condition.type) {
      case ConditionType.EQUALS:
        return variableValue === condition.value;

      case ConditionType.NOT_EQUALS:
        return variableValue !== condition.value;

      case ConditionType.GREATER_THAN:
        return variableValue > condition.value;

      case ConditionType.LESS_THAN:
        return variableValue < condition.value;

      case ConditionType.GREATER_EQUAL:
        return variableValue >= condition.value;

      case ConditionType.LESS_EQUAL:
        return variableValue <= condition.value;

      case ConditionType.CONTAINS:
        return String(variableValue).includes(String(condition.value));

      case ConditionType.NOT_CONTAINS:
        return !String(variableValue).includes(String(condition.value));

      case ConditionType.IN:
        return Array.isArray(condition.value) && condition.value.includes(variableValue);

      case ConditionType.NOT_IN:
        return Array.isArray(condition.value) && !condition.value.includes(variableValue);

      case ConditionType.IS_NULL:
        return variableValue === null || variableValue === undefined;

      case ConditionType.IS_NOT_NULL:
        return variableValue !== null && variableValue !== undefined;

      case ConditionType.IS_TRUE:
        return variableValue === true;

      case ConditionType.IS_FALSE:
        return variableValue === false;

      case ConditionType.CUSTOM:
        if (!condition.customExpression) {
          return false;
        }
        return this.evaluateCustomExpression(condition.customExpression, context);

      default:
        return false;
    }
  }

  /**
   * 获取变量值
   * @param path 变量路径，支持嵌套访问
   * @param context 执行上下文
   * @returns 变量值
   */
  private getVariableValue(path: string, context: ExecutionContext): any {
    // 支持嵌套路径访问，如 "output.data.items[0].name"
    const parts = path.split('.');
    let value: any = context;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[part];
    }

    return value;
  }

  /**
   * 评估自定义表达式
   * @param expression 自定义表达式
   * @param context 执行上下文
   * @returns 表达式评估结果
   */
  private evaluateCustomExpression(expression: string, context: ExecutionContext): boolean {
    // TODO: 实现安全的表达式评估器
    // 支持变量引用，如 {{output.score}} > 0.8
    // 返回布尔值

    // 临时实现：简单的变量替换和评估
    let evaluatedExpression = expression;

    // 替换变量引用 {{variableName}}
    const variablePattern = /\{\{(\w+)\}\}/g;
    evaluatedExpression = evaluatedExpression.replace(variablePattern, (match, varName) => {
      const value = (context as any)[varName];
      return JSON.stringify(value);
    });

    // 使用 Function 构造函数评估表达式（注意：生产环境需要更安全的实现）
    try {
      const result = new Function(`return ${evaluatedExpression}`)();
      return Boolean(result);
    } catch (error) {
      console.error(`Failed to evaluate custom expression: ${expression}`, error);
      return false;
    }
  }

  /**
   * 过滤满足条件的边
   * @param edges 边数组
   * @param context 执行上下文
   * @returns 满足条件的边数组
   */
  private filterEdges(edges: Edge[], context: ExecutionContext): Edge[] {
    return edges.filter(edge => this.evaluateEdgeCondition(edge, context));
  }

  /**
   * 排序边
   * @param edges 边数组
   * @returns 排序后的边数组
   */
  private sortEdges(edges: Edge[]): Edge[] {
    return [...edges].sort((a, b) => {
      // 按权重降序排序（weight越大越优先）
      const weightA = a.weight || 0;
      const weightB = b.weight || 0;

      if (weightA !== weightB) {
        return weightB - weightA;
      }

      // 如果权重相同，按id升序排序（保证确定性）
      return a.id.localeCompare(b.id);
    });
  }
}