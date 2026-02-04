/**
 * API层入口文件
 * 导出所有API模块和类型
 */

// 主SDK类
export { SDK } from './core/sdk';

// API模块
export { ThreadExecutorAPI } from './core/thread-executor-api';
export type { UserInteractionHandler, UserInteractionContext } from '../types/interaction';
export type { HumanRelayHandler, HumanRelayContext } from '../types/human-relay';
export { WorkflowRegistryAPI } from './registry/workflow-registry-api';
export { ThreadRegistryAPI } from './registry/thread-registry-api';
export { WorkflowValidatorAPI } from './validation/workflow-validator-api';
export { ToolServiceAPI } from './tools/tool-service-api';
export { CodeServiceAPI } from './code/code-service-api';
export { LLMWrapperAPI } from './llm/llm-wrapper-api';
export { ProfileManagerAPI } from './llm/profile-manager-api';
export { EventManagerAPI } from './management/event-manager-api';
export { CheckpointManagerAPI } from './management/checkpoint-manager-api';
export { VariableManagerAPI } from './management/variable-manager-api';
export { MessageManagerAPI } from './conversation/message-manager-api';
export { NodeRegistryAPI } from './template-registry/node-template-registry-api';
export { TriggerTemplateRegistryAPI } from './template-registry/trigger-template-registry-api';
export { TriggerManagerAPI, triggerManagerAPI } from './management/trigger-manager-api';

// 构建器
export { WorkflowBuilder, ExecutionBuilder, WorkflowComposer, sequential, parallel } from './builders';
export { merge as mergeWorkflows } from './builders';
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
export type {
  MessageQueryOptions,
  MessageFilter,
  MessageStats,
  TokenUsageStats
} from './conversation/message-manager-api';

// Profile模板类型
export type { ProfileTemplate } from './llm/profile-manager-api';

// ValidationResult 从 types/errors.ts 导入
export type { ValidationResult } from '../types/errors';