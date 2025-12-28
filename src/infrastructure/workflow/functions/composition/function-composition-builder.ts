import { BaseWorkflowFunction } from '../base/base-workflow-function';
import { WorkflowFunctionType } from '../../../../domain/workflow/value-objects/workflow-function-type';
import {
  NodeCompositeFunction,
  ConditionCompositeFunction,
  RoutingCompositeFunction,
  TriggerCompositeFunction,
  HookCompositeFunction
} from './index';
import { CompositionStrategy, SequentialCompositionStrategy } from './composition-strategy';
import { CompositeFunctionType, validateSameFunctionType } from './composition-types';

/**
 * 函数组合构建器
 * 提供流式API来构建类型安全的复合函数
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
   * 构建节点函数组合
   * @param id 函数ID
   * @param name 函数名称
   * @param description 函数描述
   * @returns 节点复合函数
   * @throws Error 如果函数类型不匹配
   */
  buildNodeComposite(
    id: string,
    name: string,
    description: string
  ): NodeCompositeFunction {
    this.validateFunctionType(WorkflowFunctionType.NODE);
    const compositeFunc = new NodeCompositeFunction(id, name, description, this.strategy);

    for (const func of this.functions) {
      compositeFunc.addFunction(func);
    }

    return compositeFunc;
  }

  /**
   * 构建条件函数组合
   * @param id 函数ID
   * @param name 函数名称
   * @param description 函数描述
   * @returns 条件复合函数
   * @throws Error 如果函数类型不匹配
   */
  buildConditionComposite(
    id: string,
    name: string,
    description: string
  ): ConditionCompositeFunction {
    this.validateFunctionType(WorkflowFunctionType.CONDITION);
    const compositeFunc = new ConditionCompositeFunction(id, name, description, this.strategy);

    for (const func of this.functions) {
      compositeFunc.addFunction(func);
    }

    return compositeFunc;
  }

  /**
   * 构建路由函数组合
   * @param id 函数ID
   * @param name 函数名称
   * @param description 函数描述
   * @returns 路由复合函数
   * @throws Error 如果函数类型不匹配
   */
  buildRoutingComposite(
    id: string,
    name: string,
    description: string
  ): RoutingCompositeFunction {
    this.validateFunctionType(WorkflowFunctionType.ROUTING);
    const compositeFunc = new RoutingCompositeFunction(id, name, description, this.strategy);

    for (const func of this.functions) {
      compositeFunc.addFunction(func);
    }

    return compositeFunc;
  }

  /**
   * 构建触发器函数组合
   * @param id 函数ID
   * @param name 函数名称
   * @param description 函数描述
   * @returns 触发器复合函数
   * @throws Error 如果函数类型不匹配
   */
  buildTriggerComposite(
    id: string,
    name: string,
    description: string
  ): TriggerCompositeFunction {
    this.validateFunctionType(WorkflowFunctionType.TRIGGER);
    const compositeFunc = new TriggerCompositeFunction(id, name, description, this.strategy);

    for (const func of this.functions) {
      compositeFunc.addFunction(func);
    }

    return compositeFunc;
  }

  /**
   * 构建钩子函数组合
   * @param id 函数ID
   * @param name 函数名称
   * @param description 函数描述
   * @returns 钩子复合函数
   * @throws Error 如果函数类型不匹配
   */
  buildHookComposite(
    id: string,
    name: string,
    description: string
  ): HookCompositeFunction {
    this.validateFunctionType(WorkflowFunctionType.HOOK);
    const compositeFunc = new HookCompositeFunction(id, name, description, this.strategy);

    for (const func of this.functions) {
      compositeFunc.addFunction(func);
    }

    return compositeFunc;
  }

  /**
   * 验证函数类型
   * @param expectedType 期望的函数类型
   * @throws Error 如果函数类型不匹配
   */
  private validateFunctionType(expectedType: WorkflowFunctionType): void {
    const validation = validateSameFunctionType(this.functions, expectedType);
    if (!validation.valid) {
      throw new Error(`函数类型验证失败: ${validation.errors.join(', ')}`);
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

  /**
   * 获取函数类型
   * @returns 函数类型，如果为空或类型不一致则返回undefined
   */
  getFunctionType(): WorkflowFunctionType | undefined {
    if (this.functions.length === 0) {
      return undefined;
    }

    const firstFunc = this.functions[0];
    if (!firstFunc) {
      return undefined;
    }

    const firstType = firstFunc.type;
    const allSameType = this.functions.every(func => func.type === firstType);

    return allSameType ? firstType : undefined;
  }
}