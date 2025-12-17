/**
 * 提示词类型注册表接口
 */

import { PromptType } from '../value-objects/prompt-type';

export interface IPromptTypeRegistry {
  /**
   * 注册提示词类型
   */
  register(type: PromptType, config?: PromptTypeConfig): void;

  /**
   * 获取提示词类型配置
   */
  get(type: PromptType): PromptTypeConfig | undefined;

  /**
   * 获取所有已注册的类型
   */
  getAll(): PromptType[];

  /**
   * 检查类型是否已注册
   */
  has(type: PromptType): boolean;

  /**
   * 根据类别推断类型
   */
  inferTypeFromCategory(category: string): PromptType;
}

/**
 * 提示词类型配置
 */
export interface PromptTypeConfig {
  injectionOrder: number;
  defaultContent?: string;
  validationRules?: Record<string, unknown>;
  supportedFormats?: string[];
}