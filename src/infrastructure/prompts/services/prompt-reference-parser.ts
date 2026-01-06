/**
 * 提示词引用解析器
 *
 * 职责：只负责引用格式的解析和验证
 * - 解析引用字符串（如 "system.coder" 或 "system.coder.code_style"）
 * - 验证引用格式的有效性
 * - 返回结构化的引用信息
 *
 * 注意：不负责文件路径构建和文件系统查找，这些由 PromptLoader 处理
 */

import { ILogger } from '../../../domain/common/types/logger-types';

/**
 * 提示词引用
 */
export interface PromptReference {
  /** 类别 */
  category: string;
  /** 名称（可能包含复合名称，如 "coder.code_style"） */
  name: string;
}

/**
 * 提示词引用解析器
 */
export class PromptReferenceParser {
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
   * 解析提示词引用
   * @param reference 引用字符串，格式："category.name" 或 "category.composite.part"
   * @returns 解析结果
   * @throws Error 如果引用格式无效
   */
  parse(reference: string): PromptReference {
    this.logger.debug('解析提示词引用', { reference });

    const parts = reference.split('.');

    if (parts.length < 2) {
      throw new Error(
        `无效的提示词引用格式: ${reference}，格式应为 "category.name" 或 "category.composite.part"`
      );
    }

    const category = parts[0]!;
    const name = parts.slice(1).join('.');

    // 验证类别
    if (!this.validCategories.includes(category)) {
      throw new Error(`无效的类别: ${category}，有效类别: ${this.validCategories.join(', ')}`);
    }

    // 验证名称格式
    const nameParts = parts.slice(1);
    for (const part of nameParts) {
      if (!part || !/^[a-zA-Z0-9_-]+$/.test(part)) {
        throw new Error(`名称包含无效字符: ${part}，只允许字母、数字、下划线和连字符`);
      }
    }

    this.logger.debug('提示词引用解析成功', { reference, category, name });

    return {
      category,
      name,
    };
  }

  /**
   * 检查引用格式是否有效
   * @param reference 引用字符串
   * @returns 是否有效
   */
  isValid(reference: string): boolean {
    try {
      this.parse(reference);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取有效的类别列表
   * @returns 有效类别列表
   */
  getValidCategories(): string[] {
    return [...this.validCategories];
  }
}
