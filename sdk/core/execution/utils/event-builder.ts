/**
 * EventBuilder - 事件构建工具函数
 * 提供统一的事件构建函数
 *
 * 设计原则：
 * - 纯函数：所有方法都是纯函数，无副作用
 * - 类型安全：提供完整的事件类型定义
 * - 统一格式：确保所有事件对象格式一致
 */

import { now } from '../../../utils';
import type { Thread, ThreadResult, NodeExecutionResult } from '../../../types/thread';
import type {
  ThreadStartedEvent,
  ThreadCompletedEvent,
  ThreadFailedEvent,
  ThreadPausedEvent,
  ThreadResumedEvent,
  ThreadCancelledEvent,
  ThreadStateChangedEvent,
  NodeStartedEvent,
  NodeCompletedEvent,
  NodeFailedEvent,
  SubgraphStartedEvent,
  SubgraphCompletedEvent,
  VariableChangedEvent,
  MessageAddedEvent,
  TokenUsageWarningEvent,
  ConversationStateChangedEvent,
  ToolCallStartedEvent,
  ToolCallCompletedEvent,
  ToolCallFailedEvent,
  ThreadForkStartedEvent,
  ThreadForkCompletedEvent,
  ThreadJoinStartedEvent,
  ThreadJoinConditionMetEvent,
  ThreadCopyStartedEvent,
  ThreadCopyCompletedEvent,
  TriggeredSubgraphStartedEvent,
  TriggeredSubgraphCompletedEvent,
  TriggeredSubgraphFailedEvent
} from '../../../types/events';
import { EventType } from '../../../types/events';

/**
 * 构建线程开始事件
 */
export function buildThreadStartedEvent(thread: Thread): ThreadStartedEvent {
  return {
    type: EventType.THREAD_STARTED,
    timestamp: now(),
    workflowId: thread.workflowId,
    threadId: thread.id,
    input: thread.input
  };
}

/**
 * 构建线程完成事件
 */
export function buildThreadCompletedEvent(thread: Thread, result: ThreadResult): ThreadCompletedEvent {
  return {
    type: EventType.THREAD_COMPLETED,
    timestamp: now(),
    workflowId: thread.workflowId,
    threadId: thread.id,
    output: result.output,
    executionTime: result.executionTime
  };
}

/**
 * 构建线程失败事件
 */
export function buildThreadFailedEvent(thread: Thread, error: Error): ThreadFailedEvent {
  return {
    type: EventType.THREAD_FAILED,
    timestamp: now(),
    workflowId: thread.workflowId,
    threadId: thread.id,
    error: error.message
  };
}

/**
 * 构建线程暂停事件
 */
export function buildThreadPausedEvent(thread: Thread): ThreadPausedEvent {
  return {
    type: EventType.THREAD_PAUSED,
    timestamp: now(),
    workflowId: thread.workflowId,
    threadId: thread.id
  };
}

/**
 * 构建线程恢复事件
 */
export function buildThreadResumedEvent(thread: Thread): ThreadResumedEvent {
  return {
    type: EventType.THREAD_RESUMED,
    timestamp: now(),
    workflowId: thread.workflowId,
    threadId: thread.id
  };
}

/**
 * 构建线程取消事件
 */
export function buildThreadCancelledEvent(thread: Thread, reason?: string): ThreadCancelledEvent {
  return {
    type: EventType.THREAD_CANCELLED,
    timestamp: now(),
    workflowId: thread.workflowId,
    threadId: thread.id,
    reason
  };
}

/**
 * 构建线程状态变更事件
 */
export function buildThreadStateChangedEvent(
  thread: Thread,
  previousStatus: string,
  newStatus: string
): ThreadStateChangedEvent {
  return {
    type: EventType.THREAD_STATE_CHANGED,
    timestamp: now(),
    workflowId: thread.workflowId,
    threadId: thread.id,
    previousStatus,
    newStatus
  };
}

/**
 * 构建节点开始事件
 */
export function buildNodeStartedEvent(threadContext: any, nodeId: string, nodeType: string): NodeStartedEvent {
  return {
    type: EventType.NODE_STARTED,
    threadId: threadContext.getThreadId(),
    workflowId: threadContext.getWorkflowId(),
    nodeId,
    nodeType,
    timestamp: now()
  };
}

/**
 * 构建节点完成事件
 */
export function buildNodeCompletedEvent(
  threadContext: any,
  nodeId: string,
  output: any,
  executionTime: number
): NodeCompletedEvent {
  return {
    type: EventType.NODE_COMPLETED,
    threadId: threadContext.getThreadId(),
    workflowId: threadContext.getWorkflowId(),
    nodeId,
    output,
    executionTime,
    timestamp: now()
  };
}

