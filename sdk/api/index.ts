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
export { LLMProfileRegistryAPI as ProfileRegistryAPI } from './resources/llm/llm-profile-registry-api';

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
export { APIFactory, apiFactory, type AllAPIs } from './core/api-factory';


// 事件系统类型
export {
  APIEventType,
  type APIEventData,
  type APIEventListener
} from './types/event-types';

// 事件系统实现
export {
  APIEventBus,
  APIEventBuilder,
  createEventBus
} from './common/api-event-system';

// ============================================================================
// Command类 - 核心API (Core APIs) - 有副作用操作
// ============================================================================

// Execution Commands
export {
  ExecuteThreadCommand
} from './operations/commands/execution/execute-thread-command';
export type { ExecuteThreadParams } from './operations/commands/execution/execute-thread-command';

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
export { WorkflowBuilder, ExecutionBuilder } from './builders';
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
} from './types/execution-events';

// ============================================================================
// 工具函数
// ============================================================================
// Result类型 - 从核心层导入
export { ok, err, tryCatch, tryCatchAsync, all, any } from '@modular-agent/common-utils';
export type { Result, Ok, Err } from '@modular-agent/types';

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
} from '@modular-agent/types';

// ============================================================================
// 配置解析模块
// ============================================================================
export {
  ConfigParser,
  ConfigTransformer,
  ConfigFormat,
  type ParsedConfig,
  type WorkflowConfigFile,
  type NodeConfigFile,
  type EdgeConfigFile,
  type IConfigParser,
  type IConfigTransformer
} from './config';

// JSON解析函数
export {
  parseJson,
  stringifyJson,
  validateJsonSyntax
} from './config';

// TOML解析函数
export {
  parseToml,
  validateTomlSyntax
} from './config';

// ============================================================================
// Profile模板类型
// ============================================================================
export type { LLMProfileTemplate as ProfileTemplate } from './resources/llm/llm-profile-registry-api';
