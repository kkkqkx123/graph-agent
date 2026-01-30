/**
 * ThreadOperations - Thread 操作工具函数
 * 提供无状态的 Fork/Join/Copy 等线程操作
 * 所有函数都是纯函数，不持有任何状态
 */

import type { Thread } from '../../../types/thread';
import type { ThreadContext } from '../context/thread-context';
import type { ThreadBuilder } from '../thread-builder';
import type { ThreadRegistry } from '../thread-registry';
import { ExecutionError, TimeoutError, ValidationError } from '../../../types/errors';
import { now, diffTimestamp } from '../../../utils';

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
 * @param parentThreadContext 父线程上下文
 * @param forkConfig Fork 配置
 * @param threadBuilder Thread 构建器
 * @returns 子线程上下文
 */
export async function fork(
  parentThreadContext: ThreadContext,
  forkConfig: ForkConfig,
  threadBuilder: ThreadBuilder
): Promise<ThreadContext> {
  // 步骤1：验证 Fork 配置
  if (!forkConfig.forkId) {
    throw new ValidationError('Fork config must have forkId', 'fork.forkId');
  }

  if (forkConfig.forkStrategy && forkConfig.forkStrategy !== 'serial' && forkConfig.forkStrategy !== 'parallel') {
    throw new ValidationError(`Invalid forkStrategy: ${forkConfig.forkStrategy}`, 'fork.forkStrategy');
  }

  // 步骤2：创建子线程
  const childThreadContext = await threadBuilder.createFork(parentThreadContext, forkConfig);

  return childThreadContext;
}

/**
 * Join 操作 - 合并子 thread 结果
 * @param childThreadIds 子线程 ID 数组
 * @param joinStrategy Join 策略
 * @param threadRegistry Thread 注册表
 * @param timeout 超时时间（毫秒）
 * @returns Join 结果
 */
export async function join(
  childThreadIds: string[],
  joinStrategy: JoinStrategy,
  threadRegistry: ThreadRegistry,
  timeout: number
): Promise<JoinResult> {
  // 步骤1：验证 Join 配置
  if (!joinStrategy) {
    throw new ValidationError('Join config must have joinStrategy', 'join.joinStrategy');
  }

  if (!timeout || timeout <= 0) {
    throw new ValidationError('Join config must have valid timeout', 'join.timeout');
  }

  // 步骤2：等待子 thread 完成
  const { completedThreads, failedThreads } = await waitForCompletion(
    childThreadIds,
    joinStrategy,
    threadRegistry,
    timeout
  );

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

  // 步骤5：返回合并结果
  return {
    success: true,
    output,
    completedThreads,
    failedThreads
  };
}

/**
 * Copy 操作 - 创建 thread 副本
 * @param sourceThreadContext 源线程上下文
 * @param threadBuilder Thread 构建器
 * @returns 副本线程上下文
 */
export async function copy(
  sourceThreadContext: ThreadContext,
  threadBuilder: ThreadBuilder
): Promise<ThreadContext> {
  // 步骤1：验证源 thread 存在
  if (!sourceThreadContext) {
    throw new ExecutionError(`Source thread context is null or undefined`, undefined, '');
  }

  // 步骤2：调用 ThreadBuilder 复制 thread
  const copiedThreadContext = await threadBuilder.createCopy(sourceThreadContext);

  return copiedThreadContext;
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
  timeout: number
): Promise<{ completedThreads: Thread[]; failedThreads: Thread[] }> {
  const completedThreads: Thread[] = [];
  const failedThreads: Thread[] = [];
  const pendingThreads = new Set(childThreadIds);
  const startTime = now();

  // 步骤2：进入等待循环
  while (pendingThreads.size > 0) {
    // 步骤3：检查超时
    const elapsedTime = diffTimestamp(startTime, now());
    if (elapsedTime > timeout) {
      throw new TimeoutError('Join operation timeout', timeout);
    }

    // 步骤4：检查子 thread 状态
    for (const threadId of Array.from(pendingThreads)) {
      const threadContext = threadRegistry.get(threadId);
      if (!threadContext) {
        continue;
      }

      const thread = threadContext.thread;
      if (thread.status === 'COMPLETED') {
        completedThreads.push(thread);
        pendingThreads.delete(threadId);
      } else if (thread.status === 'FAILED' || thread.status === 'CANCELLED') {
        failedThreads.push(thread);
        pendingThreads.delete(threadId);
      }
    }

    // 步骤5：根据策略判断是否退出
    if (shouldExitWait(completedThreads, failedThreads, childThreadIds, joinStrategy, pendingThreads.size)) {
      break;
    }

    // 步骤6：等待一段时间
    await new Promise(resolve => setTimeout(resolve, 100));
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