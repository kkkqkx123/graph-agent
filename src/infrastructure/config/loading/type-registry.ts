/**
 * 类型注册表实现
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { ITypeRegistry, ValidationResult } from './types';
import { ILogger } from '@shared/types/logger';

// 使用 JSONSchemaType 作为 JSONSchema 的别名
type JSONSchema = any;

/**
 * 类型注册表实现
 */
export class TypeRegistry implements ITypeRegistry {
  private readonly schemas: Map<string, JSONSchema> = new Map();
  private readonly validators: Map<string, any> = new Map();
  private readonly ajv: Ajv;
  private readonly logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger.child({ module: 'TypeRegistry' });
    
    // 初始化AJV
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false
    });
    
    // 添加格式支持
    addFormats(this.ajv);
  }

  /**
   * 注册模块类型
   */
  registerModuleType(moduleType: string, schema: JSONSchema): void {
    this.logger.debug('注册模块类型', { moduleType });
    
    try {
      // 编译验证器
      const validate = this.ajv.compile(schema);
      
      // 存储schema和验证器
      this.schemas.set(moduleType, schema);
      this.validators.set(moduleType, validate);
      
      this.logger.debug('模块类型注册成功', { moduleType });
    } catch (error) {
      this.logger.error('模块类型注册失败', error as Error, {
        moduleType
      });
      throw new Error(`注册模块类型 ${moduleType} 失败: ${(error as Error).message}`);
    }
  }

  /**
   * 获取模块类型的Schema
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
        errors: [error]
      };
    }

    const isValid = validator(config);
    
    if (isValid) {
      this.logger.debug('配置验证通过', { moduleType });
      return { isValid: true, errors: [] };
    }

    // 格式化错误信息
    const errors = this.formatValidationErrors(validator.errors || []);
    
    this.logger.warn('配置验证失败', { 
      moduleType, 
      errorCount: errors.length,
      errors: errors.slice(0, 3) // 只记录前3个错误
    });

    return {
      isValid: false,
      errors
    };
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
   * 移除模块类型
   */
  unregisterModuleType(moduleType: string): boolean {
    const hadSchema = this.schemas.has(moduleType);
    const hadValidator = this.validators.has(moduleType);
    
    this.schemas.delete(moduleType);
    this.validators.delete(moduleType);
    
    if (hadSchema || hadValidator) {
      this.logger.debug('移除模块类型', { moduleType });
      return true;
    }
    
    return false;
  }

  /**
   * 清空所有注册的类型
   */
  clear(): void {
    const count = this.schemas.size;
    this.schemas.clear();
    this.validators.clear();
    
    this.logger.debug('清空所有模块类型', { count });
  }

  /**
   * 格式化验证错误
   */
  private formatValidationErrors(errors: any[]): string[] {
    return errors.map(error => {
      const path = this.getErrorPath(error);
      const message = this.getErrorMessage(error);
      
      if (path) {
        return `${path}: ${message}`;
      }
      
      return message;
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
}
