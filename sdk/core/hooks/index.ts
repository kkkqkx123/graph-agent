/**
 * 通用 Hook 模块
 *
 * 提供可被 Graph 和 Agent 模块复用的 Hook 执行框架。
 */

// 类型定义
export type {
  BaseHookDefinition,
  BaseHookContext,
  HookExecutionResult,
  HookExecutorConfig,
  HookHandler,
  EventEmitter,
  ContextBuilder
} from './types.js';

// 执行器函数
export {
  filterAndSortHooks,
  evaluateHookCondition,
  executeSingleHook,
  executeHooks,
  resolvePayloadTemplate
} from './executor.js';
