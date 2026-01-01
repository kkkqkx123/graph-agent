import { injectable } from 'inversify';
import { IWorkflowFunction } from './types';

/**
 * 函数注册表实现
 * 支持分层函数类型：CONDITION、ROUTING、TRIGGER、HOOK
 */
@injectable()
export class FunctionRegistry {
  private functions: Map<string, IWorkflowFunction> = new Map();
  private functionsByName: Map<string, IWorkflowFunction> = new Map();

  /**
   * 注册函数
   * @param func 工作流函数
   */
  registerFunction(func: IWorkflowFunction): void {
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
  getFunction(id: string): IWorkflowFunction | null {
    return this.functions.get(id) || null;
  }

  /**
   * 根据名称获取函数
   * @param name 函数名称
   * @returns 工作流函数
   */
  getFunctionByName(name: string): IWorkflowFunction | null {
    return this.functionsByName.get(name) || null;
  }

  /**
   * 获取所有函数
   * @returns 工作流函数列表
   */
  getAllFunctions(): IWorkflowFunction[] {
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
  getConditionFunction(name: string): IWorkflowFunction | null {
    return this.getFunctionByName(name);
  }

  /**
   * 获取路由函数
   * @param name 函数名称
   * @returns 工作流函数
   */
  getRoutingFunction(name: string): IWorkflowFunction | null {
    return this.getFunctionByName(name);
  }

  /**
   * 获取触发器函数
   * @param name 函数名称
   * @returns 工作流函数
   */
  getTriggerFunction(name: string): IWorkflowFunction | null {
    return this.getFunctionByName(name);
  }

  /**
   * 获取钩子函数
   * @param name 函数名称
   * @returns 工作流函数
   */
  getHookFunction(name: string): IWorkflowFunction | null {
    return this.getFunctionByName(name);
  }
}