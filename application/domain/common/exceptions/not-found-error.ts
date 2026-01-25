import { BaseError } from './base-error';

/**
 * 未找到错误
 * 用于表示请求的资源或实体不存在
 */
export class NotFoundError extends BaseError {
  constructor(
    message: string,
    options?: {
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super('NOT_FOUND', message, options);
  }
}

/**
 * 实体未找到错误
 * 用于表示特定实体不存在
 */
export class EntityNotFoundError extends NotFoundError {
  constructor(
    entityType: string,
    entityId: string,
    options?: {
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(`${entityType} 不存在: ${entityId}`, {
      ...options,
      context: { ...options?.context, entityType, entityId }
    });
  }
}