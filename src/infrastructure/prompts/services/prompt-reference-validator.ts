/**
 * 提示词引用验证器
 *
 * 负责验证提示词引用格式的有效性，并提供详细的验证结果和错误信息
 */

import { ILogger } from '../../../domain/common/types/logger-types';

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误信息（如果无效） */
  error?: string;
  /** 错误代码（如果无效） */
  errorCode?: string;
}

/**
 * 错误代码枚举
 */
export enum ReferenceErrorCode {
  INVALID_FORMAT = 'INVALID_FORMAT',
  INVALID_CATEGORY = 'INVALID_CATEGORY',
  INVALID_NAME = 'INVALID_NAME',
  EMPTY_REFERENCE = 'EMPTY_REFERENCE',
}

/**
 * 提示词引用验证器
 */
export class PromptReferenceValidator {
  private readonly validCategories = [
    'system',
    'rules',
    'user_commands',
    'templates',
    'context',
    'examples',
  ];

  constructor(private readonly logger: ILogger) {}

  /**
   * 验证引用格式
   * @param reference 引用字符串
   * @returns 验证结果
   */
  validate(reference: string): ValidationResult {
    this.logger.debug('验证提示词引用', { reference });

    // 检查空引用
    if (!reference || reference.trim().length === 0) {
      return {
        valid: false,
        error: '引用不能为空',
        errorCode: ReferenceErrorCode.EMPTY_REFERENCE,
      };
    }

    const trimmedReference = reference.trim();
    const parts = trimmedReference.split('.');

    // 基本格式验证
    if (parts.length < 2) {
      return {
        valid: false,
        error: `引用格式必须包含类别和名称，格式应为 "category.name" 或 "category.composite.part"`,
        errorCode: ReferenceErrorCode.INVALID_FORMAT,
      };
    }

    const category = parts[0]!;

    // 类别验证
    if (!this.validCategories.includes(category)) {
      return {
        valid: false,
        error: `无效的类别: ${category}，有效类别: ${this.validCategories.join(', ')}`,
        errorCode: ReferenceErrorCode.INVALID_CATEGORY,
      };
    }

    // 名称验证（不能包含特殊字符）
    const nameParts = parts.slice(1);
    for (const part of nameParts) {
      if (!part || part.trim().length === 0) {
        return {
          valid: false,
          error: '名称部分不能为空',
          errorCode: ReferenceErrorCode.INVALID_NAME,
        };
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(part)) {
        return {
          valid: false,
          error: `名称包含无效字符: ${part}，只允许字母、数字、下划线和连字符`,
          errorCode: ReferenceErrorCode.INVALID_NAME,
        };
      }
    }

    this.logger.debug('提示词引用验证通过', { reference });

    return { valid: true };
  }

  /**
   * 批量验证引用
   * @param references 引用字符串数组
   * @returns 验证结果映射
   */
  validateBatch(references: string[]): Map<string, ValidationResult> {
    const results = new Map<string, ValidationResult>();

    for (const reference of references) {
      results.set(reference, this.validate(reference));
    }

    return results;
  }

  /**
   * 检查引用是否有效（简化版本）
   * @param reference 引用字符串
   * @returns 是否有效
   */
  isValid(reference: string): boolean {
    return this.validate(reference).valid;
  }

  /**
   * 获取有效的类别列表
   * @returns 有效类别列表
   */
  getValidCategories(): string[] {
    return [...this.validCategories];
  }

  /**
   * 检查类别是否有效
   * @param category 类别
   * @returns 是否有效
   */
  isValidCategory(category: string): boolean {
    return this.validCategories.includes(category);
  }
}
