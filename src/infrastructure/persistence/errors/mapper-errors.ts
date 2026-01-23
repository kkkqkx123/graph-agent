/**
 * Mapper错误处理机制
 * 提供详细的错误上下文和转换路径追踪
 */

/**
 * Mapper错误代码枚举
 */
export enum MapperErrorCode {
  /** 数据验证错误 */
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  /** 类型转换错误 */
  TYPE_CONVERSION_ERROR = 'TYPE_CONVERSION_ERROR',
  /** 业务规则违反 */
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  /** 引用完整性错误 */
  REFERENCE_INTEGRITY_ERROR = 'REFERENCE_INTEGRITY_ERROR',
  /** 未知映射错误 */
  UNKNOWN_MAPPING_ERROR = 'UNKNOWN_MAPPING_ERROR',
  /** 定义提取错误 */
  DEFINITION_EXTRACTION_ERROR = 'DEFINITION_EXTRACTION_ERROR',
  /** 元数据提取错误 */
  METADATA_EXTRACTION_ERROR = 'METADATA_EXTRACTION_ERROR',
}

/**
 * 领域映射错误类
 */
export class DomainMappingError extends Error {
  public readonly code: MapperErrorCode;
  public readonly context: Record<string, unknown>;
  public readonly path: string[];
  public readonly timestamp: Date;

  constructor(params: {
    code: MapperErrorCode;
    message: string;
    context: Record<string, unknown>;
    path: string[];
    cause?: Error;
  }) {
    super(params.message, { cause: params.cause });
    this.name = 'DomainMappingError';
    this.code = params.code;
    this.context = params.context;
    this.path = params.path;
    this.timestamp = new Date;

    // 保持正确的原型链
    Object.setPrototypeOf(this, DomainMappingError.prototype);
  }

  /**
   * 获取错误路径字符串
   */
  getPathString(): string {
    return this.path.join(' -> ');
  }

  /**
   * 转换为JSON格式（便于日志记录）
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      path: this.path,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

/**
 * 错误构建器（流畅API）
 */
export class MappingErrorBuilder {
  private error: Partial<DomainMappingError> = {};
  private path: string[] = [];

  /**
   * 设置错误代码
   */
  code(code: MapperErrorCode): MappingErrorBuilder {
    this.error.code = code;
    return this;
  }

  /**
   * 设置错误消息
   */
  message(message: string): MappingErrorBuilder {
    this.error.message = message;
    return this;
  }

  /**
   * 设置错误上下文
   */
  context(context: Record<string, unknown>): MappingErrorBuilder {
    this.error.context = context;
    return this;
  }

  /**
   * 添加路径段
   */
  addPath(segment: string): MappingErrorBuilder {
    this.path.push(segment);
    return this;
  }

  /**
   * 设置原始错误
   */
  cause(cause: Error): MappingErrorBuilder {
    this.error.cause = cause;
    return this;
  }

  /**
   * 构建错误对象
   */
  build(): DomainMappingError {
    if (!this.error.code || !this.error.message || !this.error.context) {
      throw new Error('Error code, message, and context are required');
    }

    return new DomainMappingError({
      code: this.error.code,
      message: this.error.message,
      context: this.error.context,
      path: [...this.path],
      cause: this.error.cause,
    });
  }
}

/**
 * 安全字符串化（避免循环引用）
 */
export function safeStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}