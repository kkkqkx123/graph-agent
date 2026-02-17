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
} from './types/command.js';

export { CommandExecutor } from './common/command-executor.js';


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
} from './types/query.js';

// Subscription模式核心
export {
  Subscription,
  BaseSubscription,
  SubscriptionMetadata
} from './types/subscription.js';

// 统一类型
export { ExecutionResult, success, failure, isSuccess, isFailure, getData, getError } from './types/execution-result.js';
export { ExecutionOptions, DEFAULT_EXECUTION_OPTIONS, mergeExecutionOptions } from './types/execution-options.js';

// 全局SDK实例
export { getSDK } from './core/sdk.js';

// 资源管理API (CRUD Operations)
export { WorkflowRegistryAPI } from './resources/workflows/workflow-registry-api.js';
export { ThreadRegistryAPI } from './resources/threads/thread-registry-api.js';
export { NodeRegistryAPI } from './resources/templates/node-template-registry-api.js';
export { TriggerTemplateRegistryAPI } from './resources/templates/trigger-template-registry-api.js';
export { ToolRegistryAPI } from './resources/tools/tool-registry-api.js';
export { ScriptRegistryAPI } from './resources/scripts/script-registry-api.js';
export { LLMProfileRegistryAPI as ProfileRegistryAPI } from './resources/llm/llm-profile-registry-api.js';

// 新增资源管理API
export { CheckpointResourceAPI } from './resources/checkpoints/checkpoint-resource-api.js';
export {
  MessageResourceAPI
} from './resources/messages/message-resource-api.js';
export {
  VariableResourceAPI,
  type VariableDefinition
} from './resources/variables/variable-resource-api.js';
export { TriggerResourceAPI } from './resources/triggers/trigger-resource-api.js';
export {
  EventResourceAPI
} from './resources/events/event-resource-api.js';

// 通用资源API基类和工具
export { GenericResourceAPI } from './resources/generic-resource-api.js';
export {
  createResourceAPIs,
  type ResourceAPIs
} from './resources/index.js';

// API工厂
export { APIFactory, getAPIFactory, type AllAPIs } from './core/api-factory.js';


// 事件系统类型
export {
  APIEventType,
  type APIEventData,
  type APIEventListener
} from './types/event-types.js';

// 事件系统实现
export {
  APIEventBus,
  APIEventBuilder,
  createEventBus
} from './common/api-event-system.js';

// ============================================================================
// Command类 - 核心API (Core APIs) - 有副作用操作
// ============================================================================

// Execution Commands
export {
  ExecuteThreadCommand
} from './operations/commands/execution/execute-thread-command.js';
export type { ExecuteThreadParams } from './operations/commands/execution/execute-thread-command.js';

export {
  PauseThreadCommand
} from './operations/commands/execution/pause-thread-command.js';

export {
  ResumeThreadCommand
} from './operations/commands/execution/resume-thread-command.js';

export {
  CancelThreadCommand
} from './operations/commands/execution/cancel-thread-command.js';

// LLM Commands
export {
  GenerateCommand
} from './operations/commands/llm/generate-command.js';

export {
  GenerateBatchCommand
} from './operations/commands/llm/generate-batch-command.js';

// Script Commands
export {
  ExecuteScriptCommand
} from './operations/commands/scripts/execute-script-command.js';

// Tool Commands
export {
  ExecuteToolCommand
} from './operations/commands/tools/execute-tool-command.js';

// Checkpoint Commands (已迁移到CheckpointResourceAPI)
// 使用CheckpointResourceAPI.createThreadCheckpoint()和.restoreFromCheckpoint()

// Trigger Commands
export {
  EnableTriggerCommand
} from './operations/commands/triggers/enable-trigger-command.js';
export type { EnableTriggerParams } from './operations/commands/triggers/enable-trigger-command.js';

export {
  DisableTriggerCommand
} from './operations/commands/triggers/disable-trigger-command.js';
export type { DisableTriggerParams } from './operations/commands/triggers/disable-trigger-command.js';

export {
  OnEventSubscription
} from './operations/subscriptions/events/on-event-subscription.js';
export type { OnEventParams } from './operations/subscriptions/events/on-event-subscription.js';

export {
  OnceEventSubscription
} from './operations/subscriptions/events/once-event-subscription.js';
export type { OnceEventParams } from './operations/subscriptions/events/once-event-subscription.js';

export {
  OffEventSubscription
} from './operations/subscriptions/events/off-event-subscription.js';
export type { OffEventParams } from './operations/subscriptions/events/off-event-subscription.js';

// ============================================================================
// 验证API
// ============================================================================
export { WorkflowValidator as WorkflowValidatorAPI } from '../core/validation/index.js';
export { CodeConfigValidator as CodeConfigValidatorAPI } from '../core/validation/index.js';
export { StaticValidator as StaticValidatorAPI } from '../core/validation/index.js';
export { RuntimeValidator as RuntimeValidatorAPI } from '../core/validation/index.js';
export { validateHook as validateHookAPI, validateHooks as validateHooksAPI } from '../core/validation/index.js';
export {
  validateTriggerCondition as validateTriggerConditionAPI,
  validateExecuteTriggeredSubgraphActionConfig as validateExecuteTriggeredSubgraphActionConfigAPI,
  validateTriggerAction as validateTriggerActionAPI,
  validateWorkflowTrigger as validateWorkflowTriggerAPI,
  validateTriggerReference as validateTriggerReferenceAPI,
  validateTriggers as validateTriggersAPI
} from '../core/validation/index.js';

// ============================================================================
// 构建器
// ============================================================================
export { WorkflowBuilder, ExecutionBuilder } from './builders/index.js';
export { NodeTemplateBuilder } from './builders/node-template-builder.js';
export { TriggerTemplateBuilder } from './builders/trigger-template-builder.js';
export type {
  ExecutionEvent,
  StartEvent,
  CompleteEvent,
  ErrorEvent,
  CancelledEvent,
  ProgressEvent,
  NodeExecutedEvent
} from './types/execution-events.js';

// ============================================================================
// Hook创建器
// ============================================================================
export {
  createThreadStateCheckHook,
  createCustomValidationHook,
  createPermissionCheckHook,
  createAuditLoggingHook
} from '../core/execution/utils/hook-creators.js';

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
} from './utils/observable.js';
export type { OperatorFunction } from './utils/observable.js';

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
} from './config/index.js';

// JSON解析函数
export {
  parseJson,
  stringifyJson,
  validateJsonSyntax
} from './config/index.js';

// TOML解析函数
export {
  parseToml,
  validateTomlSyntax
} from './config/index.js';

// 配置解析函数
export {
  parseWorkflow,
  parseNodeTemplate,
  parseTriggerTemplate,
  parseScript,
  loadConfigContent
} from './config/index.js';

// ============================================================================
// Profile模板类型
// ============================================================================
export type { LLMProfileTemplate as ProfileTemplate } from './resources/llm/llm-profile-registry-api.js';
