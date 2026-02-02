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

import type { Thread, ThreadStatus, ThreadResult } from '../../../types/thread';
import type { EventManager } from '../../services/event-manager';
import { EventType } from '../../../types/events';
import { eventManager } from '../../services/event-manager';
import type { ThreadStartedEvent, ThreadCompletedEvent, ThreadFailedEvent, ThreadPausedEvent, ThreadResumedEvent, ThreadCancelledEvent, ThreadStateChangedEvent } from '../../../types/events';
import { now } from '../../../utils';
import { globalMessageStorage } from '../../services/global-message-storage';
import { validateTransition } from '../utils/thread-state-validator';

/**
 * ThreadLifecycleManager - Thread生命周期管理器
 * 
 * 提供原子化的状态转换操作
 */
export class ThreadLifecycleManager {
  constructor(private eventManagerParam: EventManager = eventManager) {
    this.eventManager = eventManagerParam;
  }

  private eventManager: EventManager;

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
    await this.emitThreadStartedEvent(thread);

    // 触发THREAD_STATE_CHANGED事件
    await this.emitThreadStateChangedEvent(thread, previousStatus, 'RUNNING');
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
    await this.emitThreadPausedEvent(thread);

    // 触发THREAD_STATE_CHANGED事件
    await this.emitThreadStateChangedEvent(thread, previousStatus, 'PAUSED');
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
    await this.emitThreadResumedEvent(thread);

    // 触发THREAD_STATE_CHANGED事件
    await this.emitThreadStateChangedEvent(thread, previousStatus, 'RUNNING');
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
      await this.emitThreadCompletedEvent(thread, result);
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
    await this.emitThreadCompletedEvent(thread, result);

    // 触发THREAD_STATE_CHANGED事件
    await this.emitThreadStateChangedEvent(thread, previousStatus, 'COMPLETED');
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
    await this.emitThreadFailedEvent(thread, error);

    // 触发THREAD_STATE_CHANGED事件
    await this.emitThreadStateChangedEvent(thread, previousStatus, 'FAILED');
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
    await this.emitThreadCancelledEvent(thread, reason);

    // 触发THREAD_STATE_CHANGED事件
    await this.emitThreadStateChangedEvent(thread, previousStatus, 'CANCELLED');
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

  /**
   * 触发THREAD_CANCELLED事件
   * @param thread Thread实例
   * @param reason 取消原因
   */
  private async emitThreadCancelledEvent(thread: Thread, reason?: string): Promise<void> {
    const event: ThreadCancelledEvent = {
      type: EventType.THREAD_CANCELLED,
      timestamp: now(),
      workflowId: thread.workflowId,
      threadId: thread.id,
      reason
    };
    await this.eventManager.emit(event);
  }

  /**
   * 触发THREAD_STATE_CHANGED事件
   * @param thread Thread实例
   * @param previousStatus 变更前状态
   * @param newStatus 变更后状态
   */
  private async emitThreadStateChangedEvent(thread: Thread, previousStatus: string, newStatus: string): Promise<void> {
    const event: ThreadStateChangedEvent = {
      type: EventType.THREAD_STATE_CHANGED,
      timestamp: now(),
      workflowId: thread.workflowId,
      threadId: thread.id,
      previousStatus,
      newStatus
    };
    await this.eventManager.emit(event);
  }

}