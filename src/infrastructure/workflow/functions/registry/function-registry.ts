import { injectable } from 'inversify';
import { WorkflowFunctionType } from '../../../../domain/workflow/value-objects/workflow-function-type';
import { BaseWorkflowFunction } from '../base/base-workflow-function';

/**
 * 函数注册表实现
 * 支持分层函数类型：CONDITION、ROUTING、TRIGGER、HOOK
 * 注意：NODE类型已不再使用此注册表，改用直接类型实现
 */
@injectable()
export class FunctionRegistry {
  private functions: Map<string, BaseWorkflowFunction> = new Map();
  private functionsByName: Map<string, BaseWorkflowFunction> = new Map();

  /**
   * 注册函数
   * @param func 工作流函数
   */
  registerFunction(func: BaseWorkflowFunction): void {
    if (this.functions.has(func.id)) {
      throw new Error(`函数ID ${func.id} 已存在`);
    }

    if (this.functionsByName.has(func.name)) {
      throw new Error(`函数名称 ${func.name} 已存在`);
    }

    this.functions.set(func.id, func);
    this.functionsByName.set(func.name, func);
  }

  /**
   * 获取函数
   * @param id 函数ID
   * @returns 工作流函数
   */
  getFunction(id: string): BaseWorkflowFunction | null {
    return this.functions.get(id) || null;
  }

  /**
   * 根据名称获取函数
   * @param name 函数名称
   * @returns 工作流函数
   */
  getFunctionByName(name: string): BaseWorkflowFunction | null {
    return this.functionsByName.get(name) || null;
  }

  /**
   * 根据类型获取函数列表
   * @param type 函数类型
   * @returns 工作流函数列表
   */
  getFunctionsByType(type: WorkflowFunctionType): BaseWorkflowFunction[] {
    return Array.from(this.functions.values()).filter(func => func.type === type);
  }

  /**
   * 获取所有函数
   * @returns 工作流函数列表
   */
  getAllFunctions(): BaseWorkflowFunction[] {
    return Array.from(this.functions.values());
  }

  /**
   * 检查函数是否存在
   * @param id 函数ID
   * @returns 是否存在
   */
  hasFunction(id: string): boolean {
    return this.functions.has(id);
  }

  /**
   * 注销函数
   * @param id 函数ID
   * @returns 是否成功
   */
  unregisterFunction(id: string): boolean {
    const func = this.functions.get(id);
    if (!func) {
      return false;
    }

    this.functions.delete(id);
    this.functionsByName.delete(func.name);
    return true;
  }

  // 便捷方法
  /**
   * 获取条件函数
   * @param name 函数名称
   * @returns 工作流函数
   */
  getConditionFunction(name: string): BaseWorkflowFunction | null {
    const func = this.getFunctionByName(name);
    if (func && func.type === WorkflowFunctionType.CONDITION) {
      return func;
    }
    return null;
  }

  /**
   * 获取路由函数
   * @param name 函数名称
   * @returns 工作流函数
   */
  getRoutingFunction(name: string): BaseWorkflowFunction | null {
    const func = this.getFunctionByName(name);
    if (func && func.type === WorkflowFunctionType.ROUTING) {
      return func;
    }
    return null;
  }

  /**
   * 获取触发器函数
   * @param name 函数名称
   * @returns 工作流函数
   */
  getTriggerFunction(name: string): BaseWorkflowFunction | null {
    const func = this.getFunctionByName(name);
    if (func && func.type === WorkflowFunctionType.TRIGGER) {
      return func;
    }
    return null;
  }

  /**
   * 获取钩子函数
   * @param name 函数名称
   * @returns 工作流函数
   */
  getHookFunction(name: string): BaseWorkflowFunction | null {
    const func = this.getFunctionByName(name);
    if (func && func.type === WorkflowFunctionType.HOOK) {
      return func;
    }
    return null;
  }
}