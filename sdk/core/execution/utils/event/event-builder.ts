/**
 * EventBuilder - 事件构建工具函数
 * 提供统一的事件构建函数
 *
 * 设计原则：
 * - 纯函数：所有方法都是纯函数，无副作用
 * - 类型安全：提供完整的事件类型定义
 * - 统一格式：确保所有事件对象格式一致
 */

import { now } from '@modular-agent/common-utils';
import type { Thread, ThreadResult, ID } from '@modular-agent/types';
import { SDKError } from '@modular-agent/types';
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
  TokenLimitExceededEvent,
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
  TriggeredSubgraphFailedEvent,
  CheckpointCreatedEvent,
  CheckpointFailedEvent,
  CheckpointDeletedEvent,
  UserInteractionRequestedEvent,
  UserInteractionProcessedEvent
} from '@modular-agent/types';

/**
 * 构建线程开始事件
 */
export function buildThreadStartedEvent(thread: Thread): ThreadStartedEvent {
  return {
    type: 'THREAD_STARTED',
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
    type: 'THREAD_COMPLETED',
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
  const errorInfo = error instanceof SDKError
    ? error.toJSON()
    : { message: error.message, name: error.name };

  return {
    type: 'THREAD_FAILED',
    timestamp: now(),
    workflowId: thread.workflowId,
    threadId: thread.id,
    error: errorInfo
  };
}

/**
 * 构建线程暂停事件
 */
export function buildThreadPausedEvent(thread: Thread): ThreadPausedEvent {
  return {
    type: 'THREAD_PAUSED',
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
    type: 'THREAD_RESUMED',
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
    type: 'THREAD_CANCELLED',
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
    type: 'THREAD_STATE_CHANGED',
    timestamp: now(),
    workflowId: thread.workflowId,
    threadId: thread.id,
    previousStatus,
    newStatus
  };
}

/**
 * 构建节点开始事件参数
 */
export interface BuildNodeStartedEventParams {
  threadId: string;
  workflowId: string;
  nodeId: string;
  nodeType: string;
}

/**
 * 构建节点开始事件
 */
export function buildNodeStartedEvent(
  params: BuildNodeStartedEventParams
): NodeStartedEvent {
  return {
    type: 'NODE_STARTED',
    threadId: params.threadId,
    workflowId: params.workflowId,
    nodeId: params.nodeId,
    nodeType: params.nodeType,
    timestamp: now()
  };
}

/**
 * 构建节点完成事件参数
 */
export interface BuildNodeCompletedEventParams {
  threadId: string;
  workflowId: string;
  nodeId: string;
  output: any;
  executionTime: number;
}

/**
 * 构建节点完成事件
 */
export function buildNodeCompletedEvent(
  params: BuildNodeCompletedEventParams
): NodeCompletedEvent {
  return {
    type: 'NODE_COMPLETED' as const,
    threadId: params.threadId,
    workflowId: params.workflowId,
    nodeId: params.nodeId,
    output: params.output,
    executionTime: params.executionTime,
    timestamp: now()
  };
}

/**
 * 构建节点失败事件参数
 */
export interface BuildNodeFailedEventParams {
  threadId: string;
  workflowId: string;
  nodeId: string;
  error: Error;
}

/**
 * 构建节点失败事件
 */
export function buildNodeFailedEvent(
  params: BuildNodeFailedEventParams
): NodeFailedEvent {
  const errorInfo = params.error instanceof SDKError
    ? params.error.toJSON()
    : { message: params.error.message, name: params.error.name };

  return {
    type: 'NODE_FAILED',
    threadId: params.threadId,
    workflowId: params.workflowId,
    nodeId: params.nodeId,
    error: errorInfo,
    timestamp: now()
  };
}

/**
 * 构建子图开始事件参数
 */
export interface BuildSubgraphStartedEventParams {
  threadId: string;
  workflowId: string;
  subgraphId: string;
  parentWorkflowId: string;
  input: Record<string, any>;
}

/**
 * 构建子图开始事件
 */
export function buildSubgraphStartedEvent(
  params: BuildSubgraphStartedEventParams
): SubgraphStartedEvent {
  return {
    type: 'SUBGRAPH_STARTED',
    timestamp: now(),
    workflowId: params.workflowId,
    threadId: params.threadId,
    subgraphId: params.subgraphId,
    parentWorkflowId: params.parentWorkflowId,
    input: params.input
  };
}

/**
 * 构建子图完成事件参数
 */
export interface BuildSubgraphCompletedEventParams {
  threadId: string;
  workflowId: string;
  subgraphId: string;
  output: Record<string, any>;
  executionTime: number;
}

/**
 * 构建子图完成事件
 */
export function buildSubgraphCompletedEvent(
  params: BuildSubgraphCompletedEventParams
): SubgraphCompletedEvent {
  return {
    type: 'SUBGRAPH_COMPLETED',
    timestamp: now(),
    workflowId: params.workflowId,
    threadId: params.threadId,
    subgraphId: params.subgraphId,
    output: params.output,
    executionTime: params.executionTime
  };
}

/**
 * 构建变量变更事件参数
 */
export interface BuildVariableChangedEventParams {
  threadId: string;
  workflowId: string;
  variableName: string;
  variableValue: any;
  variableScope: string;
}

/**
 * 构建变量变更事件
 */
export function buildVariableChangedEvent(
  params: BuildVariableChangedEventParams
): VariableChangedEvent {
  return {
    type: 'VARIABLE_CHANGED' as const,
    timestamp: now(),
    workflowId: params.workflowId,
    threadId: params.threadId,
    variableName: params.variableName,
    variableValue: params.variableValue,
    variableScope: params.variableScope
  };
}

/**
 * 构建消息添加事件参数
 */
export interface BuildMessageAddedEventParams {
  threadId: string;
  role: string;
  content: string;
  nodeId?: string;
  workflowId?: string;
}

/**
 * 构建消息添加事件
 */
export function buildMessageAddedEvent(
  params: BuildMessageAddedEventParams
): MessageAddedEvent {
  const event: MessageAddedEvent = {
    type: 'MESSAGE_ADDED',
    timestamp: now(),
    threadId: params.threadId,
    nodeId: params.nodeId,
    role: params.role,
    content: params.content
  };
  if (params.workflowId) {
    (event as any).workflowId = params.workflowId;
  }
  return event;
}

/**
 * 构建Token使用警告事件参数
 */
export interface BuildTokenUsageWarningEventParams {
  threadId: string;
  tokensUsed: number;
  tokenLimit: number;
  usagePercentage: number;
  workflowId?: string;
}

/**
 * 构建Token使用警告事件
 */
export function buildTokenUsageWarningEvent(
  params: BuildTokenUsageWarningEventParams
): TokenUsageWarningEvent {
  const event: TokenUsageWarningEvent = {
    type: 'TOKEN_USAGE_WARNING',
    timestamp: now(),
    threadId: params.threadId,
    tokensUsed: params.tokensUsed,
    tokenLimit: params.tokenLimit,
    usagePercentage: params.usagePercentage
  };
  if (params.workflowId) {
    (event as any).workflowId = params.workflowId;
  }
  return event;
}

/**
 * 构建Token超限事件参数
 */
export interface BuildTokenLimitExceededEventParams {
  threadId: string;
  tokensUsed: number;
  tokenLimit: number;
  workflowId?: string;
}

/**
 * 构建Token超限事件
 */
export function buildTokenLimitExceededEvent(
  params: BuildTokenLimitExceededEventParams
): TokenLimitExceededEvent {
  const event: TokenLimitExceededEvent = {
    type: 'TOKEN_LIMIT_EXCEEDED',
    timestamp: now(),
    threadId: params.threadId,
    tokensUsed: params.tokensUsed,
    tokenLimit: params.tokenLimit
  };
  if (params.workflowId) {
    (event as any).workflowId = params.workflowId;
  }
  return event;
}

/**
 * 构建对话状态变更事件参数
 */
export interface BuildConversationStateChangedEventParams {
  threadId: string;
  messageCount: number;
  tokenUsage: number;
  nodeId?: string;
  workflowId?: string;
}

/**
 * 构建对话状态变更事件
 */
export function buildConversationStateChangedEvent(
  params: BuildConversationStateChangedEventParams
): ConversationStateChangedEvent {
  const event: ConversationStateChangedEvent = {
    type: 'CONVERSATION_STATE_CHANGED',
    timestamp: now(),
    threadId: params.threadId,
    nodeId: params.nodeId,
    messageCount: params.messageCount,
    tokenUsage: params.tokenUsage
  };
  if (params.workflowId) {
    (event as any).workflowId = params.workflowId;
  }
  return event;
}

/**
 * 工具调用开始事件参数
 */
export interface BuildToolCallStartedEventParams {
  threadId: string;
  nodeId: string;
  toolId: ID;
  taskId: string;
  batchId: string;
  toolName: string;
  toolArguments: string;
  workflowId?: string;
}

/**
 * 构建工具调用开始事件
 */
export function buildToolCallStartedEvent(
  params: BuildToolCallStartedEventParams
): ToolCallStartedEvent {
  return {
    type: 'TOOL_CALL_STARTED',
    timestamp: now(),
    threadId: params.threadId,
    nodeId: params.nodeId,
    toolId: params.toolId,
    toolName: params.toolName,
    toolArguments: params.toolArguments,
    taskId: params.taskId,
    batchId: params.batchId,
    ...(params.workflowId && { workflowId: params.workflowId })
  };
}

/**
 * 工具调用完成事件参数
 */
export interface BuildToolCallCompletedEventParams {
  threadId: string;
  nodeId: string;
  toolId: ID;
  taskId: string;
  batchId: string;
  toolName: string;
  toolResult: any;
  executionTime: number;
  workflowId?: string;
}

/**
 * 构建工具调用完成事件
 */
export function buildToolCallCompletedEvent(
  params: BuildToolCallCompletedEventParams
): ToolCallCompletedEvent {
  return {
    type: 'TOOL_CALL_COMPLETED',
    timestamp: now(),
    threadId: params.threadId,
    nodeId: params.nodeId,
    toolId: params.toolId,
    toolName: params.toolName,
    toolResult: params.toolResult,
    executionTime: params.executionTime,
    taskId: params.taskId,
    batchId: params.batchId,
    ...(params.workflowId && { workflowId: params.workflowId })
  };
}

/**
 * 工具调用失败事件参数
 */
export interface BuildToolCallFailedEventParams {
  threadId: string;
  nodeId: string;
  toolId: ID;
  taskId: string;
  batchId: string;
  toolName: string;
  error: Error;
  workflowId?: string;
}

/**
 * 构建工具调用失败事件
 */
export function buildToolCallFailedEvent(
  params: BuildToolCallFailedEventParams
): ToolCallFailedEvent {
  return {
    type: 'TOOL_CALL_FAILED',
    timestamp: now(),
    threadId: params.threadId,
    nodeId: params.nodeId,
    toolId: params.toolId,
    toolName: params.toolName,
    error: params.error.message || 'Unknown error',
    taskId: params.taskId,
    batchId: params.batchId,
    ...(params.workflowId && { workflowId: params.workflowId })
  };
}

/**
 * 构建线程Fork开始事件参数
 */
export interface BuildThreadForkStartedEventParams {
  threadId: string;
  workflowId: string;
  parentThreadId: string;
  forkConfig: any;
}

/**
 * 构建线程Fork开始事件
 */
export function buildThreadForkStartedEvent(
  params: BuildThreadForkStartedEventParams
): ThreadForkStartedEvent {
  return {
    type: 'THREAD_FORK_STARTED',
    timestamp: now(),
    workflowId: params.workflowId,
    threadId: params.threadId,
    parentThreadId: params.parentThreadId,
    forkConfig: params.forkConfig
  };
}

/**
 * 构建线程Fork完成事件参数
 */
export interface BuildThreadForkCompletedEventParams {
  threadId: string;
  workflowId: string;
  parentThreadId: string;
  childThreadIds: string[];
}

/**
 * 构建线程Fork完成事件
 */
export function buildThreadForkCompletedEvent(
  params: BuildThreadForkCompletedEventParams
): ThreadForkCompletedEvent {
  return {
    type: 'THREAD_FORK_COMPLETED',
    timestamp: now(),
    workflowId: params.workflowId,
    threadId: params.threadId,
    parentThreadId: params.parentThreadId,
    childThreadIds: params.childThreadIds
  };
}

/**
 * 构建线程Join开始事件参数
 */
export interface BuildThreadJoinStartedEventParams {
  threadId: string;
  workflowId: string;
  parentThreadId: string;
  childThreadIds: string[];
  joinStrategy: string;
}

/**
 * 构建线程Join开始事件
 */
export function buildThreadJoinStartedEvent(
  params: BuildThreadJoinStartedEventParams
): ThreadJoinStartedEvent {
  return {
    type: 'THREAD_JOIN_STARTED',
    timestamp: now(),
    workflowId: params.workflowId,
    threadId: params.threadId,
    parentThreadId: params.parentThreadId,
    childThreadIds: params.childThreadIds,
    joinStrategy: params.joinStrategy
  };
}

/**
 * 构建线程Join条件满足事件参数
 */
export interface BuildThreadJoinConditionMetEventParams {
  threadId: string;
  workflowId: string;
  parentThreadId: string;
  childThreadIds: string[];
  condition: string;
}

/**
 * 构建线程Join条件满足事件
 */
export function buildThreadJoinConditionMetEvent(
  params: BuildThreadJoinConditionMetEventParams
): ThreadJoinConditionMetEvent {
  return {
    type: 'THREAD_JOIN_CONDITION_MET',
    timestamp: now(),
    workflowId: params.workflowId,
    threadId: params.threadId,
    parentThreadId: params.parentThreadId,
    childThreadIds: params.childThreadIds,
    condition: params.condition
  };
}

/**
 * 构建线程Copy开始事件参数
 */
export interface BuildThreadCopyStartedEventParams {
  threadId: string;
  workflowId: string;
  sourceThreadId: string;
}

/**
 * 构建线程Copy开始事件
 */
export function buildThreadCopyStartedEvent(
  params: BuildThreadCopyStartedEventParams
): ThreadCopyStartedEvent {
  return {
    type: 'THREAD_COPY_STARTED',
    timestamp: now(),
    workflowId: params.workflowId,
    threadId: params.threadId,
    sourceThreadId: params.sourceThreadId
  };
}

/**
 * 构建线程Copy完成事件参数
 */
export interface BuildThreadCopyCompletedEventParams {
  threadId: string;
  workflowId: string;
  sourceThreadId: string;
  copiedThreadId: string;
}

/**
 * 构建线程Copy完成事件
 */
export function buildThreadCopyCompletedEvent(
  params: BuildThreadCopyCompletedEventParams
): ThreadCopyCompletedEvent {
  return {
    type: 'THREAD_COPY_COMPLETED',
    timestamp: now(),
    workflowId: params.workflowId,
    threadId: params.threadId,
    sourceThreadId: params.sourceThreadId,
    copiedThreadId: params.copiedThreadId
  };
}

/**
 * 构建触发子图开始事件参数
 */
export interface BuildTriggeredSubgraphStartedEventParams {
  threadId: string;
  workflowId: string;
  subgraphId: string;
  triggerId: string;
  input: Record<string, any>;
}

/**
 * 构建触发子图开始事件
 */
export function buildTriggeredSubgraphStartedEvent(
  params: BuildTriggeredSubgraphStartedEventParams
): TriggeredSubgraphStartedEvent {
  return {
    type: 'TRIGGERED_SUBGRAPH_STARTED',
    timestamp: now(),
    workflowId: params.workflowId,
    threadId: params.threadId,
    subgraphId: params.subgraphId,
    triggerId: params.triggerId,
    input: params.input
  };
}

/**
 * 构建触发子图完成事件参数
 */
export interface BuildTriggeredSubgraphCompletedEventParams {
  threadId: string;
  workflowId: string;
  subgraphId: string;
  triggerId: string;
  output: Record<string, any> | undefined;
  executionTime: number | undefined;
}

/**
 * 构建触发子图完成事件
 */
export function buildTriggeredSubgraphCompletedEvent(
  params: BuildTriggeredSubgraphCompletedEventParams
): TriggeredSubgraphCompletedEvent {
  return {
    type: 'TRIGGERED_SUBGRAPH_COMPLETED',
    timestamp: now(),
    workflowId: params.workflowId,
    threadId: params.threadId,
    subgraphId: params.subgraphId,
    triggerId: params.triggerId,
    output: params.output,
    executionTime: params.executionTime
  };
}

/**
 * 构建触发子图失败事件参数
 */
export interface BuildTriggeredSubgraphFailedEventParams {
  threadId: string;
  workflowId: string;
  subgraphId: string;
  triggerId: string;
  error: Error;
}

/**
 * 构建触发子图失败事件
 */
export function buildTriggeredSubgraphFailedEvent(
  params: BuildTriggeredSubgraphFailedEventParams
): TriggeredSubgraphFailedEvent {
  const errorInfo = params.error instanceof SDKError
    ? JSON.stringify(params.error.toJSON())
    : params.error.message;

  return {
    type: 'TRIGGERED_SUBGRAPH_FAILED',
    timestamp: now(),
    workflowId: params.workflowId,
    threadId: params.threadId,
    subgraphId: params.subgraphId,
    triggerId: params.triggerId,
    error: errorInfo
  };
}

/**
 * 构建检查点创建事件参数
 */
export interface BuildCheckpointCreatedEventParams {
  threadId: string;
  checkpointId: ID;
  workflowId?: string;
  description?: string;
}

/**
 * 构建检查点创建事件
 */
export function buildCheckpointCreatedEvent(
  params: BuildCheckpointCreatedEventParams
): CheckpointCreatedEvent {
  return {
    type: 'CHECKPOINT_CREATED',
    timestamp: now(),
    ...(params.workflowId && { workflowId: params.workflowId }),
    threadId: params.threadId,
    checkpointId: params.checkpointId,
    description: params.description
  };
}

/**
 * 构建检查点失败事件参数
 */
export interface BuildCheckpointFailedEventParams {
  threadId: string;
  operation: 'create' | 'restore' | 'delete';
  error?: Error;
  checkpointId?: ID;
  workflowId?: string;
}

/**
 * 构建检查点失败事件
 */
export function buildCheckpointFailedEvent(
  params: BuildCheckpointFailedEventParams
): CheckpointFailedEvent {
  const errorInfo = params.error
    ? (params.error instanceof SDKError
      ? JSON.stringify(params.error.toJSON())
      : params.error.message)
    : 'Unknown error';

  const event: CheckpointFailedEvent = {
    type: 'CHECKPOINT_FAILED',
    timestamp: now(),
    threadId: params.threadId,
    checkpointId: params.checkpointId,
    operation: params.operation,
    error: errorInfo
  };
  if (params.workflowId) {
    (event as any).workflowId = params.workflowId;
  }
  return event;
}

/**
 * 构建检查点删除事件参数
 */
export interface BuildCheckpointDeletedEventParams {
  threadId: string;
  checkpointId: ID;
  workflowId?: string;
  reason?: 'manual' | 'cleanup' | 'policy';
}

/**
 * 构建检查点删除事件
 */
export function buildCheckpointDeletedEvent(
  params: BuildCheckpointDeletedEventParams
): CheckpointDeletedEvent {
  return {
    type: 'CHECKPOINT_DELETED',
    timestamp: now(),
    ...(params.workflowId && { workflowId: params.workflowId }),
    threadId: params.threadId,
    checkpointId: params.checkpointId,
    reason: params.reason
  };
}

/**
 * 构建用户交互请求事件参数
 */
export interface BuildUserInteractionRequestedEventParams {
  threadId: string;
  nodeId: ID;
  interactionId: ID;
  operationType: string;
  prompt: string;
  timeout: number;
  workflowId?: string;
}

/**
 * 构建用户交互请求事件
 */
export function buildUserInteractionRequestedEvent(
  params: BuildUserInteractionRequestedEventParams
): UserInteractionRequestedEvent {
  const event: UserInteractionRequestedEvent = {
    type: 'USER_INTERACTION_REQUESTED',
    timestamp: now(),
    threadId: params.threadId,
    nodeId: params.nodeId,
    interactionId: params.interactionId,
    operationType: params.operationType,
    prompt: params.prompt,
    timeout: params.timeout
  };
  if (params.workflowId) {
    (event as any).workflowId = params.workflowId;
  }
  return event;
}

/**
 * 构建用户交互处理完成事件参数
 */
export interface BuildUserInteractionProcessedEventParams {
  threadId: string;
  interactionId: ID;
  operationType: string;
  results: any;
  workflowId?: string;
}

/**
 * 构建用户交互处理完成事件
 */
export function buildUserInteractionProcessedEvent(
  params: BuildUserInteractionProcessedEventParams
): UserInteractionProcessedEvent {
  const event: UserInteractionProcessedEvent = {
    type: 'USER_INTERACTION_PROCESSED',
    timestamp: now(),
    threadId: params.threadId,
    interactionId: params.interactionId,
    operationType: params.operationType,
    results: params.results
  };
  if (params.workflowId) {
    (event as any).workflowId = params.workflowId;
  }
  return event;
}
