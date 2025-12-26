import { BaseWorkflowFunction } from '../base/base-workflow-function';
import { ValidationResult } from '../base/base-workflow-function';

/**
 * 组合策略接口
 */
export interface CompositionStrategy {
  /**
   * 执行函数组合
   * @param functions 函数列表
   * @param context 执行上下文
   * @param config 配置对象
   * @returns 执行结果
   */
  execute(functions: BaseWorkflowFunction[], context: any, config: any): Promise<any>;

  /**
   * 验证函数组合
   * @param functions 函数列表
   * @returns 验证结果
   */
  validate(functions: BaseWorkflowFunction[]): ValidationResult;
}

/**
 * 顺序组合策略
 */
export class SequentialCompositionStrategy implements CompositionStrategy {
  async execute(functions: BaseWorkflowFunction[], context: any, config: any): Promise<any> {
    let result = context;

    for (const func of functions) {
      result = await func.execute(result, config);
    }

    return result;
  }

  validate(functions: BaseWorkflowFunction[]): ValidationResult {
    const errors: string[] = [];

    if (functions.length === 0) {
      errors.push('函数组合不能为空');
    }

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

    return { valid: errors.length === 0, errors };
  }

  private areTypesCompatible(outputType: string, inputParameters: any[]): boolean {
    // 简化实现，实际应该进行更严格的类型检查
    return true;
  }
}

/**
 * 并行组合策略
 */
export class ParallelCompositionStrategy implements CompositionStrategy {
  async execute(functions: BaseWorkflowFunction[], context: any, config: any): Promise<any> {
    const promises = functions.map(func => func.execute(context, config));
    const results = await Promise.all(promises);

    // 合并所有结果
    return results.reduce((acc: Record<string, any>, result: any, index: number) => {
      acc[`result_${index}`] = result;
      return acc;
    }, {} as Record<string, any>);
  }

  validate(functions: BaseWorkflowFunction[]): ValidationResult {
    const errors: string[] = [];

    if (functions.length === 0) {
      errors.push('函数组合不能为空');
    }

    return { valid: errors.length === 0, errors };
  }
}

/**
 * 管道组合策略
 */
export class PipelineCompositionStrategy implements CompositionStrategy {
  async execute(functions: BaseWorkflowFunction[], context: any, config: any): Promise<any> {
    let result = context;

    for (const func of functions) {
      const funcResult = await func.execute(result, config);

      // 将结果传递给下一个函数
      result = {
        ...result,
        _lastResult: funcResult
      };
    }

    return result._lastResult;
  }

  validate(functions: BaseWorkflowFunction[]): ValidationResult {
    const errors: string[] = [];

    if (functions.length === 0) {
      errors.push('函数组合不能为空');
    }

    return { valid: errors.length === 0, errors };
  }
}