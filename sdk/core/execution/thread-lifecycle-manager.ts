/**
 * ThreadLifecycleManager - Thread生命周期管理器
 * 负责Thread状态转换管理，独立于执行逻辑
 */

import type { Thread, ThreadStatus, ThreadResult } from '../../types/thread';
import type { EventManager } from './managers/event-manager';
import { EventType } from '../../types/events';
import type { ThreadStartedEvent, ThreadCompletedEvent, ThreadFailedEvent, ThreadPausedEvent, ThreadResumedEvent } from '../../types/events';
import { ValidationError } from '../../types/errors';
import { now } from '../../utils';

/**
 * ThreadLifecycleManager - Thread生命周期管理器
 */
export class ThreadLifecycleManager {
  constructor(private eventManager: EventManager) { }

  /**
   * 启动Thread
   * @param thread Thread实例
   */
  async startThread(thread: Thread): Promise<void> {
    // 验证状态转换合法性
    if (!this.validateStateTransition(thread.status, 'RUNNING' as ThreadStatus)) {
      throw new ValidationError(
        `Invalid state transition: ${thread.status} -> RUNNING`,
        'thread.status',
        thread.status,
        { threadId: thread.id, currentStatus: thread.status, targetStatus: 'RUNNING' }
      );
    }

    // 更新Thread状态为RUNNING
    thread.status = 'RUNNING' as ThreadStatus;

    // 触发THREAD_STARTED事件
    await this.emitThreadStartedEvent(thread);
  }

  /**
   * 暂停Thread
   * @param thread Thread实例
   */
  async pauseThread(thread: Thread): Promise<void> {
    // 验证状态转换合法性
    if (!this.validateStateTransition(thread.status, 'PAUSED' as ThreadStatus)) {
      throw new ValidationError(
        `Invalid state transition: ${thread.status} -> PAUSED`,
        'thread.status',
        thread.status,
        { threadId: thread.id, currentStatus: thread.status, targetStatus: 'PAUSED' }
      );
    }

    // 更新Thread状态为PAUSED
    thread.status = 'PAUSED' as ThreadStatus;

    // 触发THREAD_PAUSED事件
    await this.emitThreadPausedEvent(thread);
  }

  /**
   * 恢复Thread
   * @param thread Thread实例
   */
  async resumeThread(thread: Thread): Promise<void> {
    // 验证状态转换合法性
    if (!this.validateStateTransition(thread.status, 'RUNNING' as ThreadStatus)) {
      throw new ValidationError(
        `Invalid state transition: ${thread.status} -> RUNNING`,
        'thread.status',
        thread.status,
        { threadId: thread.id, currentStatus: thread.status, targetStatus: 'RUNNING' }
      );
    }

    // 更新Thread状态为RUNNING
    thread.status = 'RUNNING' as ThreadStatus;

    // 触发THREAD_RESUMED事件
    await this.emitThreadResumedEvent(thread);
  }

  /**
   * 完成Thread
   * @param thread Thread实例
   * @param result 执行结果
   */
  async completeThread(thread: Thread, result: ThreadResult): Promise<void> {
    // 验证状态转换合法性
    if (!this.validateStateTransition(thread.status, 'COMPLETED' as ThreadStatus)) {
      throw new ValidationError(
        `Invalid state transition: ${thread.status} -> COMPLETED`,
        'thread.status',
        thread.status,
        { threadId: thread.id, currentStatus: thread.status, targetStatus: 'COMPLETED' }
      );
    }

    // 更新Thread状态为COMPLETED
    thread.status = 'COMPLETED' as ThreadStatus;

    // 设置结束时间
    thread.endTime = now();

    // 触发THREAD_COMPLETED事件
    await this.emitThreadCompletedEvent(thread, result);
  }

  /**
   * 失败Thread
   * @param thread Thread实例
   * @param error 错误信息
   */
  async failThread(thread: Thread, error: Error): Promise<void> {
    // 验证状态转换合法性
    if (!this.validateStateTransition(thread.status, 'FAILED' as ThreadStatus)) {
      throw new ValidationError(
        `Invalid state transition: ${thread.status} -> FAILED`,
        'thread.status',
        thread.status,
        { threadId: thread.id, currentStatus: thread.status, targetStatus: 'FAILED' }
      );
    }

    // 更新Thread状态为FAILED
    thread.status = 'FAILED' as ThreadStatus;

    // 设置结束时间
    thread.endTime = now();

    // 记录错误信息
    thread.errors.push(error.message);

    // 触发THREAD_FAILED事件
    await this.emitThreadFailedEvent(thread, error);
  }

