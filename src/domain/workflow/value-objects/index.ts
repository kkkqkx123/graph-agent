/**
 * 工作流值对象模块入口
 *
 * 导出所有工作流相关的值对象
 */

export * from './node';
export * from './edge';
export * from './hook';

export * from './workflow-status';
export * from './workflow-type';
export * from './workflow-config';
export * from './workflow-definition';
export * from './error-handling-strategy';
export * from './execution';
export * from './context';

// 触发器值对象（仅保留类型相关的值对象）
export {
  TriggerType,
  TriggerTypeValue,
  TriggerAction,
  TriggerActionValue,
  TriggerStatus,
  TriggerStatusValue,
} from './trigger-value-object';
