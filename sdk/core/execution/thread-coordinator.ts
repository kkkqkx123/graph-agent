/**
 * ThreadCoordinator - Thread 协调器
 * 负责 Fork/Join 操作，协调子 thread 的执行和合并
 */

import type { Thread, ThreadResult } from '../../types/thread';
import { ThreadRegistry } from './thread-registry';
import { ThreadBuilder } from './thread-builder';
import { ThreadExecutor } from './thread-executor';
import { EventManager } from './event-manager';
import { ExecutionError, TimeoutError, ValidationError } from '../../types/errors';
import { EventType } from '../../types/events';
import type { ThreadForkedEvent, ThreadJoinedEvent, ThreadCopiedEvent } from '../../types/events';

/**
 * Join 策略
 */
export type JoinStrategy = 'ALL_COMPLETED' | 'ANY_COMPLETED' | 'ALL_FAILED' | 'ANY_FAILED' | 'SUCCESS_COUNT_THRESHOLD';

/**
 * Join 结果
 */
export interface JoinResult {
  success: boolean;
  output: any;
  completedThreads: Thread[];
  failedThreads: Thread[];
}

/**
 * ThreadCoordinator - Thread 协调器
 */
export class ThreadCoordinator {
  constructor(
    private threadRegistry: ThreadRegistry,
    private threadBuilder: ThreadBuilder,
    private threadExecutor: ThreadExecutor,
    private eventManager: EventManager
  ) { }

  /**
   * Fork 操作 - 创建子 thread
   * @param parentThreadId 父线程 ID
   * @param forkId Fork 操作 ID
   * @param forkStrategy Fork 策略（serial 或 parallel）
   * @returns 子线程 ID 数组
   */
  async fork(parentThreadId: string, forkId: string, forkStrategy: 'serial' | 'parallel' = 'serial'): Promise<string[]> {
    // 步骤1：验证 Fork 配置
    if (!forkId) {
      throw new ValidationError('Fork config must have forkId', 'fork.forkId');
    }

    if (forkStrategy !== 'serial' && forkStrategy !== 'parallel') {
      throw new ValidationError(`Invalid forkStrategy: ${forkStrategy}`, 'fork.forkStrategy');
    }

    // 步骤2：获取父 thread
    const parentThread = this.threadRegistry.get(parentThreadId);
    if (!parentThread) {
      throw new ExecutionError(`Parent thread not found: ${parentThreadId}`, undefined, parentThreadId);
    }

    // 步骤3：获取 Fork 节点的出边
    // 注意：这里需要从 workflow context 获取，暂时简化处理
    // 实际实现中需要根据 forkId 找到对应的 Fork 节点，然后获取其出边
    // 这里暂时返回空数组，需要后续完善
    const childThreadIds: string[] = [];

    // 步骤4：触发 THREAD_FORKED 事件
    const forkedEvent: ThreadForkedEvent = {
      type: EventType.THREAD_FORKED,
      timestamp: Date.now(),
      workflowId: parentThread.workflowId,
      threadId: parentThreadId,
      parentThreadId,
      childThreadIds
    };
    await this.eventManager.emit(forkedEvent);

    // 步骤5：返回子 thread ID 数组
    return childThreadIds;
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
    joinStrategy: JoinStrategy = 'ALL_COMPLETED',
    timeout: number = 60
  ): Promise<JoinResult> {
    // 步骤1：验证 Join 配置
    if (!joinStrategy) {
      throw new ValidationError('Join config must have joinStrategy', 'join.joinStrategy');
    }

    if (joinStrategy === 'SUCCESS_COUNT_THRESHOLD') {
      // 需要额外的 threshold 参数，这里暂时简化处理
    }

    if (!timeout || timeout <= 0) {
      throw new ValidationError('Join config must have valid timeout', 'join.timeout');
    }

    // 步骤2：等待子 thread 完成
    const { completedThreads, failedThreads } = await this.waitForCompletion(
      childThreadIds,
      joinStrategy,
      timeout * 1000
    );

    // 步骤3：根据策略判断是否继续
    let shouldContinue = false;
    switch (joinStrategy) {
      case 'ALL_COMPLETED':
        shouldContinue = failedThreads.length === 0;
        break;
      case 'ANY_COMPLETED':
        shouldContinue = completedThreads.length > 0;
        break;
      case 'ALL_FAILED':
        shouldContinue = failedThreads.length === childThreadIds.length;
        break;
      case 'ANY_FAILED':
        shouldContinue = failedThreads.length > 0;
        break;
      case 'SUCCESS_COUNT_THRESHOLD':
        // 需要额外的 threshold 参数，这里暂时简化处理
        shouldContinue = completedThreads.length > 0;
        break;
    }

    if (!shouldContinue) {
      throw new ExecutionError(
        `Join condition not met: ${joinStrategy}`,
        undefined,
        parentThreadId
      );
    }

    // 步骤4：合并子 thread 结果
    const output = this.mergeResults(completedThreads, joinStrategy);

    // 步骤5：触发 THREAD_JOINED 事件
    const joinedEvent: ThreadJoinedEvent = {
      type: EventType.THREAD_JOINED,
      timestamp: Date.now(),
      workflowId: parentThreadId,
      threadId: parentThreadId,
      parentThreadId,
      childThreadIds,
      joinStrategy
    };
    await this.eventManager.emit(joinedEvent);

    // 步骤6：返回合并结果
    return {
      success: true,
      output,
      completedThreads,
      failedThreads
    };
  }

