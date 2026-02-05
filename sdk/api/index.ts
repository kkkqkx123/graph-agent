/**
 * API层入口文件
 * 导出所有API模块和类型
 */

// 主SDK类
export { SDK } from './core/sdk';

// 资源管理API (CRUD Operations)
export { WorkflowRegistryAPI } from './resources/workflows/workflow-registry-api';
export { ThreadRegistryAPI } from './resources/threads/thread-registry-api';
export { NodeRegistryAPI } from './resources/templates/node-template-registry-api';
export { TriggerTemplateRegistryAPI } from './resources/templates/trigger-template-registry-api';
export { ToolRegistryAPI } from './resources/tools/tool-registry-api';
export { ScriptRegistryAPI } from './resources/scripts/script-registry-api';
export { ProfileRegistryAPI } from './resources/profiles/profile-registry-api';

// 业务操作API (Business Operations)
export { ThreadExecutorAPI } from './operations/execution/thread-executor-api';
export { MessageManagerAPI } from './operations/conversation/message-manager-api';
export { VariableManagerAPI } from './operations/state/variable-manager-api';
export { CheckpointManagerAPI } from './operations/state/checkpoint-manager-api';
export { TriggerManagerAPI } from './operations/state/trigger-manager-api';
export { EventManagerAPI } from './operations/events/event-manager-api';
export { LLMWrapperAPI } from './operations/llm/llm-wrapper-api';
export { ToolExecutionAPI } from './operations/tools/tool-execution-api';
export { ScriptExecutionAPI } from './operations/code/script-execution-api';

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
export type {
  MessageQueryOptions,
  MessageFilter,
  MessageStats,
  TokenUsageStats
} from './operations/conversation/message-manager-api';

// Profile模板类型
export type { ProfileTemplate } from './resources/profiles/profile-registry-api';

// ValidationResult 从 types/errors.ts 导入
export type { ValidationResult } from '../types/errors';
