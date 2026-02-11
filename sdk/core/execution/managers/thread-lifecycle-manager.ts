/**
 * ThreadLifecycleManager - Thread生命周期管理器
 *
 * 职责：
 * - Thread状态转换（原子操作）
 * - 状态转换验证
 * - 生命周期事件触发
 * - 生命周期钩子执行（如清理消息存储）
 *
 * 设计原则：
 * - 原子操作：每个方法代表一个完整的状态转换单元
 * - 无业务逻辑：不涉及执行、暂停等实现细节
 * - 无流程协调：不决定何时调用这些方法
 * - 纯函数性：同一输入产生同一输出
 *
 * 调用者：
 * - ThreadLifecycleCoordinator - 高层流程协调
 * - 触发器处理函数（通过Coordinator）
 */

import type { Thread, ThreadStatus, ThreadResult } from '@modular-agent/types/thread';
import type { EventManager } from '../../services/event-manager';
import { globalMessageStorage } from '../../services/global-message-storage';
import { validateTransition } from '@modular-agent/common-utils/thread-state-validator';
import {
  buildThreadStartedEvent,
  buildThreadStateChangedEvent,
  buildThreadPausedEvent,
  buildThreadResumedEvent,
  buildThreadCompletedEvent,
  buildThreadFailedEvent,
  buildThreadCancelledEvent
} from '@modular-agent/common-utils/event/event-builder';
import {
  emit
} from '@modular-agent/common-utils/event/event-emitter';
import { now } from '../../../utils';

/**
 * ThreadLifecycleManager - Thread生命周期管理器
 * 
 * 提供原子化的状态转换操作
 */
export class ThreadLifecycleManager {
  constructor(private eventManager: EventManager) {
    // eventManager 必须通过构造函数传入，不再使用默认值
  }

  /**
   * 启动Thread
   * 
   * @param thread Thread实例
   * @throws ValidationError 状态转换不合法
   */
  async startThread(thread: Thread): Promise<void> {
    const previousStatus = thread.status;

    // 验证状态转换合法性
    validateTransition(thread.id, thread.status, 'RUNNING' as ThreadStatus);

    // 更新Thread状态为RUNNING
    thread.status = 'RUNNING' as ThreadStatus;

    // 触发THREAD_STARTED事件
    const startedEvent = buildThreadStartedEvent(thread);
    await emit(this.eventManager, startedEvent);

    // 触发THREAD_STATE_CHANGED事件
    const stateChangedEvent = buildThreadStateChangedEvent(thread, previousStatus, 'RUNNING');
    await emit(this.eventManager, stateChangedEvent);
  }

  /**
   * 暂停Thread
   *
   * @param thread Thread实例
   * @throws ValidationError 状态转换不合法
   */
  async pauseThread(thread: Thread): Promise<void> {
    // 幂等性检查：如果已经是PAUSED状态，直接返回
    if (thread.status === 'PAUSED') {
      return;
    }

    const previousStatus = thread.status;

    // 验证状态转换合法性
    validateTransition(thread.id, thread.status, 'PAUSED' as ThreadStatus);

    // 更新Thread状态为PAUSED
    thread.status = 'PAUSED' as ThreadStatus;

    // 触发THREAD_PAUSED事件
    const pausedEvent = buildThreadPausedEvent(thread);
    await emit(this.eventManager, pausedEvent);

    // 触发THREAD_STATE_CHANGED事件
    const stateChangedEvent = buildThreadStateChangedEvent(thread, previousStatus, 'PAUSED');
    await emit(this.eventManager, stateChangedEvent);
  }

  /**
   * 恢复Thread
   *
   * @param thread Thread实例
   * @throws ValidationError 状态转换不合法
   */
  async resumeThread(thread: Thread): Promise<void> {
    // 幂等性检查：如果已经是RUNNING状态，直接返回
    if (thread.status === 'RUNNING') {
      return;
    }

    const previousStatus = thread.status;

    // 验证状态转换合法性
    validateTransition(thread.id, thread.status, 'RUNNING' as ThreadStatus);

    // 更新Thread状态为RUNNING
    thread.status = 'RUNNING' as ThreadStatus;

    // 触发THREAD_RESUMED事件
    const resumedEvent = buildThreadResumedEvent(thread);
    await emit(this.eventManager, resumedEvent);

    // 触发THREAD_STATE_CHANGED事件
    const stateChangedEvent = buildThreadStateChangedEvent(thread, previousStatus, 'RUNNING');
    await emit(this.eventManager, stateChangedEvent);
  }

