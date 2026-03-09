/**
 * ThreadOperations - Thread 操作工具函数
 * 提供无状态的 Fork/Join/Copy 等线程操作
 * 所有函数都是纯函数，不持有任何状态
 */

import type { Thread } from '@modular-agent/types';
import type { ThreadEntity } from '../../entities/thread-entity.js';
import type { ThreadBuilder } from '../thread-builder.js';
import type { ThreadRegistry } from '../../services/thread-registry.js';
import type { EventManager } from '../../../core/services/event-manager.js';
import { ExecutionError, RuntimeValidationError } from '@modular-agent/types';
import { MessageArrayUtils } from '../../../core/utils/messages/message-array-utils.js';
import { getErrorMessage, getErrorOrUndefined } from '@modular-agent/common-utils';
import {
  buildThreadForkStartedEvent,
  buildThreadForkCompletedEvent,
  buildThreadJoinStartedEvent,
  buildThreadJoinConditionMetEvent,
  buildThreadCopyStartedEvent,
  buildThreadCopyCompletedEvent
} from './event/event-builder.js';
import {
  safeEmit
} from '../../../core/utils/event/event-emitter.js';
import {
  waitForMultipleThreadsCompleted,
  waitForAnyThreadCompleted,
  waitForAnyThreadCompletion
} from './event/event-waiter.js';

/**
 * Fork 配置
 */
export interface ForkConfig {
  /** Fork 操作 ID */
  forkId: string;
  /** Fork 策略（serial 或 parallel） */
  forkStrategy?: 'serial' | 'parallel';
  /** 起始节点 ID（可选，默认使用父线程的当前节点） */
  startNodeId?: string;
  /** Fork 路径 ID（用于标识子线程路径） */
  forkPathId?: string;
}

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
 * Fork 操作 - 创建子 thread
 * @param parentThreadEntity 父线程实体
 * @param forkConfig Fork 配置
 * @param threadBuilder Thread 构建器
 * @returns 子线程实体
 */
export async function fork(
  parentThreadEntity: ThreadEntity,
  forkConfig: ForkConfig,
  threadBuilder: ThreadBuilder,
  eventManager?: EventManager
): Promise<ThreadEntity> {
  // 步骤1：验证 Fork 配置
  if (!forkConfig.forkId) {
    throw new RuntimeValidationError('Fork config must have forkId', {
      field: 'fork.forkId'
    });
  }

  if (forkConfig.forkStrategy && forkConfig.forkStrategy !== 'serial' && forkConfig.forkStrategy !== 'parallel') {
    throw new RuntimeValidationError(`Invalid forkStrategy: ${forkConfig.forkStrategy}`, {
      field: 'fork.forkStrategy'
    });
  }

  // 触发THREAD_FORK_STARTED事件
  const forkStartedEvent = buildThreadForkStartedEvent({
    threadId: parentThreadEntity.thread.id,
    workflowId: parentThreadEntity.thread.workflowId,
    parentThreadId: parentThreadEntity.getThreadId(),
    forkConfig
  });
  await safeEmit(eventManager, forkStartedEvent);

  // 步骤2：创建子线程
  const childThreadEntity = await threadBuilder.createFork(parentThreadEntity, forkConfig);

  // 触发THREAD_FORK_COMPLETED事件
  const forkCompletedEvent = buildThreadForkCompletedEvent({
    threadId: parentThreadEntity.thread.id,
    workflowId: parentThreadEntity.thread.workflowId,
    parentThreadId: parentThreadEntity.getThreadId(),
    childThreadIds: [childThreadEntity.getThreadId()]
  });
  await safeEmit(eventManager, forkCompletedEvent);

  return childThreadEntity;
}

