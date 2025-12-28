import { BaseWorkflowFunction } from '../base/base-workflow-function';
import { WorkflowFunctionType } from '../../../../domain/workflow/value-objects/workflow-function-type';
import { WorkflowExecutionContext, NodeFunctionResult } from '../base/base-workflow-function';

/**
 * 组合函数类型标记
 * 对应实际的函数分类
 * 注意：这里使用Domain层的WorkflowFunctionType作为基础
 */
export enum CompositeFunctionType {
  NODE = 'node',           // 节点函数
  CONDITION = 'condition', // 条件函数
  ROUTING = 'routing',     // 路由函数
  TRIGGER = 'trigger',     // 触发器函数
  HOOK = 'hook'            // 钩子函数
}

/**
 * 节点函数组合配置
 */
export interface NodeCompositeConfig {
  [key: string]: any;
}

/**
 * 条件函数组合配置
 */
export interface ConditionCompositeConfig {
  [key: string]: any;
}

/**
 * 路由函数组合配置
 */
export interface RoutingCompositeConfig {
  [key: string]: any;
}

/**
 * 触发器函数组合配置
 */
export interface TriggerCompositeConfig {
  [key: string]: any;
}

/**
 * 钩子函数组合配置
 */
export interface HookCompositeConfig {
  [key: string]: any;
}

/**
 * 组合函数接口
 * 确保组合函数的类型安全
 */
export interface ICompositeFunction<TConfig = any> {
  readonly compositeType: CompositeFunctionType;
  addFunction(func: BaseWorkflowFunction): void;
  removeFunction(func: BaseWorkflowFunction): boolean;
  getFunctions(): BaseWorkflowFunction[];
  execute(context: WorkflowExecutionContext, config: TConfig): Promise<any>;
}

/**
 * 验证函数类型是否匹配
 */
export function validateFunctionType(
  func: BaseWorkflowFunction,
  expectedType: WorkflowFunctionType
): boolean {
  return func.type === expectedType;
}

/**
 * 验证所有函数是否为同一类型
 */
export function validateSameFunctionType(
  functions: BaseWorkflowFunction[],
  expectedType: WorkflowFunctionType
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (functions.length === 0) {
    errors.push('函数列表不能为空');
    return { valid: false, errors };
  }

  for (let i = 0; i < functions.length; i++) {
    const func = functions[i];
    if (!func || !validateFunctionType(func, expectedType)) {
      errors.push(
        `函数 ${func?.name || 'unknown'} 的类型 ${func?.type || 'unknown'} 与期望类型 ${expectedType} 不匹配`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 获取组合函数的WorkflowFunctionType
 * 将CompositeFunctionType映射到Domain层的WorkflowFunctionType
 */
export function getWorkflowFunctionType(
  compositeType: CompositeFunctionType
): WorkflowFunctionType {
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
 */
export function getCompositeReturnType(
  compositeType: CompositeFunctionType
): string {
  switch (compositeType) {
    case CompositeFunctionType.NODE:
      return 'NodeFunctionResult';
    case CompositeFunctionType.HOOK:
      return 'NodeFunctionResult'; // 钩子函数也返回NodeFunctionResult
    case CompositeFunctionType.CONDITION:
    case CompositeFunctionType.ROUTING:
    case CompositeFunctionType.TRIGGER:
      return 'boolean';
    default:
      return 'any';
  }
}