/**
 * 构建节点失败事件
 */
export function buildNodeFailedEvent(
  threadContext: any,
  nodeId: string,
  error: Error
): NodeFailedEvent {
  return {
    type: EventType.NODE_FAILED,
    threadId: threadContext.getThreadId(),
    workflowId: threadContext.getWorkflowId(),
    nodeId,
    error: error.message,
    timestamp: now()
  };
}

/**
 * 构建子图开始事件
 */
export function buildSubgraphStartedEvent(
  threadContext: any,
  subgraphId: string,
  parentWorkflowId: string,
  input: Record<string, any>
): SubgraphStartedEvent {
  return {
    type: EventType.SUBGRAPH_STARTED,
    timestamp: now(),
    workflowId: threadContext.getWorkflowId(),
    threadId: threadContext.getThreadId(),
    subgraphId,
    parentWorkflowId,
    input
  };
}

/**
 * 构建子图完成事件
 */
export function buildSubgraphCompletedEvent(
  threadContext: any,
  subgraphId: string,
  output: Record<string, any>,
  executionTime: number
): SubgraphCompletedEvent {
  return {
    type: EventType.SUBGRAPH_COMPLETED,
    timestamp: now(),
    workflowId: threadContext.getWorkflowId(),
    threadId: threadContext.getThreadId(),
    subgraphId,
    output,
    executionTime
  };
}

/**
 * 构建变量变更事件
 */
export function buildVariableChangedEvent(
  threadContext: any,
  name: string,
  value: any,
  scope: string
): VariableChangedEvent {
  return {
    type: EventType.VARIABLE_CHANGED,
    timestamp: now(),
    workflowId: threadContext.getWorkflowId(),
    threadId: threadContext.getThreadId(),
    variableName: name,
    variableValue: value,
    variableScope: scope
  };
}

/**
 * 构建消息添加事件
 */
export function buildMessageAddedEvent(
  threadContext: any,
  nodeId: string | undefined,
  role: string,
  content: string
): MessageAddedEvent {
  return {
    type: EventType.MESSAGE_ADDED,
    timestamp: now(),
    workflowId: threadContext.getWorkflowId(),
    threadId: threadContext.getThreadId(),
    nodeId,
    role,
    content
  };
}

/**
 * 构建Token使用警告事件
 */
export function buildTokenUsageWarningEvent(
  threadContext: any,
  tokensUsed: number,
  tokenLimit: number,
  usagePercentage: number
): TokenUsageWarningEvent {
  return {
    type: EventType.TOKEN_USAGE_WARNING,
    timestamp: now(),
    workflowId: threadContext.getWorkflowId(),
    threadId: threadContext.getThreadId(),
    tokensUsed,
    tokenLimit,
    usagePercentage
  };
}

/**
 * 构建对话状态变更事件
 */
export function buildConversationStateChangedEvent(
  threadContext: any,
  nodeId: string | undefined,
  messageCount: number,
  tokenUsage: number
): ConversationStateChangedEvent {
  return {
    type: EventType.CONVERSATION_STATE_CHANGED,
    timestamp: now(),
    workflowId: threadContext.getWorkflowId(),
    threadId: threadContext.getThreadId(),
    nodeId,
    messageCount,
    tokenUsage
  };
}

/**
 * 构建工具调用开始事件
 */
export function buildToolCallStartedEvent(
  threadContext: any,
  nodeId: string,
  toolName: string,
  toolArguments: string
): ToolCallStartedEvent {
  return {
    type: EventType.TOOL_CALL_STARTED,
    timestamp: now(),
    workflowId: threadContext.getWorkflowId(),
    threadId: threadContext.getThreadId(),
    nodeId,
    toolName,
    toolArguments
  };
}

/**
 * 构建工具调用完成事件
 */
export function buildToolCallCompletedEvent(
  threadContext: any,
  nodeId: string,
  toolName: string,
  toolResult: any,
  executionTime: number
): ToolCallCompletedEvent {
  return {
    type: EventType.TOOL_CALL_COMPLETED,
    timestamp: now(),
    workflowId: threadContext.getWorkflowId(),
    threadId: threadContext.getThreadId(),
    nodeId,
    toolName,
    toolResult,
    executionTime
  };
}

/**
 * 构建工具调用失败事件
 */
export function buildToolCallFailedEvent(
  threadContext: any,
  nodeId: string,
  toolName: string,
  error: Error
): ToolCallFailedEvent {
  return {
    type: EventType.TOOL_CALL_FAILED,
    timestamp: now(),
    workflowId: threadContext.getWorkflowId(),
    threadId: threadContext.getThreadId(),
    nodeId,
    toolName,
    error: error.message
  };
}

