/**
 * ThreadCoordinator - Thread 协调器（执行模块主类）
 * 负责协调 Thread 的创建、执行、管理和生命周期
 * 作为执行模块的统一入口，提供完整的 Thread 管理功能
 *
 * 职责：
 * - Thread 的创建和注册
 * - Thread 的执行协调
 * - Thread 的生命周期管理（暂停、恢复、停止）
 * - Fork/Join/Copy 操作的协调
 * - 变量管理
 * - 事件发布
 * - 触发器管理
 *
 * 设计原则：
 * - 作为执行模块的主类，协调各个组件
 * - 使用 ThreadOperations 进行无状态操作
 * - 使用 ThreadExecutor 执行 Thread
 * - 使用 ThreadLifecycleManager 管理生命周期
 * - 使用 TriggerManager 管理触发器
 */

import type { ThreadOptions, ThreadResult } from '../../types/thread';
import type { ForkConfig, JoinResult } from './thread-operations/thread-operations';
import { ThreadRegistry } from '../registry/thread-registry';
import { ThreadBuilder } from './thread-builder';
import { ThreadExecutor } from './thread-executor';
import { ThreadLifecycleManager } from './thread-lifecycle-manager';
import { EventManager } from './managers/event-manager';
import { TriggerManager } from './managers/trigger-manager';
import { NotFoundError, ValidationError } from '../../types/errors';
import { EventType } from '../../types/events';
import type {
  ThreadForkedEvent,
  ThreadJoinedEvent,
  ThreadCopiedEvent
} from '../../types/events';
import { fork, join, copy } from './thread-operations/thread-operations';
import { now } from '../../utils';

/**
 * ThreadCoordinator - Thread 协调器（执行模块主类）
 *
 * 作为执行模块的统一入口，协调 Thread 的创建、执行和管理
 */
export class ThreadCoordinator {
  private threadRegistry: ThreadRegistry;
  private threadBuilder: ThreadBuilder;
  private threadExecutor: ThreadExecutor;
  private lifecycleManager: ThreadLifecycleManager;
  private eventManager: EventManager;
  private triggerManager: TriggerManager;

  constructor(workflowRegistry?: any) {
    this.threadRegistry = new ThreadRegistry();
    this.threadBuilder = new ThreadBuilder(workflowRegistry);
    this.eventManager = new EventManager();
    this.triggerManager = new TriggerManager();
    this.lifecycleManager = new ThreadLifecycleManager(this.eventManager);
    // ✅ 不再传递 workflowRegistry 给 ThreadExecutor，触发器由 ThreadBuilder 在创建 ThreadContext 时注册
    this.threadExecutor = new ThreadExecutor(this.eventManager, this.triggerManager);
  }

  /**
   * 从工作流ID执行工作流
   * @param workflowId 工作流ID
   * @param options 执行选项
   * @returns 执行结果
   */
  async execute(workflowId: string, options: ThreadOptions = {}): Promise<ThreadResult> {
    // 步骤1：构建 ThreadContext
    const threadContext = await this.threadBuilder.build(workflowId, options);

    // 步骤2：注册 ThreadContext
    this.threadRegistry.register(threadContext);

    // 步骤3：启动 Thread
    await this.lifecycleManager.startThread(threadContext.thread);

    // 步骤4：执行 Thread
    const result = await this.threadExecutor.executeThread(threadContext);

    // 步骤5：根据执行结果更新 Thread 状态
    // 判断执行是否成功：没有错误且Thread状态为COMPLETED
    const isSuccess = !result.error && threadContext.getStatus() === 'COMPLETED';

    if (isSuccess) {
      await this.lifecycleManager.completeThread(threadContext.thread, result);
    } else {
      await this.lifecycleManager.failThread(threadContext.thread, result.error || new Error('Execution failed'));
    }

    return result;
  }

  /**
   * Fork 操作 - 创建子 thread
   * @param parentThreadId 父线程 ID
   * @param forkConfig Fork 配置
   * @returns 子线程 ID 数组
   */
  async fork(parentThreadId: string, forkConfig: ForkConfig): Promise<string[]> {
    // 步骤1：获取父线程上下文
    const parentThreadContext = this.threadRegistry.get(parentThreadId);
    if (!parentThreadContext) {
      throw new NotFoundError(`Parent thread not found: ${parentThreadId}`, 'Thread', parentThreadId);
    }

    // 步骤2：使用 ThreadOperations 创建子线程
    const childThreadContext = await fork(parentThreadContext, forkConfig, this.threadBuilder);

    // 步骤3：注册子线程
    this.threadRegistry.register(childThreadContext);

    // 步骤4：触发 THREAD_FORKED 事件
    const forkedEvent: ThreadForkedEvent = {
      type: EventType.THREAD_FORKED,
      timestamp: now(),
      workflowId: parentThreadContext.getWorkflowId(),
      threadId: parentThreadId,
      parentThreadId,
      childThreadIds: [childThreadContext.getThreadId()]
    };
    await this.eventManager.emit(forkedEvent);

    // 步骤5：返回子线程 ID 数组
    return [childThreadContext.getThreadId()];
  }

