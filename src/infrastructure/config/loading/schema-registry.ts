/**
 * Schema注册表 - 集中管理模块Schema
 * 解决Schema管理分散问题
 */

import { z, ZodSchema, ZodError } from 'zod';
import { ILogger } from '../../../domain/common/types';


/**
 * Schema版本信息
 */
export interface SchemaVersion {
  version: string;
  schema: ZodSchema<any>;
  description: string;
  createdAt: Date;
  compatibleWith?: string[];
}

/**
 * Schema注册表选项
 */
export interface SchemaRegistryOptions {
  strict?: boolean;
  enableFormats?: boolean;
  cacheValidators?: boolean;
}

/**
 * Schema注册表
 * 集中管理所有模块类型的Schema定义
 */
export class SchemaRegistry {
  private readonly schemas: Map<string, ZodSchema<any>> = new Map();
  private readonly versions: Map<string, SchemaVersion[]> = new Map();
  private readonly logger: ILogger;
  private readonly options: SchemaRegistryOptions;

  constructor(
    logger: ILogger,
    options: SchemaRegistryOptions = {}
  ) {
    this.logger = logger.child({ module: 'SchemaRegistry' });
    this.options = {
      strict: true,
      enableFormats: true,
      cacheValidators: true,
      ...options
    };
  }

  /**
   * 注册模块Schema
   */
  registerSchema(
    moduleType: string,
    schema: ZodSchema<any>,
    version: string = '1.0.0',
    description: string = `${moduleType}模块Schema`
  ): void {
    this.logger.debug('注册模块Schema', { moduleType, version });

    try {
      // 检查Schema兼容性
      const existingSchema = this.schemas.get(moduleType);
      if (existingSchema && !this.validateSchemaCompatibility(schema, existingSchema)) {
        this.logger.warn('Schema兼容性检查失败', { moduleType });
      }

      // 存储Schema
      this.schemas.set(moduleType, schema);

      // 记录版本历史
      this.addVersionHistory(moduleType, {
        version,
        schema,
        description,
        createdAt: new Date()
      });

      this.logger.debug('模块Schema注册成功', { moduleType, version });
    } catch (error) {
      this.logger.error('模块Schema注册失败', error as Error, {
        moduleType
      });
      throw new Error(`注册模块Schema ${moduleType} 失败: ${(error as Error).message}`);
    }
  }

  /**
   * 获取模块Schema
   */
  getSchema(moduleType: string): ZodSchema<any> | undefined {
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
        errors: [{
          path: 'root',
          message: error,
          code: 'VALIDATION_ERROR',
          severity: 'error'
        }],
        severity: 'error'
      };
    }

    try {
      schema.parse(config);

      this.logger.debug('配置验证通过', { moduleType });
      return { isValid: true, errors: [], severity: 'success' };
    } catch (error) {
      if (error instanceof ZodError) {
        // 格式化错误信息
        const errors = this.formatZodValidationErrors(error, moduleType);

        this.logger.warn('配置验证失败', {
          moduleType,
          errorCount: errors.length,
          errors: errors.slice(0, 5) // 记录前5个错误
        });

        return {
          isValid: false,
          errors,
          severity: this.determineSeverity(errors)
        };
      }

      const validationError: ValidationError = {
        path: 'root',
        message: `验证器执行失败: ${(error as Error).message}`,
        code: 'VALIDATION_ERROR',
        severity: 'error' as ValidationSeverity
      };

      this.logger.error('配置验证失败', error as Error);
      return {
        isValid: false,
        errors: [validationError],
        severity: 'error' as ValidationSeverity
      };
    }
  }

  /**
   * 预验证配置（在加载前进行基础验证）
   */
  preValidate(config: any, moduleType: string): PreValidationResult {
    this.logger.debug('预验证配置', { moduleType });

    const schema = this.schemas.get(moduleType);
    if (!schema) {
      return {
        isValid: false,
        errors: [`未找到模块类型 ${moduleType} 的Schema`],
        severity: 'error'
      };
    }

    // 基础验证：检查必需字段和类型
    const basicErrors = this.basicValidation(config, schema);

    if (basicErrors.length > 0) {
      return {
        isValid: false,
        errors: basicErrors,
        severity: 'error'
      };
    }

    return {
      isValid: true,
      errors: [],
      severity: 'success'
    };
  }

  /**
   * 验证Schema兼容性
   */
  validateSchemaCompatibility(newSchema: ZodSchema<any>, oldSchema: ZodSchema<any>): boolean {
    // 简化的兼容性检查 for Zod schemas
    // In a real implementation, this might need more complex logic

    // For now, we'll just return true since Zod doesn't have the same
    // required field tracking as JSON Schema
    return true;
  }

  /**
   * 获取Schema版本历史
   */
  getSchemaHistory(moduleType: string): SchemaVersion[] {
    return this.versions.get(moduleType) || [];
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
    this.versions.delete(moduleType);

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
    this.versions.clear();

    this.logger.debug('清空所有模块Schema', { count });
  }

  /**
   * 添加版本历史记录
   */
  private addVersionHistory(moduleType: string, version: SchemaVersion): void {
    if (!this.versions.has(moduleType)) {
      this.versions.set(moduleType, []);
    }
    
    const history = this.versions.get(moduleType)!;
    history.push(version);
    
    // 保持历史记录有序（最新的在前）
    history.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    // 限制历史记录数量
    if (history.length > 10) {
      history.splice(10);
    }
  }

  /**
   * 基础验证（预验证）
   */
  private basicValidation(config: any, schema: ZodSchema<any>): string[] {
    // For Zod schemas, we'll run a basic parse to check validation
    try {
      schema.parse(config);
      return []; // No errors if parsing succeeds
    } catch (error) {
      if (error instanceof ZodError) {
        return error.issues.map((e: any) => e.message);
      }
      return [`验证失败: ${(error as Error).message}`];
    }
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
        suggestions: this.getZodErrorSuggestions(error)
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

/**
 * 验证结果接口
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  severity: ValidationSeverity;
}

/**
 * 预验证结果接口
 */
export interface PreValidationResult {
  isValid: boolean;
  errors: string[];
  severity: ValidationSeverity;
}

/**
 * 验证错误接口
 */
export interface ValidationError {
  path: string;
  message: string;
  code: string;
  severity: ValidationSeverity;
  suggestions?: string[];
}

/**
 * 验证严重性枚举
 */
export type ValidationSeverity = 'error' | 'warning' | 'info' | 'success';