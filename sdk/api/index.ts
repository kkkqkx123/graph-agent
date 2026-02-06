/**
 * API层入口文件
 * 导出所有API模块和类型
 */

// Command模式核心
export {
  Command,
  BaseCommand,
  SyncCommand,
  BaseSyncCommand,
  CommandMetadata,
  CommandValidationResult,
  validationSuccess,
  validationFailure
} from './core/command';

export { CommandExecutor } from './core/command-executor';

export {
  CommandMiddleware,
  LoggingMiddleware,
  ValidationMiddleware,
  CacheMiddleware,
  MetricsMiddleware,
  RetryMiddleware,
  Logger,
  CommandMetrics
} from './core/command-middleware';

// Query模式核心
export {
  Query,
  BaseQuery,
  QueryMetadata,
  QueryResult,
  querySuccess,
  queryFailure,
  isQuerySuccess,
  isQueryFailure
} from './core/query';

// Subscription模式核心
export {
  Subscription,
  BaseSubscription,
  SubscriptionMetadata
} from './core/subscription';

// 统一类型
export { ExecutionResult, success, failure, isSuccess, isFailure, getData, getError } from './types/execution-result';
export { ExecutionOptions, DEFAULT_EXECUTION_OPTIONS, mergeExecutionOptions } from './types/execution-options';

// 全局SDK实例
export { sdk } from './core/sdk';

// 资源管理API (CRUD Operations)
export { WorkflowRegistryAPI } from './resources/workflows/workflow-registry-api';
export { ThreadRegistryAPI } from './resources/threads/thread-registry-api';
export { NodeRegistryAPI } from './resources/templates/node-template-registry-api';
export { TriggerTemplateRegistryAPI } from './resources/templates/trigger-template-registry-api';
export { ToolRegistryAPI } from './resources/tools/tool-registry-api';
export { ScriptRegistryAPI } from './resources/scripts/script-registry-api';
export { ProfileRegistryAPI } from './resources/profiles/profile-registry-api';

// 通用资源API基类
export { GenericResourceAPI, type ResourceAPIOptions } from './resources/generic-resource-api';

// API工厂
export { APIFactory, apiFactory, type SDKAPIConfig, type AllAPIs } from './factory/api-factory';

// API装饰器
export {
  withCache,
  withLogging,
  withPerformance,
  withRetry,
  decorate,
  type CacheDecoratorOptions,
  type LoggingDecoratorOptions,
  type PerformanceDecoratorOptions,
  type RetryDecoratorOptions
} from './decorators/api-decorators';

// 统一错误处理
export {
  APIError,
  APIErrorCode,
  type APIErrorDetails,
  type ErrorHandler,
  type ErrorContext,
  DefaultErrorHandler,
  ErrorHandlerRegistry
} from './types/api-error';

// 事件系统
export {
  APIEventBus,
  APIEventType,
  APIEventBuilder,
  apiEventBus,
  type APIEventData,
  type APIEventListener,
  type EventListenerConfig
} from './events/api-event-system';

// 审计日志
export {
  AuditLogger,
  AuditLogLevel,
  InMemoryAuditLogStorage,
  auditLogger,
  type AuditLogEntry,
  type AuditLogStorage,
  type AuditLogFilter,
  type AuditLoggerConfig
} from './audit/audit-logger';

// ============================================================================
// Command类 - 核心API (Core APIs) - 有副作用操作
// ============================================================================

// Execution Commands
export {
  ExecuteWorkflowCommand
} from './operations/commands/execution/execute-workflow-command';
export type { ExecuteWorkflowParams } from './operations/commands/execution/execute-workflow-command';

export {
  PauseThreadCommand
} from './operations/commands/execution/pause-thread-command';

export {
  ResumeThreadCommand
} from './operations/commands/execution/resume-thread-command';

export {
  CancelThreadCommand
} from './operations/commands/execution/cancel-thread-command';

// LLM Commands
export {
  GenerateCommand
} from './operations/commands/llm/generate-command';

export {
  GenerateBatchCommand
} from './operations/commands/llm/generate-batch-command';

// Script Commands
export {
  ExecuteScriptCommand
} from './operations/commands/scripts/execute-script-command';

// Tool Commands
export {
  ExecuteToolCommand
} from './operations/commands/tools/execute-tool-command';

// Checkpoint Commands
export {
  CreateCheckpointCommand
} from './operations/commands/checkpoints/create-checkpoint-command';
export type { CreateCheckpointParams } from './operations/commands/checkpoints/create-checkpoint-command';

export {
  RestoreFromCheckpointCommand
} from './operations/commands/checkpoints/restore-from-checkpoint-command';
export type { RestoreFromCheckpointParams } from './operations/commands/checkpoints/restore-from-checkpoint-command';

// Trigger Commands
export {
  EnableTriggerCommand
} from './operations/commands/triggers/enable-trigger-command';
export type { EnableTriggerParams } from './operations/commands/triggers/enable-trigger-command';

export {
  DisableTriggerCommand
} from './operations/commands/triggers/disable-trigger-command';
export type { DisableTriggerParams } from './operations/commands/triggers/disable-trigger-command';

// ============================================================================
// Query类 - 监控API (Monitoring APIs) - 纯查询操作
// ============================================================================

// Messages Queries
export {
  GetMessagesQuery
} from './operations/queries/messages/get-messages-query';
export type { GetMessagesParams } from './operations/queries/messages/get-messages-query';

export {
  GetRecentMessagesQuery
} from './operations/queries/messages/get-recent-messages-query';
export type { GetRecentMessagesParams } from './operations/queries/messages/get-recent-messages-query';