  /**
   * Join 操作 - 合并子 thread 结果
   * @param parentThreadId 父线程 ID
   * @param childThreadIds 子线程 ID 数组
   * @param joinStrategy Join 策略
   * @param timeout 超时时间（秒）
   * @returns Join 结果
   */
  async join(
    parentThreadId: string,
    childThreadIds: string[],
    joinStrategy: 'ALL_COMPLETED' | 'ANY_COMPLETED' | 'ALL_FAILED' | 'ANY_FAILED' | 'SUCCESS_COUNT_THRESHOLD' = 'ALL_COMPLETED',
    timeout: number = 60
  ): Promise<JoinResult> {
    // 步骤1：获取父线程上下文
    const parentThreadContext = this.threadRegistry.get(parentThreadId);
    if (!parentThreadContext) {
      throw new NotFoundError(`Parent thread not found: ${parentThreadId}`, 'Thread', parentThreadId);
    }

    // 步骤2：使用 ThreadOperations 执行 Join
    const joinResult = await join(
      childThreadIds,
      joinStrategy,
      this.threadRegistry,
      timeout * 1000
    );

    // 步骤3：触发 THREAD_JOINED 事件
    const joinedEvent: ThreadJoinedEvent = {
      type: EventType.THREAD_JOINED,
      timestamp: now(),
      workflowId: parentThreadContext.getWorkflowId(),
      threadId: parentThreadId,
      parentThreadId,
      childThreadIds,
      joinStrategy
    };
    await this.eventManager.emit(joinedEvent);

    // 步骤4：返回 Join 结果
    return joinResult;
  }

  /**
   * Copy 操作 - 创建 thread 副本
   * @param sourceThreadId 源线程 ID
   * @returns 副本线程 ID
   */
  async copy(sourceThreadId: string): Promise<string> {
    // 步骤1：获取源线程上下文
    const sourceThreadContext = this.threadRegistry.get(sourceThreadId);
    if (!sourceThreadContext) {
      throw new NotFoundError(`Source thread not found: ${sourceThreadId}`, 'Thread', sourceThreadId);
    }

    // 步骤2：使用 ThreadOperations 创建副本
    const copiedThreadContext = await copy(sourceThreadContext, this.threadBuilder);

    // 步骤3：注册副本线程
    this.threadRegistry.register(copiedThreadContext);

    // 步骤4：触发 THREAD_COPIED 事件
    const copiedEvent: ThreadCopiedEvent = {
      type: EventType.THREAD_COPIED,
      timestamp: now(),
      workflowId: sourceThreadContext.getWorkflowId(),
      threadId: sourceThreadId,
      sourceThreadId,
      copiedThreadId: copiedThreadContext.getThreadId()
    };
    await this.eventManager.emit(copiedEvent);

    // 步骤5：返回副本线程 ID
    return copiedThreadContext.getThreadId();
  }

  /**
   * 暂停 Thread 执行
   * @param threadId Thread ID
   */
  async pauseThread(threadId: string): Promise<void> {
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`ThreadContext not found: ${threadId}`, 'ThreadContext', threadId);
    }

    // 设置暂停标志
    threadContext.thread.shouldPause = true;

    // 等待执行器检测到暂停标志
    // 注意：这里需要等待执行器检测到暂停标志并退出执行循环
    // 实际实现中可能需要更复杂的同步机制
    await new Promise(resolve => setTimeout(resolve, 100));

    // 更新线程状态
    await this.lifecycleManager.pauseThread(threadContext.thread);
  }

  /**
   * 恢复 Thread 执行
   * @param threadId Thread ID
   * @returns 执行结果
   */
  async resumeThread(threadId: string): Promise<ThreadResult> {
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`ThreadContext not found: ${threadId}`, 'ThreadContext', threadId);
    }

    // 恢复线程状态
    await this.lifecycleManager.resumeThread(threadContext.thread);

    // 清除暂停标志
    threadContext.thread.shouldPause = false;

    // 继续执行
    return await this.threadExecutor.executeThread(threadContext);
  }

  /**
   * 停止 Thread 执行
   * @param threadId Thread ID
   */
  async stopThread(threadId: string): Promise<void> {
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`ThreadContext not found: ${threadId}`, 'ThreadContext', threadId);
    }

    // 设置停止标志
    threadContext.thread.shouldStop = true;

    // 等待执行器检测到停止标志
    await new Promise(resolve => setTimeout(resolve, 100));

    // 更新线程状态
    await this.lifecycleManager.cancelThread(threadContext.thread);
  }

  /**
   * 设置 Thread 变量
   * @param threadId Thread ID
   * @param variables 变量对象
   */
  async setVariables(threadId: string, variables: Record<string, any>): Promise<void> {
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`ThreadContext not found: ${threadId}`, 'ThreadContext', threadId);
    }

    // 使用ThreadContext的updateVariable方法更新已定义的变量
    for (const [name, value] of Object.entries(variables)) {
      threadContext.updateVariable(name, value);
    }
  }

  /**
   * 获取 Thread
   * @param threadId Thread ID
   * @returns Thread 实例
   */
  getThread(threadId: string) {
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`Thread not found: ${threadId}`, 'Thread', threadId);
    }
    return threadContext.thread;
  }

  /**
   * 获取 ThreadContext
   * @param threadId Thread ID
   * @returns ThreadContext 实例
   */
  getThreadContext(threadId: string) {
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`ThreadContext not found: ${threadId}`, 'ThreadContext', threadId);
    }
    return threadContext;
  }

  /**
   * 获取 ThreadRegistry
   * @returns ThreadRegistry 实例
   */
  getThreadRegistry(): ThreadRegistry {
    return this.threadRegistry;
  }

  /**
   * 获取 EventManager
   * @returns EventManager 实例
   */
  getEventManager(): EventManager {
    return this.eventManager;
  }

  /**
   * 获取 ThreadLifecycleManager
   * @returns ThreadLifecycleManager 实例
   */
  getLifecycleManager(): ThreadLifecycleManager {
    return this.lifecycleManager;
  }

  /**
   * 获取 ThreadExecutor
   * @returns ThreadExecutor 实例
   */
  getThreadExecutor(): ThreadExecutor {
    return this.threadExecutor;
  }

  /**
   * 获取 TriggerManager
   * @returns TriggerManager 实例
   */
  getTriggerManager(): TriggerManager {
    return this.triggerManager;
  }
}