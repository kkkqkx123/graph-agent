/**
 * 线程中断工具函数
 * 提供特定于线程中断的工具函数
 */

import type { InterruptionRequestOptions } from '@modular-agent/types';
import { ThreadInterruptedException } from '@modular-agent/types';

/**
 * 创建 AbortController 并设置中断原因
 * @param options 中断请求选项
 * @returns AbortController 实例
 */
export function createAbortController(options: InterruptionRequestOptions): AbortController {
  const controller = new AbortController();
  const reason = new ThreadInterruptedException(
    options.reason || `Thread ${options.type.toLowerCase()}`,
    options.type,
    options.threadId,
    options.nodeId
  );
  controller.abort(reason);
  return controller;
}

/**
 * 检查是否是暂停中断
 * @param signal AbortSignal
 * @returns 是否是暂停中断
 */
export function isPaused(signal: AbortSignal): boolean {
  const reason = signal.reason;
  return reason instanceof ThreadInterruptedException && reason.interruptionType === 'PAUSE';
}

/**
 * 检查是否是停止中断
 * @param signal AbortSignal
 * @returns 是否是停止中断
 */
export function isStopped(signal: AbortSignal): boolean {
  const reason = signal.reason;
  return reason instanceof ThreadInterruptedException && reason.interruptionType === 'STOP';
}

/**
 * 获取线程中断异常
 * @param signal AbortSignal
 * @returns ThreadInterruptedException 或 undefined
 */
export function getThreadInterruptedException(
  signal: AbortSignal
): ThreadInterruptedException | undefined {
  const reason = signal.reason;
  return reason instanceof ThreadInterruptedException ? reason : undefined;
}