export {
  SearchMessagesQuery
} from './operations/queries/messages/search-messages-query';
export type { SearchMessagesParams } from './operations/queries/messages/search-messages-query';

export {
  GetMessageStatsQuery
} from './operations/queries/messages/get-message-stats-query';
export type { GetMessageStatsParams, MessageStats } from './operations/queries/messages/get-message-stats-query';

// Events Queries
export {
  GetEventsQuery
} from './operations/queries/events/get-events-query';
export type { GetEventsParams } from './operations/queries/events/get-events-query';

export {
  GetEventStatsQuery
} from './operations/queries/events/get-event-stats-query';
export type { GetEventStatsParams, EventStats } from './operations/queries/events/get-event-stats-query';

// State Queries
export {
  GetVariablesQuery
} from './operations/queries/state/get-variables-query';
export type { GetVariablesParams } from './operations/queries/state/get-variables-query';

export {
  GetVariableQuery
} from './operations/queries/state/get-variable-query';
export type { GetVariableParams } from './operations/queries/state/get-variable-query';

export {
  HasVariableQuery
} from './operations/queries/state/has-variable-query';
export type { HasVariableParams } from './operations/queries/state/has-variable-query';

export {
  GetVariableDefinitionsQuery
} from './operations/queries/state/get-variable-definitions-query';
export type { GetVariableDefinitionsParams } from './operations/queries/state/get-variable-definitions-query';

// Checkpoints Queries
export {
  GetCheckpointsQuery
} from './operations/queries/checkpoints/get-checkpoints-query';
export type { GetCheckpointsParams } from './operations/queries/checkpoints/get-checkpoints-query';

// Triggers Queries
export {
  GetTriggersQuery
} from './operations/queries/triggers/get-triggers-query';
export type { GetTriggersParams } from './operations/queries/triggers/get-triggers-query';

// ============================================================================
// Subscription类 - 事件订阅API (Event Subscription APIs)
// ============================================================================

export {
  OnEventSubscription
} from './operations/subscriptions/events/on-event-subscription';
export type { OnEventParams } from './operations/subscriptions/events/on-event-subscription';

export {
  OnceEventSubscription
} from './operations/subscriptions/events/once-event-subscription';
export type { OnceEventParams } from './operations/subscriptions/events/once-event-subscription';

export {
  OffEventSubscription
} from './operations/subscriptions/events/off-event-subscription';
export type { OffEventParams } from './operations/subscriptions/events/off-event-subscription';

// ============================================================================
// 验证API
// ============================================================================
export { WorkflowValidatorAPI } from './validation/workflow-validator-api';
export { CodeConfigValidatorAPI } from './validation/code-config-validator-api';
export { ToolConfigValidatorAPI } from './validation/tool-config-validator-api';
export { HookValidatorAPI } from './validation/hook-validator-api';
export { TriggerValidatorAPI } from './validation/trigger-validator-api';

// ============================================================================
// 构建器
// ============================================================================
export { WorkflowBuilder, ExecutionBuilder, WorkflowComposer, sequential, parallel } from './builders';
export { merge as mergeWorkflows } from './builders';
export { NodeTemplateBuilder } from './builders/node-template-builder';
export { TriggerTemplateBuilder } from './builders/trigger-template-builder';
export type {
  ExecutionEvent,
  StartEvent,
  CompleteEvent,
  ErrorEvent,
  CancelledEvent,
  ProgressEvent,
  NodeExecutedEvent
} from './builders/execution-builder';
export type {
  WorkflowCompositionConfig,
  WorkflowCompositionItem,
  WorkflowCompositionResult,
  CompositionEvent,
  CompositionStartEvent,
  CompositionCompleteEvent,
  CompositionErrorEvent
} from './builders/workflow-composer';

// ============================================================================
// 工具函数
// ============================================================================
export { ok, err, tryCatch, tryCatchAsync, all, any } from './utils/result';
export type { Result, Ok, Err } from './utils/result';

// ============================================================================
// Observable响应式编程
// ============================================================================
export {
  Observable,
  Observer,
  Subscription as ObservableSubscription,
  ObservableImpl,
  of,
  fromPromise,
  fromArray,
  create,
  map,
  filter,
  flatMap,
  distinctUntilChanged,
  throttleTime,
  debounceTime,
  catchError,
  retry,
  delay,
  interval,
  timer,
  merge,
  concat,
  combineLatest,
  take,
  skip,
  scan,
  reduce,
  last,
  first
} from './utils/observable';
export type { OperatorFunction } from './utils/observable';

// ============================================================================
// 类型定义
// ============================================================================
export type {
  ThreadOptions,
  SDKOptions,
  SDKDependencies,
  WorkflowFilter,
  ThreadFilter,
  WorkflowSummary,
  ThreadSummary,
  ToolFilter,
  ToolOptions,
  ToolExecutionResult,
  ToolTestResult,
  ScriptFilter,
  ScriptOptions,
  ScriptTestResult,
  ScriptExecutionLog,
  ScriptStatistics,
  ScriptRegistrationConfig,
  ScriptBatchExecutionConfig,
  EventFilter,
  CheckpointFilter,
  CheckpointSummary,
  VariableUpdateOptions,
  VariableFilter,
  NodeTemplateFilter,
  NodeTemplateSummary,
  TriggerTemplateFilter,
  TriggerTemplateSummary,
  TriggerFilter
} from './types';

// ============================================================================
// Profile模板类型
// ============================================================================
export type { ProfileTemplate } from './resources/profiles/profile-registry-api';

// ============================================================================
// ValidationResult 从 types/errors.ts 导入
// ============================================================================
export type { ValidationResult } from '../types/errors';