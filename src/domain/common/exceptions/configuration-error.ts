import { BaseError } from './base-error';

/**
 * 配置错误
 * 用于表示配置相关的问题
 */
export class ConfigurationError extends BaseError {
  constructor(
    message: string,
    options?: {
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super('CONFIGURATION_ERROR', message, options);
  }
}

/**
 * 缺少配置错误
 * 用于表示缺少必要的配置项
 */
export class MissingConfigurationError extends ConfigurationError {
  constructor(
    configKey: string,
    options?: {
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(`缺少必要的配置项: ${configKey}`, {
      ...options,
      context: { ...options?.context, configKey }
    });
  }
}

/**
 * 无效配置错误
 * 用于表示配置值无效
 */
export class InvalidConfigurationError extends ConfigurationError {
  constructor(
    configKey: string,
    reason: string,
    options?: {
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(`配置值无效: ${configKey} - ${reason}`, {
      ...options,
      context: { ...options?.context, configKey, reason }
    });
  }
}