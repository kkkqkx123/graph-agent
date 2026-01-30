/**
 * 触发子工作流处理函数
 * 提供无状态的触发子工作流执行功能
 *
 * 职责：
 * - 保存和恢复主工作流状态
 * - 创建子工作流上下文
 * - 触发子工作流开始和完成事件
 * - 执行子工作流
 *
 * 设计原则：
 * - 无状态函数式设计
 * - 职责单一，每个函数只做一件事
 * - 与其他触发器处理函数保持一致
 */

import type { ID } from '../../../types/common';
import { ThreadContext } from '../context/thread-context';
import { EventCoordinator } from '../coordinators/event-coordinator';
import { EventType } from '../../../types/events';
import { now } from '../../../utils';

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
 * 触发子工作流任务接口
 */
export interface TriggeredSubgraphTask {
  /** 子工作流ID */
  subgraphId: ID;
  /** 输入数据 */
  input: Record<string, any>;
  /** 触发器ID */
  triggerId: string;
  /** 主工作流线程上下文 */
  mainThreadContext: ThreadContext;
  /** 配置选项 */
  config?: {
    waitForCompletion?: boolean;
    timeout?: number;
    recordHistory?: boolean;
    metadata?: any;
  };
}

/**
 * 主工作流保存的状态
 */
export interface SavedMainThreadState {
  currentNodeId: string;
  output: Record<string, any>;
  metadata: any;
}

/**
 * 保存主工作流状态
 * @param mainThreadContext 主工作流线程上下文
 * @returns 保存的状态
 */
export function saveMainThreadState(mainThreadContext: ThreadContext): SavedMainThreadState {
  return {
    currentNodeId: mainThreadContext.getCurrentNodeId(),
    output: { ...mainThreadContext.getOutput() },
    metadata: { ...mainThreadContext.getMetadata() }
  };
}

/**
 * 恢复主工作流状态
 * @param mainThreadContext 主工作流线程上下文
 * @param savedState 保存的状态
 */
export function restoreMainThreadState(
  mainThreadContext: ThreadContext,
  savedState: SavedMainThreadState
): void {
  mainThreadContext.setCurrentNodeId(savedState.currentNodeId);
  mainThreadContext.setOutput(savedState.output);
  mainThreadContext.setMetadata(savedState.metadata);
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
  const metadata = {
    triggeredBy: {
      triggerId: task.triggerId,
      mainThreadId: task.mainThreadContext.getThreadId(),
      timestamp: now()
    },
    isTriggeredSubgraph: true
  };

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
 * @param eventCoordinator 事件协调器
 */
export async function emitSubgraphStartedEvent(
  mainThreadContext: ThreadContext,
  task: TriggeredSubgraphTask,
  eventCoordinator: EventCoordinator
): Promise<void> {
  const eventManager = eventCoordinator.getEventManager();
  await eventManager.emit({
    type: EventType.TRIGGERED_SUBGRAPH_STARTED,
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
 * @param eventCoordinator 事件协调器
 */
export async function emitSubgraphCompletedEvent(
  mainThreadContext: ThreadContext,
  task: TriggeredSubgraphTask,
  eventCoordinator: EventCoordinator
): Promise<void> {
  const eventManager = eventCoordinator.getEventManager();
  await eventManager.emit({
    type: EventType.TRIGGERED_SUBGRAPH_COMPLETED,
    threadId: mainThreadContext.getThreadId(),
    workflowId: mainThreadContext.getWorkflowId(),
    subgraphId: task.subgraphId,
    triggerId: task.triggerId,
    timestamp: now()
  });
}

/**
 * 执行单个触发子工作流
 * @param task 触发子工作流任务
 * @param contextFactory 子工作流上下文工厂
 * @param subgraphExecutor 子工作流执行器
 * @param eventCoordinator 事件协调器
 */
export async function executeSingleTriggeredSubgraph(
  task: TriggeredSubgraphTask,
  contextFactory: SubgraphContextFactory,
  subgraphExecutor: SubgraphExecutor,
  eventCoordinator: EventCoordinator
): Promise<void> {
  // 1. 保存主工作流状态
  const savedState = saveMainThreadState(task.mainThreadContext);
  
  // 2. 标记开始执行触发子工作流
  task.mainThreadContext.startTriggeredSubgraphExecution();
  
  try {
    // 3. 创建子工作流上下文
    const subgraphContext = await createSubgraphContext(task, contextFactory);
    
    // 4. 触发子工作流开始事件
    await emitSubgraphStartedEvent(task.mainThreadContext, task, eventCoordinator);
    
    // 5. 执行子工作流
    await subgraphExecutor.executeThread(subgraphContext);
    
    // 6. 触发子工作流完成事件
    await emitSubgraphCompletedEvent(task.mainThreadContext, task, eventCoordinator);
  } finally {
    // 7. 恢复主工作流状态
    task.mainThreadContext.endTriggeredSubgraphExecution();
    restoreMainThreadState(task.mainThreadContext, savedState);
  }
}