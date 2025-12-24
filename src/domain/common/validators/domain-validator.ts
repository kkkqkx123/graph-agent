import { DomainError } from '../errors/domain-error';

/**
 * 验证结果接口
 */
export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
}

/**
 * 验证结果构建器
 */
export class ValidationResultBuilder {
  private isValid = true;
  private errors: string[] = [];
  private warnings: string[] = [];

  /**
   * 添加错误
   */
  addError(message: string): ValidationResultBuilder {
    this.isValid = false;
    this.errors.push(message);
    return this;
  }

  /**
   * 添加警告
   */
  addWarning(message: string): ValidationResultBuilder {
    this.warnings.push(message);
    return this;
  }

  /**
   * 合并其他验证结果
   */
  merge(other: ValidationResult): ValidationResultBuilder {
    if (!other.isValid) {
      this.isValid = false;
    }
    this.errors.push(...other.errors);
    this.warnings.push(...other.warnings);
    return this;
  }

  /**
   * 构建验证结果
   */
  build(): ValidationResult {
    return {
      isValid: this.isValid,
      errors: [...this.errors],
      warnings: [...this.warnings]
    };
  }
}

/**
 * 领域验证器抽象基类
 * 
 * 提供通用的验证框架，所有具体验证器都应该继承此类
 */
export abstract class DomainValidator<T> {
  /**
   * 验证实体
   * @param entity 要验证的实体
   * @returns 验证结果
   */
  abstract validate(entity: T): ValidationResult;

  /**
   * 验证并抛出异常（如果验证失败）
   * @param entity 要验证的实体
   * @param errorMessage 自定义错误消息
   */
  validateAndThrow(entity: T, errorMessage?: string): void {
    const result = this.validate(entity);
    if (!result.isValid) {
      const message = errorMessage || `验证失败: ${result.errors.join(', ')}`;
      throw new DomainError(message);
    }
  }

  /**
   * 批量验证
   * @param entities 要验证的实体列表
   * @returns 验证结果列表
   */
  validateBatch(entities: T[]): ValidationResult[] {
    return entities.map(entity => this.validate(entity));
  }

  /**
   * 验证必填字段
   * @param value 字段值
   * @param fieldName 字段名称
   * @param builder 验证结果构建器
   */
  protected validateRequired(value: any, fieldName: string, builder: ValidationResultBuilder): void {
    if (value === null || value === undefined || value === '') {
      builder.addError(`${fieldName} 是必填字段`);
    }
  }

  /**
   * 验证字符串长度
   * @param value 字符串值
   * @param fieldName 字段名称
   * @param minLength 最小长度
   * @param maxLength 最大长度
   * @param builder 验证结果构建器
   */
  protected validateStringLength(
    value: string,
    fieldName: string,
    minLength: number,
    maxLength: number,
    builder: ValidationResultBuilder
  ): void {
    if (value.length < minLength) {
      builder.addError(`${fieldName} 长度不能少于 ${minLength} 个字符`);
    }
    if (value.length > maxLength) {
      builder.addError(`${fieldName} 长度不能超过 ${maxLength} 个字符`);
    }
  }

  /**
   * 验证数值范围
   * @param value 数值
   * @param fieldName 字段名称
   * @param min 最小值
   * @param max 最大值
   * @param builder 验证结果构建器
   */
  protected validateNumberRange(
    value: number,
    fieldName: string,
    min: number,
    max: number,
    builder: ValidationResultBuilder
  ): void {
    if (value < min) {
      builder.addError(`${fieldName} 不能小于 ${min}`);
    }
    if (value > max) {
      builder.addError(`${fieldName} 不能大于 ${max}`);
    }
  }

  /**
   * 验证邮箱格式
   * @param email 邮箱地址
   * @param fieldName 字段名称
   * @param builder 验证结果构建器
   */
  protected validateEmail(email: string, fieldName: string, builder: ValidationResultBuilder): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      builder.addError(`${fieldName} 格式不正确`);
    }
  }

  /**
   * 验证正则表达式
   * @param value 字符串值
   * @param fieldName 字段名称
   * @param regex 正则表达式
   * @param errorMessage 错误消息
   * @param builder 验证结果构建器
   */
  protected validateRegex(
    value: string,
    fieldName: string,
    regex: RegExp,
    errorMessage: string,
    builder: ValidationResultBuilder
  ): void {
    if (!regex.test(value)) {
      builder.addError(errorMessage || `${fieldName} 格式不正确`);
    }
  }
}

/**
 * 组合验证器
 * 
 * 可以组合多个验证器进行复合验证
 */
export class CompositeValidator<T> extends DomainValidator<T> {
  constructor(private readonly validators: DomainValidator<T>[]) {
    super();
  }

  validate(entity: T): ValidationResult {
    const builder = new ValidationResultBuilder();
    
    for (const validator of this.validators) {
      const result = validator.validate(entity);
      builder.merge(result);
    }

    return builder.build();
  }
}

/**
 * 条件验证器
 * 
 * 根据条件决定是否执行验证
 */
export class ConditionalValidator<T> extends DomainValidator<T> {
  constructor(
    private readonly condition: (entity: T) => boolean,
    private readonly validator: DomainValidator<T>
  ) {
    super();
  }

  validate(entity: T): ValidationResult {
    if (this.condition(entity)) {
      return this.validator.validate(entity);
    }
    
    return new ValidationResultBuilder().build();
  }
}