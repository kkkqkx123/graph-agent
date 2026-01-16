/**
 * 共享基础设施索引
 */
// 工具集
export {
  ValidationUtils,
  ValidationResult as CommonValidationResult,
  ValidationRule as CommonValidationRule,
} from './utils/validation-utils';

// 不可变状态更新工具
export {
  updateState,
  updateNestedState,
  updateArray,
  createImmutableState,
} from './utils/immutable-state';
