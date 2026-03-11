/**
 * Events类型定义统一导出
 * 定义工作流执行过程中的事件类型
 */

// 导出基础类型
export * from './base.js';

// 导出线程相关事件
export * from './thread-events.js';

// 导出节点相关事件
export * from './node-events.js';

// 导出工具相关事件
export * from './tool-events.js';

// 导出对话相关事件
export * from './conversation-events.js';

// 导出检查点相关事件
export * from './checkpoint-events.js';

// 导出子图相关事件
export * from './subgraph-events.js';

// 导出交互相关事件
export * from './interaction-events.js';

// 导出系统事件
export * from './system-events.js';

// 导出 Agent 相关事件
export * from './agent-events.js';

// 导出 Skill 相关事件
export * from './skill-events.js';

// 为了向后兼容，重新导出 EventType
export { EventType } from './base.js';

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
} from './thread-events.js';

import type {
  NodeStartedEvent,
  NodeCompletedEvent,
  NodeFailedEvent,
  NodeCustomEvent
} from './node-events.js';

import type {
  ToolCallStartedEvent,
  ToolCallCompletedEvent,
  ToolCallFailedEvent,
  ToolAddedEvent
} from './tool-events.js';

import type {
  MessageAddedEvent,
  ConversationStateChangedEvent
} from './conversation-events.js';

import type {
  CheckpointCreatedEvent,
  CheckpointRestoredEvent,
  CheckpointDeletedEvent,
  CheckpointFailedEvent
} from './checkpoint-events.js';

import type {
  SubgraphStartedEvent,
  SubgraphCompletedEvent,
  TriggeredSubgraphStartedEvent,
  TriggeredSubgraphCompletedEvent,
  TriggeredSubgraphFailedEvent
} from './subgraph-events.js';

import type {
  UserInteractionRequestedEvent,
  UserInteractionRespondedEvent,
  UserInteractionProcessedEvent,
  UserInteractionFailedEvent,
  HumanRelayRequestedEvent,
  HumanRelayRespondedEvent,
  HumanRelayProcessedEvent,
  HumanRelayFailedEvent
} from './interaction-events.js';

import type {
  TokenLimitExceededEvent,
  TokenUsageWarningEvent,
  ErrorEvent,
  VariableChangedEvent,
  LLMStreamAbortedEvent,
  LLMStreamErrorEvent
} from './system-events.js';

import type { AgentCustomEvent } from './agent-events.js';
import type {
  SkillExecutionStartedEvent,
  SkillExecutionCompletedEvent,
  SkillExecutionFailedEvent
} from './skill-events.js';

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
  | ToolAddedEvent
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
  | LLMStreamErrorEvent
  | AgentCustomEvent
  | SkillExecutionStartedEvent
  | SkillExecutionCompletedEvent
  | SkillExecutionFailedEvent;