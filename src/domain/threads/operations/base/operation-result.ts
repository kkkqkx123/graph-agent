import { ID } from '../../../common/value-objects/id';
import { Timestamp } from '../../../common/value-objects/timestamp';

/**
 * 操作错误接口
 */
export interface OperationError {
  readonly code: string;
  readonly message: string;
  readonly details?: unknown;
  readonly timestamp: Timestamp;
}

/**
 * 操作元数据接口
 */
export interface OperationMetadata {
  readonly operationId: ID;
  readonly operationType: string;
  readonly timestamp: Timestamp;
  readonly duration?: number;
  readonly operatorId?: ID;
  readonly additionalInfo?: Record<string, unknown>;
}

/**
 * 操作结果接口
 */
export interface OperationResult<T> {
  readonly success: boolean;
  readonly result?: T;
  readonly error?: OperationError;
  readonly metadata: OperationMetadata;
}

/**
 * 创建成功的操作结果
 * @param result 操作结果
 * @param metadata 操作元数据
 * @returns 操作结果
 */
export function createSuccessResult<T>(
  result: T,
  metadata: OperationMetadata
): OperationResult<T> {
  return {
    success: true,
    result,
    metadata
  };
}

/**
 * 创建失败的操作结果
 * @param error 操作错误
 * @param metadata 操作元数据
 * @returns 操作结果
 */
export function createFailureResult<T>(
  error: OperationError,
  metadata: OperationMetadata
): OperationResult<T> {
  return {
    success: false,
    error,
    metadata
  };
}

/**
 * 创建操作错误
 * @param code 错误代码
 * @param message 错误消息
 * @param details 错误详情
 * @returns 操作错误
 */
export function createOperationError(
  code: string,
  message: string,
  details?: unknown
): OperationError {
  return {
    code,
    message,
    details,
    timestamp: Timestamp.now()
  };
}

/**
 * 创建操作元数据
 * @param operationType 操作类型
 * @param operatorId 操作者ID
 * @param additionalInfo 附加信息
 * @returns 操作元数据
 */
export function createOperationMetadata(
  operationType: string,
  operatorId?: ID,
  additionalInfo?: Record<string, unknown>
): OperationMetadata {
  return {
    operationId: ID.generate(),
    operationType,
    timestamp: Timestamp.now(),
    operatorId,
    additionalInfo
  };
}