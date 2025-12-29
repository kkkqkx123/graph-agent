import { injectable } from 'inversify';
import { BaseHookFunction } from './base-hook-function';
import { WorkflowExecutionContext, NodeFunctionResult, NodeFunctionConfig } from '../types';

/**
 * 执行前钩子函数
 * 在工作流执行前调用，用于预处理、验证等
 */
@injectable()
export class BeforeExecuteHookFunction extends BaseHookFunction<NodeFunctionConfig> {
  constructor() {
    super(
      'hook:before_execute',
      'before_execute_hook',
      '在工作流执行前调用的钩子，用于预处理、验证等'
    );
  }

  override getParameters() {
    return [
      ...super.getParameters(),
      {
        name: 'validationRules',
        type: 'object',
        required: false,
        description: '验证规则配置'
      },
      {
        name: 'preprocessing',
        type: 'object',
        required: false,
        description: '预处理配置'
      }
    ];
  }

  protected override validateCustomConfig(config: any): string[] {
    const errors: string[] = [];

    if (config['validationRules'] && typeof config['validationRules'] !== 'object') {
      errors.push('validationRules 必须是对象类型');
    }

    if (config['preprocessing'] && typeof config['preprocessing'] !== 'object') {
      errors.push('preprocessing 必须是对象类型');
    }

    return errors;
  }

  override async execute(context: WorkflowExecutionContext, config: NodeFunctionConfig): Promise<NodeFunctionResult> {
    this.checkInitialized();

    try {
      const result: {
        success: boolean;
        shouldContinue: boolean;
        data: Record<string, any>;
        metadata: Record<string, any>;
      } = {
        success: true,
        shouldContinue: true,
        data: {},
        metadata: {
          hookPoint: 'before_execute',
          timestamp: Date.now()
        }
      };

      // 执行验证
      if (config['validationRules']) {
        const validationResult = this.validateContext(context, config['validationRules']);
        if (!validationResult.valid) {
          result.success = false;
          result.shouldContinue = false;
          result.data['validationErrors'] = validationResult.errors;
          return {
            success: false,
            error: '验证失败',
            output: result
          };
        }
      }

      // 执行预处理
      if (config['preprocessing']) {
        result.data['preprocessed'] = this.preprocessContext(context, config['preprocessing']);
      }

      return {
        success: true,
        output: result,
        metadata: result.metadata
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private validateContext(context: WorkflowExecutionContext, rules: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 简化的验证逻辑
    if (rules['required']) {
      for (const field of rules['required']) {
        if (context.getVariable(field) === undefined) {
          errors.push(`缺少必需字段: ${field}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private preprocessContext(context: WorkflowExecutionContext, preprocessing: any): any {
    // 简化的预处理逻辑
    const result: Record<string, any> = {};

    if (preprocessing['transform']) {
      for (const [key, transform] of Object.entries(preprocessing['transform'])) {
        if (context.getVariable(key) !== undefined) {
          // 这里可以添加各种转换逻辑
          result[key] = transform;
        }
      }
    }

    return result;
  }
}