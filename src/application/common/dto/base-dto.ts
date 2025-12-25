/**
 * DTO基类
 * 提供通用的DTO验证和转换功能
 */

import { z, ZodSchema, ZodError } from 'zod';

/**
 * DTO基类抽象类
 * 所有DTO都应该继承此类
 */
export abstract class BaseDto<T extends ZodSchema> {
  protected schema: T;
  protected version: string;

  constructor(schema: T, version: string = '1.0.0') {
    this.schema = schema;
    this.version = version;
  }

  /**
   * 验证数据并返回类型安全的对象
   * @param data 待验证的数据
   * @returns 验证后的类型安全对象
   * @throws DtoValidationError 当验证失败时抛出
   */
  validate(data: unknown): z.infer<T> {
    try {
      return this.schema.parse(data);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new DtoValidationError(error.issues, this.version);
      }
      throw error;
    }
  }

  /**
   * 安全验证（不抛出异常）
   * @param data 待验证的数据
   * @returns 验证结果对象
   */
  safeValidate(data: unknown): { success: boolean; data?: z.infer<T>; error?: ZodError } {
    const result = this.schema.safeParse(data);
    return result;
  }

  /**
   * 异步验证（支持异步验证器）
   * @param data 待验证的数据
   * @returns 验证后的类型安全对象
   */
  async validateAsync(data: unknown): Promise<z.infer<T>> {
    try {
      return await this.schema.parseAsync(data);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new DtoValidationError(error.issues, this.version);
      }
      throw error;
    }
  }

  /**
   * 获取Schema
   * @returns Zod Schema对象
   */
  getSchema(): T {
    return this.schema;
  }

  /**
   * 获取版本
   * @returns DTO版本号
   */
  getVersion(): string {
    return this.version;
  }

  /**
   * 检查数据是否符合Schema（不返回验证后的数据）
   * @param data 待检查的数据
   * @returns 是否符合Schema
   */
  isValid(data: unknown): boolean {
    return this.schema.safeParse(data).success;
  }

  /**
   * 获取Schema的TypeScript类型
   * @returns Schema对应的TypeScript类型名称
   */
  getTypeName(): string {
    return this.schema.constructor.name;
  }
}

/**
 * DTO验证错误类
 * 当DTO验证失败时抛出此错误
 */
export class DtoValidationError extends Error {
  constructor(
    public errors: Array<{ path: (string | number | symbol)[]; message: string; code: string }>,
    public version: string
  ) {
    const errorMessages = errors.map(e => `${e.path.map(p => String(p)).join('.')}: ${e.message}`).join(', ');
    super(`DTO验证失败 (版本: ${version}): ${errorMessages}`);
    this.name = 'DtoValidationError';
  }

  /**
   * 获取格式化的错误信息
   * @returns 格式化的错误信息数组
   */
  getFormattedErrors(): Array<{ field: string; message: string; code: string }> {
    return this.errors.map(error => ({
      field: error.path.map(p => String(p)).join('.'),
      message: error.message,
      code: error.code
    }));
  }

  /**
   * 获取第一个错误信息
   * @returns 第一个错误信息
   */
  getFirstError(): { field: string; message: string; code: string } | null {
    if (this.errors.length === 0) return null;
    const error = this.errors[0];
    if (!error) return null;
    return {
      field: error.path.map(p => String(p)).join('.'),
      message: error.message,
      code: error.code
    };
  }

  /**
   * 按字段分组错误信息
   * @returns 按字段分组的错误信息
   */
  getErrorsByField(): Record<string, string[]> {
    const errorsByField: Record<string, string[]> = {};

    this.errors.forEach(error => {
      const field = error.path.map(p => String(p)).join('.');
      if (!errorsByField[field]) {
        errorsByField[field] = [];
      }
      errorsByField[field].push(error.message);
    });

    return errorsByField;
  }
}

/**
 * DTO验证选项
 */
export interface DtoValidationOptions {
  /**
   * 是否严格模式（默认true）
   * 严格模式下，额外的字段会导致验证失败
   */
  strict?: boolean;

  /**
   * 是否跳过未知字段（默认false）
   * 跳过未知字段时，Schema中未定义的字段会被忽略
   */
  stripUnknown?: boolean;

  /**
   * 自定义错误消息
   */
  customErrorMessages?: Record<string, string>;
}

/**
 * 带选项的DTO基类
 */
export abstract class BaseDtoWithOptions<T extends ZodSchema> extends BaseDto<T> {
  protected options: DtoValidationOptions;

  constructor(schema: T, options: DtoValidationOptions = {}, version: string = '1.0.0') {
    super(schema, version);
    this.options = {
      strict: true,
      stripUnknown: false,
      ...options
    };
  }

  /**
   * 使用选项验证数据
   * @param data 待验证的数据
   * @returns 验证后的类型安全对象
   */
  validateWithOptions(data: unknown): z.infer<T> {
    try {
      let processedSchema = this.schema;

      // 应用选项
      if (this.options.strict !== undefined) {
        // For object schemas, we can use strict mode
        if (typeof (processedSchema as any).strict === 'function') {
          processedSchema = (processedSchema as any).strict(this.options.strict);
        }
      }

      if (this.options.stripUnknown) {
        // For object schemas, we can use passthrough to allow unknown fields
        if (typeof (processedSchema as any).passthrough === 'function') {
          processedSchema = (processedSchema as any).passthrough();
        }
      }

      return processedSchema.parse(data);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new DtoValidationError(error.issues, this.version);
      }
      throw error;
    }
  }
}