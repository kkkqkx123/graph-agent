/**
 * 工作流值对象模块入口
 *
 * 导出所有工作流相关的值对象
 */

export * from './node-type';
export * from './edge-type';
export {
  ExecutionMode as ValueObjectExecutionMode,
  ExecutionModeValue,
  ExecutionModeValueProps
} from './execution-mode';
export {
  HookPoint,
  HookPointValue,
  HookPointValueProps
} from './hook-point';

export * from './node-id';
export * from './edge-id';
export * from './workflow-status';
export * from './workflow-type';
export * from './workflow-config';
export * from './error-handling-strategy';
export * from './execution-strategy';

// 状态管理相关值对象
export * from './execution-status';
export * from './node-status';
export * from './prompt-context';

// 节点和边值对象
export * from './node-value-object';
export * from './edge-value-object';

// 触发器和钩子值对象
export * from './trigger-value-object';
export * from './hook-value-object';