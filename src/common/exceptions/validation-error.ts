import { BaseError } from './base-error';

/**
 * 验证错误
 * 用于表示数据验证失败的情况
 */
export class ValidationError extends BaseError {
  constructor(
    message: string,
    options?: {
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super('VALIDATION_ERROR', message, options);
  }
}

/**
 * 参数验证错误
 * 用于表示函数参数验证失败
 */
export class ParameterValidationError extends ValidationError {
  constructor(
    parameterName: string,
    message: string,
    options?: {
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(`参数验证失败: ${parameterName} - ${message}`, {
      ...options,
      context: { ...options?.context, parameterName }
    });
  }
}

/**
 * 状态验证错误
 * 用于表示状态验证失败
 */
export class StateValidationError extends ValidationError {
  constructor(
    message: string,
    options?: {
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, options);
  }
}

/**
 * 配置验证错误
 * 用于表示配置验证失败
 */
export class ConfigurationValidationError extends ValidationError {
  constructor(
    message: string,
    options?: {
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, options);
  }
}