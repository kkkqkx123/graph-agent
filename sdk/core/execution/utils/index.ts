/**
 * 工具类模块导出
 * 提供事件相关的工具函数
 */

// 事件构建工具函数
export {
  buildThreadStartedEvent,
  buildThreadCompletedEvent,
  buildThreadFailedEvent,
  buildThreadPausedEvent,
  buildThreadResumedEvent,
  buildThreadCancelledEvent,
  buildThreadStateChangedEvent,
  buildNodeStartedEvent,
  buildNodeCompletedEvent,
  buildNodeFailedEvent,
  buildSubgraphStartedEvent,
  buildSubgraphCompletedEvent,
  buildVariableChangedEvent,
  buildMessageAddedEvent,
  buildTokenUsageWarningEvent,
  buildConversationStateChangedEvent,
  buildToolCallStartedEvent,
  buildToolCallCompletedEvent,
  buildToolCallFailedEvent,
  buildThreadForkStartedEvent,
  buildThreadForkCompletedEvent,
  buildThreadJoinStartedEvent,
  buildThreadJoinConditionMetEvent,
  buildThreadCopyStartedEvent,
  buildThreadCopyCompletedEvent,
  buildTriggeredSubgraphStartedEvent,
  buildTriggeredSubgraphCompletedEvent,
  buildTriggeredSubgraphFailedEvent
} from './event';

// 事件触发工具函数
export {
  safeEmit,
  emit,
  emitBatch,
  emitBatchParallel,
  emitIf,
  emitDelayed,
  emitWithRetry,
  emitAndWaitForCallback
} from './event/event-emitter';

// 事件等待工具函数
export {
  waitForThreadPaused,
  waitForThreadCancelled,
  waitForThreadCompleted,
  waitForThreadFailed,
  waitForThreadResumed,
  waitForAnyLifecycleEvent,
  waitForMultipleThreadsCompleted,
  waitForAnyThreadCompleted,
  waitForAnyThreadCompletion,
  waitForNodeCompleted,
  waitForNodeFailed,
  waitForCondition,
  waitForAllConditions,
  waitForAnyCondition
} from './event/event-waiter';

// 线程操作工具
export {
  fork,
  join,
  copy,
  type ForkConfig,
  type JoinStrategy,
  type JoinResult
} from './thread-operations';

// 线程状态验证工具
export {
  validateTransition,
  isValidTransition,
  getAllowedTransitions,
  isTerminalStatus,
  isActiveStatus
} from './thread-state-validator';

export {
  VariableAccessor,
  VariableNamespace
} from './variable-accessor';

export { checkWorkflowReferences } from "./workflow-reference-checker";
