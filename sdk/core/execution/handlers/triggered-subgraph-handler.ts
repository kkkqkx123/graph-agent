/**
 * 触发子工作流处理函数
 * 提供无状态的触发子工作流执行功能
 *
 * 职责：
 * - 创建子工作流上下文
 * - 触发子工作流开始和完成事件
 * - 执行子工作流
 * - 管理触发子工作流执行标记
 *
 * 设计原则：
 * - 无状态函数式设计
 * - 职责单一，每个函数只做一件事
 * - 与其他触发器处理函数保持一致
 * - 触发子工作流异步执行，不阻塞主工作流
 */

import type { ID } from '@modular-agent/types';
import { ThreadContext } from '../context/thread-context';
import type { EventManager } from '../../services/event-manager';
import { EventType } from '@modular-agent/types';
import type { ThreadResult } from '@modular-agent/types';
import { now, getErrorMessage, getErrorOrNew } from '@modular-agent/common-utils';
import { createSubgraphMetadata } from './subgraph-handler';
import type { TriggeredSubgraphTask, ExecutedSubgraphResult } from '../types/triggered-subgraph.types';

/**
 * 子工作流执行器接口
 */
export interface SubgraphExecutor {
  executeThread(threadContext: ThreadContext): Promise<any>;
}

/**
 * 子工作流上下文工厂接口
 * 用于创建子工作流上下文，避免直接依赖ThreadBuilder
 */
export interface SubgraphContextFactory {
  buildSubgraphContext(subgraphId: ID, input: Record<string, any>, metadata: any): Promise<ThreadContext>;
}

/**
 * 创建子工作流上下文
 * @param task 触发子工作流任务
 * @param contextFactory 子工作流上下文工厂
 * @returns 子工作流上下文
 */
export async function createSubgraphContext(
  task: TriggeredSubgraphTask,
  contextFactory: SubgraphContextFactory
): Promise<ThreadContext> {
  const metadata = createSubgraphMetadata(task.triggerId, task.mainThreadContext.getThreadId());

  const subgraphContext = await contextFactory.buildSubgraphContext(
    task.subgraphId,
    task.input,
    metadata
  );

  return subgraphContext;
}

/**
 * 触发子工作流开始事件
 * @param mainThreadContext 主工作流线程上下文
 * @param task 触发子工作流任务
 * @param eventManager 事件管理器
 */
export async function emitSubgraphStartedEvent(
  mainThreadContext: ThreadContext,
  task: TriggeredSubgraphTask,
  eventManager: EventManager
): Promise<void> {
  await eventManager.emit({
    type: 'TRIGGERED_SUBGRAPH_STARTED',
    threadId: mainThreadContext.getThreadId(),
    workflowId: mainThreadContext.getWorkflowId(),
    subgraphId: task.subgraphId,
    triggerId: task.triggerId,
    input: task.input,
    timestamp: now()
  });
}

/**
 * 触发子工作流完成事件
 * @param mainThreadContext 主工作流线程上下文
 * @param task 触发子工作流任务
 * @param subgraphContext 子工作流线程上下文
 * @param executionTime 执行时间（毫秒）
 * @param eventManager 事件管理器
 */
export async function emitSubgraphCompletedEvent(
  mainThreadContext: ThreadContext,
  task: TriggeredSubgraphTask,
  subgraphContext: ThreadContext,
  executionTime: number,
  eventManager: EventManager
): Promise<void> {
  await eventManager.emit({
    type: 'TRIGGERED_SUBGRAPH_COMPLETED',
    threadId: mainThreadContext.getThreadId(),
    workflowId: mainThreadContext.getWorkflowId(),
    subgraphId: task.subgraphId,
    triggerId: task.triggerId,
    output: subgraphContext.getOutput(),
    executionTime,
    timestamp: now()
  });
}

/**
 * 触发子工作流失败事件
 * @param mainThreadContext 主工作流线程上下文
 * @param task 触发子工作流任务
 * @param error 错误信息
 * @param executionTime 执行时间（毫秒）
 * @param eventManager 事件管理器
 */
export async function emitSubgraphFailedEvent(
  mainThreadContext: ThreadContext,
  task: TriggeredSubgraphTask,
  error: Error | string,
  executionTime: number,
  eventManager: EventManager
): Promise<void> {
  await eventManager.emit({
    type: 'TRIGGERED_SUBGRAPH_FAILED',
    threadId: mainThreadContext.getThreadId(),
    workflowId: mainThreadContext.getWorkflowId(),
    subgraphId: task.subgraphId,
    triggerId: task.triggerId,
    error: getErrorMessage(error),
    executionTime,
    timestamp: now()
  });
}

/**
 * 执行单个触发子工作流
 * @param task 触发子工作流任务
 * @param contextFactory 子工作流上下文工厂
 * @param subgraphExecutor 子工作流执行器
 * @param eventManager 事件管理器
 * @returns 执行结果，包含子工作流上下文、执行结果和执行时间
 */
export async function executeSingleTriggeredSubgraph(
  task: TriggeredSubgraphTask,
  contextFactory: SubgraphContextFactory,
  subgraphExecutor: SubgraphExecutor,
  eventManager: EventManager
): Promise<ExecutedSubgraphResult> {
  const startTime = Date.now();
  
  try {
    // 创建子工作流上下文
    const subgraphContext = await createSubgraphContext(task, contextFactory);
    
    // 触发子工作流开始事件
    await emitSubgraphStartedEvent(task.mainThreadContext, task, eventManager);
    
    // 执行子工作流
    const threadResult = await subgraphExecutor.executeThread(subgraphContext);
    
    const executionTime = Date.now() - startTime;
    
    // 触发子工作流完成事件
    await emitSubgraphCompletedEvent(
      task.mainThreadContext,
      task,
      subgraphContext,
      executionTime,
      eventManager
    );
    
    return {
      subgraphContext,
      threadResult,
      executionTime
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    // 触发子工作流失败事件
    await emitSubgraphFailedEvent(
      task.mainThreadContext,
      task,
      getErrorOrNew(error),
      executionTime,
      eventManager
    );
    
    // 重新抛出错误，让调用者处理
    throw error;
  }
}