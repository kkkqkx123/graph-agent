/**
 * 高级验证工具
 * 提供更复杂的验证场景和组合验证功能
 */

import { ValidationError } from '../../types/errors';
import type { Result } from '../../types/result';
import { ok, err } from '../../utils/result-utils';

/**
 * 验证对象结构完整性
 * @param obj 待验证的对象
 * @param requiredKeys 必需键列表
 * @param fieldName 字段名称
 * @returns 验证错误数组
 */
export function validateObjectStructure<T extends Record<string, any>>(
  obj: T,
  requiredKeys: (keyof T)[],
  fieldName: string
): Result<T, ValidationError[]> {
  const errors: ValidationError[] = [];
  
  if (obj === null || obj === undefined) {
    errors.push(new ValidationError(
      `${fieldName}不能为空`,
      fieldName,
      obj
    ));
    return err(errors);
  }
  
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    errors.push(new ValidationError(
      `${fieldName}必须是有效的对象`,
      fieldName,
      obj
    ));
    return err(errors);
  }
  
  for (const key of requiredKeys) {
    if (!(key in obj)) {
      errors.push(new ValidationError(
        `${String(key)}字段是必需的`,
        `${fieldName}.${String(key)}`,
        undefined
      ));
    }
  }
  
  if (errors.length === 0) {
    return ok(obj);
  } else {
    return err(errors);
  }
}

/**
 * 验证嵌套对象
 * @param obj 待验证的对象
 * @param validators 字段验证器映射
 * @param fieldName 字段名称
 * @returns 验证错误数组
 */
export function validateNestedObject<T extends Record<string, any>>(
  obj: T,
  validators: { [K in keyof T]?: (value: T[K], fieldPath: string) => Result<T[K], ValidationError[]> },
  fieldName: string
): Result<T, ValidationError[]> {
  const errors: ValidationError[] = [];
  
  if (obj === null || obj === undefined) {
    errors.push(new ValidationError(
      `${fieldName}不能为空`,
      fieldName,
      obj
    ));
    return err(errors);
  }
  
  for (const [key, validator] of Object.entries(validators)) {
    if (validator) {
      const fieldPath = `${fieldName}.${key}`;
      const value = obj[key as keyof T];
      const fieldResult = validator(value, fieldPath);
      if (fieldResult.isErr()) {
        errors.push(...fieldResult.unwrapOrElse((err: ValidationError[]) => err));
      }
    }
  }
  
  if (errors.length === 0) {
    return ok(obj);
  } else {
    return err(errors);
  }
}

/**
 * 验证数组元素
 * @param array 待验证的数组
 * @param elementValidator 元素验证器
 * @param fieldName 字段名称
 * @param minLength 最小长度
 * @returns 验证错误数组
 */
export function validateArrayElements<T>(
  array: T[],
  elementValidator: (element: T, index: number, fieldPath: string) => Result<T, ValidationError[]>,
  fieldName: string,
  minLength: number = 1
): Result<T[], ValidationError[]> {
  const errors: ValidationError[] = [];
  
  if (!Array.isArray(array)) {
    errors.push(new ValidationError(
      `${fieldName}必须是数组`,
      fieldName,
      array
    ));
    return err(errors);
  }
  
  if (array.length < minLength) {
    errors.push(new ValidationError(
      `${fieldName}至少需要${minLength}个元素`,
      fieldName,
      array
    ));
  }
  
  for (let i = 0; i < array.length; i++) {
    const element = array[i]!; // 使用非空断言，因为数组索引访问不会返回 undefined
    const fieldPath = `${fieldName}[${i}]`;
    const elementResult = elementValidator(element, i, fieldPath);
    if (elementResult.isErr()) {
      errors.push(...elementResult.unwrapOrElse((err: ValidationError[]) => err));
    }
  }
  
  if (errors.length === 0) {
    return ok(array);
  } else {
    return err(errors);
  }
}

/**
 * 验证条件约束
 * @param condition 条件函数
 * @param message 错误消息
 * @param fieldName 字段名称
 * @param value 字段值
 * @returns 验证错误数组
 */
export function validateCondition(
  condition: () => boolean,
  message: string,
  fieldName: string,
  value?: any
): Result<boolean, ValidationError[]> {
  const errors: ValidationError[] = [];
  
  if (!condition()) {
    errors.push(new ValidationError(
      message,
      fieldName,
      value
    ));
  }
  
  if (errors.length === 0) {
    return ok(true);
  } else {
    return err(errors);
  }
}

/**
 * 验证互斥字段
 * @param obj 待验证的对象
 * @param exclusiveFields 互斥字段列表
 * @param fieldName 字段名称
 * @returns 验证错误数组
 */