/**
 * Join 操作 - 合并子 thread 结果
 *
 * 说明：
 * - timeout 单位为秒，0 表示不超时
 * - 内部转换为毫秒进行处理
 * - 使用 Promise.race() 实现超时控制
 * - mainPathId 指定主线程路径，会将主线程的对话历史合并到父线程
 *
 * @param childThreadIds 子线程 ID 数组
 * @param joinStrategy Join 策略
 * @param threadRegistry Thread 注册表
 * @param timeout 超时时间（秒），0 表示不超时，>0 表示超时的秒数
 * @param parentThreadId 父线程 ID（可选）
 * @param eventManager 事件管理器（可选）
 * @param mainPathId 主线程路径 ID（可选，默认使用第一个子线程）
 * @returns Join 结果
 */
export async function join(
  childThreadIds: string[],
  joinStrategy: JoinStrategy,
  threadRegistry: ThreadRegistry,
  mainPathId: string,
  timeout: number = 0,
  parentThreadId?: string,
  eventManager?: EventManager
): Promise<JoinResult> {
  // 步骤1：验证 Join 配置
  if (!joinStrategy) {
    throw new RuntimeValidationError('Join config must have joinStrategy', {
      field: 'join.joinStrategy'
    });
  }

  if (timeout < 0) {
    throw new RuntimeValidationError('Join timeout must be non-negative', {
      field: 'join.timeout'
    });
  }

  // 触发THREAD_JOIN_STARTED事件
  if (eventManager && parentThreadId) {
    const parentThreadEntity = threadRegistry.get(parentThreadId);
    if (parentThreadEntity) {
      const joinStartedEvent = buildThreadJoinStartedEvent({
        threadId: parentThreadEntity.thread.id,
        workflowId: parentThreadEntity.thread.workflowId,
        parentThreadId: parentThreadEntity.getThreadId(),
        childThreadIds,
        joinStrategy
      });
      await safeEmit(eventManager, joinStartedEvent);
    }
  }

  // 步骤2：等待子 thread 完成
  // 如果 timeout 为 0，表示不超时，传递 undefined
  const timeoutMs = timeout > 0 ? timeout * 1000 : undefined;

  // 统一使用 eventManager.waitFor() 的超时机制
  const result = await waitForCompletion(
    childThreadIds,
    joinStrategy,
    threadRegistry,
    timeoutMs,
    parentThreadId,
    eventManager
  );

  const completedThreads = result.completedThreads;
  const failedThreads = result.failedThreads;

  // 步骤3：根据策略判断是否继续
  if (!validateJoinStrategy(completedThreads, failedThreads, childThreadIds, joinStrategy)) {
    throw new ExecutionError(
      `Join condition not met: ${joinStrategy}`,
      undefined,
      childThreadIds[0]
    );
  }

  // 步骤4：合并子 thread 结果
  const output = mergeResults(completedThreads, joinStrategy);

  // 步骤5：合并主线程对话历史到父线程
  if (parentThreadId && mainPathId) {
    const parentThreadEntity = threadRegistry.get(parentThreadId);
    if (parentThreadEntity) {
      // 找到对应mainPathId的子线程
      const mainThread = completedThreads.find(thread =>
        thread.forkJoinContext?.forkPathId === mainPathId
      );

      if (!mainThread) {
        throw new ExecutionError(
          `Main thread not found for mainPathId: ${mainPathId}`,
          undefined,
          parentThreadId,
          { mainPathId, completedThreadIds: completedThreads.map(t => t.id) }
        );
      }

      const mainThreadEntity = threadRegistry.get(mainThread.id);
      if (!mainThreadEntity) {
        throw new ExecutionError(
          `Main thread entity not found for threadId: ${mainThread.id}`,
          undefined,
          parentThreadId,
          { mainPathId, mainThreadId: mainThread.id }
        );
      }

      try {
        // 使用 MessageArrayUtils 克隆主线程的消息并合并到父线程
        const mainConversationManager = mainThreadEntity.getConversationManager();
        if (!mainConversationManager) {
          throw new ExecutionError(
            `Main thread conversation manager not found`,
            undefined,
            mainThreadEntity.getThreadId()
          );
        }

        const parentConversationManager = parentThreadEntity.getConversationManager();
        if (!parentConversationManager) {
          throw new ExecutionError(
            `Parent thread conversation manager not found`,
            undefined,
            parentThreadEntity.getThreadId()
          );
        }

        const mainMessages = mainConversationManager.getMessages();
        const clonedMessages = MessageArrayUtils.cloneMessages(mainMessages);

        // 将克隆的消息添加到父线程
        for (const msg of clonedMessages) {
          parentConversationManager.addMessage(msg);
        }
      } catch (error) {
        throw new ExecutionError(
          `Failed to merge conversation history from main thread`,
          undefined,
          parentThreadId,
          { mainPathId, mainThreadId: mainThread.id, error: getErrorMessage(error) },
          getErrorOrUndefined(error)
        );
      }
    }
  }

  // 步骤6：返回合并结果
  return {
    success: true,
    output,
    completedThreads,
    failedThreads
  };
}

