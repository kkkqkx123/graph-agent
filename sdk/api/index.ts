/**
 * API层入口文件
 * 导出所有API模块和类型
 */

// 主SDK类
export { SDK } from './core/sdk';

// API模块
export { ThreadExecutorAPI } from './core/thread-executor-api';
export { userInteractionHandlerRegistry } from './core/user-interaction-api';
export type { UserInteractionHandler, UserInteractionContext } from './core/user-interaction-api';
export { WorkflowRegistryAPI } from './registry/workflow-registry-api';
export { ThreadRegistryAPI } from './registry/thread-registry-api';
export { WorkflowValidatorAPI } from './validation/workflow-validator-api';
export { ToolServiceAPI } from './tools/tool-service-api';
export { LLMWrapperAPI } from './llm/llm-wrapper-api';
export { ProfileManagerAPI } from './llm/profile-manager-api';
export { EventManagerAPI } from './management/event-manager-api';
export { CheckpointManagerAPI } from './management/checkpoint-manager-api';
export { VariableManagerAPI } from './management/variable-manager-api';
export { MessageManagerAPI } from './conversation/message-manager-api';
export { NodeRegistryAPI } from './template-registry/node-template-registry-api';
export { TriggerTemplateRegistryAPI } from './template-registry/trigger-template-registry-api';
export { TriggerManagerAPI, triggerManagerAPI } from './management/trigger-manager-api';

// langgraph兼容API
export { StateGraph, CompiledGraph, END } from './langgraph-compatible/stategraph-api';

// 类型定义
export type {
  ExecuteOptions,
  WorkflowFilter,
  ThreadFilter,
  WorkflowSummary,
  ThreadSummary,
  SDKOptions,
  ToolFilter,
  ToolOptions,
  ToolExecutionResult,
  ToolTestResult,
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