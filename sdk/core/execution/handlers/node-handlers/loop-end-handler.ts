/**
 * LoopEnd节点处理函数
 * 负责执行LOOP_END节点，更新循环变量，检查中断条件
 */

import type { Node, LoopEndNodeConfig } from '@modular-agent/types/node';
import type { Thread } from '@modular-agent/types/thread';
import type { Condition, EvaluationContext } from '@modular-agent/types/condition';
import { ExecutionError, NotFoundError } from '@modular-agent/types/errors';
import { conditionEvaluator } from '@modular-agent/common-utils/evalutor/condition-evaluator';
import { now } from '../../../../utils';

/**
 * 循环状态
 */
interface LoopState {
  loopId: string;
  iterable: any | null;  // 可以为 null（计数循环时）
  currentIndex: number;
  maxIterations: number;
  iterationCount: number;
  variableName: string | null;  // 可以为 null（计数循环时）
}

/**
 * 检查节点是否可以执行
 */
function canExecute(thread: Thread, node: Node): boolean {
  if (thread.status !== 'RUNNING') {
    return false;
  }

  const config = node.config as LoopEndNodeConfig;
  const loopState = getLoopState(thread, config.loopId);

  // 检查循环状态是否存在
  if (!loopState) {
    return false;
  }

  return true;
}

/**
 * 获取循环状态
 */
function getLoopState(thread: Thread, loopId: string): LoopState | undefined {
  const currentLoopScope = thread.variableScopes.loop[thread.variableScopes.loop.length - 1];
  if (currentLoopScope) {
    return currentLoopScope[`__loop_state`];
  }
  return undefined;
}

/**
 * 清除循环状态及作用域
 */
function clearLoopState(thread: Thread, loopId: string): void {
  // 清除循环状态对象
  const currentLoopScope = thread.variableScopes.loop[thread.variableScopes.loop.length - 1];
  if (currentLoopScope) {
    delete currentLoopScope[`__loop_state`];
  }

  // 退出循环作用域
  if (thread.variableScopes && thread.variableScopes.loop.length > 0) {
    thread.variableScopes.loop.pop();
  }
}

/**
 * 评估中断条件
 */
function evaluateBreakCondition(breakCondition: Condition, thread: Thread): boolean {
  try {
    // 构建评估上下文
    const context: EvaluationContext = {
      variables: thread.variableScopes.thread || {},
      input: thread.input || {},
      output: thread.output || {}
    };

    // 使用ConditionEvaluator评估条件
    return conditionEvaluator.evaluate(breakCondition, context);
  } catch (error) {
    throw new ExecutionError(
      `Failed to evaluate break condition: ${error instanceof Error ? error.message : String(error)}`,
      thread.currentNodeId,
      thread.workflowId,
      {
        breakCondition,
        variables: thread.variableScopes.thread,
        input: thread.input,
        output: thread.output
      },
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * 检查循环条件
 */
function checkLoopCondition(loopState: LoopState): boolean {
  // 检查maxIterations是否有效（必须为正数）
  if (loopState.maxIterations <= 0) {
    return false;
  }

  // 检查迭代次数
  if (loopState.iterationCount >= loopState.maxIterations) {
    return false;
  }

  // 如果提供了 iterable，还需要检查当前索引是否超出范围
  if (loopState.iterable !== null && loopState.iterable !== undefined) {
    const iterableLength = getIterableLength(loopState.iterable);
    if (loopState.currentIndex >= iterableLength) {
      return false;
    }
  }

  return true;
}

/**
 * 获取iterable的长度
 */
function getIterableLength(iterable: any): number {
  if (Array.isArray(iterable)) {
    return iterable.length;
  } else if (typeof iterable === 'object' && iterable !== null) {
    return Object.keys(iterable).length;
  } else if (typeof iterable === 'number') {
    return iterable;
  } else if (typeof iterable === 'string') {
    return iterable.length;
  }
  return 0;
}

/**
 * 更新循环状态
 */
function updateLoopState(loopState: LoopState): void {
  loopState.iterationCount++;
  loopState.currentIndex++;
}

/**
 * LoopEnd节点处理函数
 * @param thread Thread实例
 * @param node 节点定义
 * @param context 处理器上下文（可选）
 * @returns 执行结果
 */
export async function loopEndHandler(thread: Thread, node: Node, context?: any): Promise<any> {
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

  const config = node.config as LoopEndNodeConfig;

  // 获取循环状态
  const loopState = getLoopState(thread, config.loopId);

  if (!loopState) {
    throw new NotFoundError(
      `Loop state not found for loopId: ${config.loopId}`,
      'loopState',
      config.loopId,
      {
        nodeId: node.id,
        loopId: config.loopId
      }
    );
  }

  // 评估中断条件
  let shouldBreak = false;
  if (config.breakCondition) {
    shouldBreak = evaluateBreakCondition(config.breakCondition, thread);
  }

  // 检查循环条件
  const loopConditionMet = checkLoopCondition(loopState);

  // 决定是否继续循环
  const shouldContinue = !shouldBreak && loopConditionMet;

  // 如果需要继续循环，更新循环状态
  if (shouldContinue) {
    updateLoopState(loopState);
  } else {
    // 循环结束，清理循环状态和作用域
    clearLoopState(thread, config.loopId);
  }

  // 记录执行历史
  thread.nodeResults.push({
    step: thread.nodeResults.length + 1,
    nodeId: node.id,
    nodeType: node.type,
    status: 'COMPLETED',
    timestamp: now(),
  });

  // 返回执行结果
  return {
    loopId: config.loopId,
    shouldContinue,
    shouldBreak,
    loopConditionMet,
    iterationCount: loopState.iterationCount,
    nextNodeId: shouldContinue ? config.loopStartNodeId : undefined
  };
}