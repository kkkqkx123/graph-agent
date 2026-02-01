/**
 * Thread 生命周期协调器
 * 负责协调 Thread 的完整生命周期管理
 *
 * 核心职责：
 * 1. 协调 Thread 的创建、执行、暂停、恢复、停止等操作
 * 2. 管理 Thread 状态转换
 * 3. 触发相关事件
 *
 * 设计原则：
 * - 无状态设计：不持有任何实例变量
 * - 依赖注入：通过构造函数接收依赖
 * - 高层协调：组合其他组件完成复杂操作
 */

import type { ThreadOptions, ThreadResult } from '../../../types/thread';
import { type ThreadRegistry } from '../../services/thread-registry';
import { ThreadBuilder } from '../thread-builder';
import { ThreadExecutor } from '../thread-executor';
import { ThreadLifecycleManager } from '../thread-lifecycle-manager';
import type { EventManager } from '../../services/event-manager';
import type { WorkflowRegistry } from '../../services/workflow-registry';

/**
 * Thread 生命周期协调器类
 *
 * 职责：
 * - 协调 Thread 的完整生命周期管理
 * - 处理 Thread 的创建、执行、暂停、恢复、停止等操作
 * - 管理 Thread 状态转换
 *
 * 设计原则：
 * - 无状态设计：不持有任何实例变量
 * - 依赖注入：通过构造函数接收依赖
 * - 高层协调：组合其他组件完成复杂操作
 */
export class ThreadLifecycleCoordinator {
  constructor(
    private threadRegistry: ThreadRegistry = threadRegistry,
    private workflowRegistry: WorkflowRegistry = workflowRegistry,
    private eventManager: EventManager = eventManager
  ) { }

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
    const lifecycleManager = new ThreadLifecycleManager(this.eventManager);
    const threadExecutor = new ThreadExecutor(this.eventManager, this.workflowRegistry);

    // 步骤 1：构建 ThreadContext
    const threadContext = await threadBuilder.build(workflowId, options);

    // 步骤 2：注册 ThreadContext
    this.threadRegistry.register(threadContext);

    // 步骤 3：启动 Thread
    await lifecycleManager.startThread(threadContext.thread);

    // 步骤 4：执行 Thread
    const result = await threadExecutor.executeThread(threadContext);

    // 步骤 5：根据执行结果更新 Thread 状态
    const isSuccess = !result.error && threadContext.getStatus() === 'COMPLETED';

    if (isSuccess) {
      await lifecycleManager.completeThread(threadContext.thread, result);
    } else {
      await lifecycleManager.failThread(threadContext.thread, result.error || new Error('Execution failed'));
    }

    return result;
  }

  /**
   * 暂停 Thread 执行
   *
   * @param threadId Thread ID
   */
  async pauseThread(threadId: string): Promise<void> {
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      throw new Error(`ThreadContext not found: ${threadId}`);
    }

    const lifecycleManager = new ThreadLifecycleManager(this.eventManager);

    // 设置暂停标志
    threadContext.thread.shouldPause = true;

    // 等待执行器检测到暂停标志
    await new Promise(resolve => setTimeout(resolve, 100));

    // 更新线程状态
    await lifecycleManager.pauseThread(threadContext.thread);
  }

  /**
   * 恢复 Thread 执行
   *
   * @param threadId Thread ID
   * @returns 执行结果
   */
  async resumeThread(threadId: string): Promise<ThreadResult> {
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      throw new Error(`ThreadContext not found: ${threadId}`);
    }

    const lifecycleManager = new ThreadLifecycleManager(this.eventManager);
    const threadExecutor = new ThreadExecutor(this.eventManager, this.workflowRegistry);

    // 恢复线程状态
    await lifecycleManager.resumeThread(threadContext.thread);

    // 清除暂停标志
    threadContext.thread.shouldPause = false;

    // 继续执行
    return await threadExecutor.executeThread(threadContext);
  }

  /**
   * 停止 Thread 执行
   *
   * @param threadId Thread ID
   */
  async stopThread(threadId: string): Promise<void> {
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      throw new Error(`ThreadContext not found: ${threadId}`);
    }

    const lifecycleManager = new ThreadLifecycleManager(this.eventManager);

    // 设置停止标志
    threadContext.thread.shouldStop = true;

    // 等待执行器检测到停止标志
    await new Promise(resolve => setTimeout(resolve, 100));

    // 更新线程状态
    await lifecycleManager.cancelThread(threadContext.thread);
  }

  /**
   * 获取 ThreadRegistry
   *
   * @returns ThreadRegistry 实例
   */
  getThreadRegistry(): ThreadRegistry {
    return this.threadRegistry;
  }

  /**
   * 获取 EventManager
   *
   * @returns EventManager 实例
   */
  getEventManager(): EventManager {
    return this.eventManager;
  }
}