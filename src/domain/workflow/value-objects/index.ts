/**
 * 工作流值对象模块入口
 *
 * 导出所有工作流相关的值对象
 */

export * from './node';
export * from './edge';
export {
  ExecutionMode as ValueObjectExecutionMode,
  ExecutionModeValue,
  ExecutionModeValueProps
} from './execution/execution-mode';
export {
  HookPoint,
  HookPointValue,
  HookPointValueProps
} from './hook-point';

export * from './workflow-status';
export * from './workflow-type';
export * from './workflow-config';
export * from './error-handling-strategy';
export * from './execution/execution-strategy';

// 状态管理相关值对象
export * from './execution/execution-status';
export * from './prompt-context';

// 触发器和钩子值对象
export * from './trigger-value-object';
export * from './hook-value-object';