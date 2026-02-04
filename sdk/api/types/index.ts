/**
 * API层类型定义统一导出
 * 导出所有API层使用的类型和接口
 */

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
} from '../../types/trigger-template';

// 注意：ValidationResult 已从 types/errors.ts 导入，此处不再重复定义
// 使用方式：import type { ValidationResult } from '../types/errors'