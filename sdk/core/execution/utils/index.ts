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
  buildTokenLimitExceededEvent,
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
  buildTriggeredSubgraphFailedEvent,
  buildCheckpointCreatedEvent,
  buildCheckpointFailedEvent,
  buildCheckpointDeletedEvent,
  buildUserInteractionRequestedEvent,
  buildUserInteractionProcessedEvent
} from './event/index.js';

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
} from './event/event-emitter.js';

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
} from './event/event-waiter.js';

// 线程操作工具
export {
  fork,
  join,
  copy,
  type ForkConfig,
  type JoinStrategy,
  type JoinResult
} from './thread-operations.js';

// 线程状态验证工具
export {
  validateTransition,
  isValidTransition,
  getAllowedTransitions,
  isTerminalStatus,
  isActiveStatus
} from './thread-state-validator.js';

export {
  VariableAccessor,
  VariableNamespace
} from './variable-accessor.js';

export { checkWorkflowReferences } from './workflow-reference-checker.js';

// Hook创建器工具
export {
  createThreadStateCheckHook,
  createCustomValidationHook,
  createPermissionCheckHook,
  createAuditLoggingHook
} from './hook-creators.js';

// 回调工具函数
export {
  wrapCallback,
  createTimeoutPromise,
  withTimeout,
  mergeResults,
  validateCallback,
  createSafeCallback,
  executeCallbacks,
  createRetryCallback,
  createThrottledCallback,
  createDebouncedCallback,
  createOnceCallback,
  createCachedCallback,
  cleanupCache
} from './callback-utils.js';
