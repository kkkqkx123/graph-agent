/**
 * 中断管理器
 * 统一管理线程中断状态和操作
 * 
 * 职责：
 * - 管理中断状态（PAUSE/STOP）
 * - 提供 AbortSignal 用于深度中断
 * - 统一中断请求和恢复操作
 * 
 * 设计原则：
 * - 单一职责：只负责中断状态管理
 * - 封装性：隐藏内部实现细节
 * - 线程安全：确保状态变更的原子性
 */

import { ThreadInterruptedException } from '@modular-agent/types';

/**
 * 中断类型
 */
export type InterruptionType = 'PAUSE' | 'STOP' | null;

/**
 * 中断管理器
 */
export class InterruptionManager {
  private abortController: AbortController = new AbortController();
  private interruptionType: InterruptionType = null;
  private threadId: string;
  private nodeId: string;

  constructor(threadId: string, nodeId: string) {
    this.threadId = threadId;
    this.nodeId = nodeId;
  }

  /**
   * 请求暂停
   */
  requestPause(): void {
    if (this.interruptionType === 'PAUSE') {
      return; // 已经是暂停状态
    }
    
    this.interruptionType = 'PAUSE';
    this.abortController.abort(new ThreadInterruptedException(
      'Thread paused',
      'PAUSE',
      this.threadId,
      this.nodeId
    ));
  }

  /**
   * 请求停止
   */
  requestStop(): void {
    if (this.interruptionType === 'STOP') {
      return; // 已经是停止状态
    }
    
    this.interruptionType = 'STOP';
    this.abortController.abort(new ThreadInterruptedException(
      'Thread stopped',
      'STOP',
      this.threadId,
      this.nodeId
    ));
  }

  /**
   * 恢复执行
   */
  resume(): void {
    this.interruptionType = null;
    // 重置 AbortController
    this.abortController = new AbortController();
  }

  /**
   * 检查是否应该中断
   */
  shouldInterrupt(): boolean {
    return this.interruptionType !== null;
  }

  /**
   * 获取中断类型
   */
  getInterruptionType(): InterruptionType {
    return this.interruptionType;
  }

  /**
   * 获取 AbortSignal
   */
  getAbortSignal(): AbortSignal {
    return this.abortController.signal;
  }

  /**
   * 检查是否已中止
   */
  isAborted(): boolean {
    return this.abortController.signal.aborted;
  }

  /**
   * 获取中止原因
   */
  getAbortReason(): ThreadInterruptedException | undefined {
    return this.abortController.signal.reason as ThreadInterruptedException;
  }

  /**
   * 更新当前节点ID
   */
  updateNodeId(nodeId: string): void {
    this.nodeId = nodeId;
  }

  /**
   * 获取线程ID
   */
  getThreadId(): string {
    return this.threadId;
  }

  /**
   * 获取节点ID
   */
  getNodeId(): string {
    return this.nodeId;
  }
}