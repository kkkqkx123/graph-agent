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

// Command类 - 核心API (Core APIs)
export {
  ExecuteWorkflowCommand,
  PauseThreadCommand,
  ResumeThreadCommand,
  CancelThreadCommand
} from './operations/core/execution/commands';

export {
  GenerateCommand,
  GenerateBatchCommand
} from './operations/core/llm/commands';

export {
  ExecuteToolCommand,
  ExecuteBatchCommand as ExecuteToolBatchCommand,
  TestToolCommand
} from './operations/core/tools/commands';

export {
  ExecuteScriptCommand,
  ExecuteBatchCommand as ExecuteScriptBatchCommand,
  TestScriptCommand
} from './operations/core/scripts/commands';

// Command类 - 监控API (Monitoring APIs)
export {
  GetMessagesCommand,
  GetRecentMessagesCommand,
  SearchMessagesCommand,
  GetMessageStatsCommand,
  ExportMessagesCommand
} from './operations/monitoring/messages/commands';

export {
  OnEventCommand,
  OnceEventCommand,
  OffEventCommand,
  WaitForEventCommand,
  GetEventsCommand,
  GetEventStatsCommand
} from './operations/monitoring/events/commands';

export {
  GetVariablesCommand,
  GetVariableCommand,
  HasVariableCommand,
  GetVariableDefinitionsCommand
} from './operations/monitoring/state/commands';

// Command类 - 管理API (Management APIs)
export {
  CreateCheckpointCommand,
  RestoreFromCheckpointCommand,
  GetCheckpointsCommand,
  DeleteCheckpointCommand
} from './operations/management/checkpoints/commands';

export {
  GetTriggersCommand,
  EnableTriggerCommand,
  DisableTriggerCommand
} from './operations/management/triggers/commands';

// 验证API
export { WorkflowValidatorAPI } from './validation/workflow-validator-api';
export { CodeConfigValidatorAPI } from './validation/code-config-validator-api';
export { ToolConfigValidatorAPI } from './validation/tool-config-validator-api';
export { HookValidatorAPI } from './validation/hook-validator-api';
export { TriggerValidatorAPI } from './validation/trigger-validator-api';

// 构建器
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

// 工具函数
export { ok, err, tryCatch, tryCatchAsync, all, any } from './utils/result';
export type { Result, Ok, Err } from './utils/result';

// Observable响应式编程
export {
  Observable,
  Observer,
  Subscription,
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

// 类型定义
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

// MessageManagerAPI类型
export type { MessageStats } from './operations/monitoring/messages/commands/get-message-stats-command';
export type { EventStats } from './operations/monitoring/events/commands/get-event-stats-command';

// Profile模板类型
export type { ProfileTemplate } from './resources/profiles/profile-registry-api';

// ValidationResult 从 types/errors.ts 导入
export type { ValidationResult } from '../types/errors';
