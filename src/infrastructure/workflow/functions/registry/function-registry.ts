import { injectable } from 'inversify';
import {
  IWorkflowFunction,
  WorkflowFunctionType,
  IConditionFunction,
  INodeFunction,
  IRoutingFunction,
  ITriggerFunction
} from '../../../../domain/workflow/interfaces/workflow-functions';

/**
 * 函数注册表实现
 */
@injectable()
export class FunctionRegistry {
  private functions: Map<string, IWorkflowFunction> = new Map();
  private functionsByName: Map<string, IWorkflowFunction> = new Map();

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

  getFunction(id: string): IWorkflowFunction | null {
    return this.functions.get(id) || null;
  }

  getFunctionByName(name: string): IWorkflowFunction | null {
    return this.functionsByName.get(name) || null;
  }

  getFunctionsByType(type: WorkflowFunctionType): IWorkflowFunction[] {
    return Array.from(this.functions.values()).filter(func => func.type === type);
  }

  getAllFunctions(): IWorkflowFunction[] {
    return Array.from(this.functions.values());
  }

  hasFunction(id: string): boolean {
    return this.functions.has(id);
  }

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
  getConditionFunction(name: string): any | null {
    const func = this.getFunctionByName(name);
    if (func && func.type === WorkflowFunctionType.CONDITION) {
      return func as IConditionFunction;
    }
    return null;
  }

  getNodeFunction(name: string): any | null {
    const func = this.getFunctionByName(name);
    if (func && func.type === WorkflowFunctionType.NODE) {
      return func as INodeFunction;
    }
    return null;
  }

  getRoutingFunction(name: string): any | null {
    const func = this.getFunctionByName(name);
    if (func && func.type === WorkflowFunctionType.ROUTING) {
      return func as IRoutingFunction;
    }
    return null;
  }

  getTriggerFunction(name: string): any | null {
    const func = this.getFunctionByName(name);
    if (func && func.type === WorkflowFunctionType.TRIGGER) {
      return func as ITriggerFunction;
    }
    return null;
  }
}