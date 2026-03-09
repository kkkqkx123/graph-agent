/**
 * 中断检测器
 * 提供统一的中断检测接口
 *
 * 职责：
 * - 检测线程是否应该中断
 * - 获取中断类型
 * - 获取 AbortSignal
 *
 * 设计原则：
 * - 接口统一：所有组件使用相同的检测接口
 * - 依赖注入：通过 ThreadRegistry 获取 ThreadContext
 * - 高效性：避免不必要的对象创建
 * - 统一使用 AbortSignal 作为主要中断机制
 */

import type { ThreadRegistry } from '../../services/thread-registry.js';
import type { InterruptionType } from './interruption-manager.js';
import { isAborted, checkInterruption, getInterruptionType as getInterruptionTypeFromResult } from '@modular-agent/common-utils';

/**
 * 中断检测器接口
 */
export interface InterruptionDetector {
  /**
   * 获取 AbortSignal
   * @param threadId 线程ID
   * @returns AbortSignal
   */
  getAbortSignal(threadId: string): AbortSignal;

  /**
   * 检查是否已中止
   * @param threadId 线程ID
   * @returns 是否已中止
   */
  isAborted(threadId: string): boolean;

  /**
   * 获取中断类型
   * @param threadId 线程ID
   * @returns 中断类型（PAUSE/STOP/null）
   */
  getInterruptionType(threadId: string): InterruptionType;
}

/**
 * 中断检测器实现
 */
export class InterruptionDetectorImpl implements InterruptionDetector {
  constructor(private threadRegistry: ThreadRegistry) { }

  /**
   * 获取 AbortSignal
   * @param threadId 线程ID
   * @returns AbortSignal
   */
  getAbortSignal(threadId: string): AbortSignal {
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      return new AbortController().signal;
    }

    const interruptionManager = (threadContext as any).interruptionManager;
    if (!interruptionManager) {
      return new AbortController().signal;
    }

    return interruptionManager.getAbortSignal();
  }

  /**
   * 检查是否已中止
   * @param threadId 线程ID
   * @returns 是否已中止
   */
  isAborted(threadId: string): boolean {
    const signal = this.getAbortSignal(threadId);
    return isAborted(signal);
  }

  /**
   * 获取中断类型
   * @param threadId 线程ID
   * @returns 中断类型（PAUSE/STOP/null）
   */
  getInterruptionType(threadId: string): InterruptionType {
    const signal = this.getAbortSignal(threadId);
    const result = checkInterruption(signal);
    return getInterruptionTypeFromResult(result);
  }
}
