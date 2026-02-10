/**
 * Thread 生命周期协调器
 * 
 * 职责：
 * - 协调Thread的完整生命周期管理
 * - 编排Thread的创建、执行、暂停、恢复、停止等复杂操作
 * - 处理多步骤流程和事件等待逻辑
 * 
 * 设计原则：
 * - 无状态设计：不持有任何实例变量
 * - 依赖注入：通过构造函数接收依赖
 * - 流程编排：处理复杂的多步骤操作和事件同步
 * - 委托模式：使用ThreadLifecycleManager进行原子状态操作
 * 
 * 调用路径：
 * - 外部调用：ThreadExecutorAPI → ThreadLifecycleCoordinator
 * - 触发器处理函数应调用Coordinator而不是Manager
 * - Manager只作为内部实现细节供Coordinator使用
 */

import { NotFoundError } from '../../../types/errors';
import type { ThreadOptions, ThreadResult } from '../../../types/thread';
import { ThreadStatus } from '../../../types/thread';
import { ThreadBuilder } from '../thread-builder';
import { ThreadExecutor } from '../thread-executor';
import { ThreadLifecycleManager } from '../managers/thread-lifecycle-manager';
import {
  waitForThreadPaused,
  waitForThreadCancelled
} from '../utils/event/event-waiter';
import { ThreadCascadeManager } from '../managers/thread-cascade-manager';
import { ExecutionContext } from '../context/execution-context';
import { now } from '../../../utils';
import { globalMessageStorage } from '../../services/global-message-storage';
import {
  buildThreadCompletedEvent,
  buildThreadFailedEvent,
  buildThreadCancelledEvent
} from '../utils/event/event-builder';
import { emit } from '../utils/event/event-emitter';

/**
 * Thread 生命周期协调器
 * 
 * 负责高层的流程编排和协调，组织多个组件完成复杂的Thread生命周期操作
 */
export class ThreadLifecycleCoordinator {
  private executionContext: ExecutionContext;

  constructor(
    executionContext?: ExecutionContext
  ) {
    this.executionContext = executionContext || ExecutionContext.createDefault();
  }

  /**
   * 获取 LifecycleManager
   * @returns ThreadLifecycleManager 实例
   */
  private getLifecycleManager(): ThreadLifecycleManager {
    return this.executionContext.getThreadLifecycleManager();
  }

  /**
   * 执行 Thread
   *
   * @param workflowId 工作流 ID
   * @param options 执行选项
   * @returns 执行结果
   */
  async execute(workflowId: string, options: ThreadOptions = {}): Promise<ThreadResult> {
    // 创建必要的组件
    const threadBuilder = new ThreadBuilder(this.executionContext.getWorkflowRegistry(), this.executionContext);
    const threadExecutor = new ThreadExecutor(this.executionContext);

    // 步骤 1：构建 ThreadContext
    const threadContext = await threadBuilder.build(workflowId, options);

    // 步骤 2：注册 ThreadContext
    this.executionContext.getThreadRegistry().register(threadContext);

    // 步骤 3：启动 Thread
    await this.getLifecycleManager().startThread(threadContext.thread);

    // 步骤 4：执行 Thread
    const result = await threadExecutor.executeThread(threadContext);

    // 步骤 5：根据执行结果更新 Thread 状态
    const status = result.metadata?.status;
    const isSuccess = status === ThreadStatus.COMPLETED;

    if (isSuccess) {
      await this.getLifecycleManager().completeThread(threadContext.thread, result);
    } else {
      // 从 errors 数组获取第一个错误
      const errors = threadContext.getErrors();
      const lastError = errors.length > 0 ? errors[errors.length - 1] : new Error('Execution failed');
      await this.getLifecycleManager().failThread(threadContext.thread, lastError);
    }

    return result;
  }

