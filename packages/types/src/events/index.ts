/**
 * Events类型定义统一导出
 * 定义工作流执行过程中的事件类型
 */

// 导出基础类型
export * from './base';

// 导出线程相关事件
export * from './thread-events';

// 导出节点相关事件
export * from './node-events';

// 导出工具相关事件
export * from './tool-events';

// 导出对话相关事件
export * from './conversation-events';

// 导出检查点相关事件
export * from './checkpoint-events';

// 导出子图相关事件
export * from './subgraph-events';

// 导出交互相关事件
export * from './interaction-events';

// 导出系统事件
export * from './system-events';

// 为了向后兼容，重新导出 EventType
export { EventType } from './base';

// 导出所有事件类型的联合类型
import type {
  ThreadStartedEvent,
  ThreadCompletedEvent,
  ThreadFailedEvent,
  ThreadPausedEvent,
  ThreadResumedEvent,
  ThreadCancelledEvent,
  ThreadStateChangedEvent,
  ThreadForkStartedEvent,
  ThreadForkCompletedEvent,
  ThreadJoinStartedEvent,
  ThreadJoinConditionMetEvent,
  ThreadCopyStartedEvent,
  ThreadCopyCompletedEvent
} from './thread-events';

import type {
  NodeStartedEvent,
  NodeCompletedEvent,
  NodeFailedEvent,
  NodeCustomEvent
} from './node-events';

import type {
  ToolCallStartedEvent,
  ToolCallCompletedEvent,
  ToolCallFailedEvent
} from './tool-events';

import type {
  MessageAddedEvent,
  ConversationStateChangedEvent
} from './conversation-events';

import type {
  CheckpointCreatedEvent,
  CheckpointRestoredEvent,
  CheckpointDeletedEvent,
  CheckpointFailedEvent
} from './checkpoint-events';

import type {
  SubgraphStartedEvent,
  SubgraphCompletedEvent,
  TriggeredSubgraphStartedEvent,
  TriggeredSubgraphCompletedEvent,
  TriggeredSubgraphFailedEvent
} from './subgraph-events';

import type {
  UserInteractionRequestedEvent,
  UserInteractionRespondedEvent,
  UserInteractionProcessedEvent,
  UserInteractionFailedEvent,
  HumanRelayRequestedEvent,
  HumanRelayRespondedEvent,
  HumanRelayProcessedEvent,
  HumanRelayFailedEvent
} from './interaction-events';

import type {
  TokenLimitExceededEvent,
  TokenUsageWarningEvent,
  ErrorEvent,
  VariableChangedEvent,
  LLMStreamAbortedEvent,
  LLMStreamErrorEvent
} from './system-events';

/**
 * 所有事件类型的联合类型
 */
export type Event =
  | ThreadStartedEvent
  | ThreadCompletedEvent
  | ThreadFailedEvent
  | ThreadPausedEvent
  | ThreadResumedEvent
  | ThreadCancelledEvent
  | ThreadStateChangedEvent
  | ThreadForkStartedEvent
  | ThreadForkCompletedEvent
  | ThreadJoinStartedEvent
  | ThreadJoinConditionMetEvent
  | ThreadCopyStartedEvent
  | ThreadCopyCompletedEvent
  | NodeStartedEvent
  | NodeCompletedEvent
  | NodeFailedEvent
  | NodeCustomEvent
  | TokenLimitExceededEvent
  | TokenUsageWarningEvent
  | MessageAddedEvent
  | ToolCallStartedEvent
  | ToolCallCompletedEvent
  | ToolCallFailedEvent
  | ConversationStateChangedEvent
  | ErrorEvent
  | CheckpointCreatedEvent
  | CheckpointRestoredEvent
  | CheckpointDeletedEvent
  | CheckpointFailedEvent
  | SubgraphStartedEvent
  | SubgraphCompletedEvent
  | TriggeredSubgraphStartedEvent
  | TriggeredSubgraphCompletedEvent
  | TriggeredSubgraphFailedEvent
  | VariableChangedEvent
  | UserInteractionRequestedEvent
  | UserInteractionRespondedEvent
  | UserInteractionProcessedEvent
  | UserInteractionFailedEvent
  | HumanRelayRequestedEvent
  | HumanRelayRespondedEvent
  | HumanRelayProcessedEvent
  | HumanRelayFailedEvent
  | LLMStreamAbortedEvent
  | LLMStreamErrorEvent;