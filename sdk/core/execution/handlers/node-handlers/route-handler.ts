/**
 * Route节点处理函数
 * 负责执行ROUTE节点，根据条件选择下一个节点
 */

import type { Node, RouteNodeConfig } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';

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
function evaluateRouteCondition(condition: string, thread: Thread): boolean {
  try {
    // 简单的条件评估，实际应该使用条件评估器
    const func = new Function('variables', `return ${condition}`);
    return func(thread.variableValues);
  } catch (error) {
    console.error(`Failed to evaluate route condition: ${condition}`, error);
    return false;
  }
}

/**
 * Route节点处理函数
 * @param thread Thread实例
 * @param node 节点定义
 * @returns 执行结果
 */
export async function routeHandler(thread: Thread, node: Node): Promise<any> {
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
        selectedRoute: route,
        targetNodeId: route.targetNodeId
      };
    }
  }

  // 没有匹配的路由，使用默认目标
  if (config.defaultTargetNodeId) {
    return {
      selectedRoute: null,
      targetNodeId: config.defaultTargetNodeId,
      message: 'No route matched, using default target'
    };
  }

  throw new Error('No route matched and no default target specified');
}