/**
 * 构建线程Fork开始事件
 */
export function buildThreadForkStartedEvent(
  threadContext: any,
  forkConfig: any
): ThreadForkStartedEvent {
  return {
    type: EventType.THREAD_FORK_STARTED,
    timestamp: now(),
    workflowId: threadContext.getWorkflowId(),
    threadId: threadContext.getThreadId(),
    parentThreadId: threadContext.getThreadId(),
    forkConfig
  };
}

/**
 * 构建线程Fork完成事件
 */
export function buildThreadForkCompletedEvent(
  threadContext: any,
  childThreadIds: string[]
): ThreadForkCompletedEvent {
  return {
    type: EventType.THREAD_FORK_COMPLETED,
    timestamp: now(),
    workflowId: threadContext.getWorkflowId(),
    threadId: threadContext.getThreadId(),
    parentThreadId: threadContext.getThreadId(),
    childThreadIds
  };
}

/**
 * 构建线程Join开始事件
 */
export function buildThreadJoinStartedEvent(
  threadContext: any,
  childThreadIds: string[],
  joinStrategy: string
): ThreadJoinStartedEvent {
  return {
    type: EventType.THREAD_JOIN_STARTED,
    timestamp: now(),
    workflowId: threadContext.getWorkflowId(),
    threadId: threadContext.getThreadId(),
    parentThreadId: threadContext.getThreadId(),
    childThreadIds,
    joinStrategy
  };
}

/**
 * 构建线程Join条件满足事件
 */
export function buildThreadJoinConditionMetEvent(
  threadContext: any,
  childThreadIds: string[],
  condition: string
): ThreadJoinConditionMetEvent {
  return {
    type: EventType.THREAD_JOIN_CONDITION_MET,
    timestamp: now(),
    workflowId: threadContext.getWorkflowId(),
    threadId: threadContext.getThreadId(),
    parentThreadId: threadContext.getThreadId(),
    childThreadIds,
    condition
  };
}

/**
 * 构建线程Copy开始事件
 */
export function buildThreadCopyStartedEvent(
  threadContext: any
): ThreadCopyStartedEvent {
  return {
    type: EventType.THREAD_COPY_STARTED,
    timestamp: now(),
    workflowId: threadContext.getWorkflowId(),
    threadId: threadContext.getThreadId(),
    sourceThreadId: threadContext.getThreadId()
  };
}

/**
 * 构建线程Copy完成事件
 */
export function buildThreadCopyCompletedEvent(
  threadContext: any,
  copiedThreadId: string
): ThreadCopyCompletedEvent {
  return {
    type: EventType.THREAD_COPY_COMPLETED,
    timestamp: now(),
    workflowId: threadContext.getWorkflowId(),
    threadId: threadContext.getThreadId(),
    sourceThreadId: threadContext.getThreadId(),
    copiedThreadId
  };
}

/**
 * 构建触发子图开始事件
 */
export function buildTriggeredSubgraphStartedEvent(
  threadContext: any,
  subgraphId: string,
  triggerId: string,
  input: Record<string, any>
): TriggeredSubgraphStartedEvent {
  return {
    type: EventType.TRIGGERED_SUBGRAPH_STARTED,
    timestamp: now(),
    workflowId: threadContext.getWorkflowId(),
    threadId: threadContext.getThreadId(),
    subgraphId,
    triggerId,
    input
  };
}

/**
 * 构建触发子图完成事件
 */
export function buildTriggeredSubgraphCompletedEvent(
  threadContext: any,
  subgraphId: string,
  triggerId: string,
  output: Record<string, any> | undefined,
  executionTime: number | undefined
): TriggeredSubgraphCompletedEvent {
  return {
    type: EventType.TRIGGERED_SUBGRAPH_COMPLETED,
    timestamp: now(),
    workflowId: threadContext.getWorkflowId(),
    threadId: threadContext.getThreadId(),
    subgraphId,
    triggerId,
    output,
    executionTime
  };
}

/**
 * 构建触发子图失败事件
 */
export function buildTriggeredSubgraphFailedEvent(
  threadContext: any,
  subgraphId: string,
  triggerId: string,
  error: Error
): TriggeredSubgraphFailedEvent {
  return {
    type: EventType.TRIGGERED_SUBGRAPH_FAILED,
    timestamp: now(),
    workflowId: threadContext.getWorkflowId(),
    threadId: threadContext.getThreadId(),
    subgraphId,
    triggerId,
    error: error.message
  };
}
