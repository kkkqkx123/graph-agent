/**
 * 验证结果类型定义
 */

/**
 * 验证问题类型
 * 用于表示验证过程中的错误或警告
 */
export interface ValidationIssue {
  /** 问题码（建议使用 ERROR_ 或 WARNING_ 前缀区分） */
  code: string;
  /** 问题消息 */
  message: string;
  /** 问题路径 */
  path: string;
  /** 问题详情 */
  details?: any;
}

/**
 * 验证结果类型
 */
export interface ValidationResult {
  /** 是否验证通过 */
  valid: boolean;
  /** 错误数组 */
  errors: ValidationIssue[];
  /** 警告数组 */
  warnings: ValidationIssue[];
}

/**
 * 创建验证结果
 */
export function createValidationResult(
  valid: boolean,
  errors: ValidationIssue[] = [],
  warnings: ValidationIssue[] = []
): ValidationResult {
  return {
    valid,
    errors,
    warnings
  };
}

/**
 * 创建验证错误
 */
export function createValidationError(
  code: string,
  message: string,
  path: string,
  details?: any
): ValidationIssue {
  return {
    code,
    message,
    path,
    details
  };
}

/**
 * 创建验证警告
 */
export function createValidationWarning(
  code: string,
  message: string,
  path: string,
  details?: any
): ValidationIssue {
  return {
    code,
    message,
    path,
    details
  };
}

/**
 * 合并验证结果
 */
export function mergeValidationResults(...results: ValidationResult[]): ValidationResult {
  const allErrors: ValidationIssue[] = [];
  const allWarnings: ValidationIssue[] = [];
  let valid = true;

  for (const result of results) {
    if (!result.valid) {
      valid = false;
    }
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  return {
    valid,
    errors: allErrors,
    warnings: allWarnings
  };
}