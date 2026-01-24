/**
 * 简化的Schema注册表
 * 专注于核心的Schema注册和验证功能
 */

import { z, ZodError } from 'zod';
import { ILogger } from '../../../domain/common/types';
import { ValidationError, ValidationResult, ValidationSeverity } from './types';
import { ConfigurationError } from '../../../common/exceptions';

/**
 * 简化的Schema注册表
 */
export class SchemaRegistry {
  private readonly schemas: Map<string, z.ZodType<any>> = new Map();
  private readonly logger: ILogger;

  constructor(logger: ILogger, schemaMap?: Record<string, z.ZodType<any>>) {
    this.logger = logger;
    
    if (schemaMap) {
      this.registerAllSchemas(schemaMap);
    }
  }

  /**
   * 注册模块Schema
   */
  registerSchema(moduleType: string, schema: z.ZodType<any>): void {
    this.logger.debug('注册模块Schema', { moduleType });

    try {
      this.schemas.set(moduleType, schema);
      this.logger.debug('模块Schema注册成功', { moduleType });
    } catch (error) {
      this.logger.error('模块Schema注册失败', error as Error, {
        moduleType,
      });
      throw new ConfigurationError(`注册模块Schema ${moduleType} 失败: ${(error as Error).message}`);
    }
  }

  /**
   * 批量注册所有Schema
   */
  registerAllSchemas(schemaMap: Record<string, z.ZodType<any>>): void {
    this.logger.debug('批量注册模块Schema', { count: Object.keys(schemaMap).length });
    
    Object.entries(schemaMap).forEach(([moduleType, schema]) => {
      try {
        this.registerSchema(moduleType, schema);
      } catch (error) {
        this.logger.error('模块Schema注册失败', error as Error, { moduleType });
        // 继续注册其他schema
      }
    });
  }

  /**
   * 获取模块Schema
   */
  getSchema(moduleType: string): z.ZodType<any> | undefined {
    return this.schemas.get(moduleType);
  }

  /**
   * 验证配置
   */
  validateConfig(moduleType: string, config: any): ValidationResult {
    this.logger.debug('验证配置', { moduleType });

    const schema = this.schemas.get(moduleType);
    if (!schema) {
      const error = `未找到模块类型 ${moduleType} 的验证器`;
      this.logger.warn(error);
      return {
        isValid: false,
        errors: [
          {
            path: 'root',
            message: error,
            code: 'VALIDATION_ERROR',
            severity: 'error' as any,
          },
        ],
        severity: 'error',
      };
    }

    try {
      schema.parse(config);

      this.logger.debug('配置验证通过', { moduleType });
      return { isValid: true, errors: [], severity: 'success' };
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = this.formatZodValidationErrors(error, moduleType);

        this.logger.warn('配置验证失败', {
          moduleType,
          errorCount: errors.length,
          errors: errors.slice(0, 5),
        });

        return {
          isValid: false,
          errors,
          severity: this.determineSeverity(errors),
        };
      }

      const validationError: ValidationError = {
        path: 'root',
        message: `验证器执行失败: ${(error as Error).message}`,
        code: 'VALIDATION_ERROR',
        severity: 'error' as any,
      };

      this.logger.error('配置验证失败', error as Error);
      return {
        isValid: false,
        errors: [validationError],
        severity: 'error',
      };
    }
  }

  /**
   * 检查模块类型是否已注册
   */
  hasModuleType(moduleType: string): boolean {
    return this.schemas.has(moduleType);
  }

  /**
   * 获取所有已注册的模块类型
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.schemas.keys());
  }

  /**
   * 移除模块Schema
   */
  unregisterModuleType(moduleType: string): boolean {
    const hadSchema = this.schemas.has(moduleType);
    this.schemas.delete(moduleType);

    if (hadSchema) {
      this.logger.debug('移除模块Schema', { moduleType });
      return true;
    }

    return false;
  }

  /**
   * 清空所有注册的Schema
   */
  clear(): void {
    const count = this.schemas.size;
    this.schemas.clear();

    this.logger.debug('清空所有模块Schema', { count });
  }

  /**
   * 格式化Zod验证错误
   */
  private formatZodValidationErrors(zodError: ZodError, moduleType: string): ValidationError[] {
    return zodError.issues.map(error => {
      const path = error.path.join('.') || 'root';
      const message = error.message;
      const severity = this.determineZodErrorSeverity(error);

      return {
        path: path ? `${moduleType}.${path}` : moduleType,
        message,
        code: this.getZodErrorCode(error),
        severity,
        suggestions: this.getZodErrorSuggestions(error),
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

  /**
   * 确定Zod错误严重性
   */
  private determineZodErrorSeverity(error: any): ValidationSeverity {
    switch (error.code) {
      case 'invalid_type':
        return 'error';
      case 'invalid_literal':
        return 'error';
      case 'custom':
        return 'error';
      case 'invalid_union':
        return 'error';
      case 'invalid_enum_value':
        return 'error';
      case 'too_small':
      case 'too_big':
        if (error.type === 'string' || error.type === 'number' || error.type === 'array') {
          return 'warning';
        }
        return 'error';
      default:
        return 'error';
    }
  }

  /**
   * 确定整体验证严重性
   */
  private determineSeverity(errors: ValidationError[]): ValidationSeverity {
    if (errors.some(e => e.severity === 'error')) {
      return 'error';
    }
    if (errors.some(e => e.severity === 'warning')) {
      return 'warning';
    }
    return 'info';
  }

  /**
   * 获取Zod错误修复建议
   */
  private getZodErrorSuggestions(error: any): string[] {
    const suggestions: string[] = [];

    switch (error.code) {
      case 'invalid_type':
        suggestions.push(`将值转换为正确的类型`);
        break;
      case 'too_small':
        if (error.type === 'string') {
          suggestions.push(`确保字符串长度不少于 ${error.minimum}`);
        } else if (error.type === 'number') {
          suggestions.push(`确保数值不小于 ${error.minimum}`);
        } else if (error.type === 'array') {
          suggestions.push(`确保数组长度不少于 ${error.minimum}`);
        }
        break;
      case 'too_big':
        if (error.type === 'string') {
          suggestions.push(`确保字符串长度不超过 ${error.maximum}`);
        } else if (error.type === 'number') {
          suggestions.push(`确保数值不超过 ${error.maximum}`);
        } else if (error.type === 'array') {
          suggestions.push(`确保数组长度不超过 ${error.maximum}`);
        }
        break;
    }

    return suggestions;
  }
}
