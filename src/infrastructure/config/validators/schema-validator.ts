/**
 * Schema验证器实现
 */

import { z, ZodError } from 'zod';
import { IConfigValidator, SchemaValidatorOptions, ConfigValidationResult, ConfigValidationError, ILogger } from '../../../domain/common/types';

/**
 * Schema验证器
 * 使用Zod验证配置
 */
export class SchemaValidator implements IConfigValidator {
  private readonly schema: z.ZodType<any>;
  private readonly strict: boolean;
  private readonly logger: ILogger;

  constructor(
    options: SchemaValidatorOptions,
    logger: ILogger
  ) {
    this.schema = options.schema as z.ZodType<any>;
    this.strict = options.strict !== false;
    this.logger = logger.child({ module: 'SchemaValidator' });
  }

  /**
   * 验证配置
   */
  validate(config: Record<string, any>): ConfigValidationResult {
    this.logger.debug('开始Schema验证');

    try {
      this.schema.parse(config);

      this.logger.debug('Schema验证通过');
      return { isValid: true, errors: [] };
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = this.formatZodErrors(error);
        this.logger.warn('Schema验证失败', { errorCount: errors.length });

        return { isValid: false, errors };
      }

      this.logger.error('Schema验证器执行失败', error as Error);
      return {
        isValid: false,
        errors: [{
          path: 'schema',
          message: `验证器执行失败: ${(error as Error).message}`,
          code: 'VALIDATOR_ERROR'
        }]
      };
    }
  }


  /**
   * 格式化Zod错误
   */
  private formatZodErrors(zodError: ZodError): ConfigValidationError[] {
    return zodError.issues.map(error => {
      const path = error.path.join('.') || 'root';
      const message = error.message;
      const code = this.getZodErrorCode(error);

      return {
        path,
        message,
        code,
        value: (error as any).input
      };
    });
  }

  /**
   * 获取Zod错误代码
   */
  private getZodErrorCode(error: any): string {
    switch (error.code) {
      case 'invalid_type':
        return 'TYPE_MISMATCH';
      case 'invalid_literal':
        return 'LITERAL_ERROR';
      case 'custom':
        return 'CUSTOM_ERROR';
      case 'invalid_union':
        return 'UNION_ERROR';
      case 'invalid_enum_value':
        return 'ENUM_ERROR';
      case 'too_small':
        if (error.type === 'string') return 'LENGTH_ERROR';
        if (error.type === 'number') return 'RANGE_ERROR';
        if (error.type === 'array') return 'LENGTH_ERROR';
        return 'VALIDATION_ERROR';
      case 'too_big':
        if (error.type === 'string') return 'LENGTH_ERROR';
        if (error.type === 'number') return 'RANGE_ERROR';
        if (error.type === 'array') return 'LENGTH_ERROR';
        return 'VALIDATION_ERROR';
      default:
        return 'VALIDATION_ERROR';
    }
  }
}
