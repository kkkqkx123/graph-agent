/**
 * 业务验证器实现
 */

import { IConfigValidator, BusinessValidatorOptions, ConfigValidationResult, ConfigValidationError } from '@shared/types/config';
import { ILogger } from '@shared/types/logger';

/**
 * 业务验证器
 * 执行业务规则验证
 */
export class BusinessValidator implements IConfigValidator {
  private readonly rules: any[];
  private readonly logger: ILogger;

  constructor(
    options: BusinessValidatorOptions,
    logger: ILogger
  ) {
    this.rules = options.rules || [];
    this.logger = logger.child({ module: 'BusinessValidator' });
  }

  /**
   * 验证配置
   */
  validate(config: Record<string, any>): ConfigValidationResult {
    this.logger.debug('开始业务规则验证');
    
    const errors: ConfigValidationError[] = [];
    
    for (const rule of this.rules) {
      try {
        const value = this.getValueByPath(config, rule.path);
        const isValid = rule.validator(value);
        
        if (!isValid) {
          errors.push({
            path: rule.path,
            message: rule.message,
            code: 'BUSINESS_RULE_VIOLATION',
            value
          });
          
          this.logger.debug('业务规则验证失败', { 
            path: rule.path, 
            message: rule.message 
          });
        }
      } catch (error) {
        errors.push({
          path: rule.path,
          message: `验证规则执行失败: ${(error as Error).message}`,
          code: 'RULE_EXECUTION_ERROR'
        });
        
        this.logger.error('业务规则执行失败', error as Error, {
          path: rule.path
        });
      }
    }
    
    if (errors.length === 0) {
      this.logger.debug('业务规则验证通过');
    } else {
      this.logger.warn('业务规则验证失败', { errorCount: errors.length });
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 根据路径获取值
   */
  private getValueByPath(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }
}