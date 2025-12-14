import { IWorkflowFunction, WorkflowFunctionType } from './workflow-function.interface';
import { IConditionFunction } from './condition-function.interface';
import { INodeFunction } from './node-function.interface';
import { IRoutingFunction } from './routing-function.interface';
import { ITriggerFunction } from './trigger-function.interface';

/**
 * 函数注册表接口
 * 
 * 管理所有工作流函数的注册和获取
 */
export interface IFunctionRegistry {
  /**
   * 注册函数
   * @param func 函数实例
   */
  registerFunction(func: IWorkflowFunction): void;

  /**
   * 根据ID获取函数
   * @param id 函数ID
   * @returns 函数实例，如果不存在则返回null
   */
  getFunction(id: string): IWorkflowFunction | null;

  /**
   * 根据名称获取函数
   * @param name 函数名称
   * @returns 函数实例，如果不存在则返回null
   */
  getFunctionByName(name: string): IWorkflowFunction | null;

  /**
   * 根据类型获取所有函数
   * @param type 函数类型
   * @returns 函数列表
   */
  getFunctionsByType(type: WorkflowFunctionType): IWorkflowFunction[];

  /**
   * 获取所有已注册的函数
   * @returns 函数列表
   */
  getAllFunctions(): IWorkflowFunction[];

  /**
   * 检查函数是否已注册
   * @param id 函数ID
   * @returns 是否已注册
   */
  hasFunction(id: string): boolean;

  /**
   * 注销函数
   * @param id 函数ID
   * @returns 是否成功注销
   */
  unregisterFunction(id: string): boolean;

  // 便捷方法
  /**
   * 获取条件函数
   * @param name 函数名称
   * @returns 条件函数实例
   */
  getConditionFunction(name: string): IConditionFunction | null;

  /**
   * 获取节点函数
   * @param name 函数名称
   * @returns 节点函数实例
   */
  getNodeFunction(name: string): INodeFunction | null;

  /**
   * 获取路由函数
   * @param name 函数名称
   * @returns 路由函数实例
   */
  getRoutingFunction(name: string): IRoutingFunction | null;

  /**
   * 获取触发器函数
   * @param name 函数名称
   * @returns 触发器函数实例
   */
  getTriggerFunction(name: string): ITriggerFunction | null;
}