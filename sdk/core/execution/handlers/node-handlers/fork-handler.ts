/**
 * Fork节点处理函数
 * Fork节点作为占位符，实际的Fork操作由ThreadExecutor调用ThreadCoordinator处理
 */

import type { Node } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';
import { NodeType } from '../../../../types/node';
import { ValidationError } from '../../../../types/errors';

/**
 * Fork节点配置
 */
interface ForkNodeConfig {
  /** Fork ID */
  forkId: string;
  /** Fork策略 */
  forkStrategy: 'SERIAL' | 'PARALLEL';
  /** 子节点ID列表 */
  childNodeIds?: string[];
}

/**
 * 验证Fork节点配置
 */
function validate(node: Node): void {
  if (node.type !== NodeType.FORK) {
    throw new ValidationError(`Invalid node type for fork handler: ${node.type}`, `node.${node.id}`);
  }

  const config = node.config as ForkNodeConfig;

  if (!config.forkId || typeof config.forkId !== 'string') {
    throw new ValidationError('Fork node must have a valid forkId', `node.${node.id}`);
  }

  if (!config.forkStrategy || !['SERIAL', 'PARALLEL'].includes(config.forkStrategy)) {
    throw new ValidationError('Fork node must have a valid forkStrategy (SERIAL or PARALLEL)', `node.${node.id}`);
  }
}

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
 * Fork节点处理函数
 * Fork节点作为占位符，实际的Fork操作由ThreadExecutor调用ThreadCoordinator处理
 * @param thread Thread实例
 * @param node 节点定义
 * @returns 执行结果
 */
export async function forkHandler(thread: Thread, node: Node): Promise<any> {
  // 验证节点配置
  validate(node);

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

  const config = node.config as ForkNodeConfig;

  // Fork节点作为占位符，仅返回配置信息
  return {
    forkId: config.forkId,
    forkStrategy: config.forkStrategy,
    childNodeIds: config.childNodeIds || [],
    message: 'Fork node is a placeholder. Actual fork operation is handled by ThreadExecutor and ThreadCoordinator.'
  };
}