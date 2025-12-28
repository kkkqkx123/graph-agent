import { WorkflowFunctionType } from '../../../../domain/workflow/value-objects/workflow-function-type';

/**
 * 组合函数类型枚举
 */
export enum CompositeFunctionType {
  NODE = 'node',
  CONDITION = 'condition',
  ROUTING = 'routing',
  TRIGGER = 'trigger',
  HOOK = 'hook'
}

/**
 * 节点组合配置
 */
export interface NodeCompositeConfig {
  [key: string]: any;
}

/**
 * 条件组合配置
 */
export interface ConditionCompositeConfig {
  [key: string]: any;
}

/**
 * 路由组合配置
 */
export interface RoutingCompositeConfig {
  [key: string]: any;
}

/**
 * 触发器组合配置
 */
export interface TriggerCompositeConfig {
  [key: string]: any;
}

/**
 * 钩子组合配置
 */
export interface HookCompositeConfig {
  [key: string]: any;
}

/**
 * 验证函数类型是否相同
 * @param functions 函数列表
 * @returns 验证结果
 */
export function validateSameFunctionType(functions: any[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (functions.length === 0) {
    errors.push('函数列表不能为空');
    return { valid: false, errors };
  }

  const firstType = functions[0].type;

  for (let i = 1; i < functions.length; i++) {
    if (functions[i].type !== firstType) {
      errors.push(
        `函数 ${functions[i].name} 的类型 ${functions[i].type} 与第一个函数的类型 ${firstType} 不匹配`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 获取组合函数类型对应的工作流函数类型
 * @param compositeType 组合函数类型
 * @returns 工作流函数类型
 */
export function getWorkflowFunctionType(compositeType: CompositeFunctionType): WorkflowFunctionType {
  switch (compositeType) {
    case CompositeFunctionType.NODE:
      return WorkflowFunctionType.NODE;
    case CompositeFunctionType.CONDITION:
      return WorkflowFunctionType.CONDITION;
    case CompositeFunctionType.ROUTING:
      return WorkflowFunctionType.ROUTING;
    case CompositeFunctionType.TRIGGER:
      return WorkflowFunctionType.TRIGGER;
    case CompositeFunctionType.HOOK:
      return WorkflowFunctionType.HOOK;
    default:
      throw new Error(`未知的组合函数类型: ${compositeType}`);
  }
}

/**
 * 获取组合函数的返回类型
 * @param compositeType 组合函数类型
 * @returns 返回类型字符串
 */
export function getCompositeReturnType(compositeType: CompositeFunctionType): string {
  switch (compositeType) {
    case CompositeFunctionType.NODE:
      return 'NodeFunctionResult';
    case CompositeFunctionType.CONDITION:
      return 'boolean';
    case CompositeFunctionType.ROUTING:
      return 'boolean';
    case CompositeFunctionType.TRIGGER:
      return 'boolean';
    case CompositeFunctionType.HOOK:
      return 'NodeFunctionResult';
    default:
      return 'any';
  }
}