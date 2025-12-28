import { BaseWorkflowFunction } from '../base/base-workflow-function';
import { ValidationResult } from '../base/base-workflow-function';
import { WorkflowExecutionContext } from '../base/base-workflow-function';
import { WorkflowFunctionType } from '../../../../domain/workflow/value-objects/workflow-function-type';

/**
 * 组合策略接口
 * 提供类型安全的函数组合执行和验证
 */
export interface CompositionStrategy {
  /**
   * 执行函数组合
   * @param functions 函数列表
   * @param context 执行上下文
   * @param config 配置对象
   * @returns 执行结果
   */
  execute(functions: BaseWorkflowFunction[], context: WorkflowExecutionContext, config: any): Promise<any>;

  /**
   * 验证函数组合
   * @param functions 函数列表
   * @returns 验证结果
   */
  validate(functions: BaseWorkflowFunction[]): ValidationResult;

  /**
   * 获取策略名称
   */
  getName(): string;
}

/**
 * 顺序组合策略
 * 按顺序执行函数，前一个函数的输出作为后一个函数的输入
 */
export class SequentialCompositionStrategy implements CompositionStrategy {
  getName(): string {
    return 'sequential';
  }

  async execute(functions: BaseWorkflowFunction[], context: WorkflowExecutionContext, config: any): Promise<any> {
    let result: any = context;

    for (const func of functions) {
      result = await func.execute(context, config);
    }

    return result;
  }

  validate(functions: BaseWorkflowFunction[]): ValidationResult {
    const errors: string[] = [];

    if (functions.length === 0) {
      errors.push('函数组合不能为空');
    }

    // 验证所有函数类型相同
    const firstType = functions[0]?.type;
    for (let i = 1; i < functions.length; i++) {
      const func = functions[i];
      if (func && func.type !== firstType) {
        errors.push(`函数 ${func.name} 的类型 ${func.type} 与第一个函数的类型 ${firstType} 不匹配`);
      }
    }

    // 对于节点函数，检查输出类型与输入类型的兼容性
    if (firstType === WorkflowFunctionType.NODE) {
      for (let i = 0; i < functions.length - 1; i++) {
        const currentFunc = functions[i];
        const nextFunc = functions[i + 1];

        if (!currentFunc || !nextFunc) {
          continue;
        }

        // 检查输出类型与输入类型的兼容性
        if (!this.areTypesCompatible(currentFunc.getReturnType(), nextFunc.getParameters())) {
          errors.push(`函数 ${currentFunc.name} 的输出与函数 ${nextFunc.name} 的输入不兼容`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private areTypesCompatible(outputType: string, inputParameters: any[]): boolean {
    // 简化实现，实际应该进行更严格的类型检查
    return true;
  }
}

/**
 * 并行组合策略
 * 并行执行所有函数，合并所有结果
 */
export class ParallelCompositionStrategy implements CompositionStrategy {
  getName(): string {
    return 'parallel';
  }

  async execute(functions: BaseWorkflowFunction[], context: WorkflowExecutionContext, config: any): Promise<any> {
    const promises = functions.map(func => func.execute(context, config));
    const results = await Promise.all(promises);

    // 根据函数类型决定如何合并结果
    const firstType = functions[0]?.type;

    if (firstType === WorkflowFunctionType.NODE) {
      // 节点函数：返回最后一个成功的结果
      const lastResult = results[results.length - 1];
      return lastResult;
    } else if (firstType === WorkflowFunctionType.CONDITION ||
               firstType === WorkflowFunctionType.ROUTING ||
               firstType === WorkflowFunctionType.TRIGGER) {
      // 布尔类型：所有结果必须为true
      return results.every(result => result === true);
    } else {
      // 其他类型：合并所有结果
      return results.reduce((acc: Record<string, any>, result: any, index: number) => {
        acc[`result_${index}`] = result;
        return acc;
      }, {} as Record<string, any>);
    }
  }

  validate(functions: BaseWorkflowFunction[]): ValidationResult {
    const errors: string[] = [];

    if (functions.length === 0) {
      errors.push('函数组合不能为空');
    }

    // 验证所有函数类型相同
    const firstType = functions[0]?.type;
    for (let i = 1; i < functions.length; i++) {
      const func = functions[i];
      if (func && func.type !== firstType) {
        errors.push(`函数 ${func.name} 的类型 ${func.type} 与第一个函数的类型 ${firstType} 不匹配`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

/**
 * 管道组合策略
 * 按顺序执行函数，保留所有中间结果
 */
export class PipelineCompositionStrategy implements CompositionStrategy {
  getName(): string {
    return 'pipeline';
  }

  async execute(functions: BaseWorkflowFunction[], context: WorkflowExecutionContext, config: any): Promise<any> {
    const results: any[] = [];

    for (const func of functions) {
      const funcResult = await func.execute(context, config);
      results.push(funcResult);
    }

    // 返回最后一个结果
    return results[results.length - 1];
  }

  validate(functions: BaseWorkflowFunction[]): ValidationResult {
    const errors: string[] = [];

    if (functions.length === 0) {
      errors.push('函数组合不能为空');
    }

    // 验证所有函数类型相同
    const firstType = functions[0]?.type;
    for (let i = 1; i < functions.length; i++) {
      const func = functions[i];
      if (func && func.type !== firstType) {
        errors.push(`函数 ${func.name} 的类型 ${func.type} 与第一个函数的类型 ${firstType} 不匹配`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

/**
 * 条件组合策略（AND）
 * 所有函数都必须返回true
 */
export class AndCompositionStrategy implements CompositionStrategy {
  getName(): string {
    return 'and';
  }

  async execute(functions: BaseWorkflowFunction[], context: WorkflowExecutionContext, config: any): Promise<any> {
    for (const func of functions) {
      const result = await func.execute(context, config);
      if (result !== true) {
        return false;
      }
    }
    return true;
  }

  validate(functions: BaseWorkflowFunction[]): ValidationResult {
    const errors: string[] = [];

    if (functions.length === 0) {
      errors.push('函数组合不能为空');
    }

    // 验证所有函数都是布尔类型
    for (const func of functions) {
      if (func.type !== WorkflowFunctionType.CONDITION &&
          func.type !== WorkflowFunctionType.ROUTING &&
          func.type !== WorkflowFunctionType.TRIGGER) {
        errors.push(`函数 ${func.name} 的类型 ${func.type} 不支持AND组合策略`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

/**
 * 条件组合策略（OR）
 * 任意一个函数返回true即可
 */
export class OrCompositionStrategy implements CompositionStrategy {
  getName(): string {
    return 'or';
  }

  async execute(functions: BaseWorkflowFunction[], context: WorkflowExecutionContext, config: any): Promise<any> {
    for (const func of functions) {
      const result = await func.execute(context, config);
      if (result === true) {
        return true;
      }
    }
    return false;
  }

  validate(functions: BaseWorkflowFunction[]): ValidationResult {
    const errors: string[] = [];

    if (functions.length === 0) {
      errors.push('函数组合不能为空');
    }

    // 验证所有函数都是布尔类型
    for (const func of functions) {
      if (func.type !== WorkflowFunctionType.CONDITION &&
          func.type !== WorkflowFunctionType.ROUTING &&
          func.type !== WorkflowFunctionType.TRIGGER) {
        errors.push(`函数 ${func.name} 的类型 ${func.type} 不支持OR组合策略`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}