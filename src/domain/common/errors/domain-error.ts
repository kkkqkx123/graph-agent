/**
 * 领域错误基类
 * 
 * 领域错误表示业务规则违反或领域逻辑错误
 */
export class DomainError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown> | undefined;

  /**
   * 构造函数
   * @param message 错误消息
   * @param code 错误代码
   * @param details 错误详情
   */
  constructor(message: string, code: string = 'DOMAIN_ERROR', details?: Record<string, unknown>) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.details = details;

    // 确保错误堆栈正确
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DomainError);
    }
  }

  /**
   * 创建业务规则违反错误
   * @param message 错误消息
   * @param details 错误详情
   * @returns 业务规则违反错误
   */
  public static businessRuleViolation(message: string, details?: Record<string, unknown>): DomainError {
    return new DomainError(message, 'BUSINESS_RULE_VIOLATION', details);
  }

  /**
   * 创建不变性违反错误
   * @param message 错误消息
   * @param details 错误详情
   * @returns 不变性违反错误
   */
  public static invariantViolation(message: string, details?: Record<string, unknown>): DomainError {
    return new DomainError(message, 'INVARIANT_VIOLATION', details);
  }

  /**
   * 创建验证错误
   * @param message 错误消息
   * @param details 错误详情
   * @returns 验证错误
   */
  public static validation(message: string, details?: Record<string, unknown>): DomainError {
    return new DomainError(message, 'VALIDATION_ERROR', details);
  }

  /**
   * 创建状态错误
   * @param message 错误消息
   * @param details 错误详情
   * @returns 状态错误
   */
  public static stateError(message: string, details?: Record<string, unknown>): DomainError {
    return new DomainError(message, 'STATE_ERROR', details);
  }

  /**
   * 创建权限错误
   * @param message 错误消息
   * @param details 错误详情
   * @returns 权限错误
   */
  public static permissionDenied(message: string, details?: Record<string, unknown>): DomainError {
    return new DomainError(message, 'PERMISSION_DENIED', details);
  }

  /**
   * 创建资源未找到错误
   * @param message 错误消息
   * @param details 错误详情
   * @returns 资源未找到错误
   */
  public static notFound(message: string, details?: Record<string, unknown>): DomainError {
    return new DomainError(message, 'NOT_FOUND', details);
  }

  /**
   * 创建冲突错误
   * @param message 错误消息
   * @param details 错误详情
   * @returns 冲突错误
   */
  public static conflict(message: string, details?: Record<string, unknown>): DomainError {
    return new DomainError(message, 'CONFLICT', details);
  }

  /**
   * 序列化错误
   * @returns 序列化后的错误对象
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      stack: this.stack
    };
  }

  /**
   * 获取错误的字符串表示
   * @returns 字符串表示
   */
  public override toString(): string {
    let result = `${this.name}: ${this.message} (Code: ${this.code})`;
    if (this.details) {
      result += ` Details: ${JSON.stringify(this.details)}`;
    }
    return result;
  }
}