  /**
   * 取消Thread
   * @param thread Thread实例
   */
  async cancelThread(thread: Thread): Promise<void> {
    // 验证状态转换合法性
    if (!this.validateStateTransition(thread.status, 'CANCELLED' as ThreadStatus)) {
      throw new ValidationError(
        `Invalid state transition: ${thread.status} -> CANCELLED`,
        'thread.status',
        thread.status,
        { threadId: thread.id, currentStatus: thread.status, targetStatus: 'CANCELLED' }
      );
    }

    // 更新Thread状态为CANCELLED
    thread.status = 'CANCELLED' as ThreadStatus;

    // 设置结束时间
    thread.endTime = now();

    // 注意：THREAD_CANCELLED 事件类型不存在，暂时不触发事件
    // 如果需要，可以在 events.ts 中添加该事件类型
  }

  /**
   * 验证状态转换合法性
   * @param currentStatus 当前状态
   * @param targetStatus 目标状态
   * @returns 是否允许转换
   */
  private validateStateTransition(currentStatus: ThreadStatus, targetStatus: ThreadStatus): boolean {
    // 状态转换规则：
    // CREATED → RUNNING
    // RUNNING → PAUSED | COMPLETED | FAILED | CANCELLED
    // PAUSED → RUNNING | CANCELLED
    // COMPLETED/FAILED/CANCELLED → 终止状态，不可转换

    const transitions: Record<string, string[]> = {
      'CREATED': ['RUNNING'],
      'RUNNING': ['PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED'],
      'PAUSED': ['RUNNING', 'CANCELLED'],
      'COMPLETED': [],
      'FAILED': [],
      'CANCELLED': [],
      'TIMEOUT': []
    };

    const allowedTransitions = transitions[currentStatus] || [];
    return allowedTransitions.includes(targetStatus);
  }

  /**
   * 触发THREAD_STARTED事件
   * @param thread Thread实例
   */
  private async emitThreadStartedEvent(thread: Thread): Promise<void> {
    const event: ThreadStartedEvent = {
      type: EventType.THREAD_STARTED,
      timestamp: now(),
      workflowId: thread.workflowId,
      threadId: thread.id,
      input: thread.input
    };
    await this.eventManager.emit(event);
  }

  /**
   * 触发THREAD_COMPLETED事件
   * @param thread Thread实例
   * @param result 执行结果
   */
  private async emitThreadCompletedEvent(thread: Thread, result: ThreadResult): Promise<void> {
    const event: ThreadCompletedEvent = {
      type: EventType.THREAD_COMPLETED,
      timestamp: now(),
      workflowId: thread.workflowId,
      threadId: thread.id,
      output: result.output,
      executionTime: result.executionTime
    };
    await this.eventManager.emit(event);
  }

  /**
   * 触发THREAD_FAILED事件
   * @param thread Thread实例
   * @param error 错误信息
   */
  private async emitThreadFailedEvent(thread: Thread, error: Error): Promise<void> {
    const event: ThreadFailedEvent = {
      type: EventType.THREAD_FAILED,
      timestamp: now(),
      workflowId: thread.workflowId,
      threadId: thread.id,
      error: error.message
    };
    await this.eventManager.emit(event);
  }

  /**
   * 触发THREAD_PAUSED事件
   * @param thread Thread实例
   */
  private async emitThreadPausedEvent(thread: Thread): Promise<void> {
    const event: ThreadPausedEvent = {
      type: EventType.THREAD_PAUSED,
      timestamp: now(),
      workflowId: thread.workflowId,
      threadId: thread.id
    };
    await this.eventManager.emit(event);
  }

  /**
   * 触发THREAD_RESUMED事件
   * @param thread Thread实例
   */
  private async emitThreadResumedEvent(thread: Thread): Promise<void> {
    const event: ThreadResumedEvent = {
      type: EventType.THREAD_RESUMED,
      timestamp: now(),
      workflowId: thread.workflowId,
      threadId: thread.id
    };
    await this.eventManager.emit(event);
  }

}