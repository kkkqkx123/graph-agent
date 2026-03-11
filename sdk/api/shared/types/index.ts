/**
 * API层类型定义统一导出
 * 导出所有API层使用的类型和接口
 */

// Command模式相关类型
export type { ExecutionResult } from './execution-result.js';
export {
  success,
  failure,
  isSuccess,
  isFailure,
  getData,
  getError
} from './execution-result.js';

export type { ExecutionOptions } from './execution-options.js';
export { DEFAULT_EXECUTION_OPTIONS, mergeExecutionOptions } from './execution-options.js';

// 核心类型
export type { ThreadOptions, SDKOptions, SDKDependencies } from './core-types.js';

// 脚本类型
export type {
  ScriptFilter,
  ScriptOptions,
  ScriptTestResult,
  ScriptExecutionLog,
  ScriptStatistics,
  ScriptRegistrationConfig,
  ScriptBatchExecutionConfig
} from './code-types.js';
