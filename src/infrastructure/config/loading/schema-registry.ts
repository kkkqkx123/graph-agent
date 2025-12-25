/**
 * Schema注册表 - 集中管理模块Schema
 * 解决Schema管理分散问题
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { ILogger } from '../../../domain/common/types';

// 使用 JSONSchemaType 作为 JSONSchema 的别名
type JSONSchema = any;

/**
 * Schema版本信息
 */
export interface SchemaVersion {
  version: string;
  schema: JSONSchema;
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
  private readonly schemas: Map<string, JSONSchema> = new Map();
  private readonly validators: Map<string, any> = new Map();
  private readonly versions: Map<string, SchemaVersion[]> = new Map();
  private readonly ajv: Ajv;
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

    // 初始化AJV
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: this.options.strict
    });

    // 添加格式支持
    if (this.options.enableFormats) {
      addFormats(this.ajv);
    }
  }

  /**
   * 注册模块Schema
   */
  registerSchema(
    moduleType: string,
    schema: JSONSchema,
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

      // 编译验证器
      const validate = this.ajv.compile(schema);

      // 存储Schema和验证器
      this.schemas.set(moduleType, schema);
      if (this.options.cacheValidators) {
        this.validators.set(moduleType, validate);
      }

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
  getSchema(moduleType: string): JSONSchema | undefined {
    return this.schemas.get(moduleType);
  }

  /**
   * 验证配置
   */
  validateConfig(moduleType: string, config: any): ValidationResult {
    this.logger.debug('验证配置', { moduleType });

    const validator = this.validators.get(moduleType);
    if (!validator) {
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

    const isValid = validator(config);

    if (isValid) {
      this.logger.debug('配置验证通过', { moduleType });
      return { isValid: true, errors: [], severity: 'success' };
    }

    // 格式化错误信息
    const errors = this.formatValidationErrors(validator.errors || [], moduleType);

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
  validateSchemaCompatibility(newSchema: JSONSchema, oldSchema: JSONSchema): boolean {
    // 简化的兼容性检查
    // 在实际实现中可能需要更复杂的逻辑
    
    // 检查新Schema是否包含所有必需字段
    if (newSchema.required && oldSchema.required) {
      const newRequired = new Set(newSchema.required);
      const oldRequired = new Set(oldSchema.required);
      
      // 新Schema必须包含所有旧Schema的必需字段
      for (const field of oldRequired) {
        if (!newRequired.has(field)) {
          this.logger.warn('Schema兼容性检查失败：缺少必需字段', { field });
          return false;
        }
      }
    }

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
    const hadValidator = this.validators.has(moduleType);
    
    this.schemas.delete(moduleType);
    this.validators.delete(moduleType);
    this.versions.delete(moduleType);
    
    if (hadSchema || hadValidator) {
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
    this.validators.clear();
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
  private basicValidation(config: any, schema: JSONSchema): string[] {
    const errors: string[] = [];

    // 检查必需字段
    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (config[field] === undefined) {
          errors.push(`缺少必需字段: ${field}`);
        }
      }
    }

    // 检查类型
    if (schema.properties) {
      for (const [field, fieldSchema] of Object.entries(schema.properties as Record<string, any>)) {
        if (config[field] !== undefined) {
          const expectedType = fieldSchema.type;
          const actualType = typeof config[field];
          
          if (expectedType && actualType !== expectedType) {
            errors.push(`字段 ${field} 类型错误，期望 ${expectedType}，实际 ${actualType}`);
          }
        }
      }
    }

    return errors;
  }

  /**
   * 格式化验证错误
   */
  private formatValidationErrors(errors: any[], moduleType: string): ValidationError[] {
    return errors.map(error => {
      const path = this.getErrorPath(error);
      const message = this.getErrorMessage(error);
      const severity = this.determineErrorSeverity(error);
      
      return {
        path: path ? `${moduleType}.${path}` : moduleType,
        message,
        code: this.getErrorCode(error),
        severity,
        suggestions: this.getErrorSuggestions(error)
      };
    });
  }

  /**
   * 获取错误路径
   */
  private getErrorPath(error: any): string {
    if (error.instancePath) {
      return error.instancePath.substring(1) || 'root';
    }
    
    if (error.dataPath) {
      return error.dataPath.substring(1) || 'root';
    }
    
    return '';
  }

  /**
   * 获取错误消息
   */
  private getErrorMessage(error: any): string {
    const params = error.params || {};
    
    switch (error.keyword) {
      case 'required':
        return `缺少必需字段: ${params.missingProperty}`;
      case 'type':
        return `类型错误，期望 ${params.type}，实际 ${typeof error.data}`;
      case 'format':
        return `格式错误，期望 ${params.format}`;
      case 'minimum':
        return `值太小，最小值为 ${params.limit}`;
      case 'maximum':
        return `值太大，最大值为 ${params.limit}`;
      case 'minLength':
        return `长度太短，最小长度为 ${params.limit}`;
      case 'maxLength':
        return `长度太长，最大长度为 ${params.limit}`;
      case 'pattern':
        return `格式不匹配，期望模式: ${params.pattern}`;
      case 'enum':
        return `值不在允许的枚举中: ${params.allowedValues?.join(', ')}`;
      case 'additionalProperties':
        return `不允许的额外属性: ${params.additionalProperty}`;
      default:
        return error.message || '验证失败';
    }
  }

  /**
   * 获取错误代码
   */
  private getErrorCode(error: any): string {
    switch (error.keyword) {
      case 'required':
        return 'REQUIRED_FIELD';
      case 'type':
        return 'TYPE_MISMATCH';
      case 'format':
        return 'FORMAT_ERROR';
      case 'minimum':
      case 'maximum':
        return 'RANGE_ERROR';
      case 'minLength':
      case 'maxLength':
        return 'LENGTH_ERROR';
      case 'pattern':
        return 'PATTERN_MISMATCH';
      case 'enum':
        return 'ENUM_ERROR';
      case 'additionalProperties':
        return 'ADDITIONAL_PROPERTY';
      default:
        return 'VALIDATION_ERROR';
    }
  }

  /**
   * 确定错误严重性
   */
  private determineErrorSeverity(error: any): ValidationSeverity {
    switch (error.keyword) {
      case 'required':
        return 'error';
      case 'type':
      case 'format':
        return 'error';
      case 'minimum':
      case 'maximum':
      case 'minLength':
      case 'maxLength':
        return 'warning';
      case 'pattern':
      case 'enum':
        return 'warning';
      case 'additionalProperties':
        return 'info';
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
   * 获取错误修复建议
   */
  private getErrorSuggestions(error: any): string[] {
    const suggestions: string[] = [];
    const params = error.params || {};
    
    switch (error.keyword) {
      case 'required':
        suggestions.push(`添加字段 ${params.missingProperty}`);
        break;
      case 'type':
        suggestions.push(`将值转换为 ${params.type} 类型`);
        break;
      case 'format':
        suggestions.push(`使用正确的 ${params.format} 格式`);
        break;
      case 'minimum':
        suggestions.push(`确保值大于等于 ${params.limit}`);
        break;
      case 'maximum':
        suggestions.push(`确保值小于等于 ${params.limit}`);
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