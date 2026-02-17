/**
 * 线程中断工具函数
 * 提供线程中断异常的提取和处理功能
 *
 * 设计原则：
 * - 统一使用 ThreadInterruptedException 作为中断错误
 * - 提供类型安全的工具函数
 * - 简化错误处理逻辑
 */

import { ThreadInterruptedException, AbortError } from '@modular-agent/types';
import type { InterruptionType } from '@modular-agent/types';
import { throwAbortReason } from './abort-utils.js';

/**
 * 从 AbortSignal 中获取线程中断异常
 * @param signal AbortSignal
 * @returns ThreadInterruptedException 或 undefined
 */
export function getThreadInterruptedException(
  signal: AbortSignal
): ThreadInterruptedException | undefined {
  const reason = signal.reason;
  return reason instanceof ThreadInterruptedException ? reason : undefined;
}

/**
 * 检查 AbortSignal 是否因线程中断而中止
 * @param signal AbortSignal
 * @returns 是否是线程中断
 */
export function isThreadInterruption(signal: AbortSignal): boolean {
  return getThreadInterruptedException(signal) !== undefined;
}

/**
 * 检查错误是否是线程中断异常
 * @param error 错误对象
 * @returns 是否是线程中断异常
 */
export function isThreadInterruptedException(error: unknown): error is ThreadInterruptedException {
  return error instanceof ThreadInterruptedException;
}

/**
 * 检查错误是否是任何类型的中断（线程中断或 AbortError）
 * @param error 错误对象
 * @returns 是否是中断错误
 */
export function isInterruptionError(error: unknown): boolean {
  return isThreadInterruptedException(error) || (error instanceof Error && error.name === 'AbortError');
}

/**
 * 从错误中提取线程中断异常
 * @param error 错误对象
 * @returns ThreadInterruptedException 或 undefined
 */
export function extractThreadInterruption(error: unknown): ThreadInterruptedException | undefined {
  if (isThreadInterruptedException(error)) {
    return error;
  }
  if (error instanceof Error && error.name === 'AbortError') {
    // 如果是 AbortError，尝试从 message 中解析信息
    // 这是为了兼容可能直接抛出 AbortError 的情况
    return undefined;
  }
  return undefined;
}

/**
 * 从 AbortSignal 中获取中断类型
 * @param signal AbortSignal
 * @returns 中断类型（PAUSE/STOP/null）
 */
export function getInterruptionType(signal: AbortSignal): InterruptionType {
  const exception = getThreadInterruptedException(signal);
  return exception?.interruptionType ?? null;
}

/**
 * 从 AbortSignal 中获取线程 ID
 * @param signal AbortSignal
 * @returns 线程 ID 或 undefined
 */
export function getThreadId(signal: AbortSignal): string | undefined {
  const exception = getThreadInterruptedException(signal);
  return exception?.threadId;
}

/**
 * 从 AbortSignal 中获取节点 ID
 * @param signal AbortSignal
 * @returns 节点 ID 或 undefined
 */
export function getNodeId(signal: AbortSignal): string | undefined {
  const exception = getThreadInterruptedException(signal);
  return exception?.nodeId;
}

/**
 * 创建线程中断异常
 * @param interruptionType 中断类型
 * @param threadId 线程 ID
 * @param nodeId 节点 ID
 * @returns ThreadInterruptedException
 */
export function createThreadInterruptedException(
  interruptionType: 'PAUSE' | 'STOP',
  threadId: string,
  nodeId: string
): ThreadInterruptedException {
  const message = `Thread ${interruptionType.toLowerCase()}`;
  return new ThreadInterruptedException(
    message,
    interruptionType,
    threadId,
    nodeId
  );
}

/**
 * 统一处理中断错误
 * 如果是线程中断异常，返回该异常；如果是 AbortError，尝试转换为线程中断异常
 * @param error 错误对象
 * @param threadId 线程 ID（用于转换 AbortError）
 * @param nodeId 节点 ID（用于转换 AbortError）
 * @returns ThreadInterruptedException 或 undefined
 */
export function normalizeInterruptionError(
  error: unknown,
  threadId?: string,
  nodeId?: string
): ThreadInterruptedException | undefined {
  // 如果已经是线程中断异常，直接返回
  if (isThreadInterruptedException(error)) {
    return error;
  }

  // 如果是 AbortError，尝试转换为线程中断异常
  if (error instanceof Error && error.name === 'AbortError') {
    if (threadId && nodeId) {
      // 默认转换为 STOP 类型
      return createThreadInterruptedException('STOP', threadId, nodeId);
    }
  }

  return undefined;
}

/**
 * 检查 AbortSignal 并抛出线程中断异常
 * @param signal AbortSignal
 * @throws 当 signal 已中止时抛出 ThreadInterruptedException
 */
export function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    const exception = getThreadInterruptedException(signal);
    if (exception) {
      throw exception;
    }
    // 如果不是线程中断异常，使用 abort-utils 中的公共函数处理
    throwAbortReason(signal);
  }
}

/**
 * 包装异步函数，自动处理线程中断
 * @param fn 异步函数
 * @param signal AbortSignal
 * @returns 函数执行结果
 * @throws 当 signal 中止时抛出 ThreadInterruptedException
 */
export async function withThreadInterruption<T>(
  fn: () => Promise<T>,
  signal: AbortSignal
): Promise<T> {
  throwIfAborted(signal);
  return await fn();
}

/**
 * 包装异步函数，自动处理线程中断（支持传递 signal）
 * @param fn 异步函数（接收 AbortSignal 参数）
 * @param signal AbortSignal
 * @returns 函数执行结果
 * @throws 当 signal 中止时抛出 ThreadInterruptedException
 */
export async function withThreadInterruptionArg<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  signal: AbortSignal
): Promise<T> {
  throwIfAborted(signal);
  return await fn(signal);
}

/**
 * 获取中断的友好描述
 * @param signal AbortSignal
 * @returns 中断描述字符串
 */
export function getInterruptionDescription(signal: AbortSignal): string {
  const exception = getThreadInterruptedException(signal);
  if (!exception) {
    return 'This operation was aborted';
  }

  const type = exception.interruptionType?.toLowerCase() || 'interrupted';
  return `Thread ${type} at node: ${exception.nodeId}`;
}