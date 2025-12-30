import { BaseHookFunction, HookFunctionResult, createHookFunctionResult } from './base-hook-function';

/**
 * 数据验证Hook函数
 * 
 * 提供数据验证功能，可以在任何Hook点使用
 */
export class ValidationHookFunction extends BaseHookFunction {
  override readonly id = 'validation-hook-function';
  override readonly name = '数据验证函数';
  override readonly description = '验证输入数据的完整性和有效性';
  override readonly version = '1.0.0';

  async execute(context: any, config?: Record<string, any>): Promise<HookFunctionResult> {
    const startTime = Date.now();

    try {
      const rules = config?.['rules'] || [];
      const data = context?.data || {};

      const errors: string[] = [];

      // 执行验证规则
      for (const rule of rules) {
        const result = this.validateRule(data, rule);
        if (!result.valid) {
          errors.push(result.error || '验证失败');
        }
      }

      const executionTime = Date.now() - startTime;

      if (errors.length > 0) {
        return createHookFunctionResult(
          false,
          { errors },
          `数据验证失败: ${errors.join(', ')}`,
          executionTime,
          config?.['stopOnFailure'] !== false
        );
      }

      return createHookFunctionResult(
        true,
        { validated: true, data },
        undefined,
        executionTime,
        true
      );
    } catch (error) {
      const executionTime = Date.now() - startTime;
      return createHookFunctionResult(
        false,
        undefined,
        error instanceof Error ? error : String(error),
        executionTime,
        false
      );
    }
  }

  /**
   * 验证单个规则
   */
  private validateRule(data: any, rule: any): { valid: boolean; error?: string } {
    const { field, type, required, min, max, pattern, custom } = rule;
    const value = data[field];

    // 检查必填字段
    if (required && (value === undefined || value === null || value === '')) {
      return { valid: false, error: `字段 ${field} 是必填的` };
    }

    // 如果值为空且非必填，跳过其他验证
    if (value === undefined || value === null || value === '') {
      return { valid: true };
    }

    // 类型验证
    if (type) {
      switch (type) {
        case 'string':
          if (typeof value !== 'string') {
            return { valid: false, error: `字段 ${field} 必须是字符串类型` };
          }
          break;
        case 'number':
          if (typeof value !== 'number' || isNaN(value)) {
            return { valid: false, error: `字段 ${field} 必须是数字类型` };
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            return { valid: false, error: `字段 ${field} 必须是布尔类型` };
          }
          break;
        case 'array':
          if (!Array.isArray(value)) {
            return { valid: false, error: `字段 ${field} 必须是数组类型` };
          }
          break;
        case 'object':
          if (typeof value !== 'object' || Array.isArray(value)) {
            return { valid: false, error: `字段 ${field} 必须是对象类型` };
          }
          break;
      }
    }

    // 最小值/最小长度验证
    if (min !== undefined) {
      if (typeof value === 'number' && value < min) {
        return { valid: false, error: `字段 ${field} 不能小于 ${min}` };
      }
      if (typeof value === 'string' && value.length < min) {
        return { valid: false, error: `字段 ${field} 长度不能小于 ${min}` };
      }
      if (Array.isArray(value) && value.length < min) {
        return { valid: false, error: `字段 ${field} 数组长度不能小于 ${min}` };
      }
    }

    // 最大值/最大长度验证
    if (max !== undefined) {
      if (typeof value === 'number' && value > max) {
        return { valid: false, error: `字段 ${field} 不能大于 ${max}` };
      }
      if (typeof value === 'string' && value.length > max) {
        return { valid: false, error: `字段 ${field} 长度不能大于 ${max}` };
      }
      if (Array.isArray(value) && value.length > max) {
        return { valid: false, error: `字段 ${field} 数组长度不能大于 ${max}` };
      }
    }

    // 正则表达式验证
    if (pattern && typeof value === 'string') {
      const regex = new RegExp(pattern);
      if (!regex.test(value)) {
        return { valid: false, error: `字段 ${field} 格式不正确` };
      }
    }

    // 自定义验证函数
    if (custom && typeof custom === 'function') {
      const result = custom(value, data);
      if (!result.valid) {
        return { valid: false, error: result.error || `字段 ${field} 自定义验证失败` };
      }
    }

    return { valid: true };
  }

  override validateConfig(config: Record<string, any>): { valid: boolean; errors: string[] } {
     const errors: string[] = [];

     if (!config?.['rules'] || !Array.isArray(config['rules'])) {
       errors.push('rules 必须是一个数组');
     } else {
       config['rules'].forEach((rule: any, index: number) => {
        if (!rule.field) {
          errors.push(`规则 ${index} 缺少 field 属性`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}