/**
 * 共享基础设施索引
 */
// 工具集
export {
  ValidationUtils,
  ValidationResult as CommonValidationResult,
  ValidationRule as CommonValidationRule,
} from './utils/validation-utils';

export {
  SerializationUtils,
  SerializationConfig,
  SerializationResult,
} from './utils/serialization-utils';

// Immer 适配器
export {
  ImmerAdapter,
  IImmerAdapter,
  createImmerAdapter,
} from './immer/immer-adapter';

export type {
  Draft,
  Patch,
  PatchListener,
} from './immer/immer-adapter';
