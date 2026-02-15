/**
 * Result 类型转换工具
 * 提供 Result 和 ExecutionResult 之间的转换功能
 */

import type { Result } from '@modular-agent/types';
import type { ExecutionResult } from '../types/execution-result';
import { success, failure, isSuccess } from '../types/execution-result';
import { ok, err } from '@modular-agent/common-utils';
import { SDKError, ExecutionError as SDKExecutionError, ValidationError } from '@modular-agent/types';

/**
 * 将 Result 转换为 ExecutionResult
 * @param result Result 对象
 * @param startTime 开始时间（用于计算执行时间）
 * @returns 对应的 ExecutionResult
 */
export function resultToExecutionResult<T, E>(
  result: Result<T, E>,
  startTime: number
): ExecutionResult<T> {
  const executionTime = Date.now() - startTime;

  if (result.isOk()) {
    return success(result.unwrap(), executionTime);
  } else {
    const error = result.unwrapOrElse(err => err);
    return failure(
      new SDKExecutionError(
        error instanceof Error ? error.message : String(error),
        undefined,
        undefined,
        { originalError: error }
      ),
      executionTime
    );
  }
}

/**
 * 将 ExecutionResult 转换为 Result
 * @param executionResult ExecutionResult 对象
 * @returns 对应的 Result
 */
export function executionResultToResult<T>(
  executionResult: ExecutionResult<T>
): Result<T, SDKError> {
  if (isSuccess(executionResult)) {
    return ok(executionResult.result.unwrap());
  } else {
    // 使用 match 方法来正确处理类型
    return executionResult.result.match({
      ok: () => {
        // 这个分支永远不会执行，因为前面已经检查了 isSuccess
        throw new Error('Unexpected ok branch in error case');
      },
      err: (error) => err(error)
    });
  }
}

/**
 * 将验证错误数组转换为 ExecutionResult
 * @param errors 验证错误数组
 * @param startTime 开始时间
 * @returns 包含验证错误的 ExecutionResult
 */
export function validationErrorsToExecutionResult<T>(
  errors: any[],
  startTime: number
): ExecutionResult<T> {
  const executionTime = Date.now() - startTime;

  return failure(
    new ValidationError(
      'Validation failed',
      undefined,
      undefined,
      { errors }
    ),
    executionTime
  );
}

/**
 * 将业务逻辑结果转换为 ExecutionResult
 * @param data 成功数据或错误
 * @param startTime 开始时间
 * @returns 对应的 ExecutionResult
 */
export function businessResultToExecutionResult<T>(
  data: T | Error,
  startTime: number
): ExecutionResult<T> {
  const executionTime = Date.now() - startTime;

  if (data instanceof Error) {
    // 如果已经是 SDKError，直接使用
    if (data instanceof SDKError) {
      return failure(data, executionTime);
    }
    // 如果是普通 Error，转换为 SDKExecutionError
    return failure(
      new SDKExecutionError(
        data.message,
        undefined,
        undefined,
        { originalError: data },
        data
      ),
      executionTime
    );
  } else {
    return success(data, executionTime);
  }
}

/**
 * 将命令验证结果转换为 ExecutionResult
 * @param isValid 是否验证通过
 * @param errors 错误信息数组
 * @param startTime 开始时间
 * @returns 对应的 ExecutionResult
 */
export function commandValidationToExecutionResult<T>(
  isValid: boolean,
  errors: string[],
  startTime: number
): ExecutionResult<T> {
  const executionTime = Date.now() - startTime;

  if (isValid) {
    return success(undefined as T, executionTime);
  } else {
    return failure(
      new ValidationError(
        'Command validation failed',
        undefined,
        undefined,
        { errors }
      ),
      executionTime
    );
  }
}