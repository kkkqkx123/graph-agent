/**
 * 函数式验证器
 * 提供统一的验证函数，返回 Result<T, ValidationError[]> 类型
 */

import { ValidationError } from '../../types/errors';
import type { Result } from '../../types/result';
import { ok, err } from '../../utils/result-utils';

/**
 * 验证必需字段
 * @param data 数据对象
 * @param fields 必需字段列表
 * @param fieldName 字段名称（用于错误信息）
 * @returns 验证错误数组
 */
export function validateRequiredFields<T>(
  data: T,
  fields: (keyof T)[],
  fieldName: string
): Result<T, ValidationError[]> {
  const errors: ValidationError[] = [];
  
  for (const field of fields) {
    const value = data[field];
    if (value === null || value === undefined || value === '') {
      errors.push(new ValidationError(
        `${String(field)}不能为空`,
        `${fieldName}.${String(field)}`,
        value
      ));
    }
  }
  
  if (errors.length === 0) {
    return ok(data);
  } else {
    return err(errors);
  }
}

/**
 * 验证字符串长度
 * @param value 字符串值
 * @param fieldName 字段名称
 * @param min 最小长度
 * @param max 最大长度
 * @returns 验证错误数组
 */
export function validateStringLength(
  value: string,
  fieldName: string,
  min: number,
  max: number
): Result<string, ValidationError[]> {
  const errors: ValidationError[] = [];
  
  if (typeof value !== 'string') {
    errors.push(new ValidationError(
      `${fieldName}必须是字符串`,
      fieldName,
      value
    ));
    return err(errors);
  }
  
  if (value.length < min) {
    errors.push(new ValidationError(
      `${fieldName}长度不能少于${min}`,
      fieldName,
      value
    ));
  }
  if (value.length > max) {
    errors.push(new ValidationError(
      `${fieldName}长度不能超过${max}`,
      fieldName,
      value
    ));
  }
  
  if (errors.length === 0) {
    return ok(value);
  } else {
    return err(errors);
  }
}

/**
 * 验证数值范围
 * @param value 数值
 * @param fieldName 字段名称
 * @param min 最小值
 * @param max 最大值
 * @returns 验证错误数组
 */
export function validateNumberRange(
  value: number,
  fieldName: string,
  min: number,
  max: number
): Result<number, ValidationError[]> {
  const errors: ValidationError[] = [];
  
  if (typeof value !== 'number' || isNaN(value)) {
    errors.push(new ValidationError(
      `${fieldName}必须是数字`,
      fieldName,
      value
    ));
    return err(errors);
  }
  
  if (value < min) {
    errors.push(new ValidationError(
      `${fieldName}不能小于${min}`,
      fieldName,
      value
    ));
  }
  if (value > max) {
    errors.push(new ValidationError(
      `${fieldName}不能大于${max}`,
      fieldName,
      value
    ));
  }
  
  if (errors.length === 0) {
    return ok(value);
  } else {
    return err(errors);
  }
}

/**
 * 验证正数
 * @param value 数值
 * @param fieldName 字段名称
 * @returns 验证错误数组
 */
export function validatePositiveNumber(value: number, fieldName: string): Result<number, ValidationError[]> {
  const errors: ValidationError[] = [];
  
  if (typeof value !== 'number' || isNaN(value)) {
    errors.push(new ValidationError(
      `${fieldName}必须是数字`,
      fieldName,
      value
    ));
    return err(errors);
  }
  
  if (value < 0) {
    errors.push(new ValidationError(
      `${fieldName}不能为负数`,
      fieldName,
      value
    ));
  }
  
  if (errors.length === 0) {
    return ok(value);
  } else {
    return err(errors);
  }
}

/**
 * 验证对象结构
 * @param value 对象值
 * @param fieldName 字段名称
 * @returns 验证错误数组
 */
export function validateObject(value: any, fieldName: string): Result<any, ValidationError[]> {
  const errors: ValidationError[] = [];
  
  if (value === null || value === undefined) {
    errors.push(new ValidationError(
      `${fieldName}不能为空`,
      fieldName,
      value
    ));
  } else if (typeof value !== 'object' || Array.isArray(value)) {
    errors.push(new ValidationError(
      `${fieldName}必须是有效的对象`,
      fieldName,
      value
    ));
  }
  
  if (errors.length === 0) {
    return ok(value);
  } else {
    return err(errors);
  }
}

/**
 * 验证数组
 * @param value 数组值
 * @param fieldName 字段名称
 * @param minLength 最小长度
 * @returns 验证错误数组
 */
export function validateArray(
  value: any[],
  fieldName: string,
  minLength: number = 1
): Result<any[], ValidationError[]> {
  const errors: ValidationError[] = [];
  
  if (!Array.isArray(value)) {
    errors.push(new ValidationError(
      `${fieldName}必须是数组`,
      fieldName,
      value
    ));
  } else if (value.length < minLength) {
    errors.push(new ValidationError(
      `${fieldName}至少需要${minLength}个元素`,
      fieldName,
      value
    ));
  }
  
  if (errors.length === 0) {
    return ok(value);
  } else {
    return err(errors);
  }
}

/**
 * 验证布尔值
 * @param value 布尔值
 * @param fieldName 字段名称
 * @returns 验证错误数组
 */
export function validateBoolean(value: any, fieldName: string): Result<boolean, ValidationError[]> {
  const errors: ValidationError[] = [];
  
  if (typeof value !== 'boolean') {
    errors.push(new ValidationError(
      `${fieldName}必须是布尔值`,
      fieldName,
      value
    ));
  }
  
  if (errors.length === 0) {
    return ok(value);
  } else {
    return err(errors);
  }
}

/**
 * 验证正则表达式匹配
 * @param value 字符串值
 * @param fieldName 字段名称
 * @param regex 正则表达式
 * @param message 自定义错误消息
 * @returns 验证错误数组
 */
export function validatePattern(
  value: string,
  fieldName: string,
  regex: RegExp,
  message?: string
): Result<string, ValidationError[]> {
  const errors: ValidationError[] = [];
  
  if (typeof value !== 'string') {
    errors.push(new ValidationError(
      `${fieldName}必须是字符串`,
      fieldName,
      value
    ));
    return err(errors);
  }
  
  if (!regex.test(value)) {
    errors.push(new ValidationError(
      message || `${fieldName}格式不正确`,
      fieldName,
      value
    ));
  }
  
  if (errors.length === 0) {
    return ok(value);
  } else {
    return err(errors);
  }
}

/**
 * 验证枚举值
 * @param value 值
 * @param fieldName 字段名称
 * @param enumValues 枚举值数组
 * @returns 验证错误数组
 */
export function validateEnum<T>(
  value: T,
  fieldName: string,
  enumValues: T[]
): Result<T, ValidationError[]> {
  const errors: ValidationError[] = [];
  
  if (!enumValues.includes(value)) {
    errors.push(new ValidationError(
      `${fieldName}必须是以下值之一: ${enumValues.join(', ')}`,
      fieldName,
      value
    ));
  }
  
  if (errors.length === 0) {
    return ok(value);
  } else {
    return err(errors);
  }
}

/**
 * 合并多个验证错误数组
 * @param errorsArrays 验证错误数组列表
 * @returns 合并后的验证错误数组
 */
export function mergeValidationErrors(...errorsArrays: ValidationError[][]): ValidationError[] {
  return errorsArrays.flat();
}

/**
 * 检查验证是否通过
 * @param result 验证结果
 * @returns 是否验证通过
 */
export function isValid<T>(result: Result<T, ValidationError[]>): boolean {
  return result.isOk();
}