/**
 * Copy 操作 - 创建 thread 副本
 * @param sourceThreadEntity 源线程实体
 * @param threadBuilder Thread 构建器
 * @returns 副本线程实体
 */
export async function copy(
  sourceThreadEntity: ThreadEntity,
  threadBuilder: ThreadBuilder,
  eventManager?: EventManager
): Promise<ThreadEntity> {
  // 步骤1：验证源 thread 存在
  if (!sourceThreadEntity) {
    throw new ExecutionError(`Source thread entity is null or undefined`, undefined, '');
  }

  // 触发THREAD_COPY_STARTED事件
  const copyStartedEvent = buildThreadCopyStartedEvent({
    threadId: sourceThreadEntity.thread.id,
    workflowId: sourceThreadEntity.thread.workflowId,
    sourceThreadId: sourceThreadEntity.thread.id
  });
  await safeEmit(eventManager, copyStartedEvent);

  // 步骤2：调用 ThreadBuilder 复制 thread
  const copiedThreadEntity = await threadBuilder.createCopy(sourceThreadEntity);

  // 触发THREAD_COPY_COMPLETED事件
  const copyCompletedEvent = buildThreadCopyCompletedEvent({
    threadId: sourceThreadEntity.thread.id,
    workflowId: sourceThreadEntity.thread.workflowId,
    sourceThreadId: sourceThreadEntity.thread.id,
    copiedThreadId: copiedThreadEntity.getThreadId()
  });
  await safeEmit(eventManager, copyCompletedEvent);

  return copiedThreadEntity;
}

/**
 * 等待子 thread 完成
 * @param childThreadIds 子线程 ID 数组
 * @param joinStrategy Join 策略
 * @param threadRegistry Thread 注册表
 * @param timeout 超时时间（毫秒）
 * @returns 完成的和失败的线程数组
 */
