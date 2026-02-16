/**
 * Abort 工具函数
 * 提供基于 AbortSignal 的高级包装和组合功能
 */

/**
 * 创建包装函数，支持 AbortSignal
 * @param fn 异步函数
 * @param signal AbortSignal
 * @returns 包装后的异步函数
 */
export function withAbortSignal<T>(
  fn: () => Promise<T>,
  signal?: AbortSignal
): Promise<T> {
  if (signal?.aborted) {
    const reason = signal.reason;
    if (reason instanceof Error) {
      throw reason;
    }
    throw new Error('Operation aborted');
  }
  return fn();
}

/**
 * 创建包装函数，支持 AbortSignal 和超时
 * @param fn 异步函数
 * @param signal AbortSignal
 * @param timeout 超时时间（毫秒）
 * @returns 包装后的异步函数
 */
export async function withAbortSignalAndTimeout<T>(
  fn: () => Promise<T>,
  signal?: AbortSignal,
  timeout?: number
): Promise<T> {
  const timeoutController = new AbortController();
  const timeoutId = timeout ? setTimeout(() => {
    timeoutController.abort(new Error('Operation timeout'));
  }, timeout) : undefined;

  try {
    // 组合 signal 和 timeout signal
    const combinedSignal = signal ? 
      combineSignals([signal, timeoutController.signal]) : 
      timeoutController.signal;

    return await withAbortSignal(fn, combinedSignal);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * 组合多个 AbortSignal
 * @param signals AbortSignal 数组
 * @returns 组合后的 AbortSignal
 */
export function combineSignals(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();

  // 检查是否有已中止的 signal
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
  }

  // 监听所有 signal
  const abortHandler = () => {
    controller.abort();
  };

  for (const signal of signals) {
    signal.addEventListener('abort', abortHandler, { once: true });
  }

  return controller.signal;
}

/**
 * 创建可取消的 Promise
 * @param promise Promise 对象
 * @param signal AbortSignal
 * @returns 可取消的 Promise
 */
export function createCancellablePromise<T>(
  promise: Promise<T>,
  signal?: AbortSignal
): Promise<T> {
  return new Promise((resolve, reject) => {
    // 检查是否已中止
    if (signal?.aborted) {
      const reason = signal.reason;
      if (reason instanceof Error) {
        reject(reason);
      } else {
        reject(new Error('Operation aborted'));
      }
      return;
    }

    // 监听中止事件
    const abortHandler = () => {
      const reason = signal!.reason;
      if (reason instanceof Error) {
        reject(reason);
      } else {
        reject(new Error('Operation aborted'));
      }
    };

    if (signal) {
      signal.addEventListener('abort', abortHandler, { once: true });
    }

    // 处理 Promise
    promise
      .then(resolve)
      .catch(reject)
      .finally(() => {
        if (signal) {
          signal.removeEventListener('abort', abortHandler);
        }
      });
  });
}