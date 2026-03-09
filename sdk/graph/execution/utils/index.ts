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

// 事件触发工具函数（从 core/utils/event 重新导出）
export {
  safeEmit,
  emit,
  emitBatch,
  emitBatchParallel,
  emitIf,
  emitDelayed,
  emitWithRetry,
  emitAndWaitForCallback
} from '../../../core/utils/event/event-emitter.js';

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
  waitForNodeFailed
} from './event/event-waiter.js';

// 通用条件等待函数（从 core/utils/event 重新导出）
export {
  WAIT_FOREVER,
  waitForCondition,
  waitForAllConditions,
  waitForAnyCondition
} from '../../../core/utils/event/condition-waiter.js';

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

// Hook创建器工具（从 core/utils/hook 重新导出通用部分）
export {
  createThreadStateCheckHook,
  createCustomValidationHook,
  createPermissionCheckHook,
  createAuditLoggingHook
} from './hook-creators.js';

// 回调工具函数（从 core/utils/callback 重新导出）
export {
  wrapCallback,
  createTimeoutPromise,
  withTimeout,
  validateCallback,
  createSafeCallback,
  executeCallbacks,
  createRetryCallback,
  createThrottledCallback,
  createDebouncedCallback,
  createOnceCallback,
  createCachedCallback,
  cleanupCache
} from '../../../core/utils/callback.js';

// 检查点差异计算器
export { CheckpointDiffCalculator } from './checkpoint-diff-calculator.js';

// 增量检查点恢复器
export { DeltaCheckpointRestorer, type DeltaRestorerDependencies } from './checkpoint-delta-restorer.js';

// 检查点清理策略（从 core/utils/checkpoint 重新导出）
export {
  TimeBasedCleanupStrategy,
  CountBasedCleanupStrategy,
  SizeBasedCleanupStrategy,
  createCleanupStrategy
} from '../../../core/utils/checkpoint/cleanup-policy.js';

// 检查点序列化（从 core/utils/checkpoint 重新导出）
export {
  serializeCheckpoint,
  deserializeCheckpoint
} from '../../../core/utils/checkpoint/serializer.js';
