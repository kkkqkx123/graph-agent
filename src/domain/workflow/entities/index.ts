/**
 * 工作流实体模块入口
 *
 * 导出所有工作流相关的实体
 */

// 基础实体
export * from './workflow';

// Hook实体（避免与Node的ValidationResult冲突）
export {
  Hook,
  HookProps,
  HookContext,
  HookExecutionResult,
  HookMetadata,
  HookParameter,
  HookPluginConfig,
  HookValidationResult,
} from './hook';

// Node实体
export {
  Node,
  NodeProps,
  NodeContext,
  NodeExecutionResult,
  NodeMetadata,
  NodeParameter,
  ValidationResult,
} from './node';

// Trigger实体
export {
  Trigger,
  TriggerProps,
  TriggerConfig,
  TriggerContext,
  TriggerValidationResult,
  TriggerExecutionResult,
} from './trigger';
