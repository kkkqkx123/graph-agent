/**
 * Router - 条件路由器
 * 负责根据边的条件选择下一个节点
 */

import type { Edge, EdgeCondition } from '../../types/edge';
import { EdgeType } from '../../types/edge';
import type { Node } from '../../types/node';
import { NodeType } from '../../types/node';
import type { Thread } from '../../types/thread';
import type { Condition, EvaluationContext } from '../../types/condition';
import { ConditionEvaluator } from './condition-evaluator';

/**
 * Router - 条件路由器
 */
export class Router {
  constructor(private conditionEvaluator: ConditionEvaluator) {}

  /**
   * 选择下一个节点
   * @param currentNode 当前节点
   * @param edges 当前节点的所有出边
   * @param thread Thread 实例
   * @returns 下一个节点ID，如果没有可用的路由则返回null
   */
  selectNextNode(
    currentNode: Node,
    edges: Edge[],
    thread: Thread
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
    const satisfiedEdges = this.filterEdges(edges, thread);

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
   * @param thread Thread 实例
   * @returns 条件是否满足
   */
  evaluateEdgeCondition(edge: Edge, thread: Thread): boolean {
    // 默认边总是满足
    if (edge.type === EdgeType.DEFAULT) {
      return true;
    }

    // 条件边必须有条件
    if (!edge.condition) {
      return false;
    }

    return this.evaluateCondition(edge.condition, thread);
  }

  /**
   * 评估条件
   * @param condition 条件
   * @param thread Thread 实例
   * @returns 条件是否满足
   */
  private evaluateCondition(condition: EdgeCondition, thread: Thread): boolean {
    // 构建评估上下文
    const context: EvaluationContext = {
      variables: thread.variableValues,
      input: thread.input,
      output: thread.output
    };

    // 使用ConditionEvaluator评估条件（EdgeCondition 现在就是 Condition 类型）
    return this.conditionEvaluator.evaluate(condition, context);
  }

  /**
   * 过滤满足条件的边
   * @param edges 边数组
   * @param thread Thread 实例
   * @returns 满足条件的边数组
   */
  private filterEdges(edges: Edge[], thread: Thread): Edge[] {
    return edges.filter(edge => this.evaluateEdgeCondition(edge, thread));
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