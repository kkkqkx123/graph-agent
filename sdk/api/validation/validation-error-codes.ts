/**
 * 验证错误代码枚举
 * 定义标准化的验证错误代码，用于统一错误处理
 * 复用现有的错误类型体系
 */

import { ErrorCode, ValidationError } from '../../types/errors';
import type { Result } from '../../types/result';
import { ok, err } from '../../utils/result-utils';

/**
 * 验证错误代码
 * 复用现有的ErrorCode枚举，提供更细粒度的验证错误分类
 */
export enum ValidationErrorCode {
  /** 必需字段为空 */
  REQUIRED_FIELD_EMPTY = 'VALIDATION_ERROR:REQUIRED_FIELD_EMPTY',
  
  /** 字段格式不正确 */
  INVALID_FORMAT = 'VALIDATION_ERROR:INVALID_FORMAT',
  
  /** 字段长度不符合要求 */
  INVALID_LENGTH = 'VALIDATION_ERROR:INVALID_LENGTH',
  
  /** 数值超出范围 */
  OUT_OF_RANGE = 'VALIDATION_ERROR:OUT_OF_RANGE',
  
  /** 数值为负数 */
  NEGATIVE_NUMBER = 'VALIDATION_ERROR:NEGATIVE_NUMBER',
  
  /** 类型不匹配 */
  TYPE_MISMATCH = 'VALIDATION_ERROR:TYPE_MISMATCH',
  
  /** 枚举值无效 */
  INVALID_ENUM_VALUE = 'VALIDATION_ERROR:INVALID_ENUM_VALUE',
  
  /** 正则表达式不匹配 */
  PATTERN_MISMATCH = 'VALIDATION_ERROR:PATTERN_MISMATCH',
  
  /** 业务规则冲突 */
  BUSINESS_RULE_VIOLATION = 'VALIDATION_ERROR:BUSINESS_RULE_VIOLATION',
  
  /** 参数冲突 */
  PARAMETER_CONFLICT = 'VALIDATION_ERROR:PARAMETER_CONFLICT'
}

/**
 * 检查是否为验证错误代码
 */
export function isValidationErrorCode(code: string): boolean {
  return code.startsWith('VALIDATION_ERROR:');
}

/**
 * 从验证错误代码提取基础错误代码
 */
export function getBaseErrorCode(validationCode: ValidationErrorCode): ErrorCode {
  return ErrorCode.VALIDATION_ERROR;
}

/**
 * 验证错误详情接口
 */
export interface ValidationErrorDetail {
  /** 错误代码 */
  code: ValidationErrorCode;
  /** 字段路径 */
  fieldPath: string;
  /** 错误消息 */
  message: string;
  /** 实际值 */
  actualValue?: any;
  /** 期望值或约束条件 */
  expectedValue?: any;
}

/**
 * 创建验证错误详情
 */
export function createValidationError(
  code: ValidationErrorCode,
  fieldPath: string,
  message: string,
  actualValue?: any,
  expectedValue?: any
): ValidationErrorDetail {
  return {
    code,
    fieldPath,
    message,
    actualValue,
    expectedValue
  };
}

/**
 * 将验证错误详情转换为ValidationError
 */
export function toValidationError(detail: ValidationErrorDetail): ValidationError {
  const context = {
    fieldPath: detail.fieldPath,
    actualValue: detail.actualValue,
    expectedValue: detail.expectedValue,
    validationCode: detail.code
  };
  
  return new ValidationError(detail.message, detail.fieldPath, detail.actualValue, context);
}

/**
 * 将验证结果转换为ValidationError数组
 */
export function toValidationErrors(result: Result<boolean, ValidationErrorDetail[]>): ValidationError[] {
  if (result.isOk()) {
    return [];
  } else {
    const errors = result.unwrapOrElse(err => err);
    return errors.map((error: ValidationErrorDetail) => toValidationError(error));
  }
}

/**
 * 创建验证成功结果
 */
export function createValidationSuccess(): Result<boolean, ValidationErrorDetail[]> {
  return ok(true);
}

/**
 * 创建验证失败结果
 */
export function createValidationFailure(errors: ValidationErrorDetail[]): Result<boolean, ValidationErrorDetail[]> {
  return err(errors);
}