export function validateExclusiveFields<T extends Record<string, any>>(
  obj: T,
  exclusiveFields: (keyof T)[],
  fieldName: string
): Result<T, ValidationError[]> {
  const errors: ValidationError[] = [];
  const presentFields = exclusiveFields.filter(field =>
    obj[field] !== null && obj[field] !== undefined && obj[field] !== ''
  );
  
  if (presentFields.length > 1) {
    errors.push(new ValidationError(
      `字段 ${presentFields.join(', ')} 不能同时存在`,
      fieldName,
      obj
    ));
  }
  
  if (errors.length === 0) {
    return ok(obj);
  } else {
    return err(errors);
  }
}

/**
 * 验证依赖字段
 * @param obj 待验证的对象
 * @param dependentField 依赖字段
 * @param requiredField 必需字段
 * @param fieldName 字段名称
 * @returns 验证错误数组
 */
export function validateDependentField<T extends Record<string, any>>(
  obj: T,
  dependentField: keyof T,
  requiredField: keyof T,
  fieldName: string
): Result<T, ValidationError[]> {
  const errors: ValidationError[] = [];
  
  const hasDependentField = obj[dependentField] !== null &&
                           obj[dependentField] !== undefined &&
                           obj[dependentField] !== '';
  
  const hasRequiredField = obj[requiredField] !== null &&
                          obj[requiredField] !== undefined &&
                          obj[requiredField] !== '';
  
  if (hasDependentField && !hasRequiredField) {
    errors.push(new ValidationError(
      `当 ${String(dependentField)} 存在时，${String(requiredField)} 字段是必需的`,
      fieldName,
      obj
    ));
  }
  
  if (errors.length === 0) {
    return ok(obj);
  } else {
    return err(errors);
  }
}

/**
 * 验证日期范围
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @param fieldName 字段名称
 * @returns 验证错误数组
 */
export function validateDateRange(
  startDate: Date,
  endDate: Date,
  fieldName: string
): Result<{ startDate: Date; endDate: Date }, ValidationError[]> {
  const errors: ValidationError[] = [];
  
  if (!(startDate instanceof Date) || isNaN(startDate.getTime())) {
    errors.push(new ValidationError(
      `${fieldName}.startDate 必须是有效的日期`,
      `${fieldName}.startDate`,
      startDate
    ));
  }
  
  if (!(endDate instanceof Date) || isNaN(endDate.getTime())) {
    errors.push(new ValidationError(
      `${fieldName}.endDate 必须是有效的日期`,
      `${fieldName}.endDate`,
      endDate
    ));
  }
  
  if (errors.length === 0 && startDate > endDate) {
    errors.push(new ValidationError(
      `${fieldName}.startDate 不能晚于 ${fieldName}.endDate`,
      fieldName,
      { startDate, endDate }
    ));
  }
  
  if (errors.length === 0) {
    return ok({ startDate, endDate });
  } else {
    return err(errors);
  }
}

/**
 * 验证文件类型
 * @param file 文件对象
 * @param allowedTypes 允许的文件类型
 * @param fieldName 字段名称
 * @returns 验证错误数组
 */
export function validateFileType(
  file: { type?: string; name?: string },
  allowedTypes: string[],
  fieldName: string
): Result<{ type?: string; name?: string }, ValidationError[]> {
  const errors: ValidationError[] = [];
  
  if (!file || !file.type) {
    errors.push(new ValidationError(
      `${fieldName} 必须是有效的文件`,
      fieldName,
      file
    ));
    return err(errors);
  }
  
  if (!allowedTypes.includes(file.type)) {
    const extension = file.name?.split('.').pop() || 'unknown';
    errors.push(new ValidationError(
      `${fieldName} 类型 ${file.type} (${extension}) 不被允许，允许的类型: ${allowedTypes.join(', ')}`,
      fieldName,
      file
    ));
  }
  
  if (errors.length === 0) {
    return ok(file);
  } else {
    return err(errors);
  }
}

/**
 * 验证文件大小
 * @param file 文件对象
 * @param maxSize 最大文件大小（字节）
 * @param fieldName 字段名称
 * @returns 验证错误数组
 */
export function validateFileSize(
  file: { size?: number },
  maxSize: number,
  fieldName: string
): Result<{ size?: number }, ValidationError[]> {
  const errors: ValidationError[] = [];
  
  if (!file || typeof file.size !== 'number') {
    errors.push(new ValidationError(
      `${fieldName} 必须是有效的文件`,
      fieldName,
      file
    ));
    return err(errors);
  }
  
  if (file.size > maxSize) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    const maxSizeInMB = (maxSize / (1024 * 1024)).toFixed(2);
    errors.push(new ValidationError(
      `${fieldName} 大小 ${sizeInMB}MB 超过限制 ${maxSizeInMB}MB`,
      fieldName,
      file
    ));
  }
  
  if (errors.length === 0) {
    return ok(file);
  } else {
    return err(errors);
  }
}