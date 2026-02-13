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
 */

import type { ThreadRegistry } from '../../services/thread-registry';
import type { InterruptionType } from './interruption-manager';

/**
 * 中断检测器接口
 */
export interface InterruptionDetector {
  /**
   * 检查是否应该中断
   * @param threadId 线程ID
   * @returns 是否应该中断
   */
  shouldInterrupt(threadId: string): boolean;

  /**
   * 获取中断类型
   * @param threadId 线程ID
   * @returns 中断类型（PAUSE/STOP/null）
   */
  getInterruptionType(threadId: string): InterruptionType;

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
}

/**
 * 中断检测器实现
 */
export class InterruptionDetectorImpl implements InterruptionDetector {
  constructor(private threadRegistry: ThreadRegistry) { }

  shouldInterrupt(threadId: string): boolean {
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      return false;
    }

    const interruptionManager = (threadContext as any).interruptionManager;
    if (!interruptionManager) {
      return false;
    }

    return interruptionManager.shouldInterrupt();
  }

  getInterruptionType(threadId: string): InterruptionType {
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      return null;
    }

    const interruptionManager = (threadContext as any).interruptionManager;
    if (!interruptionManager) {
      return null;
    }

    return interruptionManager.getInterruptionType();
  }

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

  isAborted(threadId: string): boolean {
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      return false;
    }

    const interruptionManager = (threadContext as any).interruptionManager;
    if (!interruptionManager) {
      return false;
    }

    return interruptionManager.isAborted();
  }
}