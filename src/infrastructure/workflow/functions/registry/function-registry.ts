import { injectable } from 'inversify';
import { WorkflowFunctionType } from '../../../../domain/workflow/value-objects/workflow-function-type';

/**
 * 简化的工作流函数接口
 */
interface BaseWorkflowFunction {
  readonly id: string;
  readonly name: string;
  readonly type: WorkflowFunctionType;
  readonly description?: string;
  readonly metadata?: Record<string, any>;
}

/**
 * 函数注册表实现
 */
@injectable()
export class FunctionRegistry {
  private functions: Map<string, BaseWorkflowFunction> = new Map();
  private functionsByName: Map<string, BaseWorkflowFunction> = new Map();

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

  getFunction(id: string): BaseWorkflowFunction | null {
    return this.functions.get(id) || null;
  }

  getFunctionByName(name: string): BaseWorkflowFunction | null {
    return this.functionsByName.get(name) || null;
  }

  getFunctionsByType(type: WorkflowFunctionType): BaseWorkflowFunction[] {
    return Array.from(this.functions.values()).filter(func => func.type === type);
  }

  getAllFunctions(): BaseWorkflowFunction[] {
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
  getConditionFunction(name: string): BaseWorkflowFunction | null {
    const func = this.getFunctionByName(name);
    if (func && func.type === WorkflowFunctionType.CONDITION) {
      return func;
    }
    return null;
  }

  getNodeFunction(name: string): BaseWorkflowFunction | null {
    const func = this.getFunctionByName(name);
    if (func && func.type === WorkflowFunctionType.NODE) {
      return func;
    }
    return null;
  }

  getRoutingFunction(name: string): BaseWorkflowFunction | null {
    const func = this.getFunctionByName(name);
    if (func && func.type === WorkflowFunctionType.ROUTING) {
      return func;
    }
    return null;
  }

  getTriggerFunction(name: string): BaseWorkflowFunction | null {
    const func = this.getFunctionByName(name);
    if (func && func.type === WorkflowFunctionType.TRIGGER) {
      return func;
    }
    return null;
  }

  /**
   * 清空注册表
   */
  clear(): void {
    this.functions.clear();
    this.functionsByName.clear();
  }

  /**
   * 获取注册表统计信息
   */
  getStats(): { total: number; byType: Record<string, number> } {
    const stats = {
      total: this.functions.size,
      byType: {} as Record<string, number>
    };

    for (const func of this.functions.values()) {
      const type = func.type;
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    }

    return stats;
  }
}