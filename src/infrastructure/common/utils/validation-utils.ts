/**
 * 通用验证工具
 */

/**
 * 验证结果接口
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 验证规则接口
 */
export interface ValidationRule<T = any> {
  name: string;
  validate: (value: T) => boolean | string;
  message?: string;
}

/**
 * 通用验证器
 */
export class ValidationUtils {
  /**
   * 验证必填字段
   */
  static required(value: unknown, fieldName?: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (value === null || value === undefined || value === '') {
      errors.push(fieldName ? `${fieldName}不能为空` : '字段不能为空');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 验证字符串长度
   */
  static length(value: string, min?: number, max?: number, fieldName?: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof value !== 'string') {
      errors.push(fieldName ? `${fieldName}必须是字符串` : '值必须是字符串');
      return { isValid: false, errors, warnings };
    }

    if (min !== undefined && value.length < min) {
      errors.push(fieldName ? `${fieldName}长度不能少于${min}个字符` : `长度不能少于${min}个字符`);
    }

    if (max !== undefined && value.length > max) {
      errors.push(fieldName ? `${fieldName}长度不能超过${max}个字符` : `长度不能超过${max}个字符`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 验证数字范围
   */
  static range(value: number, min?: number, max?: number, fieldName?: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof value !== 'number' || isNaN(value)) {
      errors.push(fieldName ? `${fieldName}必须是有效数字` : '值必须是有效数字');
      return { isValid: false, errors, warnings };
    }

    if (min !== undefined && value < min) {
      errors.push(fieldName ? `${fieldName}不能小于${min}` : `值不能小于${min}`);
    }

    if (max !== undefined && value > max) {
      errors.push(fieldName ? `${fieldName}不能大于${max}` : `值不能大于${max}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 验证邮箱格式
   */
  static email(value: string, fieldName?: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof value !== 'string') {
      errors.push(fieldName ? `${fieldName}必须是字符串` : '值必须是字符串');
      return { isValid: false, errors, warnings };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      errors.push(fieldName ? `${fieldName}格式不正确` : '邮箱格式不正确');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 验证URL格式
   */
  static url(value: string, fieldName?: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof value !== 'string') {
      errors.push(fieldName ? `${fieldName}必须是字符串` : '值必须是字符串');
      return { isValid: false, errors, warnings };
    }

    try {
      new URL(value);
    } catch {
      errors.push(fieldName ? `${fieldName}格式不正确` : 'URL格式不正确');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 验证正则表达式
   */
  static pattern(value: string, pattern: RegExp, fieldName?: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof value !== 'string') {
      errors.push(fieldName ? `${fieldName}必须是字符串` : '值必须是字符串');
      return { isValid: false, errors, warnings };
    }

    if (!pattern.test(value)) {
      errors.push(fieldName ? `${fieldName}格式不正确` : '格式不正确');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 验证枚举值
   */
  static enum<T>(value: T, enumValues: T[], fieldName?: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!enumValues.includes(value)) {
      errors.push(fieldName ? `${fieldName}必须是有效值` : '值必须是有效值');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 验证数组
   */
  static array(
    value: unknown,
    minItems?: number,
    maxItems?: number,
    fieldName?: string
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(value)) {
      errors.push(fieldName ? `${fieldName}必须是数组` : '值必须是数组');
      return { isValid: false, errors, warnings };
    }

    if (minItems !== undefined && value.length < minItems) {
      errors.push(
        fieldName ? `${fieldName}至少需要${minItems}个元素` : `数组至少需要${minItems}个元素`
      );
    }

    if (maxItems !== undefined && value.length > maxItems) {
      errors.push(
        fieldName ? `${fieldName}最多只能有${maxItems}个元素` : `数组最多只能有${maxItems}个元素`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 验证对象
   */
  static object(value: unknown, requiredKeys?: string[], fieldName?: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      errors.push(fieldName ? `${fieldName}必须是对象` : '值必须是对象');
      return { isValid: false, errors, warnings };
    }

    if (requiredKeys) {
      for (const key of requiredKeys) {
        if (!(key in value)) {
          errors.push(fieldName ? `${fieldName}缺少必需字段: ${key}` : `缺少必需字段: ${key}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 批量验证
   */
  static validateAll(validations: ValidationResult[]): ValidationResult {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    for (const validation of validations) {
      allErrors.push(...validation.errors);
      allWarnings.push(...validation.warnings);
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    };
  }

  /**
   * 使用规则验证
   */
  static validateWithRules<T>(value: T, rules: ValidationRule<T>[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const rule of rules) {
      const result = rule.validate(value);
      if (result === false) {
        errors.push(rule.message || `验证规则 ${rule.name} 失败`);
      } else if (typeof result === 'string') {
        errors.push(result);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 创建自定义验证规则
   */
  static createRule<T>(
    name: string,
    validator: (value: T) => boolean,
    message?: string
  ): ValidationRule<T> {
    return {
      name,
      validate: validator,
      message,
    };
  }
}
