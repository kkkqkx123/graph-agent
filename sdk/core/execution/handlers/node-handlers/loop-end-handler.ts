/**
 * LoopEnd节点处理函数
 * 负责执行LOOP_END节点，更新循环变量，检查中断条件
 */

import type { Node } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';
import { NodeType } from '../../../../types/node';
import { ValidationError, ExecutionError, NotFoundError } from '../../../../types/errors';
import { conditionEvaluator } from '../../../../utils/evalutor/condition-evaluator';
import { now } from '../../../../utils';

/**
 * LoopEnd节点配置
 */
interface LoopEndNodeConfig {
  /** 循环ID */
  loopId: string;
  /** 中断条件 */
  breakCondition?: any;
  /** LOOP_START节点ID（用于跳转） */
  loopStartNodeId?: string;
}

/**
 * 循环状态
 */
interface LoopState {
  loopId: string;
  iterable: any;
  currentIndex: number;
  maxIterations: number;
  iterationCount: number;
  variableName: string;
}

/**
 * 验证LoopEnd节点配置
 */
function validate(node: Node): void {
  if (node.type !== NodeType.LOOP_END) {
    throw new ValidationError(`Invalid node type for loop end handler: ${node.type}`, `node.${node.id}`);
  }

  const config = node.config as LoopEndNodeConfig;

  if (!config.loopId || typeof config.loopId !== 'string') {
    throw new ValidationError('Loop end node must have a valid loopId', `node.${node.id}`);
  }
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
  return thread.variableValues?.[`__loop_${loopId}`];
}

/**
 * 清除循环状态
 */
function clearLoopState(thread: Thread, loopId: string): void {
  if (thread.variableValues) {
    delete thread.variableValues[`__loop_${loopId}`];
  }
}

/**
 * 评估中断条件
 */
function evaluateBreakCondition(breakCondition: any, thread: Thread): boolean {
  try {
    // 构建评估上下文
    const context = {
      variables: thread.variableValues || {},
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
        variables: thread.variableValues,
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
  // 检查迭代次数
  if (loopState.iterationCount >= loopState.maxIterations) {
    return false;
  }

  // 检查当前索引
  const iterableLength = getIterableLength(loopState.iterable);
  if (loopState.currentIndex >= iterableLength) {
    return false;
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
 * @returns 执行结果
 */
export async function loopEndHandler(thread: Thread, node: Node): Promise<any> {
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
    // 循环结束，清理循环状态
    clearLoopState(thread, config.loopId);
  }

  // 记录执行历史
  thread.nodeResults.push({
    step: thread.nodeResults.length + 1,
    nodeId: node.id,
    nodeType: node.type,
    status: 'COMPLETED',
    timestamp: now(),
    output: {
      loopId: config.loopId,
      shouldContinue,
      shouldBreak,
      loopConditionMet,
      iterationCount: loopState.iterationCount,
      nextNodeId: shouldContinue ? config.loopStartNodeId : undefined
    }
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