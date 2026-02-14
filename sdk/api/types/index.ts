/**
 * API层类型定义统一导出
 * 导出所有API层使用的类型和接口
 */

// Command模式相关类型
export type {
  ExecutionResult,
  ExecutionSuccess,
  ExecutionFailure
} from './execution-result';
export {
  success,
  failure,
  isSuccess,
  isFailure,
  getData,
  getError
} from './execution-result';

export type { ExecutionOptions } from './execution-options';
export { DEFAULT_EXECUTION_OPTIONS, mergeExecutionOptions } from './execution-options';

// 核心类型
export type { ThreadOptions, SDKOptions, SDKDependencies } from './core-types';

// 注册表类型
export type {
  WorkflowFilter,
  ThreadFilter,
  WorkflowSummary,
  ThreadSummary,
  NodeTemplateFilter,
  NodeTemplateSummary
} from './registry-types';

// 管理类型
export type {
  CheckpointFilter,
  CheckpointSummary,
  EventFilter,
  VariableUpdateOptions,
  VariableFilter,
  TriggerFilter
} from './management-types';

// 工具类型
export type {
  ToolFilter,
  ToolOptions,
  ToolExecutionResult,
  ToolTestResult
} from './tools-types';

// 脚本类型
export type {
  ScriptFilter,
  ScriptOptions,
  ScriptTestResult,
  ScriptExecutionLog,
  ScriptStatistics,
  ScriptRegistrationConfig,
  ScriptBatchExecutionConfig
} from './code-types';

// 重新导出触发器模板类型（来自types层）
export type {
  TriggerTemplateFilter,
  TriggerTemplateSummary
} from '@modular-agent/types';
