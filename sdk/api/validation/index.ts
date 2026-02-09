/**
 * 验证模块统一导出
 * 提供简化验证工具的统一访问入口
 */

// 验证错误代码
export {
  ValidationErrorCode,
  ValidationErrorDetail,
  createValidationSuccess,
  createValidationFailure,
  createValidationError,
  isValidationErrorCode,
  getBaseErrorCode,
  toValidationError,
  toValidationErrors
} from './validation-error-codes';

// 函数式验证器
export {
  validateRequiredFields,
  validateStringLength,
  validateNumberRange,
  validatePositiveNumber,
  validateObject,
  validateArray,
  validateBoolean,
  validatePattern,
  validateEnum,
  mergeValidationErrors,
  isValid
} from './validation-strategy';

// 高级验证工具
export {
  validateObjectStructure,
  validateNestedObject,
  validateArrayElements,
  validateCondition,
  validateExclusiveFields,
  validateDependentField,
  validateDateRange,
  validateFileType,
  validateFileSize
} from './common-validators';