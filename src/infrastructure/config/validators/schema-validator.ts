/**
 * Schema验证器实现
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { IConfigValidator, SchemaValidatorOptions, ConfigValidationResult, ConfigValidationError } from '@shared/types/config';
import { ILogger } from '@shared/types/logger';

/**
 * Schema验证器
 * 使用JSON Schema验证配置
 */
export class SchemaValidator implements IConfigValidator {
  private readonly ajv: Ajv;
  private readonly schema: Record<string, any>;
  private readonly strict: boolean;
  private readonly logger: ILogger;

  constructor(
    options: SchemaValidatorOptions,
    logger: ILogger
  ) {
    this.schema = options.schema;
    this.strict = options.strict !== false;
    this.logger = logger.child({ module: 'SchemaValidator' });
    
    // 初始化AJV
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: this.strict
    });
    
    // 添加格式支持
    addFormats(this.ajv);
  }

  /**
   * 验证配置
   */
  validate(config: Record<string, any>): ConfigValidationResult {
    this.logger.debug('开始Schema验证');
    
    try {
      const validate = this.ajv.compile(this.schema);
      const isValid = validate(config);
      
      if (isValid) {
        this.logger.debug('Schema验证通过');
        return { isValid: true, errors: [] };
      }
      
      const errors = this.formatErrors(validate.errors || []);
      this.logger.warn('Schema验证失败', { errorCount: errors.length });
      
      return { isValid: false, errors };
    } catch (error) {
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
   * 格式化AJV错误
   */
  private formatErrors(ajvErrors: any[]): ConfigValidationError[] {
    return ajvErrors.map(error => {
      const path = this.getErrorPath(error);
      const message = this.getErrorMessage(error);
      const code = this.getErrorCode(error);
      
      return {
        path,
        message,
        code,
        value: error.data
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
    
    return 'unknown';
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
}