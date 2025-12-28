import { injectable } from 'inversify';
import { WorkflowFunctionType } from '../../../../../domain/workflow/value-objects/workflow-function-type';
import { BaseWorkflowFunction } from '../../base/base-workflow-function';
import { ValueObject } from '../../../../../domain/common/value-objects/value-object';
import { NodeValueObject } from '../../../../../domain/workflow/value-objects';
import { EdgeValueObject } from '../../../../../domain/workflow/value-objects/edge/edge-value-object';
import { TriggerValueObject } from '../../../../../domain/workflow/value-objects/trigger-value-object';
import { HookValueObject } from '../../../../../domain/workflow/value-objects/hook-value-object';

/**
 * 函数注册表实现
 *
 * 支持分层函数类型：CONDITION、ROUTING、NODE、TRIGGER、HOOK
 * 基于现有的BaseWorkflowFunction基类实现
 */
@injectable()
export class FunctionRegistry {
  private functions: Map<string, BaseWorkflowFunction> = new Map();
  private functionsByName: Map<string, BaseWorkflowFunction> = new Map();
  private valueObjectTypeMapping: Map<string, string> = new Map();

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

  // 便捷方法（向后兼容）
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
   * 获取节点函数
   * @param name 函数名称
   * @returns 工作流函数
   */
  getNodeFunction(name: string): BaseWorkflowFunction | null {
    const func = this.getFunctionByName(name);
    if (func && func.type === WorkflowFunctionType.NODE) {
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

  /**
   * 获取所有条件函数
   * @returns 条件函数列表
   */
  getAllConditionFunctions(): BaseWorkflowFunction[] {
    return this.getFunctionsByType(WorkflowFunctionType.CONDITION);
  }

  /**
   * 获取所有路由函数
   * @returns 路由函数列表
   */
  getAllRoutingFunctions(): BaseWorkflowFunction[] {
    return this.getFunctionsByType(WorkflowFunctionType.ROUTING);
  }

  /**
   * 获取所有节点函数
   * @returns 节点函数列表
   */
  getAllNodeFunctions(): BaseWorkflowFunction[] {
    return this.getFunctionsByType(WorkflowFunctionType.NODE);
  }

  /**
   * 获取所有触发器函数
   * @returns 触发器函数列表
   */
  getAllTriggerFunctions(): BaseWorkflowFunction[] {
    return this.getFunctionsByType(WorkflowFunctionType.TRIGGER);
  }

  /**
   * 获取所有钩子函数
   * @returns 钩子函数列表
   */
  getAllHookFunctions(): BaseWorkflowFunction[] {
    return this.getFunctionsByType(WorkflowFunctionType.HOOK);
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
   * @returns 统计信息
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

  /**
   * 注册值对象类型与函数的映射关系
   * @param valueObjectType 值对象类型标识
   * @param functionName 函数名称
   */
  registerValueObjectMapping(valueObjectType: string, functionName: string): void {
    if (this.valueObjectTypeMapping.has(valueObjectType)) {
      throw new Error(`值对象类型 ${valueObjectType} 的映射关系已存在`);
    }
    this.valueObjectTypeMapping.set(valueObjectType, functionName);
  }

  /**
   * 根据值对象获取对应的函数
   * @param valueObject 值对象
   * @returns 工作流函数
   */
  getFunctionByValueObject(valueObject: ValueObject<any>): BaseWorkflowFunction | null {
    const valueObjectType = this.getValueObjectType(valueObject);
    const functionName = this.valueObjectTypeMapping.get(valueObjectType);

    if (!functionName) {
      return null;
    }

    return this.getFunctionByName(functionName);
  }

  /**
   * 获取支持特定值对象类型的函数列表
   * @param valueObjectType 值对象类型标识
   * @returns 工作流函数列表
   */
  getFunctionsByValueObjectType(valueObjectType: string): BaseWorkflowFunction[] {
    const functionName = this.valueObjectTypeMapping.get(valueObjectType);
    if (!functionName) {
      return [];
    }

    const func = this.getFunctionByName(functionName);
    return func ? [func] : [];
  }

  /**
   * 获取值对象类型映射关系
   * @returns 值对象类型映射关系
   */
  getValueObjectTypeMapping(): Map<string, string> {
    return new Map(this.valueObjectTypeMapping);
  }

  /**
   * 注销值对象类型映射关系
   * @param valueObjectType 值对象类型标识
   * @returns 是否成功
   */
  unregisterValueObjectMapping(valueObjectType: string): boolean {
    return this.valueObjectTypeMapping.delete(valueObjectType);
  }

  /**
   * 获取值对象的类型标识
   * @param valueObject 值对象
   * @returns 类型标识字符串
   */
  private getValueObjectType(valueObject: ValueObject<any>): string {
    if (valueObject instanceof NodeValueObject) {
      return `node_${valueObject.type.toString()}`;
    } else if (valueObject instanceof EdgeValueObject) {
      return `edge_${valueObject.type.toString()}`;
    } else if (valueObject instanceof TriggerValueObject) {
      return `trigger_${valueObject.type.toString()}`;
    } else if (valueObject instanceof HookValueObject) {
      return `hook_${valueObject.hookPoint.toString()}`;
    }
    return 'unknown';
  }
}