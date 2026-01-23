/**
 * Mapper错误处理机制
 * 提供简化的错误类型和上下文信息
 */

/**
 * Mapper错误代码枚举
 */
export enum MapperErrorCode {
  /** 数据验证错误 */
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  /** 类型转换错误 */
  TYPE_CONVERSION_ERROR = 'TYPE_CONVERSION_ERROR',
  /** 未知映射错误 */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * 领域映射错误类
 */
export class DomainMappingError extends Error {
  constructor(
    public readonly code: MapperErrorCode,
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DomainMappingError';
  }
}