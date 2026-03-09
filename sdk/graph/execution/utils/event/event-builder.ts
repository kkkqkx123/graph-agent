/**
 * EventBuilder - 事件构建工具函数
 * 提供统一的事件构建函数
 *
 * 设计原则：
 * - 纯函数：所有方法都是纯函数，无副作用
 * - 类型安全：通过泛型自动推导参数类型
 * - 统一格式：确保所有事件对象格式一致
 * - 极简实现：使用泛型工厂减少重复代码
 */

import { now } from '@modular-agent/common-utils';
import type { Thread, ThreadResult, ID } from '@modular-agent/types';
import { SDKError } from '@modular-agent/types';
import type {
  BaseEvent,
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

// =============================================================================
// 类型工具
// =============================================================================

/** 构建参数类型（排除 type 和 timestamp） */
type BuildParams<T extends BaseEvent> = Omit<T, 'type' | 'timestamp'>;

/** 带 Error 的参数类型 */
type ErrorParams<T extends BaseEvent & { error: any }> = Omit<BuildParams<T>, 'error'> & { error: Error };

// =============================================================================
// 通用构建器工厂
// =============================================================================

/** 创建标准事件构建器 */
const createBuilder = <T extends BaseEvent>(type: T['type']) =>
  (params: BuildParams<T>): T => ({ type, timestamp: now(), ...params } as T);

/** 创建带 Error 转换的构建器 */
const createErrorBuilder = <T extends BaseEvent & { error: any }>(type: T['type']) =>
  (params: ErrorParams<T>): T => ({
    type,
    timestamp: now(),
    ...params,
    error: params.error instanceof SDKError
      ? params.error.toJSON()
      : { message: params.error.message, name: params.error.name }
  } as T);

/** 创建 Error 转字符串的构建器 */
const createStringErrorBuilder = <T extends BaseEvent & { error: string }>(type: T['type']) =>
  (params: Omit<BuildParams<T>, 'error'> & { error: Error }): T => ({
    type,
    timestamp: now(),
    ...params,
    error: params.error instanceof SDKError
      ? JSON.stringify(params.error.toJSON())
      : params.error.message
  } as T);

// =============================================================================
// 线程生命周期事件（从 Thread 对象构建）
// =============================================================================

export const buildThreadStartedEvent = (thread: Thread): ThreadStartedEvent => ({
  type: 'THREAD_STARTED',
  timestamp: now(),
  workflowId: thread.workflowId,
  threadId: thread.id,
  input: thread.input
});

export const buildThreadCompletedEvent = (thread: Thread, result: ThreadResult): ThreadCompletedEvent => ({
  type: 'THREAD_COMPLETED',
  timestamp: now(),
  workflowId: thread.workflowId,
  threadId: thread.id,
  output: result.output,
  executionTime: result.executionTime
});

export const buildThreadFailedEvent = createErrorBuilder<ThreadFailedEvent>('THREAD_FAILED');

export const buildThreadPausedEvent = (thread: Thread): ThreadPausedEvent => ({
  type: 'THREAD_PAUSED',
  timestamp: now(),
  workflowId: thread.workflowId,
  threadId: thread.id
});

export const buildThreadResumedEvent = (thread: Thread): ThreadResumedEvent => ({
  type: 'THREAD_RESUMED',
  timestamp: now(),
  workflowId: thread.workflowId,
  threadId: thread.id
});

export const buildThreadCancelledEvent = (thread: Thread, reason?: string): ThreadCancelledEvent => ({
  type: 'THREAD_CANCELLED',
  timestamp: now(),
  workflowId: thread.workflowId,
  threadId: thread.id,
  reason
});

export const buildThreadStateChangedEvent = (
  thread: Thread,
  previousStatus: string,
  newStatus: string
): ThreadStateChangedEvent => ({
  type: 'THREAD_STATE_CHANGED',
  timestamp: now(),
  workflowId: thread.workflowId,
  threadId: thread.id,
  previousStatus,
  newStatus
});

// =============================================================================
// 节点事件
// =============================================================================

export const buildNodeStartedEvent = createBuilder<NodeStartedEvent>('NODE_STARTED');
export const buildNodeCompletedEvent = createBuilder<NodeCompletedEvent>('NODE_COMPLETED');
export const buildNodeFailedEvent = createErrorBuilder<NodeFailedEvent>('NODE_FAILED');

// =============================================================================
// 子图事件
// =============================================================================

export const buildSubgraphStartedEvent = createBuilder<SubgraphStartedEvent>('SUBGRAPH_STARTED');
export const buildSubgraphCompletedEvent = createBuilder<SubgraphCompletedEvent>('SUBGRAPH_COMPLETED');

// =============================================================================
// 变量事件
// =============================================================================

export const buildVariableChangedEvent = createBuilder<VariableChangedEvent>('VARIABLE_CHANGED');

// =============================================================================
// 消息/Token/对话事件（使用工厂创建）
// =============================================================================

export const buildMessageAddedEvent = (params: BuildParams<MessageAddedEvent> & { workflowId?: string }): MessageAddedEvent =>
  ({ type: 'MESSAGE_ADDED', timestamp: now(), ...params } as MessageAddedEvent);

export const buildTokenUsageWarningEvent = (params: BuildParams<TokenUsageWarningEvent> & { workflowId?: string }): TokenUsageWarningEvent =>
  ({ type: 'TOKEN_USAGE_WARNING', timestamp: now(), ...params } as TokenUsageWarningEvent);

export const buildTokenLimitExceededEvent = (params: BuildParams<TokenLimitExceededEvent> & { workflowId?: string }): TokenLimitExceededEvent =>
  ({ type: 'TOKEN_LIMIT_EXCEEDED', timestamp: now(), ...params } as TokenLimitExceededEvent);

export const buildConversationStateChangedEvent = (params: BuildParams<ConversationStateChangedEvent> & { workflowId?: string }): ConversationStateChangedEvent =>
  ({ type: 'CONVERSATION_STATE_CHANGED', timestamp: now(), ...params } as ConversationStateChangedEvent);

// =============================================================================
// 工具调用事件
// =============================================================================

export const buildToolCallStartedEvent = (params: BuildParams<ToolCallStartedEvent> & { workflowId?: string }): ToolCallStartedEvent =>
  ({ type: 'TOOL_CALL_STARTED', timestamp: now(), ...params } as ToolCallStartedEvent);

export const buildToolCallCompletedEvent = (params: BuildParams<ToolCallCompletedEvent> & { workflowId?: string }): ToolCallCompletedEvent =>
  ({ type: 'TOOL_CALL_COMPLETED', timestamp: now(), ...params } as ToolCallCompletedEvent);

export const buildToolCallFailedEvent = (params: Omit<BuildParams<ToolCallFailedEvent>, 'error'> & { error: Error; workflowId?: string }): ToolCallFailedEvent =>
  ({ type: 'TOOL_CALL_FAILED', timestamp: now(), ...params, error: params.error.message || 'Unknown error' } as ToolCallFailedEvent);

// =============================================================================
// Fork/Join/Copy 事件
// =============================================================================

export const buildThreadForkStartedEvent = createBuilder<ThreadForkStartedEvent>('THREAD_FORK_STARTED');
export const buildThreadForkCompletedEvent = createBuilder<ThreadForkCompletedEvent>('THREAD_FORK_COMPLETED');
export const buildThreadJoinStartedEvent = createBuilder<ThreadJoinStartedEvent>('THREAD_JOIN_STARTED');
export const buildThreadJoinConditionMetEvent = createBuilder<ThreadJoinConditionMetEvent>('THREAD_JOIN_CONDITION_MET');
export const buildThreadCopyStartedEvent = createBuilder<ThreadCopyStartedEvent>('THREAD_COPY_STARTED');
export const buildThreadCopyCompletedEvent = createBuilder<ThreadCopyCompletedEvent>('THREAD_COPY_COMPLETED');

// =============================================================================
// 触发子图事件
// =============================================================================

export const buildTriggeredSubgraphStartedEvent = createBuilder<TriggeredSubgraphStartedEvent>('TRIGGERED_SUBGRAPH_STARTED');
export const buildTriggeredSubgraphCompletedEvent = createBuilder<TriggeredSubgraphCompletedEvent>('TRIGGERED_SUBGRAPH_COMPLETED');
export const buildTriggeredSubgraphFailedEvent = createStringErrorBuilder<TriggeredSubgraphFailedEvent>('TRIGGERED_SUBGRAPH_FAILED');

// =============================================================================
// 检查点事件
// =============================================================================

export const buildCheckpointCreatedEvent = (params: BuildParams<CheckpointCreatedEvent> & { workflowId?: string }): CheckpointCreatedEvent =>
  ({ type: 'CHECKPOINT_CREATED', timestamp: now(), ...params } as CheckpointCreatedEvent);

export const buildCheckpointFailedEvent = (params: Omit<BuildParams<CheckpointFailedEvent>, 'error'> & { error?: Error; workflowId?: string }): CheckpointFailedEvent =>
  ({
    type: 'CHECKPOINT_FAILED',
    timestamp: now(),
    ...params,
    error: params.error
      ? (params.error instanceof SDKError ? JSON.stringify(params.error.toJSON()) : params.error.message)
      : 'Unknown error'
  } as CheckpointFailedEvent);

export const buildCheckpointDeletedEvent = (params: BuildParams<CheckpointDeletedEvent> & { workflowId?: string }): CheckpointDeletedEvent =>
  ({ type: 'CHECKPOINT_DELETED', timestamp: now(), ...params } as CheckpointDeletedEvent);

// =============================================================================
// 用户交互事件
// =============================================================================

export const buildUserInteractionRequestedEvent = (params: BuildParams<UserInteractionRequestedEvent> & { workflowId?: string }): UserInteractionRequestedEvent =>
  ({ type: 'USER_INTERACTION_REQUESTED', timestamp: now(), ...params } as UserInteractionRequestedEvent);

export const buildUserInteractionProcessedEvent = (params: BuildParams<UserInteractionProcessedEvent> & { workflowId?: string }): UserInteractionProcessedEvent =>
  ({ type: 'USER_INTERACTION_PROCESSED', timestamp: now(), ...params } as UserInteractionProcessedEvent);