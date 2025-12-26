import { BaseWorkflowFunction } from '../base/base-workflow-function';
import { ValidationResult } from '../base/base-workflow-function';

/**
 * 执行策略接口
 */
export interface ExecutionStrategy {
  name: string;
  description: string;

  /**
   * 执行函数列表
   * @param functions 函数列表
   * @param context 执行上下文
   * @returns 执行结果
   */
  execute(functions: BaseWorkflowFunction[], context: any): Promise<any[]>;

  /**
   * 验证策略配置
   * @param config 配置对象
   * @returns 验证结果
   */
  validate(config: any): ValidationResult;
}

/**
 * 顺序执行策略
 */
export class SequentialStrategy implements ExecutionStrategy {
  name = 'sequential';
  description = '按顺序依次执行函数';

  async execute(functions: BaseWorkflowFunction[], context: any): Promise<any[]> {
    const results: any[] = [];
    let currentContext = context;

    for (const func of functions) {
      const result = await func.execute(currentContext, {});
      results.push(result);
      currentContext = result;
    }

    return results;
  }

  validate(config: any): ValidationResult {
    return { valid: true, errors: [] };
  }
}

/**
 * 并行执行策略
 */
export class ParallelStrategy implements ExecutionStrategy {
  name = 'parallel';
  description = '并行执行所有函数';

  async execute(functions: BaseWorkflowFunction[], context: any): Promise<any[]> {
    const promises = functions.map(func => func.execute(context, {}));
    return Promise.all(promises);
  }

  validate(config: any): ValidationResult {
    return { valid: true, errors: [] };
  }
}

/**
 * 条件执行策略
 */
export class ConditionalStrategy implements ExecutionStrategy {
  name = 'conditional';
  description = '根据条件选择执行函数';

  async execute(functions: BaseWorkflowFunction[], context: any): Promise<any[]> {
    const results: any[] = [];

    for (const func of functions) {
      // 检查函数是否有条件配置
      if (func.metadata?.['condition']) {
        const shouldExecute = this.evaluateCondition(func.metadata['condition'], context);
        if (shouldExecute) {
          const result = await func.execute(context, {});
          results.push(result);
        }
      } else {
        const result = await func.execute(context, {});
        results.push(result);
      }
    }

    return results;
  }

  validate(config: any): ValidationResult {
    const errors: string[] = [];

    if (config.condition && typeof config.condition !== 'string') {
      errors.push('条件必须是字符串表达式');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private evaluateCondition(condition: string, context: any): boolean {
    // 简化的条件评估逻辑
    // 实际实现应该使用表达式评估器
    try {
      const func = new Function('context', `return ${condition}`);
      return func(context);
    } catch {
      return false;
    }
  }
}