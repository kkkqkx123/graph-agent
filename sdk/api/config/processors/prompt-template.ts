/**
 * PromptTemplate配置处理函数
 * 提供PromptTemplate配置的验证、转换和导出功能
 * 所有函数都是无状态的纯函数
 */

import type { ParsedConfig } from '../types.js';
import { ConfigType, ConfigFormat } from '../types.js';
import type { Result } from '@modular-agent/types';
import { ValidationError } from '@modular-agent/types';
import { validatePromptTemplateConfig } from '../validators/prompt-template-validator.js';
import { ok } from '@modular-agent/common-utils';
import type { PromptTemplate } from '@modular-agent/prompt-templates';
import { loadPromptTemplateConfig, mergePromptTemplateConfig } from '../prompt-template-loader.js';

/**
 * 验证PromptTemplate配置
 * @param config 解析后的配置对象
 * @returns 验证结果
 */
export function validatePromptTemplate(config: ParsedConfig<'prompt_template'>): Result<ParsedConfig<'prompt_template'>, ValidationError[]> {
  const result = validatePromptTemplateConfig(config.config);

  // 使用 andThen 进行类型转换
  return result.andThen(() => ok(config)) as Result<ParsedConfig<'prompt_template'>, ValidationError[]>;
}

/**
 * 转换PromptTemplate配置
 * 将应用层配置与默认模板合并
 * @param config 解析后的配置对象
 * @param defaultTemplate 默认模板（来自 @modular-agent/prompt-templates）
 * @returns 合并后的PromptTemplate
 */
export function transformPromptTemplate(
  config: ParsedConfig<'prompt_template'>,
  defaultTemplate: PromptTemplate
): PromptTemplate {
  return mergePromptTemplateConfig(defaultTemplate, config.config);
}

/**
 * 加载并转换PromptTemplate配置
 * 便捷方法，一次性完成加载、验证和转换
 * @param content 配置文件内容
 * @param format 配置格式
 * @param defaultTemplate 默认模板
 * @returns 合并后的PromptTemplate
 */
export function loadAndTransformPromptTemplate(
  content: string,
  format: ConfigFormat,
  defaultTemplate: PromptTemplate
): PromptTemplate {
  // 加载配置
  const appConfig = loadPromptTemplateConfig(content, format);

  // 验证配置
  const validationResult = validatePromptTemplateConfig(appConfig);
  if (validationResult.isErr()) {
    const errorMessages = validationResult.error.map(err => err.message).join('\n');
    throw new Error(`提示词模板配置验证失败:\n${errorMessages}`);
  }

  // 合并配置
  return mergePromptTemplateConfig(defaultTemplate, appConfig);
}