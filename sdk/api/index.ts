/**
 * API层入口文件
 * 导出所有API模块和类型
 *
 * 目录结构：
 * - graph/   : Graph 相关 API (Workflow, Thread, Checkpoint 等)
 * - agent/   : Agent 相关 API (AgentLoop 等)
 * - shared/  : 共享模块 (types, core, common, utils, validation 等)
 */

// ============================================================================
// Shared - Command模式核心
// ============================================================================
export {
  Command,
  BaseCommand,
  SyncCommand,
  BaseSyncCommand,
  CommandMetadata,
  CommandValidationResult,
  validationSuccess,
  validationFailure
} from './shared/types/command.js';

export { CommandExecutor } from './shared/common/command-executor.js';

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
} from './shared/types/query.js';

// Subscription模式核心
export {
  Subscription,
  BaseSubscription,
  SubscriptionMetadata
} from './shared/types/subscription.js';

// 统一类型
export { ExecutionResult, success, failure, isSuccess, isFailure, getData, getError } from './shared/types/execution-result.js';
export { ExecutionOptions, DEFAULT_EXECUTION_OPTIONS, mergeExecutionOptions } from './shared/types/execution-options.js';

// 全局SDK实例
export { getSDK } from './shared/core/sdk.js';

// API工厂
export { APIFactory, getAPIFactory, type AllAPIs } from './shared/core/api-factory.js';

// 事件系统类型
export {
  APIEventType,
  type APIEventData,
  type APIEventListener
} from './shared/types/event-types.js';

// 事件系统实现
export {
  APIEventBus,
  APIEventBuilder,
  createEventBus
} from './shared/common/api-event-system.js';

// ============================================================================
// Shared - 资源管理API (CRUD Operations) - 共享资源
// ============================================================================
export { ToolRegistryAPI } from './shared/resources/tools/tool-registry-api.js';
export { ScriptRegistryAPI } from './shared/resources/scripts/script-registry-api.js';
export { LLMProfileRegistryAPI as ProfileRegistryAPI } from './shared/resources/llm/llm-profile-registry-api.js';

// 通用资源API基类和工具
export { GenericResourceAPI } from './shared/resources/generic-resource-api.js';
export {
  createResourceAPIs,
  type ResourceAPIs
} from './shared/resources/index.js';

// ============================================================================
// Graph - 资源管理API (CRUD Operations)
// ============================================================================
export { WorkflowRegistryAPI } from './graph/resources/workflows/workflow-registry-api.js';
export { ThreadRegistryAPI } from './graph/resources/threads/thread-registry-api.js';
export { NodeRegistryAPI } from './graph/resources/templates/node-template-registry-api.js';
export { TriggerTemplateRegistryAPI } from './graph/resources/templates/trigger-template-registry-api.js';
export { CheckpointResourceAPI } from './graph/resources/checkpoints/checkpoint-resource-api.js';
export {
  MessageResourceAPI,
  type MessageFilter,
  type MessageStats
} from './graph/resources/messages/message-resource-api.js';
export {
  VariableResourceAPI,
  type VariableDefinition,
  type VariableFilter
} from './graph/resources/variables/variable-resource-api.js';
export { TriggerResourceAPI } from './graph/resources/triggers/trigger-resource-api.js';
export {
  EventResourceAPI,
  type EventFilter,
  type EventStats
} from './graph/resources/events/event-resource-api.js';
export {
  UserInteractionResourceAPI,
  type UserInteractionConfig,
  type UserInteractionFilter
} from './graph/resources/user-interaction/user-interaction-resource-api.js';
export {
  HumanRelayResourceAPI,
  type HumanRelayConfig,
  type HumanRelayFilter
} from './graph/resources/human-relay/human-relay-resource-api.js';

// ============================================================================
// Graph - Command类 (有副作用操作)
// ============================================================================

// Execution Commands
export {
  ExecuteThreadCommand
} from './graph/operations/execution/execute-thread-command.js';
export type { ExecuteThreadParams } from './graph/operations/execution/execute-thread-command.js';

export {
  PauseThreadCommand
} from './graph/operations/execution/pause-thread-command.js';

export {
  ResumeThreadCommand
} from './graph/operations/execution/resume-thread-command.js';

export {
  CancelThreadCommand
} from './graph/operations/execution/cancel-thread-command.js';

// Trigger Commands
export {
  EnableTriggerCommand
} from './graph/operations/triggers/enable-trigger-command.js';
export type { EnableTriggerParams } from './graph/operations/triggers/enable-trigger-command.js';

