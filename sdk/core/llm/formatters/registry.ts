/**
 * Formatter 注册表
 *
 * 管理所有格式转换器的注册和获取
 * 使用注册表模式，便于扩展新的提供商
 */

import { BaseFormatter } from './base.js';
import { OpenAIChatFormatter } from './openai-chat.js';
import { OpenAIResponseFormatter } from './openai-response.js';
import { AnthropicFormatter } from './anthropic.js';
import { GeminiNativeFormatter } from './gemini-native.js';
import { GeminiOpenAIFormatter } from './gemini-openai.js';
import type { LLMProvider } from '@modular-agent/types';

/**
 * Formatter 注册表
 */
export class FormatterRegistry {
  private formatters: Map<string, BaseFormatter> = new Map();
  private static instance: FormatterRegistry | null = null;

  private constructor() {
    // 注册默认的格式转换器
    this.registerDefaults();
  }

  /**
   * 获取注册表单例
   */
  static getInstance(): FormatterRegistry {
    if (!FormatterRegistry.instance) {
      FormatterRegistry.instance = new FormatterRegistry();
    }
    return FormatterRegistry.instance;
  }

  /**
   * 注册默认的格式转换器
   */
  private registerDefaults(): void {
    this.register(new OpenAIChatFormatter());
    this.register(new OpenAIResponseFormatter());
    this.register(new AnthropicFormatter());
    this.register(new GeminiNativeFormatter());
    this.register(new GeminiOpenAIFormatter());
  }

  /**
   * 注册格式转换器
   *
   * @param formatter 格式转换器实例
   */
  register(formatter: BaseFormatter): void {
    const provider = formatter.getSupportedProvider();
    if (this.formatters.has(provider)) {
      console.warn(`Formatter for provider "${provider}" already registered, will be overwritten`);
    }
    this.formatters.set(provider, formatter);
  }

  /**
   * 获取格式转换器
   *
   * @param provider 提供商类型
   * @returns 格式转换器实例，如果不存在则返回 undefined
   */
  get(provider: LLMProvider | string): BaseFormatter | undefined {
    return this.formatters.get(provider);
  }

  /**
   * 检查是否已注册
   *
   * @param provider 提供商类型
   * @returns 是否已注册
   */
  has(provider: LLMProvider | string): boolean {
    return this.formatters.has(provider);
  }

  /**
   * 获取所有已注册的提供商
   *
   * @returns 提供商列表
   */
  getRegisteredProviders(): string[] {
    return Array.from(this.formatters.keys());
  }

  /**
   * 注销格式转换器
   *
   * @param provider 提供商类型
   * @returns 是否成功注销
   */
  unregister(provider: LLMProvider | string): boolean {
    return this.formatters.delete(provider);
  }

  /**
   * 清空所有注册
   */
  clear(): void {
    this.formatters.clear();
  }

  /**
   * 重置为默认注册
   */
  reset(): void {
    this.clear();
    this.registerDefaults();
  }
}

/**
 * 导出默认注册表实例
 */
export const formatterRegistry = FormatterRegistry.getInstance();

/**
 * 便捷函数：获取格式转换器
 *
 * @param provider 提供商类型
 * @returns 格式转换器实例
 */
export function getFormatter(provider: LLMProvider | string): BaseFormatter {
  const formatter = formatterRegistry.get(provider);
  if (!formatter) {
    throw new Error(`No formatter registered for provider: ${provider}`);
  }
  return formatter;
}

/**
 * 便捷函数：注册格式转换器
 *
 * @param formatter 格式转换器实例
 */
export function registerFormatter(formatter: BaseFormatter): void {
  formatterRegistry.register(formatter);
}
