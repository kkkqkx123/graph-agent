import { BaseWorkflowFunction } from '../base/base-workflow-function';
import { BaseCompositeFunction } from './base-composite-function';
import { CompositionStrategy, SequentialCompositionStrategy } from './composition-strategy';
import { NodeCompositeFunction } from './impl/node-composite-function';
import { ConditionCompositeFunction } from './impl/condition-composite-function';
import { RoutingCompositeFunction } from './impl/routing-composite-function';
import { TriggerCompositeFunction } from './impl/trigger-composite-function';
import { HookCompositeFunction } from './impl/hook-composite-function';
import { WorkflowFunctionType } from '../../../../domain/workflow/value-objects/workflow-function-type';

/**
 * 函数组合构建器
 * 提供流式API来构建复合函数
 */
export class FunctionCompositionBuilder {
  private functions: BaseWorkflowFunction[] = [];
  private strategy: CompositionStrategy = new SequentialCompositionStrategy();

  /**
   * 添加函数
   * @param func 工作流函数
   * @returns 构建器实例
   */
  addFunction(func: BaseWorkflowFunction): FunctionCompositionBuilder {
    this.functions.push(func);
    return this;
  }

  /**
   * 添加多个函数
   * @param funcs 工作流函数列表
   * @returns 构建器实例
   */
  addFunctions(funcs: BaseWorkflowFunction[]): FunctionCompositionBuilder {
    this.functions.push(...funcs);
    return this;
  }

  /**
   * 设置组合策略
   * @param strategy 组合策略
   * @returns 构建器实例
   */
  withStrategy(strategy: CompositionStrategy): FunctionCompositionBuilder {
    this.strategy = strategy;
    return this;
  }

  /**
   * 清空函数列表
   * @returns 构建器实例
   */
  clear(): FunctionCompositionBuilder {
    this.functions = [];
    return this;
  }

  /**
   * 构建节点组合函数
   * @param id 函数ID
   * @param name 函数名称
   * @param description 函数描述
   * @returns 节点复合函数
   */
  buildNodeComposite(id: string, name: string, description: string): NodeCompositeFunction {
    this.validateSameFunctionType(WorkflowFunctionType.NODE);
    const compositeFunc = new NodeCompositeFunction(id, name, description, this.strategy);

    for (const func of this.functions) {
      compositeFunc.addFunction(func);
    }

    return compositeFunc;
  }

  /**
   * 构建条件组合函数
   * @param id 函数ID
   * @param name 函数名称
   * @param description 函数描述
   * @returns 条件复合函数
   */
  buildConditionComposite(id: string, name: string, description: string): ConditionCompositeFunction {
    this.validateSameFunctionType(WorkflowFunctionType.CONDITION);
    const compositeFunc = new ConditionCompositeFunction(id, name, description, this.strategy);

    for (const func of this.functions) {
      compositeFunc.addFunction(func);
    }

    return compositeFunc;
  }

  /**
   * 构建路由组合函数
   * @param id 函数ID
   * @param name 函数名称
   * @param description 函数描述
   * @returns 路由复合函数
   */
  buildRoutingComposite(id: string, name: string, description: string): RoutingCompositeFunction {
    this.validateSameFunctionType(WorkflowFunctionType.ROUTING);
    const compositeFunc = new RoutingCompositeFunction(id, name, description, this.strategy);

    for (const func of this.functions) {
      compositeFunc.addFunction(func);
    }

    return compositeFunc;
  }

  /**
   * 构建触发器组合函数
   * @param id 函数ID
   * @param name 函数名称
   * @param description 函数描述
   * @returns 触发器复合函数
   */
  buildTriggerComposite(id: string, name: string, description: string): TriggerCompositeFunction {
    this.validateSameFunctionType(WorkflowFunctionType.TRIGGER);
    const compositeFunc = new TriggerCompositeFunction(id, name, description, this.strategy);

    for (const func of this.functions) {
      compositeFunc.addFunction(func);
    }

    return compositeFunc;
  }

  /**
   * 构建钩子组合函数
   * @param id 函数ID
   * @param name 函数名称
   * @param description 函数描述
   * @returns 钩子复合函数
   */
  buildHookComposite(id: string, name: string, description: string): HookCompositeFunction {
    this.validateSameFunctionType(WorkflowFunctionType.HOOK);
    const compositeFunc = new HookCompositeFunction(id, name, description, this.strategy);

    for (const func of this.functions) {
      compositeFunc.addFunction(func);
    }

    return compositeFunc;
  }

  /**
   * 验证所有函数都是同一类型
   * @param expectedType 期望的函数类型
   * @throws Error 如果函数类型不一致
   */
  private validateSameFunctionType(expectedType: WorkflowFunctionType): void {
    if (this.functions.length === 0) {
      throw new Error('函数列表不能为空');
    }

    for (const func of this.functions) {
      if (func.type !== expectedType) {
        throw new Error(
          `函数 ${func.name} 的类型 ${func.type} 与期望类型 ${expectedType} 不匹配`
        );
      }
    }
  }

  /**
   * 获取当前函数数量
   * @returns 函数数量
   */
  getFunctionCount(): number {
    return this.functions.length;
  }

  /**
   * 检查是否为空
   * @returns 是否为空
   */
  isEmpty(): boolean {
    return this.functions.length === 0;
  }
}