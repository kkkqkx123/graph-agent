/**
 * 全局异常体系
 * 统一的异常定义和导出
 */

// 基础异常类
export { BaseError } from './base-error';

// 验证错误
export {
  ValidationError,
  ParameterValidationError,
  StateValidationError,
  ConfigurationValidationError
} from './validation-error';

// 未找到错误
export {
  NotFoundError,
  EntityNotFoundError
} from './not-found-error';

// 状态转换错误
export {
  StateTransitionError,
  InvalidStateTransitionError,
  InvalidStatusError
} from './state-transition-error';

// 配置错误
export {
  ConfigurationError,
  MissingConfigurationError,
  InvalidConfigurationError
} from './configuration-error';

// 执行错误
export {
  ExecutionError,
  ExecutionTimeoutError,
  ExecutionCancelledError,
  ExecutionFailedError
} from './execution-error';

// 权限错误
export {
  PermissionError,
  AccessDeniedError,
  AuthenticationError
} from './permission-error';