  /**
   * 完成Thread
   * 
   * @param thread Thread实例
   * @param result 执行结果
   * @throws ValidationError 状态转换不合法
   */
  async completeThread(thread: Thread, result: ThreadResult): Promise<void> {
    const previousStatus = thread.status;

    // 如果已经是COMPLETED状态，只触发事件（幂等性）
    if (thread.status === 'COMPLETED' as ThreadStatus) {
      // 确保结束时间已设置
      if (!thread.endTime) {
        thread.endTime = now();
      }
      // 清理全局消息存储中的消息历史
      globalMessageStorage.removeReference(thread.id);
      // 触发THREAD_COMPLETED事件
      const completedEvent = buildThreadCompletedEvent(thread, result);
      await emit(this.eventManager, completedEvent);
      return;
    }

    // 验证状态转换合法性
    validateTransition(thread.id, thread.status, 'COMPLETED' as ThreadStatus);

    // 更新Thread状态为COMPLETED
    thread.status = 'COMPLETED' as ThreadStatus;

    // 设置结束时间
    thread.endTime = now();

    // 清理全局消息存储中的消息历史
    globalMessageStorage.removeReference(thread.id);

    // 触发THREAD_COMPLETED事件
    const completedEvent = buildThreadCompletedEvent(thread, result);
    await emit(this.eventManager, completedEvent);

    // 触发THREAD_STATE_CHANGED事件
    const stateChangedEvent = buildThreadStateChangedEvent(thread, previousStatus, 'COMPLETED');
    await emit(this.eventManager, stateChangedEvent);
  }

  /**
   * 失败Thread
   * 
   * @param thread Thread实例
   * @param error 错误信息
   * @throws ValidationError 状态转换不合法
   */
  async failThread(thread: Thread, error: Error): Promise<void> {
    const previousStatus = thread.status;

    // 验证状态转换合法性
    validateTransition(thread.id, thread.status, 'FAILED' as ThreadStatus);

    // 更新Thread状态为FAILED
    thread.status = 'FAILED' as ThreadStatus;

    // 设置结束时间
    thread.endTime = now();

    // 记录错误信息
    thread.errors.push(error.message);

    // 清理全局消息存储中的消息历史
    globalMessageStorage.removeReference(thread.id);

    // 触发THREAD_FAILED事件
    const failedEvent = buildThreadFailedEvent(thread, error);
    await emit(this.eventManager, failedEvent);

    // 触发THREAD_STATE_CHANGED事件
    const stateChangedEvent = buildThreadStateChangedEvent(thread, previousStatus, 'FAILED');
    await emit(this.eventManager, stateChangedEvent);
  }

  /**
   * 取消Thread
   *
   * @param thread Thread实例
   * @param reason 取消原因
   * @throws ValidationError 状态转换不合法
   */
  async cancelThread(thread: Thread, reason?: string): Promise<void> {
    // 幂等性检查：如果已经是CANCELLED状态，直接返回
    if (thread.status === 'CANCELLED') {
      return;
    }

    const previousStatus = thread.status;

    // 验证状态转换合法性
    validateTransition(thread.id, thread.status, 'CANCELLED' as ThreadStatus);

    // 更新Thread状态为CANCELLED
    thread.status = 'CANCELLED' as ThreadStatus;

    // 设置结束时间
    thread.endTime = now();

    // 清理全局消息存储中的消息历史
    globalMessageStorage.removeReference(thread.id);

    // 触发THREAD_CANCELLED事件
    const cancelledEvent = buildThreadCancelledEvent(thread, reason);
    await emit(this.eventManager, cancelledEvent);

    // 触发THREAD_STATE_CHANGED事件
    const stateChangedEvent = buildThreadStateChangedEvent(thread, previousStatus, 'CANCELLED');
    await emit(this.eventManager, stateChangedEvent);
  }
}