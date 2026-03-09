/**
 * 通用 Trigger 模块
 *
 * 提供可被 Graph 和 Agent 模块复用的 Trigger 执行框架。
 */

// 类型定义
export type {
  BaseTriggerCondition,
  BaseTriggerAction,
  BaseTriggerDefinition,
  TriggerExecutionResult,
  TriggerStatus,
  BaseEventData,
  TriggerHandler,
  TriggerMatcher
} from './types.js';

// 匹配器
export {
  defaultTriggerMatcher,
  matchTriggerCondition,
  matchTriggers,
  createTriggerMatcher
} from './matcher.js';

// 限制器
export {
  canTrigger,
  getTriggerStatus,
  incrementTriggerCount,
  resetTriggerCount,
  isTriggerExpired,
  getRemainingTriggers
} from './limiter.js';

// 处理器
export {
  executeCustomAction,
  createCustomHandler
} from './handlers/index.js';

export type { CustomActionParameters } from './handlers/index.js';
