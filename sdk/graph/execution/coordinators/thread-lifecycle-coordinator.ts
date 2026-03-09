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

import { ThreadContextNotFoundError, RuntimeValidationError } from '@modular-agent/types';
import type { ThreadOptions, ThreadResult } from '@modular-agent/types';
import { ThreadStatus } from '@modular-agent/types';
import { ThreadBuilder } from '../thread-builder.js';
import { ThreadExecutor } from '../thread-executor.js';
import { ThreadLifecycleManager } from '../managers/thread-lifecycle-manager.js';
import { ThreadCascadeManager } from '../managers/thread-cascade-manager.js';
import type { ThreadRegistry } from '../../services/thread-registry.js';
import type { WorkflowRegistry } from '../../services/workflow-registry.js';
import { LifecycleCapable } from '../../../core/execution/managers/lifecycle-capable.js';

/**
 * Thread 生命周期协调器
 *
 * 负责高层的流程编排和协调，组织多个组件完成复杂的Thread生命周期操作
 */
export class ThreadLifecycleCoordinator implements LifecycleCapable<{}> {
  constructor(
    private readonly threadRegistry: ThreadRegistry,
    private readonly threadLifecycleManager: ThreadLifecycleManager,
    private readonly threadCascadeManager: ThreadCascadeManager,
    private readonly threadBuilder: ThreadBuilder,
    private readonly threadExecutor: ThreadExecutor,
    private readonly workflowRegistry: WorkflowRegistry
  ) { }


  /**
   * 执行 Thread
   *
   * @param workflowId 工作流 ID
   * @param options 执行选项
   * @returns 执行结果
   */
  async execute(workflowId: string, options: ThreadOptions = {}): Promise<ThreadResult> {
    // 步骤 1：构建 ThreadEntity
    const threadEntity = await this.threadBuilder.build(workflowId, options);

    // 步骤 2：注册 ThreadEntity
    this.threadRegistry.register(threadEntity);

    // 步骤 3：启动 Thread
    await this.threadLifecycleManager.startThread(threadEntity.getThread());

    // 步骤 4：执行 Thread
    const result = await this.threadExecutor.executeThread(threadEntity);

    // 步骤 5：根据执行结果更新 Thread 状态
    const status = result.metadata?.status;
    const isSuccess = status === 'COMPLETED';

    if (isSuccess) {
      await this.threadLifecycleManager.completeThread(threadEntity.getThread(), result);
    } else {
      // 从 errors 数组获取第一个错误
      const errors = threadEntity.getErrors();
      const lastError = errors.length > 0 ? errors[errors.length - 1] : new Error('Execution failed');
      await this.threadLifecycleManager.failThread(threadEntity.getThread(), lastError);
    }

    return result;
  }

  /**
   * 暂停 Thread 执行
   *
   * 流程：
   * 1. 获取Thread上下文
   * 2. 设置暂停标志
   * 3. 触发 AbortController 以中断正在进行的异步操作
   * 4. 更新Thread状态
   *
   * 注意：
   * - 不再等待执行器响应，执行器会在安全点检测到暂停标志并自行处理
   * - AbortController 会中断正在进行的 LLM 调用和工具执行
   * - 执行器会触发 THREAD_PAUSED 事件
   *
   * @param threadId Thread ID
   * @throws NotFoundError ThreadContext不存在
   */
  async pauseThread(threadId: string): Promise<void> {
    const threadEntity = this.threadRegistry.get(threadId);
    if (!threadEntity) {
      throw new ThreadContextNotFoundError(`ThreadEntity not found`, threadId);
    }

    const thread = threadEntity.getThread();

    // 1. 请求暂停（InterruptionManager 会自动触发 AbortController）
    threadEntity.interrupt('PAUSE');

    // 2. 完全委托给Manager进行状态转换和事件触发
    await this.threadLifecycleManager.pauseThread(thread);
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
    const threadEntity = this.threadRegistry.get(threadId);
    if (!threadEntity) {
      throw new ThreadContextNotFoundError(`ThreadEntity not found`, threadId);
    }

    const thread = threadEntity.getThread();

    // 1. 完全委托给Manager进行状态转换和事件触发
    await this.threadLifecycleManager.resumeThread(thread);

    // 2. 重置中断状态（包括 AbortController）
    threadEntity.resetInterrupt();

    // 3. 继续执行
    return await this.threadExecutor.executeThread(threadEntity);
  }

