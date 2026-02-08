/**
 * 统一的执行结果类型
 * 所有Core API的执行方法都返回此类型
 */

/**
 * 执行结果 - 成功
 */
export interface ExecutionSuccess<T> {
  success: true;
  data: T;
  executionTime: number;
}

/**
 * 执行结果 - 失败
 */
export interface ExecutionFailure {
  success: false;
  error: ExecutionError;
  executionTime: number;
}

/**
 * 执行错误信息
 */
export interface ExecutionError {
  message: string;
  code?: string;
  details?: Record<string, any>;
  timestamp?: number;
  requestId?: string;
  cause?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * 统一的执行结果类型
 */
export type ExecutionResult<T> = ExecutionSuccess<T> | ExecutionFailure;

/**
 * 创建成功结果
 */
export function success<T>(data: T, executionTime: number): ExecutionResult<T> {
  return {
    success: true,
    data,
    executionTime
  };
}

/**
 * 创建失败结果
 */
export function failure<T>(error: ExecutionError, executionTime: number): ExecutionResult<T> {
  return {
    success: false,
    error,
    executionTime
  };
}

/**
 * 检查结果是否成功
 */
export function isSuccess<T>(result: ExecutionResult<T>): result is ExecutionSuccess<T> {
  return result.success === true;
}

/**
 * 检查结果是否失败
 */
export function isFailure<T>(result: ExecutionResult<T>): result is ExecutionFailure {
  return result.success === false;
}

/**
 * 获取结果数据（如果成功）
 */
export function getData<T>(result: ExecutionResult<T>): T | null {
  return isSuccess(result) ? result.data : null;
}

/**
 * 获取错误信息（如果失败）
 */
export function getError<T>(result: ExecutionResult<T>): ExecutionError | null {
  return isFailure(result) ? result.error : null;
}

/**
 * 获取错误消息（如果失败）
 */
export function getErrorMessage<T>(result: ExecutionResult<T>): string | null {
  if (!isFailure(result)) return null;
  return result.error.message;
}