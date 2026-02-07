/**
 * 配置验证工具函数
 * 提供通用的配置验证辅助函数
 */

import { ValidationError } from '../../../types/errors';

/**
 * 验证必需字段
 * @param obj 对象
 * @param requiredFields 必需字段列表
 * @param fieldName 字段名称（用于错误信息）
 * @returns 验证错误数组
 */
export function validateRequiredFields(
  obj: any,
  requiredFields: string[],
  fieldName: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const field of requiredFields) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
      errors.push(new ValidationError(
        `${fieldName}.${field} 是必需字段`,
        `${fieldName}.${field}`,
        obj[field]
      ));
    }
  }

  return errors;
}

/**
 * 验证字符串字段
 * @param value 字段值
 * @param fieldName 字段名称
 * @param options 验证选项
 * @returns 验证错误数组
 */
export function validateStringField(
  value: any,
  fieldName: string,
  options?: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
  }
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (typeof value !== 'string') {
    errors.push(new ValidationError(
      `${fieldName} 必须是字符串类型`,
      fieldName,
      value
    ));
    return errors;
  }

  if (options?.minLength && value.length < options.minLength) {
    errors.push(new ValidationError(
      `${fieldName} 长度不能小于 ${options.minLength}`,
      fieldName,
      value
    ));
  }

  if (options?.maxLength && value.length > options.maxLength) {
    errors.push(new ValidationError(
      `${fieldName} 长度不能大于 ${options.maxLength}`,
      fieldName,
      value
    ));
  }

  if (options?.pattern && !options.pattern.test(value)) {
    errors.push(new ValidationError(
      `${fieldName} 格式不正确`,
      fieldName,
      value
    ));
  }

  return errors;
}

/**
 * 验证数字字段
 * @param value 字段值
 * @param fieldName 字段名称
 * @param options 验证选项
 * @returns 验证错误数组
 */
export function validateNumberField(
  value: any,
  fieldName: string,
  options?: {
    min?: number;
    max?: number;
    integer?: boolean;
  }
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (typeof value !== 'number' || isNaN(value)) {
    errors.push(new ValidationError(
      `${fieldName} 必须是数字类型`,
      fieldName,
      value
    ));
    return errors;
  }

  if (options?.integer && !Number.isInteger(value)) {
    errors.push(new ValidationError(
      `${fieldName} 必须是整数`,
      fieldName,
      value
    ));
  }

  if (options?.min !== undefined && value < options.min) {
    errors.push(new ValidationError(
      `${fieldName} 不能小于 ${options.min}`,
      fieldName,
      value
    ));
  }

  if (options?.max !== undefined && value > options.max) {
    errors.push(new ValidationError(
      `${fieldName} 不能大于 ${options.max}`,
      fieldName,
      value
    ));
  }

  return errors;
}

/**
 * 验证布尔字段
 * @param value 字段值
 * @param fieldName 字段名称
 * @returns 验证错误数组
 */
export function validateBooleanField(value: any, fieldName: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (typeof value !== 'boolean') {
    errors.push(new ValidationError(
      `${fieldName} 必须是布尔类型`,
      fieldName,
      value
    ));
  }

  return errors;
}

/**
 * 验证数组字段
 * @param value 字段值
 * @param fieldName 字段名称
 * @param options 验证选项
 * @returns 验证错误数组
 */
export function validateArrayField(
  value: any,
  fieldName: string,
  options?: {
    minLength?: number;
    maxLength?: number;
  }
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!Array.isArray(value)) {
    errors.push(new ValidationError(
      `${fieldName} 必须是数组类型`,
      fieldName,
      value
    ));
    return errors;
  }

  if (options?.minLength && value.length < options.minLength) {
    errors.push(new ValidationError(
      `${fieldName} 长度不能小于 ${options.minLength}`,
      fieldName,
      value
    ));
  }

  if (options?.maxLength && value.length > options.maxLength) {
    errors.push(new ValidationError(
      `${fieldName} 长度不能大于 ${options.maxLength}`,
      fieldName,
      value
    ));
  }

  return errors;
}

/**
 * 验证对象字段
 * @param value 字段值
 * @param fieldName 字段名称
 * @returns 验证错误数组
 */
export function validateObjectField(value: any, fieldName: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    errors.push(new ValidationError(
      `${fieldName} 必须是对象类型`,
      fieldName,
      value
    ));
  }

  return errors;
}

/**
 * 验证枚举字段
 * @param value 字段值
 * @param fieldName 字段名称
 * @param enumValues 枚举值数组
 * @returns 验证错误数组
 */
export function validateEnumField(
  value: any,
  fieldName: string,
  enumValues: any[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!enumValues.includes(value)) {
    errors.push(new ValidationError(
      `${fieldName} 必须是以下值之一: ${enumValues.join(', ')}`,
      fieldName,
      value
    ));
  }

  return errors;
}