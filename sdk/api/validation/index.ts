/**
 * 验证模块统一导出
 * 提供简化验证工具的统一访问入口
 */

// 简化验证工具
export {
  validateRequiredFields,
  validateStringLength,
  validatePositiveNumber,
  validateNumberRange,
  validateObject,
  validateArray,
  validateBoolean,
  validatePattern,
  validateEnum
} from './common-validators';