import { BaseError } from './base-error';

/**
 * 权限错误
 * 用于表示权限相关的问题
 */
export class PermissionError extends BaseError {
  constructor(
    message: string,
    options?: {
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super('PERMISSION_ERROR', message, options);
  }
}

/**
 * 访问拒绝错误
 * 用于表示访问被拒绝
 */
export class AccessDeniedError extends PermissionError {
  constructor(
    resource: string,
    action: string,
    options?: {
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(`访问被拒绝: ${action} ${resource}`, {
      ...options,
      context: { ...options?.context, resource, action }
    });
  }
}

/**
 * 认证错误
 * 用于表示认证失败
 */
export class AuthenticationError extends PermissionError {
  constructor(
    message: string = '认证失败',
    options?: {
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, options);
  }
}