async function waitForCompletion(
  childThreadIds: string[],
  joinStrategy: JoinStrategy,
  threadRegistry: ThreadRegistry,
  timeout: number | undefined,
  parentThreadId?: string,
  eventManager?: EventManager
): Promise<{ completedThreads: Thread[]; failedThreads: Thread[] }> {
  const completedThreads: Thread[] = [];
  const failedThreads: Thread[] = [];
  const pendingThreads = new Set(childThreadIds);
  let conditionMet = false;

  // 如果没有事件管理器，使用轮询方式
  if (!eventManager) {
    return await waitForCompletionByPolling(
      childThreadIds,
      joinStrategy,
      threadRegistry,
      timeout,
      parentThreadId,
      eventManager
    );
  }

  // 使用事件驱动方式等待
  // 根据策略选择等待方式
  switch (joinStrategy) {
    case 'ALL_COMPLETED':
      // 等待所有线程完成
      await waitForMultipleThreadsCompleted(eventManager, childThreadIds, timeout);
      // 收集所有完成的线程
      for (const threadId of childThreadIds) {
        const threadEntity = threadRegistry.get(threadId);
        if (threadEntity) {
          const thread = threadEntity.getThread();
          if (thread.status === 'COMPLETED') {
            completedThreads.push(thread);
          } else if (thread.status === 'FAILED' || thread.status === 'CANCELLED') {
            failedThreads.push(thread);
          }
        }
      }
      conditionMet = failedThreads.length === 0;
      break;

    case 'ANY_COMPLETED':
      // 等待任意线程完成
      const completedThreadId = await waitForAnyThreadCompleted(eventManager, childThreadIds, timeout);
      // 收集完成的线程
      for (const threadId of childThreadIds) {
        const threadEntity = threadRegistry.get(threadId);
        if (threadEntity) {
          const thread = threadEntity.getThread();
          if (thread.status === 'COMPLETED') {
            completedThreads.push(thread);
          } else if (thread.status === 'FAILED' || thread.status === 'CANCELLED') {
            failedThreads.push(thread);
          }
        }
      }
      conditionMet = completedThreads.length > 0;
      break;

    case 'ALL_FAILED':
      // 等待所有线程失败
      await waitForMultipleThreadsCompleted(eventManager, childThreadIds, timeout);
      // 收集所有失败的线程
      for (const threadId of childThreadIds) {
        const threadEntity = threadRegistry.get(threadId);
        if (threadEntity) {
          const thread = threadEntity.getThread();
          if (thread.status === 'FAILED' || thread.status === 'CANCELLED') {
            failedThreads.push(thread);
          } else if (thread.status === 'COMPLETED') {
            completedThreads.push(thread);
          }
        }
      }
      conditionMet = failedThreads.length === childThreadIds.length;
      break;

    case 'ANY_FAILED':
      // 等待任意线程失败
      const result = await waitForAnyThreadCompletion(eventManager, childThreadIds, timeout);
      // 收集所有线程状态
      for (const threadId of childThreadIds) {
        const threadEntity = threadRegistry.get(threadId);
        if (threadEntity) {
          const thread = threadEntity.getThread();
          if (thread.status === 'COMPLETED') {
            completedThreads.push(thread);
          } else if (thread.status === 'FAILED' || thread.status === 'CANCELLED') {
            failedThreads.push(thread);
          }
        }
      }
      conditionMet = failedThreads.length > 0;
      break;

    case 'SUCCESS_COUNT_THRESHOLD':
      // 等待任意线程完成（简化处理）
      await waitForAnyThreadCompleted(eventManager, childThreadIds, timeout);
      // 收集所有线程状态
      for (const threadId of childThreadIds) {
        const threadEntity = threadRegistry.get(threadId);
        if (threadEntity) {
          const thread = threadEntity.getThread();
          if (thread.status === 'COMPLETED') {
            completedThreads.push(thread);
          } else if (thread.status === 'FAILED' || thread.status === 'CANCELLED') {
            failedThreads.push(thread);
          }
        }
      }
      conditionMet = completedThreads.length > 0;
      break;

    default:
      throw new RuntimeValidationError(`Invalid join strategy: ${joinStrategy}`, { field: 'joinStrategy', value: joinStrategy });
  }

  // 触发THREAD_JOIN_CONDITION_MET事件
  if (eventManager && parentThreadId && conditionMet) {
    const parentThreadEntity = threadRegistry.get(parentThreadId);
    if (parentThreadEntity) {
      const joinConditionMetEvent = buildThreadJoinConditionMetEvent({
        threadId: parentThreadEntity.thread.id,
        workflowId: parentThreadEntity.thread.workflowId,
        parentThreadId: parentThreadEntity.getThreadId(),
        childThreadIds,
        condition: joinStrategy
      });
      await safeEmit(eventManager, joinConditionMetEvent);
    }
  }

  return { completedThreads, failedThreads };
}

/**
 * 使用轮询方式等待线程完成（备用方案）
 * 
 * 说明：
 * - timeout 是 Promise.race 传入的超时值（毫秒）
 * - 轮询时不再检查超时，由外层的 Promise.race 统一管理
 * - 轮询周期为 100ms
 */
