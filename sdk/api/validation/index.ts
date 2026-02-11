/**
 * 验证模块统一导出
 * 提供简化验证工具的统一访问入口
 */

// 函数式验证器
export {
  validateRequiredFields,
  validateStringLength,
  validatePositiveNumber,
  validateObject,
  validateArray,
  validateBoolean,
  validatePattern,
  validateEnum
} from './validation-strategy';