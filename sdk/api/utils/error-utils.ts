/**
 * 错误转换工具
 * 负责将核心层的错误类型转换为API层的错误类型
 */

import { SDKError, ErrorCode } from '../../types/errors';
import { APIError, APIErrorCode } from '../types/api-error';

/**
 * SDK错误码到API错误码的映射表
 */
const ERROR_CODE_MAP: Record<ErrorCode, APIErrorCode> = {
  [ErrorCode.VALIDATION_ERROR]: APIErrorCode.RESOURCE_VALIDATION_FAILED,
  [ErrorCode.NOT_FOUND_ERROR]: APIErrorCode.RESOURCE_NOT_FOUND,
  [ErrorCode.TIMEOUT_ERROR]: APIErrorCode.TIMEOUT,
  [ErrorCode.CONFIGURATION_ERROR]: APIErrorCode.INVALID_PARAMETER,
  [ErrorCode.EXECUTION_ERROR]: APIErrorCode.OPERATION_FAILED,
  [ErrorCode.NETWORK_ERROR]: APIErrorCode.SERVICE_UNAVAILABLE,
  [ErrorCode.LLM_ERROR]: APIErrorCode.SERVICE_UNAVAILABLE,
  [ErrorCode.TOOL_ERROR]: APIErrorCode.OPERATION_FAILED,
  [ErrorCode.CODE_EXECUTION_ERROR]: APIErrorCode.OPERATION_FAILED,
  [ErrorCode.RATE_LIMIT_ERROR]: APIErrorCode.SERVICE_UNAVAILABLE,
  [ErrorCode.CIRCUIT_BREAKER_OPEN_ERROR]: APIErrorCode.SERVICE_UNAVAILABLE
};

/**
 * 将SDK错误转换为API错误
 * @param error SDK错误对象
 * @returns API错误对象
 */
export function convertSDKErrorToAPIError(error: SDKError): APIError {
  const apiCode = ERROR_CODE_MAP[error.code] || APIErrorCode.INTERNAL_ERROR;
  
  // 合并错误上下文
  const details = {
    ...error.context,
    sdkErrorCode: error.code,
    sdkErrorName: error.name
  };
  
  return new APIError(
    apiCode,
    error.message,
    details,
    error.cause
  );
}

/**
 * 处理任意错误并返回API错误
 * @param error 任意类型的错误
 * @returns API错误对象
 */
export function handleUnknownError(error: unknown): APIError {
  // 如果已经是APIError，直接返回
  if (error instanceof APIError) {
    return error;
  }
  
  // 如果是SDKError，转换为APIError
  if (error instanceof SDKError) {
    return convertSDKErrorToAPIError(error);
  }
  
  // 如果是标准Error对象
  if (error instanceof Error) {
    // 根据错误消息判断错误类型
    const message = error.message.toLowerCase();
    
    if (message.includes('not found')) {
      return new APIError(
        APIErrorCode.RESOURCE_NOT_FOUND,
        error.message,
        undefined,
        error
      );
    }
    
    if (message.includes('already exists')) {
      return new APIError(
        APIErrorCode.RESOURCE_ALREADY_EXISTS,
        error.message,
        undefined,
        error
      );
    }
    
    if (message.includes('validation') || message.includes('invalid')) {
      return new APIError(
        APIErrorCode.RESOURCE_VALIDATION_FAILED,
        error.message,
        undefined,
        error
      );
    }
    
    if (message.includes('unauthorized')) {
      return new APIError(
        APIErrorCode.UNAUTHORIZED,
        error.message,
        undefined,
        error
      );
    }
    
    if (message.includes('forbidden')) {
      return new APIError(
        APIErrorCode.FORBIDDEN,
        error.message,
        undefined,
        error
      );
    }
    
    if (message.includes('timeout')) {
      return new APIError(
        APIErrorCode.TIMEOUT,
        error.message,
        undefined,
        error
      );
    }
    
    // 默认返回内部错误
    return new APIError(
      APIErrorCode.INTERNAL_ERROR,
      error.message,
      undefined,
      error
    );
  }
  
  // 其他类型的错误
  return new APIError(
    APIErrorCode.INTERNAL_ERROR,
    String(error)
  );
}

/**
 * 判断错误是否为可重试的错误
 * @param error API错误对象
 * @returns 是否可重试
 */
export function isRetryableError(error: APIError): boolean {
  const retryableCodes = [
    APIErrorCode.SERVICE_UNAVAILABLE,
    APIErrorCode.TIMEOUT,
    APIErrorCode.CONFLICT
  ];
  
  return retryableCodes.includes(error.code);
}

/**
 * 判断错误是否为客户端错误（4xx）
 * @param error API错误对象
 * @returns 是否为客户端错误
 */
export function isClientError(error: APIError): boolean {
  const clientErrorCodes = [
    APIErrorCode.INVALID_PARAMETER,
    APIErrorCode.MISSING_PARAMETER,
    APIErrorCode.INVALID_TYPE,
    APIErrorCode.RESOURCE_VALIDATION_FAILED,
    APIErrorCode.UNAUTHORIZED,
    APIErrorCode.FORBIDDEN,
    APIErrorCode.RESOURCE_NOT_FOUND,
    APIErrorCode.RESOURCE_ALREADY_EXISTS
  ];
  
  return clientErrorCodes.includes(error.code);
}

/**
 * 判断错误是否为服务器错误（5xx）
 * @param error API错误对象
 * @returns 是否为服务器错误
 */
export function isServerError(error: APIError): boolean {
  const serverErrorCodes = [
    APIErrorCode.INTERNAL_ERROR,
    APIErrorCode.SERVICE_UNAVAILABLE,
    APIErrorCode.OPERATION_FAILED
  ];
  
  return serverErrorCodes.includes(error.code);
}