  /**
   * 暂停 Thread 执行
   * 
   * 流程：
   * 1. 获取Thread上下文
   * 2. 设置暂停标志
   * 3. 等待执行器响应暂停完成
   * 4. 更新Thread状态
   *
   * @param threadId Thread ID
   * @throws NotFoundError ThreadContext不存在
   */
  async pauseThread(threadId: string): Promise<void> {
    const threadContext = this.executionContext.getThreadRegistry().get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`ThreadContext not found`, 'ThreadContext', threadId);
    }

    const thread = threadContext.thread;

    // 1. 设置暂停标志，通知执行器应该暂停
    threadContext.setShouldPause(true);

    // 2. 等待执行器在安全点处暂停并触发THREAD_PAUSED事件
    await waitForThreadPaused(this.executionContext.getEventManager(), threadId, 5000);

    // 3. 完全委托给Manager进行状态转换和事件触发
    await this.getLifecycleManager().pauseThread(thread);
  }

  /**
   * 恢复 Thread 执行
   * 
   * 流程：
   * 1. 获取Thread上下文
   * 2. 更新Thread状态为RUNNING
   * 3. 清除暂停标志
   * 4. 继续执行Thread
   *
   * @param threadId Thread ID
   * @returns 执行结果
   * @throws NotFoundError ThreadContext不存在
   */
  async resumeThread(threadId: string): Promise<ThreadResult> {
    const threadContext = this.executionContext.getThreadRegistry().get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`ThreadContext not found`, 'ThreadContext', threadId);
    }

    const thread = threadContext.thread;

    // 1. 完全委托给Manager进行状态转换和事件触发
    await this.getLifecycleManager().resumeThread(thread);

    // 2. 清除暂停标志
    threadContext.setShouldPause(false);

    // 3. 创建执行器并继续执行
    const threadExecutor = new ThreadExecutor(this.executionContext);
    return await threadExecutor.executeThread(threadContext);
  }

  /**
   * 停止 Thread 执行
   * 
   * 流程：
   * 1. 获取Thread上下文
   * 2. 设置停止标志
   * 3. 等待执行器响应停止完成
   * 4. 更新Thread状态为CANCELLED
   * 5. 级联取消子Threads
   *
   * @param threadId Thread ID
   * @throws NotFoundError ThreadContext不存在
   */
  async stopThread(threadId: string): Promise<void> {
    const threadContext = this.executionContext.getThreadRegistry().get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`ThreadContext not found`, 'ThreadContext', threadId);
    }

    const thread = threadContext.thread;

    // 1. 设置停止标志，通知执行器应该停止
    threadContext.setShouldStop(true);

    // 2. 等待执行器在安全点处停止并触发THREAD_CANCELLED事件
    await waitForThreadCancelled(this.executionContext.getEventManager(), threadId, 5000);

    // 3. 完全委托给Manager进行状态转换和事件触发
    await this.getLifecycleManager().cancelThread(thread, 'user_requested');

    // 4. 级联取消子Threads
    await this.getCascadeManager().cascadeCancel(threadId);
  }

  /**
   * 获取 CascadeManager
   * @returns ThreadCascadeManager 实例
   */
  private getCascadeManager(): ThreadCascadeManager {
    return this.executionContext.getCascadeManager();
  }

  /**
   * 强制设置线程状态（不依赖执行器）
   * @param threadId 线程ID
   * @param status 新的状态
   */
  async forceSetThreadStatus(threadId: string, status: ThreadStatus): Promise<void> {
    const threadContext = this.executionContext.getThreadRegistry().get(threadId);
    if (!threadContext) {
      throw new Error(`ThreadContext not found for threadId: ${threadId}`);
    }

    // 验证状态转换合法性
    const { validateTransition } = await import('../utils/thread-state-validator');
    validateTransition(threadId, threadContext.getStatus() as ThreadStatus, status);

    // 直接设置状态
    threadContext.setStatus(status);

    // 如果是终止状态，设置结束时间并清理
    if ([ThreadStatus.COMPLETED, ThreadStatus.FAILED, ThreadStatus.CANCELLED, ThreadStatus.TIMEOUT].includes(status)) {
      threadContext.setEndTime(now());
      globalMessageStorage.removeReference(threadId);

      // 触发相应的终止事件
      let event;
      switch (status) {
        case ThreadStatus.COMPLETED:
          event = buildThreadCompletedEvent(threadContext.thread, { success: true, output: threadContext.getOutput() } as any);
          break;
        case ThreadStatus.FAILED:
          event = buildThreadFailedEvent(threadContext.thread, new Error('Thread failed'));
          break;
        case ThreadStatus.CANCELLED:
          event = buildThreadCancelledEvent(threadContext.thread, 'forced_cancel');
          break;
      }

      if (event) {
        await emit(this.executionContext.getEventManager(), event);
      }
    }
  }

  /**
   * 强制暂停线程（不依赖执行器）
   * @param threadId 线程ID
   */
  async forcePauseThread(threadId: string): Promise<void> {
    await this.forceSetThreadStatus(threadId, ThreadStatus.PAUSED);
  }

  /**
   * 强制取消线程（不依赖执行器）
   * @param threadId 线程ID
   * @param reason 取消原因
   */
  async forceCancelThread(threadId: string, reason?: string): Promise<void> {
    const threadContext = this.executionContext.getThreadRegistry().get(threadId);
    if (!threadContext) {
      throw new Error(`ThreadContext not found for threadId: ${threadId}`);
    }

    // 设置状态
    threadContext.setStatus(ThreadStatus.CANCELLED);

    // 设置结束时间
    threadContext.setEndTime(now());

    // 清理全局消息存储
    globalMessageStorage.removeReference(threadId);

    // 触发取消事件
    const cancelledEvent = buildThreadCancelledEvent(threadContext.thread, reason || 'forced_cancel');
    await emit(this.executionContext.getEventManager(), cancelledEvent);
  }
}