  /**
   * 停止 Thread 执行
   *
   * 流程：
   * 1. 获取Thread上下文
   * 2. 设置停止标志
   * 3. 触发 AbortController 以中断正在进行的异步操作
   * 4. 更新Thread状态为CANCELLED
   * 5. 级联取消子Threads
   *
   * 注意：
   * - 不再等待执行器响应，执行器会在安全点检测到停止标志并自行处理
   * - AbortController 会中断正在进行的 LLM 调用和工具执行
   * - 执行器会触发 THREAD_CANCELLED 事件
   *
   * @param threadId Thread ID
   * @throws NotFoundError ThreadContext不存在
   */
  async stopThread(threadId: string): Promise<void> {
    const threadEntity = this.threadRegistry.get(threadId);
    if (!threadEntity) {
      throw new ThreadContextNotFoundError(`ThreadEntity not found`, threadId);
    }

    const thread = threadEntity.getThread();

    // 1. 请求停止（InterruptionManager 会自动触发 AbortController）
    threadEntity.interrupt('STOP');

    // 2. 完全委托给Manager进行状态转换和事件触发
    await this.threadLifecycleManager.cancelThread(thread, 'user_requested');

    // 3. 级联取消子Threads
    await this.threadCascadeManager.cascadeCancel(threadId);
  }


  /**
   * 强制设置线程状态（直接委托给 ThreadLifecycleManager）
   * 
   * 注意：这是应急操作，通常应该通过正常生命周期方法（pauseThread/resumeThread/stopThread）
   * 来管理线程状态。只有在那些方法无法正常工作时才使用此方法。
   * 
   * @param threadId 线程ID
   * @param status 新的状态
   */
  async forceSetThreadStatus(threadId: string, status: ThreadStatus): Promise<void> {
    const threadEntity = this.threadRegistry.get(threadId);
    if (!threadEntity) {
      throw new ThreadContextNotFoundError(`ThreadEntity not found`, threadId);
    }

    const thread = threadEntity.getThread();

    // 根据目标状态委托给对应的生命周期管理方法
    switch (status) {
      case 'PAUSED':
        await this.threadLifecycleManager.pauseThread(thread);
        break;
      case 'RUNNING':
        await this.threadLifecycleManager.resumeThread(thread);
        break;
      case 'CANCELLED':
        await this.threadLifecycleManager.cancelThread(thread, 'forced');
        break;
      default:
        throw new RuntimeValidationError(
          `Unsupported status for forceSetThreadStatus: ${status}`,
          { operation: 'forceSetThreadStatus', field: 'status', value: status }
        );
    }
  }

  /**
   * 强制暂停线程（委托给 ThreadLifecycleManager）
   * @param threadId 线程ID
   */
  async forcePauseThread(threadId: string): Promise<void> {
    await this.forceSetThreadStatus(threadId, 'PAUSED');
  }

  /**
   * 强制取消线程（委托给 ThreadLifecycleManager）
   * @param threadId 线程ID
   * @param reason 取消原因
   */
  async forceCancelThread(threadId: string, reason?: string): Promise<void> {
    const threadEntity = this.threadRegistry.get(threadId);
    if (!threadEntity) {
      throw new ThreadContextNotFoundError(`ThreadEntity not found`, threadId);
    }

    // 直接委托给 Manager 处理状态转换和事件触发
    await this.threadLifecycleManager.cancelThread(threadEntity.getThread(), reason || 'forced_cancel');
  }

  // ============================================================
  // LifecycleCapable 接口实现
  // ============================================================

  /**
   * 清理资源
   * ThreadLifecycleCoordinator 不持有需要清理的资源
   */
  async cleanup(): Promise<void> {
    // 不需要清理
  }

  /**
   * 创建状态快照
   * ThreadLifecycleCoordinator 无状态，返回空对象
   */
  createSnapshot(): {} {
    return {};
  }

  /**
   * 从快照恢复状态
   * ThreadLifecycleCoordinator 无状态，无需恢复
   */
  async restoreFromSnapshot(snapshot: {}): Promise<void> {
    // 无需恢复
  }
}