  /**
   * 等待子 thread 完成
   * @param childThreadIds 子线程 ID 数组
   * @param joinStrategy Join 策略
   * @param timeout 超时时间（毫秒）
   * @returns 完成的和失败的线程数组
   */
  private async waitForCompletion(
    childThreadIds: string[],
    joinStrategy: JoinStrategy,
    timeout: number
  ): Promise<{ completedThreads: Thread[]; failedThreads: Thread[] }> {
    const completedThreads: Thread[] = [];
    const failedThreads: Thread[] = [];
    const pendingThreads = new Set(childThreadIds);
    const startTime = Date.now();

    // 步骤2：进入等待循环
    while (pendingThreads.size > 0) {
      // 步骤3：检查超时
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime > timeout) {
        throw new TimeoutError('Join operation timeout', timeout);
      }

      // 步骤4：检查子 thread 状态
      for (const threadId of Array.from(pendingThreads)) {
        const thread = this.threadRegistry.get(threadId);
        if (!thread) {
          continue;
        }

        if (thread.status === 'COMPLETED') {
          completedThreads.push(thread);
          pendingThreads.delete(threadId);
        } else if (thread.status === 'FAILED' || thread.status === 'CANCELLED') {
          failedThreads.push(thread);
          pendingThreads.delete(threadId);
        }
      }

      // 步骤5：根据策略判断是否退出
      let shouldExit = false;
      switch (joinStrategy) {
        case 'ALL_COMPLETED':
          shouldExit = pendingThreads.size === 0;
          break;
        case 'ANY_COMPLETED':
          shouldExit = completedThreads.length > 0;
          break;
        case 'ALL_FAILED':
          shouldExit = pendingThreads.size === 0 && failedThreads.length === childThreadIds.length;
          break;
        case 'ANY_FAILED':
          shouldExit = failedThreads.length > 0;
          break;
        case 'SUCCESS_COUNT_THRESHOLD':
          // 需要额外的 threshold 参数，这里暂时简化处理
          shouldExit = completedThreads.length > 0;
          break;
      }

      if (shouldExit) {
        break;
      }

      // 步骤6：等待一段时间
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 步骤7：返回完成的 thread 数组
    return { completedThreads, failedThreads };
  }

  /**
   * 合并结果
   * @param completedThreads 完成的线程数组
   * @param joinStrategy Join 策略
   * @returns 合并后的输出
   */
  private mergeResults(completedThreads: Thread[], joinStrategy: JoinStrategy): any {
    if (completedThreads.length === 0) {
      return {};
    }

    if (completedThreads.length === 1) {
      return completedThreads[0]!.output;
    }

    // 合并多个 thread 的输出
    const mergedOutput: any = {};
    for (const thread of completedThreads) {
      mergedOutput[thread.id] = thread.output;
    }

    return mergedOutput;
  }

  /**
   * Copy 操作 - 创建 thread 的完全相同的副本
   * @param sourceThreadId 源线程 ID
   * @returns 副本线程 ID
   */
  async copy(sourceThreadId: string): Promise<string> {
    // 步骤1：验证源 thread 存在
    const sourceThread = this.threadRegistry.get(sourceThreadId);
    if (!sourceThread) {
      throw new ExecutionError(`Source thread not found: ${sourceThreadId}`, undefined, sourceThreadId);
    }

    // 步骤2：调用 ThreadBuilder 复制 thread
    const copiedThread = await this.threadBuilder.createCopy(sourceThread);
    const copiedThreadId = copiedThread.id;

    // 步骤3：注册到 ThreadRegistry
    this.threadRegistry.register(copiedThread);

    // 步骤3：触发 THREAD_COPIED 事件
    const copiedEvent: ThreadCopiedEvent = {
      type: EventType.THREAD_COPIED,
      timestamp: Date.now(),
      workflowId: sourceThread.workflowId,
      threadId: sourceThreadId,
      sourceThreadId,
      copiedThreadId
    };
    await this.eventManager.emit(copiedEvent);

    // 步骤4：返回副本 thread ID
    return copiedThreadId;
  }
}