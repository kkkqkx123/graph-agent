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
import type { ThreadOptions, ThreadResult, Thread, ThreadStatus } from '../../../types/thread';
import { type ThreadRegistry } from '../../services/thread-registry';
import { ThreadBuilder } from '../thread-builder';
import { ThreadExecutor } from '../thread-executor';
import { ThreadLifecycleManager } from '../thread-lifecycle-manager';
import type { EventManager } from '../../services/event-manager';
import type { WorkflowRegistry } from '../../services/workflow-registry';
import { EventType } from '../../../types/events';
import { validateTransition } from '../utils/thread-state-validator';
import { now } from '../../../utils';
import { globalMessageStorage } from '../../services/global-message-storage';

/**
 * Thread 生命周期协调器
 * 
 * 负责高层的流程编排和协调，组织多个组件完成复杂的Thread生命周期操作
 */
export class ThreadLifecycleCoordinator {
  private lifecycleManager: ThreadLifecycleManager;

  constructor(
    private threadRegistry: ThreadRegistry = threadRegistry,
    private workflowRegistry: WorkflowRegistry = workflowRegistry,
    private eventManager: EventManager = eventManager
  ) {
    this.lifecycleManager = new ThreadLifecycleManager(this.eventManager);
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
    const threadBuilder = new ThreadBuilder(this.workflowRegistry);
    const threadExecutor = new ThreadExecutor(this.eventManager, this.workflowRegistry);

    // 步骤 1：构建 ThreadContext
    const threadContext = await threadBuilder.build(workflowId, options);

    // 步骤 2：注册 ThreadContext
    this.threadRegistry.register(threadContext);

    // 步骤 3：启动 Thread
    await this.lifecycleManager.startThread(threadContext.thread);

    // 步骤 4：执行 Thread
    const result = await threadExecutor.executeThread(threadContext);

    // 步骤 5：根据执行结果更新 Thread 状态
    const isSuccess = !result.error && threadContext.getStatus() === 'COMPLETED';

    if (isSuccess) {
      await this.lifecycleManager.completeThread(threadContext.thread, result);
    } else {
      await this.lifecycleManager.failThread(threadContext.thread, result.error || new Error('Execution failed'));
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
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`ThreadContext not found`, 'ThreadContext', threadId);
    }

    const thread = threadContext.thread;

    // 1. 设置暂停标志，通知执行器应该暂停
    thread.shouldPause = true;

    // 2. 等待执行器在安全点处暂停并触发THREAD_PAUSED事件
    await this.eventManager.waitFor(
      EventType.THREAD_PAUSED,
      5000 // 5秒超时
    );

    // 3. 验证状态转换并调用Manager进行原子操作（状态转换+事件触发）
    validateTransition(thread.id, thread.status, 'PAUSED' as ThreadStatus);
    thread.status = 'PAUSED' as ThreadStatus;

    // 触发THREAD_STATE_CHANGED事件
    await this.eventManager.emit({
      type: EventType.THREAD_STATE_CHANGED,
      timestamp: now(),
      workflowId: thread.workflowId,
      threadId: thread.id,
      previousStatus: 'RUNNING',
      newStatus: 'PAUSED'
    });
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
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`ThreadContext not found`, 'ThreadContext', threadId);
    }

    const thread = threadContext.thread;

    // 1. 验证状态转换并更新状态
    validateTransition(thread.id, thread.status, 'RUNNING' as ThreadStatus);
    const previousStatus = thread.status;
    thread.status = 'RUNNING' as ThreadStatus;

    // 触发THREAD_RESUMED事件
    await this.eventManager.emit({
      type: EventType.THREAD_RESUMED,
      timestamp: now(),
      workflowId: thread.workflowId,
      threadId: thread.id
    });

    // 触发THREAD_STATE_CHANGED事件
    await this.eventManager.emit({
      type: EventType.THREAD_STATE_CHANGED,
      timestamp: now(),
      workflowId: thread.workflowId,
      threadId: thread.id,
      previousStatus,
      newStatus: 'RUNNING'
    });

    // 2. 清除暂停标志
    thread.shouldPause = false;

    // 3. 创建执行器并继续执行
    const threadExecutor = new ThreadExecutor(this.eventManager, this.workflowRegistry);
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
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`ThreadContext not found`, 'ThreadContext', threadId);
    }

    const thread = threadContext.thread;

    // 1. 设置停止标志，通知执行器应该停止
    thread.shouldStop = true;

    // 2. 等待执行器在安全点处停止并触发THREAD_CANCELLED事件
    await this.eventManager.waitFor(
      EventType.THREAD_CANCELLED,
      5000 // 5秒超时
    );

    // 3. 验证状态转换并更新Thread状态
    validateTransition(thread.id, thread.status, 'CANCELLED' as ThreadStatus);
    const previousStatus = thread.status;
    thread.status = 'CANCELLED' as ThreadStatus;
    thread.endTime = now();

    // 清理全局消息存储
    globalMessageStorage.removeReference(thread.id);

    // 触发THREAD_CANCELLED事件
    await this.eventManager.emit({
      type: EventType.THREAD_CANCELLED,
      timestamp: now(),
      workflowId: thread.workflowId,
      threadId: thread.id,
      reason: 'user_requested'
    });

    // 触发THREAD_STATE_CHANGED事件
    await this.eventManager.emit({
      type: EventType.THREAD_STATE_CHANGED,
      timestamp: now(),
      workflowId: thread.workflowId,
      threadId: thread.id,
      previousStatus,
      newStatus: 'CANCELLED'
    });

    // 4. 级联取消子Threads
    const childThreadIds = threadContext.getMetadata()?.childThreadIds as string[] || [];
    for (const childThreadId of childThreadIds) {
      const childContext = this.threadRegistry.get(childThreadId);
      if (childContext) {
        const childThread = childContext.thread;
        const childStatus = childContext.getStatus();

        // 只取消运行中或暂停的子线程
        if (childStatus === 'RUNNING' || childStatus === 'PAUSED') {
          try {
            await this.cancelThreadInternal(childThread);
          } catch (error) {
            // 继续取消其他子线程，不中断
            console.error(`Failed to cancel child thread ${childThreadId}:`, error);
          }
        }
      }
    }
  }

  /**
   * 内部方法：取消单个Thread（不级联）
   * 
   * @param thread Thread实例
   * @private
   */
  private async cancelThreadInternal(thread: Thread): Promise<void> {
    validateTransition(thread.id, thread.status, 'CANCELLED' as ThreadStatus);
    const previousStatus = thread.status;
    thread.status = 'CANCELLED' as ThreadStatus;
    thread.endTime = now();

    globalMessageStorage.removeReference(thread.id);

    await this.eventManager.emit({
      type: EventType.THREAD_CANCELLED,
      timestamp: now(),
      workflowId: thread.workflowId,
      threadId: thread.id,
      reason: 'parent_cancelled'
    });

    await this.eventManager.emit({
      type: EventType.THREAD_STATE_CHANGED,
      timestamp: now(),
      workflowId: thread.workflowId,
      threadId: thread.id,
      previousStatus,
      newStatus: 'CANCELLED'
    });
  }

}