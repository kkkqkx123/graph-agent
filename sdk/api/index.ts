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
} from './types/command';

export { CommandExecutor } from './common/command-executor';

export {
  CommandMiddleware,
  LoggingMiddleware,
  ValidationMiddleware,
  CacheMiddleware,
  MetricsMiddleware,
  RetryMiddleware,
  Logger,
  CommandMetrics
} from './types/command-middleware';

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
} from './types/query';

// Subscription模式核心
export {
  Subscription,
  BaseSubscription,
  SubscriptionMetadata
} from './types/subscription';

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
export { LLMProfileRegistryAPI as ProfileRegistryAPI } from './resources/profiles/profile-registry-api';

// 新增资源管理API
export { CheckpointResourceAPI } from './resources/checkpoints/checkpoint-resource-api';
export {
  MessageResourceAPI
} from './resources/messages/message-resource-api';
export {
  VariableResourceAPI,
  type VariableDefinition
} from './resources/variables/variable-resource-api';
export { TriggerResourceAPI } from './resources/triggers/trigger-resource-api';
export {
  EventResourceAPI
} from './resources/events/event-resource-api';

// 通用资源API基类和工具
export { GenericResourceAPI } from './resources/generic-resource-api';
export {
  createResourceAPIs,
  type ResourceAPIs
} from './resources';

// API工厂
export { APIFactory, apiFactory, type SDKAPIConfig, type AllAPIs } from './core/api-factory';

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
} from './common/api-decorators';

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

// 事件系统类型
export {
  APIEventType,
  type APIEventData,
  type APIEventListener,
  type EventListenerConfig
} from './types/event-types';

// 事件系统实现
export {
  APIEventBus,
  APIEventBuilder,
  apiEventBus
} from './common/api-event-system';

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

// Checkpoint Commands (已迁移到CheckpointResourceAPI)
// 使用CheckpointResourceAPI.createThreadCheckpoint()和.restoreFromCheckpoint()

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

// Messages Queries (已迁移到MessageResourceAPI)
// 使用MessageResourceAPI.getThreadMessages(), .getRecentMessages(), .searchMessages(), .getMessageStats()

// Events Queries (已迁移到EventResourceAPI)
// 使用EventResourceAPI.getEvents(), .getEventStats()

// State Queries (已迁移到VariableResourceAPI)
// 使用VariableResourceAPI.getThreadVariables(), .getThreadVariable(), .hasThreadVariable(), .getThreadVariableDefinitions()

// Checkpoints Queries (已迁移到CheckpointResourceAPI)
// 使用CheckpointResourceAPI.getAll(), .getThreadCheckpoints()

// Triggers Queries (已迁移到TriggerResourceAPI)
// 使用TriggerResourceAPI.getThreadTriggers(), .getThreadTrigger()

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
export { WorkflowValidator as WorkflowValidatorAPI } from '../core/validation';
export { CodeConfigValidator as CodeConfigValidatorAPI } from '../core/validation';
export { ToolConfigValidator as ToolConfigValidatorAPI } from '../core/validation';
export { validateHook as validateHookAPI, validateHooks as validateHooksAPI } from '../core/validation';
export {
  validateTriggerCondition as validateTriggerConditionAPI,
  validateExecuteTriggeredSubgraphActionConfig as validateExecuteTriggeredSubgraphActionConfigAPI,
  validateTriggerAction as validateTriggerActionAPI,
  validateWorkflowTrigger as validateWorkflowTriggerAPI,
  validateTriggerReference as validateTriggerReferenceAPI,
  validateTriggers as validateTriggersAPI
} from '../core/validation';

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
  create
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
export type { LLMProfileTemplate as ProfileTemplate } from './resources/profiles/profile-registry-api';

// ============================================================================
// ValidationResult 从 types/errors.ts 导入
// ============================================================================
export type { ValidationResult } from '../types/errors';