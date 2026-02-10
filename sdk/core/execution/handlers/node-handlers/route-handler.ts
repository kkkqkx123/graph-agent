/**
 * Route节点处理函数
 * 负责执行ROUTE节点，根据条件选择下一个节点
 */

import { ExecutionError } from '../../../../types/errors';
import type { Node, RouteNodeConfig } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';
import type { Condition, EvaluationContext } from '../../../../types/condition';
import { conditionEvaluator } from '../../../../utils/evalutor/condition-evaluator';

/**
 * 检查节点是否可以执行
 */
function canExecute(thread: Thread, node: Node): boolean {
  if (thread.status !== 'RUNNING') {
    return false;
  }
  return true;
}

/**
 * 评估路由条件
 */
function evaluateRouteCondition(condition: Condition, thread: Thread): boolean {
  try {
    // 构建评估上下文
    const context: EvaluationContext = {
      variables: thread.variableScopes.thread || {},
      input: thread.input || {},
      output: thread.output || {}
    };

    return conditionEvaluator.evaluate(condition, context);
  } catch (error) {
    console.error(`Failed to evaluate route condition: ${condition.expression}`, error);
    return false;
  }
}

/**
 * Route节点处理函数
 * @param thread Thread实例
 * @param node 节点定义
 * @param context 处理器上下文（可选）
 * @returns 执行结果
 */
export async function routeHandler(thread: Thread, node: Node, context?: any): Promise<any> {
  // 检查是否可以执行
  if (!canExecute(thread, node)) {
    return {
      nodeId: node.id,
      nodeType: node.type,
      status: 'SKIPPED',
      step: thread.nodeResults.length + 1,
      executionTime: 0
    };
  }

  const config = node.config as RouteNodeConfig;

  // 按优先级排序路由规则
  const sortedRoutes = [...config.routes].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  // 评估路由条件
  for (const route of sortedRoutes) {
    if (evaluateRouteCondition(route.condition, thread)) {
      return {
        status: 'COMPLETED',
        selectedNode: route.targetNodeId
      };
    }
  }

  // 没有匹配的路由，使用默认目标
  if (config.defaultTargetNodeId) {
    return {
      status: 'COMPLETED',
      selectedNode: config.defaultTargetNodeId
    };
  }

  throw new ExecutionError('No route matched and no default target specified', node.id);
}