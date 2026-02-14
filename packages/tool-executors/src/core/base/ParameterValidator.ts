/**
 * 参数验证器
 * 负责验证工具参数是否符合定义的schema
 */

import { z } from 'zod';
import type { Tool } from '@modular-agent/types';
import { ValidationError, RuntimeValidationError } from '@modular-agent/types';

/**
 * 参数验证器
 */
export class ParameterValidator {
  /**
   * 验证工具参数
   * @param tool 工具定义
   * @param parameters 工具参数
   * @throws ValidationError 如果参数验证失败
   */
  validate(tool: Tool, parameters: Record<string, any>): void {
    const schema = this.buildSchema(tool);
    const result = schema.safeParse(parameters);

    if (!result.success) {
      const firstError = result.error.issues[0];
      if (!firstError) {
        throw new RuntimeValidationError('Parameter validation failed', { operation: 'validate', field: 'parameters', value: parameters });
      }
      const field = firstError.path.join('.');
      throw new RuntimeValidationError(
        firstError.message,
        {
          operation: 'validate',
          field: field,
          value: parameters
        }
      );
    }
  }

  /**
   * 构建参数验证schema
   * @param tool 工具定义
   * @returns zod schema
   */
  private buildSchema(tool: Tool): z.ZodType<Record<string, any>> {
    const shape: Record<string, z.ZodTypeAny> = {};

    for (const [paramName, paramSchema] of Object.entries(tool.parameters.properties)) {
      let zodSchema = this.buildTypeSchema(paramSchema.type);

      // 添加枚举验证
      if (paramSchema.enum && paramSchema.enum.length > 0) {
        zodSchema = zodSchema.pipe(z.enum(paramSchema.enum as [string, ...string[]]));
      }

      // 添加格式验证
      if (paramSchema.format && typeof paramSchema.format === 'string') {
        zodSchema = zodSchema.pipe(this.buildFormatSchema(paramSchema.format));
      }

      // 设置是否必需
      if (tool.parameters.required.includes(paramName)) {
        shape[paramName] = zodSchema;
      } else {
        shape[paramName] = zodSchema.optional();
      }
    }

    return z.object(shape);
  }

  /**
   * 构建类型schema
   * @param type 类型字符串
   * @returns zod schema
   */
  private buildTypeSchema(type: string): z.ZodTypeAny {
    switch (type) {
      case 'string':
        return z.string();
      case 'number':
        return z.number();
      case 'boolean':
        return z.boolean();
      case 'array':
        return z.array(z.any());
      case 'object':
        return z.record(z.string(), z.any());
      default:
        return z.any();
    }
  }

  /**
   * 构建格式schema
   * @param format 格式字符串
   * @returns zod schema
   */
  private buildFormatSchema(format: string): z.ZodTypeAny {
    switch (format) {
      case 'uri':
        return z.string().url();
      case 'email':
        return z.string().email();
      case 'uuid':
        return z.string().uuid();
      case 'date-time':
        return z.string().datetime();
      default:
        return z.any();
    }
  }
}