async function waitForCompletionByPolling(
  childThreadIds: string[],
  joinStrategy: JoinStrategy,
  threadRegistry: ThreadRegistry,
  timeout: number | undefined,
  parentThreadId?: string,
  eventManager?: EventManager
): Promise<{ completedThreads: Thread[]; failedThreads: Thread[] }> {
  const completedThreads: Thread[] = [];
  const failedThreads: Thread[] = [];
  const pendingThreads = new Set(childThreadIds);
  let conditionMet = false;

  // 进入等待循环
  while (pendingThreads.size > 0) {
    // 检查子 thread 状态
    for (const threadId of Array.from(pendingThreads)) {
      const threadEntity = threadRegistry.get(threadId);
      if (!threadEntity) {
        continue;
      }

      const thread = threadEntity.getThread();
      if (thread.status === 'COMPLETED') {
        completedThreads.push(thread);
        pendingThreads.delete(threadId);
      } else if (thread.status === 'FAILED' || thread.status === 'CANCELLED') {
        failedThreads.push(thread);
        pendingThreads.delete(threadId);
      }
    }

    // 根据策略判断是否退出
    if (shouldExitWait(completedThreads, failedThreads, childThreadIds, joinStrategy, pendingThreads.size)) {
      conditionMet = true;
      break;
    }

    // 等待一段时间后重新检查
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // 触发THREAD_JOIN_CONDITION_MET事件
  if (eventManager && parentThreadId && conditionMet) {
    const parentThreadEntity = threadRegistry.get(parentThreadId);
    if (parentThreadEntity) {
      const joinConditionMetEvent = buildThreadJoinConditionMetEvent({
        threadId: parentThreadEntity.thread.id,
        workflowId: parentThreadEntity.thread.workflowId,
        parentThreadId: parentThreadEntity.getThreadId(),
        childThreadIds,
        condition: joinStrategy
      });
      await safeEmit(eventManager, joinConditionMetEvent);
    }
  }

  // 步骤7：返回完成的 thread 数组
  return { completedThreads, failedThreads };
}

/**
 * 验证 Join 策略是否满足
 * @param completedThreads 完成的线程数组
 * @param failedThreads 失败的线程数组
 * @param childThreadIds 子线程 ID 数组
 * @param joinStrategy Join 策略
 * @returns 是否满足策略
 */
function validateJoinStrategy(
  completedThreads: Thread[],
  failedThreads: Thread[],
  childThreadIds: string[],
  joinStrategy: JoinStrategy
): boolean {
  switch (joinStrategy) {
    case 'ALL_COMPLETED':
      return failedThreads.length === 0;
    case 'ANY_COMPLETED':
      return completedThreads.length > 0;
    case 'ALL_FAILED':
      return failedThreads.length === childThreadIds.length;
    case 'ANY_FAILED':
      return failedThreads.length > 0;
    case 'SUCCESS_COUNT_THRESHOLD':
      // 需要额外的 threshold 参数，这里暂时简化处理
      return completedThreads.length > 0;
    default:
      return false;
  }
}

/**
 * 判断是否应该退出等待
 * @param completedThreads 完成的线程数组
 * @param failedThreads 失败的线程数组
 * @param childThreadIds 子线程 ID 数组
 * @param joinStrategy Join 策略
 * @param pendingCount 待处理线程数量
 * @returns 是否应该退出
 */
function shouldExitWait(
  completedThreads: Thread[],
  failedThreads: Thread[],
  childThreadIds: string[],
  joinStrategy: JoinStrategy,
  pendingCount: number
): boolean {
  switch (joinStrategy) {
    case 'ALL_COMPLETED':
      return pendingCount === 0;
    case 'ANY_COMPLETED':
      return completedThreads.length > 0;
    case 'ALL_FAILED':
      return pendingCount === 0 && failedThreads.length === childThreadIds.length;
    case 'ANY_FAILED':
      return failedThreads.length > 0;
    case 'SUCCESS_COUNT_THRESHOLD':
      // 需要额外的 threshold 参数，这里暂时简化处理
      return completedThreads.length > 0;
    default:
      return false;
  }
}

/**
 * 合并结果
 * @param completedThreads 完成的线程数组
 * @param joinStrategy Join 策略
 * @returns 合并后的输出
 */
function mergeResults(completedThreads: Thread[], joinStrategy: JoinStrategy): any {
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
