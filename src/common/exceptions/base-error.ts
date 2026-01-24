/**
 * 基础异常类
 * 所有自定义异常的基类，提供统一的错误信息结构
 */
export abstract class BaseError extends Error {
  /**
   * 错误代码，用于错误分类和识别
   */
  public readonly code: string;

  /**
   * 错误上下文信息，包含额外的调试信息
   */
  public readonly context?: Record<string, unknown>;

  /**
   * 原始错误，用于错误链追踪
   */
  public override readonly cause?: Error;

  constructor(
    code: string,
    message: string,
    options?: {
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = options?.context;
    this.cause = options?.cause;

    // 保持正确的原型链
    Object.setPrototypeOf(this, new.target.prototype);

    // 捕获堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * 转换为字符串格式
   */
  override toString(): string {
    const contextStr = this.context ? ` | Context: ${JSON.stringify(this.context)}` : '';
    const causeStr = this.cause ? ` | Caused by: ${this.cause.message}` : '';
    return `[${this.code}] ${this.message}${contextStr}${causeStr}`;
  }
}