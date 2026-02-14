/**
 * 函数式验证器
 * 提供统一的验证函数，返回 Result<T, ValidationError[]> 类型
 */

import { ValidationError, SchemaValidationError } from '@modular-agent/types';
import type { Result } from '@modular-agent/types';
import { ok, err } from '@modular-agent/common-utils';

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
      errors.push(new SchemaValidationError(
        `${String(field)}不能为空`,
        {
          field: `${fieldName}.${String(field)}`,
          value: value
        }
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
    errors.push(new SchemaValidationError(
      `${fieldName}必须是字符串`,
      {
        field: fieldName,
        value: value
      }
    ));
    return err(errors);
  }

  if (value.length < min) {
    errors.push(new SchemaValidationError(
      `${fieldName}长度不能少于${min}`,
      {
        field: fieldName,
        value: value
      }
    ));
  }
  if (value.length > max) {
    errors.push(new SchemaValidationError(
      `${fieldName}长度不能超过${max}`,
      {
        field: fieldName,
        value: value
      }
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
    errors.push(new SchemaValidationError(
      `${fieldName}必须是数字`,
      {
        field: fieldName,
        value: value
      }
    ));
    return err(errors);
  }

  if (value < 0) {
    errors.push(new SchemaValidationError(
      `${fieldName}不能为负数`,
      {
        field: fieldName,
        value: value
      }
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
    errors.push(new SchemaValidationError(
      `${fieldName}不能为空`,
      {
        field: fieldName,
        value: value
      }
    ));
  } else if (typeof value !== 'object' || Array.isArray(value)) {
    errors.push(new SchemaValidationError(
      `${fieldName}必须是有效的对象`,
      {
        field: fieldName,
        value: value
      }
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
    errors.push(new SchemaValidationError(
      `${fieldName}必须是数组`,
      {
        field: fieldName,
        value: value
      }
    ));
  } else if (value.length < minLength) {
    errors.push(new SchemaValidationError(
      `${fieldName}至少需要${minLength}个元素`,
      {
        field: fieldName,
        value: value
      }
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
    errors.push(new SchemaValidationError(
      `${fieldName}必须是布尔值`,
      {
        field: fieldName,
        value: value
      }
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
    errors.push(new SchemaValidationError(
      `${fieldName}必须是字符串`,
      {
        field: fieldName,
        value: value
      }
    ));
    return err(errors);
  }

  if (!regex.test(value)) {
    errors.push(new SchemaValidationError(
      message || `${fieldName}格式不正确`,
      {
        field: fieldName,
        value: value
      }
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
    errors.push(new SchemaValidationError(
      `${fieldName}必须是以下值之一: ${enumValues.join(', ')}`,
      {
        field: fieldName,
        value: value
      }
    ));
  }

  if (errors.length === 0) {
    return ok(value);
  } else {
    return err(errors);
  }
}
