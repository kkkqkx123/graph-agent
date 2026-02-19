/**
 * 线程中断工具函数
 * 使用返回值标记体系替代错误体系处理控制流中断
 *
 * 设计原则：
 * - 使用返回值标记控制流状态（continue/paused/stopped）
 * - 避免使用异常处理预期内的中断
 * - 提供类型安全的工具函数
 * - 保持与 AbortSignal 的兼容性
 */

import type { InterruptionType } from '@modular-agent/types';
import type { InterruptionCheckResult, InterruptionInfo } from './interruption-types.js';
import { getAbortReason } from './abort-utils.js';

/**
 * 检查 AbortSignal 并返回中断状态
 * @param signal AbortSignal
 * @returns 中断检查结果
 */
export function checkInterruption(signal?: AbortSignal): InterruptionCheckResult {
  if (!signal) {
    return { type: 'continue' };
  }

  if (!signal.aborted) {
    return { type: 'continue' };
  }

  const reason = getAbortReason(signal);
  
  // 检查是否是线程中断
  if (reason && typeof reason === 'object' && 'interruptionType' in reason) {
    const interruption = reason as any;
    const type = interruption.interruptionType as InterruptionType;
    const threadId = interruption.threadId as string | undefined;
    const nodeId = interruption.nodeId as string | undefined;

    if (type === 'PAUSE') {
      return {
        type: 'paused',
        threadId,
        nodeId: nodeId || 'unknown'
      };
    } else if (type === 'STOP') {
      return {
        type: 'stopped',
        threadId,
        nodeId: nodeId || 'unknown'
      };
    }
  }

  // 普通中止
  return {
    type: 'aborted',
    reason
  };
}

/**
 * 创建线程中断信息
 * @param type 中断类型
 * @param threadId 线程 ID
 * @param nodeId 节点 ID
 * @returns 中断信息
 */
export function createInterruptionInfo(
  type: Exclude<InterruptionType, null>,
  threadId: string,
  nodeId: string
): InterruptionInfo {
  return {
    type,
    threadId,
    nodeId,
    timestamp: Date.now()
  };
}

/**
 * 判断是否继续执行
 * @param result 中断检查结果
 * @returns 是否继续
 */
export function shouldContinue(result: InterruptionCheckResult): boolean {
  return result.type === 'continue';
}

/**
 * 判断是否已中断
 * @param result 中断检查结果
 * @returns 是否中断
 */
export function isInterrupted(result: InterruptionCheckResult): boolean {
  return result.type !== 'continue';
}

/**
 * 获取中断类型
 * @param result 中断检查结果
 * @returns 中断类型或 null
 */
export function getInterruptionType(result: InterruptionCheckResult): InterruptionType {
  if (result.type === 'paused') {
    return 'PAUSE';
  } else if (result.type === 'stopped') {
    return 'STOP';
  }
  return null;
}

/**
 * 获取节点 ID
 * @param result 中断检查结果
 * @returns 节点 ID 或 undefined
 */
export function getNodeId(result: InterruptionCheckResult): string | undefined {
  if (result.type === 'paused' || result.type === 'stopped') {
    return result.nodeId;
  }
  return undefined;
}

/**
 * 获取线程 ID
 * @param result 中断检查结果
 * @returns 线程 ID 或 undefined
 */
export function getThreadId(result: InterruptionCheckResult): string | undefined {
  if (result.type === 'paused' || result.type === 'stopped') {
    return result.threadId;
  }
  return undefined;
}

/**
 * 获取中断的友好描述
 * @param result 中断检查结果
 * @returns 中断描述字符串
 */
export function getInterruptionDescription(result: InterruptionCheckResult): string {
  switch (result.type) {
    case 'continue':
      return 'Execution continuing';
    case 'paused':
      return `Thread paused at node: ${result.nodeId}`;
    case 'stopped':
      return `Thread stopped at node: ${result.nodeId}`;
    case 'aborted':
      return result.reason ? String(result.reason) : 'Operation aborted';
    default:
      return 'Unknown interruption state';
  }
}

/**
 * 包装异步函数，自动处理中断检查
 * @param fn 异步函数
 * @param signal AbortSignal
 * @returns 函数执行结果和状态
 */
export async function withInterruptionCheck<T>(
  fn: () => Promise<T>,
  signal?: AbortSignal
): Promise<{ result: T; status: 'completed' } | { status: 'interrupted'; interruption: InterruptionCheckResult }> {
  const interruption = checkInterruption(signal);
  
  if (!shouldContinue(interruption)) {
    return {
      status: 'interrupted',
      interruption
    };
  }
  
  try {
    const result = await fn();
    return {
      result,
      status: 'completed'
    };
  } catch (error) {
    // 如果函数内部抛出中断错误，转换为返回值
    if (error instanceof Error && error.name === 'AbortError') {
      const interruption = checkInterruption(signal);
      return {
        status: 'interrupted',
        interruption
      };
    }
    throw error;
  }
}

/**
 * 创建带中断检查的异步迭代器包装
 * @param iterable 异步可迭代对象
 * @param signal AbortSignal
 * @returns 包装后的异步迭代器
 */
export async function* withInterruptionCheckIter<T>(
  iterable: AsyncIterable<T>,
  signal?: AbortSignal
): AsyncGenerator<T | InterruptionCheckResult, void, unknown> {
  const iterator = iterable[Symbol.asyncIterator]();
  
  try {
    while (true) {
      // 检查中断
      const interruption = checkInterruption(signal);
      if (!shouldContinue(interruption)) {
        yield interruption;
        return;
      }
      
      const { value, done } = await iterator.next();
      if (done) break;
      
      yield value;
    }
  } finally {
    // 确保清理迭代器
    if (iterator.return) {
      await iterator.return();
    }
  }
}