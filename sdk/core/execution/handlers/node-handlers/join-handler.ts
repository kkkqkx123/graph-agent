/**
 * Join节点处理函数
 * Join节点作为占位符，实际的Join操作由ThreadExecutor调用ThreadCoordinator处理
 */

import type { Node } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';
import { NodeType } from '../../../../types/node';
import { ValidationError } from '../../../../types/errors';

/**
 * Join策略
 */
type JoinStrategy = 'ALL_COMPLETED' | 'ANY_COMPLETED' | 'ALL_FAILED' | 'ANY_FAILED' | 'SUCCESS_COUNT_THRESHOLD';

/**
 * Join节点配置
 */
interface JoinNodeConfig {
  /** Join ID */
  joinId: string;
  /** Join策略 */
  joinStrategy: JoinStrategy;
  /** 成功阈值（用于SUCCESS_COUNT_THRESHOLD策略） */
  threshold?: number;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 子Thread ID列表 */
  childThreadIds?: string[];
}

/**
 * 验证Join节点配置
 */
function validate(node: Node): void {
  if (node.type !== NodeType.JOIN) {
    throw new ValidationError(`Invalid node type for join handler: ${node.type}`, `node.${node.id}`);
  }

  const config = node.config as JoinNodeConfig;

  if (!config.joinId || typeof config.joinId !== 'string') {
    throw new ValidationError('Join node must have a valid joinId', `node.${node.id}`);
  }

  const validStrategies = ['ALL_COMPLETED', 'ANY_COMPLETED', 'ALL_FAILED', 'ANY_FAILED', 'SUCCESS_COUNT_THRESHOLD'];
  if (!config.joinStrategy || !validStrategies.includes(config.joinStrategy)) {
    throw new ValidationError(`Join node must have a valid joinStrategy (${validStrategies.join(', ')})`, `node.${node.id}`);
  }

  if (config.joinStrategy === 'SUCCESS_COUNT_THRESHOLD' && (config.threshold === undefined || config.threshold <= 0)) {
    throw new ValidationError('Join node must have a valid threshold when using SUCCESS_COUNT_THRESHOLD strategy', `node.${node.id}`);
  }

  if (config.timeout !== undefined && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
    throw new ValidationError('Join node timeout must be a positive number', `node.${node.id}`);
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
 * Join节点处理函数
 * Join节点作为占位符，实际的Join操作由ThreadExecutor调用ThreadCoordinator处理
 * @param thread Thread实例
 * @param node 节点定义
 * @returns 执行结果
 */
export async function joinHandler(thread: Thread, node: Node): Promise<any> {
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

  const config = node.config as JoinNodeConfig;

  // Join节点作为占位符，仅返回配置信息
  return {
    joinId: config.joinId,
    joinStrategy: config.joinStrategy,
    threshold: config.threshold,
    timeout: config.timeout,
    childThreadIds: config.childThreadIds || [],
    message: 'Join node is a placeholder. Actual join operation is handled by ThreadExecutor and ThreadCoordinator.'
  };
}