export {
  DisableTriggerCommand
} from './graph/operations/triggers/disable-trigger-command.js';
export type { DisableTriggerParams } from './graph/operations/triggers/disable-trigger-command.js';

// Subscriptions
export {
  OnEventSubscription
} from './graph/operations/subscriptions/events/on-event-subscription.js';
export type { OnEventParams } from './graph/operations/subscriptions/events/on-event-subscription.js';

export {
  OnceEventSubscription
} from './graph/operations/subscriptions/events/once-event-subscription.js';
export type { OnceEventParams } from './graph/operations/subscriptions/events/once-event-subscription.js';

export {
  OffEventSubscription
} from './graph/operations/subscriptions/events/off-event-subscription.js';
export type { OffEventParams } from './graph/operations/subscriptions/events/off-event-subscription.js';

// ============================================================================
// Graph - 构建器
// ============================================================================
export { WorkflowBuilder, ExecutionBuilder } from './graph/builders/index.js';
export { NodeTemplateBuilder } from './graph/builders/node-template-builder.js';
export { TriggerTemplateBuilder } from './graph/builders/trigger-template-builder.js';

// ============================================================================
// Graph - 验证API
// ============================================================================
export { WorkflowValidator as WorkflowValidatorAPI } from '../graph/validation/index.js';
export { CodeConfigValidator as CodeConfigValidatorAPI } from '../graph/validation/script-config-validator.js';
export { StaticValidator as StaticValidatorAPI } from '../core/validation/index.js';
export { StaticValidator } from '../core/validation/index.js';
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
// Graph - Hook创建器
// ============================================================================
export {
  createThreadStateCheckHook,
  createCustomValidationHook,
  createPermissionCheckHook,
  createAuditLoggingHook
} from '../graph/execution/utils/hook-creators.js';

// ============================================================================
// Shared - Commands (LLM, Tool, Script)
// ============================================================================

// LLM Commands
export {
  GenerateCommand
} from './shared/operations/generate-command.js';

export {
  GenerateBatchCommand
} from './shared/operations/generate-batch-command.js';

// Script Commands
export {
  ExecuteScriptCommand
} from './shared/operations/scripts/execute-script-command.js';

// Tool Commands
export {
  ExecuteToolCommand
} from './shared/operations/tools/execute-tool-command.js';

// ============================================================================
// Agent - Commands
// ============================================================================
export {
  RunAgentLoopCommand,
  type RunAgentLoopParams
} from './agent/operations/run-agent-loop-command.js';

export {
  RunAgentLoopStreamCommand,
  type RunAgentLoopStreamParams
} from './agent/operations/run-agent-loop-stream-command.js';

// ============================================================================
// Shared - 工具函数
// ============================================================================
// Result类型 - 从核心层导入
export { ok, err, all, any, tryCatchAsyncWithSignal } from '@modular-agent/common-utils';
export type { Result, Ok, Err } from '@modular-agent/types';

// ============================================================================
// Shared - Observable响应式编程
// ============================================================================
export {
  Observable,
  Observer,
  Subscription as ObservableSubscription,
  ObservableImpl,
  create
} from './shared/utils/observable.js';
export type { OperatorFunction } from './shared/utils/observable.js';

// ============================================================================
// Shared - 类型定义
// ============================================================================
export type {
  ThreadOptions,
  SDKOptions,
  SDKDependencies
} from './shared/types/core-types.js';

export type {
  ScriptFilter,
  ScriptOptions,
  ScriptTestResult,
  ScriptExecutionLog,
  ScriptStatistics,
  ScriptRegistrationConfig,
  ScriptBatchExecutionConfig
} from './shared/types/code-types.js';

export type {
  ExecutionEvent,
  StartEvent,
  CompleteEvent,
  ErrorEvent,
  CancelledEvent,
  ProgressEvent,
  NodeExecutedEvent
} from './shared/types/execution-events.js';

// ============================================================================
// Shared - 配置解析模块
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
} from './shared/config/index.js';

// JSON解析函数
export {
  parseJson,
  stringifyJson,
  validateJsonSyntax
} from './shared/config/index.js';

// TOML解析函数
export {
  parseToml,
  validateTomlSyntax
} from './shared/config/index.js';

// 配置解析函数
export {
  parseWorkflow,
  parseNodeTemplate,
  parseTriggerTemplate,
  parseScript,
  parseLLMProfile,
  loadConfigContent
} from './shared/config/index.js';

// ============================================================================
// Profile模板类型
// ============================================================================
export type { LLMProfileTemplate as ProfileTemplate } from './shared/resources/llm/llm-profile-registry-api.js';
