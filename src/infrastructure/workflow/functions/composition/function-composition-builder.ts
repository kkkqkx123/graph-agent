import { BaseWorkflowFunction } from '../base/base-workflow-function';
import { CompositeFunction } from './composite-function';
import { CompositionStrategy, SequentialCompositionStrategy } from './composition-strategy';

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
   * 构建组合函数
   * @param id 函数ID
   * @param name 函数名称
   * @param description 函数描述
   * @returns 复合函数
   */
  build(id: string, name: string, description: string): CompositeFunction {
    const compositeFunc = new CompositeFunction(id, name, description, this.strategy);

    for (const func of this.functions) {
      compositeFunc.addFunction(func);
    }

    return compositeFunc;
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