/**
 * Abort 工具函数
 * 提供基于 AbortSignal 的基础包装功能
 *
 * 设计原则：
 * - 统一使用 AbortSignal 作为中断机制
 * - 简化异步操作的中断处理
 * - 提供类型安全的工具函数
 */
import { TimeoutError, AbortError } from '@modular-agent/types';

/**
 * 抛出 AbortSignal 的中止原因
 * 如果 reason 是 Error 实例则直接抛出，否则包装为 AbortError
 * @param signal AbortSignal
 * @throws 始终抛出错误
 */
export function throwAbortReason(signal: AbortSignal): never {
  const reason = signal.reason;
  if (reason instanceof Error) {
    throw reason;
  }
  // 当 reason 不存在或不是 Error 实例时，使用 AbortError
  // 使用 'This operation was aborted' 与浏览器原生行为保持一致
  throw new AbortError('This operation was aborted', reason);
}

/**
 * 检查 AbortSignal 并执行函数
 * @param fn 异步函数
 * @param signal AbortSignal
 * @returns 函数执行结果
 * @throws 当 signal 已中止时抛出中止原因
 */
export function withAbortSignal<T>(
  fn: () => Promise<T>,
  signal?: AbortSignal
): Promise<T> {
  if (signal?.aborted) {
    throwAbortReason(signal);
  }
  return fn();
}

/**
 * 检查 AbortSignal 并执行函数（支持传递 signal 给函数）
 * @param fn 异步函数（接收 AbortSignal 参数）
 * @param signal AbortSignal
 * @returns 函数执行结果
 * @throws 当 signal 已中止时抛出中止原因
 */
export function withAbortSignalArg<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  signal?: AbortSignal
): Promise<T> {
  if (signal?.aborted) {
    throwAbortReason(signal);
  }
  if (!signal) {
    throw new Error('Signal is required for withAbortSignalArg');
  }
  return fn(signal);
}

/**
 * 创建带超时的 AbortSignal
 * @param timeoutMs 超时时间（毫秒）
 * @returns AbortController 和 AbortSignal
 */
export function createTimeoutSignal(timeoutMs: number): {
  controller: AbortController;
  signal: AbortSignal;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    // 使用 SDK 的 TimeoutError 替代普通 Error
    const timeoutError = new TimeoutError(
      `Operation timed out after ${timeoutMs}ms`,
      timeoutMs
    );
    controller.abort(timeoutError);
  }, timeoutMs);

  // 清理定时器
  const originalAbort = controller.abort.bind(controller);
  controller.abort = (reason?: any) => {
    clearTimeout(timeoutId);
    return originalAbort(reason);
  };

  return { controller, signal: controller.signal };
}

/**
 * 组合多个 AbortSignal
 * 当任意一个 signal 中止时，组合的 signal 也会中止
 * @param signals AbortSignal 数组
 * @returns AbortController 和组合的 AbortSignal
 */
export function combineAbortSignals(signals: AbortSignal[]): {
  controller: AbortController;
  signal: AbortSignal;
} {
  const controller = new AbortController();

  // 监听所有 signal
  const abortHandlers = signals.map(signal => {
    if (signal.aborted) {
      // 如果已经中止，立即中止组合的 signal
      controller.abort(signal.reason);
      return () => {};
    }
    
    const handler = () => {
      controller.abort(signal.reason);
    };
    signal.addEventListener('abort', handler);
    return () => signal.removeEventListener('abort', handler);
  });

  // 清理事件监听器
  const originalAbort = controller.abort.bind(controller);
  controller.abort = (reason?: any) => {
    abortHandlers.forEach(cleanup => cleanup());
    return originalAbort(reason);
  };

  return { controller, signal: controller.signal };
}

/**
 * 检查 AbortSignal 是否已中止
 * @param signal AbortSignal
 * @returns 是否已中止
 */
export function isAborted(signal?: AbortSignal): boolean {
  return signal?.aborted ?? false;
}

/**
 * 获取 AbortSignal 的中止原因
 * @param signal AbortSignal
 * @returns 中止原因（Error 或其他值）
 */
export function getAbortReason(signal?: AbortSignal): any {
  return signal?.reason;
}

/**
 * 创建永不中止的 AbortSignal
 * @returns AbortSignal
 */
export function createNeverAbortSignal(): AbortSignal {
  const controller = new AbortController();
  // 不调用 abort，返回一个永远不会中止的 signal
  return controller.signal;
}

/**
 * 包装异步操作，支持超时和中断
 * @param fn 异步函数
 * @param options 选项
 * @returns 函数执行结果
 */
export async function withTimeoutAndAbort<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  options: {
    signal?: AbortSignal;
    timeoutMs?: number;
  }
): Promise<T> {
  const { signal, timeoutMs } = options;

  // 如果没有超时和 signal，直接执行
  if (!signal && !timeoutMs) {
    return await fn(createNeverAbortSignal());
  }

  // 创建超时 signal
  let timeoutController: AbortController | undefined;
  if (timeoutMs) {
    const { controller, signal: timeoutSignal } = createTimeoutSignal(timeoutMs);
    timeoutController = controller;
  }

  // 组合 signal
  const signals: AbortSignal[] = [];
  if (signal) signals.push(signal);
  if (timeoutController) signals.push(timeoutController.signal);
  
  let combinedController: AbortController | undefined;
  let combinedSignal: AbortSignal;
  
  if (signals.length === 0) {
    combinedSignal = createNeverAbortSignal();
  } else if (signals.length === 1) {
    combinedSignal = signals[0]!;
  } else {
    const result = combineAbortSignals(signals);
    combinedController = result.controller;
    combinedSignal = result.signal;
  }

  // 检查组合信号是否已经被中止
  if (combinedSignal.aborted) {
    throw combinedSignal.reason || new AbortError('This operation was aborted');
  }

  try {
    // 执行函数并返回结果
    // 函数内部应该监听 signal 并正确处理中止
    return await fn(combinedSignal);
  } finally {
    // 确保清理资源，但只在未被中止时才主动中止控制器
    if (timeoutController && !timeoutController.signal.aborted) {
      timeoutController.abort();
    }
    if (combinedController && !combinedController.signal.aborted) {
      combinedController.abort();
    }
  }
}