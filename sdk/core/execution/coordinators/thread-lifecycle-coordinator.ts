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
import { type ThreadRegistry } from '../../services/thread-registry';
import { ThreadBuilder } from '../thread-builder';
import { ThreadExecutor } from '../thread-executor';
import { ThreadLifecycleManager } from '../managers/thread-lifecycle-manager';
import type { EventManager } from '../../services/event-manager';
import type { WorkflowRegistry } from '../../services/workflow-registry';
import {
  waitForThreadPaused,
  waitForThreadCancelled
} from '../utils/event/event-waiter';
import { ThreadCascadeManager } from '../managers/thread-cascade-manager';

/**
 * Thread 生命周期协调器
 * 
 * 负责高层的流程编排和协调，组织多个组件完成复杂的Thread生命周期操作
 */
export class ThreadLifecycleCoordinator {
  private lifecycleManager: ThreadLifecycleManager;
  private cascadeManager: ThreadCascadeManager;

  constructor(
    private threadRegistry: ThreadRegistry = threadRegistry,
    private workflowRegistry: WorkflowRegistry = workflowRegistry,
    private eventManager: EventManager = eventManager
  ) {
    this.lifecycleManager = new ThreadLifecycleManager(this.eventManager);
    this.cascadeManager = new ThreadCascadeManager(this.threadRegistry, this.lifecycleManager);
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
    const threadExecutor = new ThreadExecutor(
      this.eventManager,
      this.workflowRegistry,
      options.userInteractionHandler
    );

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
    await waitForThreadPaused(this.eventManager, threadId, 5000);

    // 3. 完全委托给Manager进行状态转换和事件触发
    await this.lifecycleManager.pauseThread(thread);
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

    // 1. 完全委托给Manager进行状态转换和事件触发
    await this.lifecycleManager.resumeThread(thread);

    // 2. 清除暂停标志
    thread.shouldPause = false;

    // 3. 创建执行器并继续执行
    const threadExecutor = new ThreadExecutor(
      this.eventManager,
      this.workflowRegistry,
    );
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
    await waitForThreadCancelled(this.eventManager, threadId, 5000);

    // 3. 完全委托给Manager进行状态转换和事件触发
    await this.lifecycleManager.cancelThread(thread, 'user_requested');

    // 4. 级联取消子Threads
    await this.cascadeManager.cascadeCancel(threadId);
  }

}