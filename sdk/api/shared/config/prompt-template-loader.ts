/**
 * PromptTemplateLoader - 提示词模板配置加载器
 * 负责加载和合并提示词模板配置
 *
 * 功能：
 * - 支持 TOML 和 JSON 格式的配置文件解析
 * - 实现配置合并逻辑，优先使用应用层配置
 * - 回退到默认模板（来自 @modular-agent/prompt-templates）
 *
 * 设计原则：
 * - 不涉及文件I/O操作，只处理配置内容
 * - 配置合并遵循"应用层覆盖默认模板"的原则
 * - 保持不可变性，不修改原始模板对象
 */

import type { PromptTemplate, VariableDefinition } from '@modular-agent/prompt-templates';
import { ConfigFormat } from './types.js';
import type { PromptTemplateConfigFile } from './types.js';
import { parseToml } from './toml-parser.js';
import { parseJson } from './json-parser.js';
import { ConfigurationError } from '@modular-agent/types';

/**
 * 加载提示词模板配置
 *
 * @param content 配置文件内容
 * @param format 配置格式（toml 或 json）
 * @returns 解析后的配置对象
 * @throws {ConfigurationError} 当配置解析失败时抛出
 */
export function loadPromptTemplateConfig(
  content: string,
  format: ConfigFormat
): PromptTemplateConfigFile {
  let config: any;

  try {
    // 根据格式选择解析器
    switch (format) {
      case 'toml':
        config = parseToml(content);
        break;
      case 'json':
        config = parseJson(content);
        break;
      default:
        throw new ConfigurationError(
          `不支持的配置格式: ${format}`,
          format
        );
    }

    // 验证必需字段
    if (!config.id) {
      throw new ConfigurationError(
        '提示词模板配置必须包含 id 字段',
        'prompt_template'
      );
    }

    return config as PromptTemplateConfigFile;
  } catch (error) {
    if (error instanceof ConfigurationError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new ConfigurationError(
        `提示词模板配置解析失败: ${error.message}`,
        'prompt_template',
        { originalError: error.message }
      );
    }
    throw new ConfigurationError('提示词模板配置解析失败: 未知错误');
  }
}

/**
 * 合并提示词模板配置
 * 将应用层配置与默认模板合并，应用层配置优先
 *
 * @param defaultTemplate 默认模板（来自 @modular-agent/prompt-templates）
 * @param appConfig 应用层配置
 * @returns 合并后的模板
 *
 * @example
 * ```ts
 * const defaultTemplate = CODER_SYSTEM_TEMPLATE;
 * const appConfig = loadPromptTemplateConfig(content, 'toml');
 * const mergedTemplate = mergePromptTemplateConfig(defaultTemplate, appConfig);
 * ```
 */
export function mergePromptTemplateConfig(
  defaultTemplate: PromptTemplate,
  appConfig: PromptTemplateConfigFile
): PromptTemplate {
  // 验证配置ID是否匹配
  if (appConfig.id !== defaultTemplate.id) {
    throw new ConfigurationError(
      `配置ID不匹配: 配置文件中的ID为 '${appConfig.id}'，但默认模板的ID为 '${defaultTemplate.id}'`,
      'prompt_template'
    );
  }

  // 合并配置，应用层配置优先
  const merged: PromptTemplate = {
    id: defaultTemplate.id,
    name: appConfig.name ?? defaultTemplate.name,
    description: appConfig.description ?? defaultTemplate.description,
    category: appConfig.category ?? defaultTemplate.category,
    content: appConfig.content ?? defaultTemplate.content,
    variables: mergeVariables(defaultTemplate.variables, appConfig.variables),
    fragments: mergeFragments(defaultTemplate.fragments, appConfig.fragments)
  };

  return merged;
}

/**
 * 合并变量定义
 * 应用层变量会覆盖默认模板中的同名变量
 *
 * @param defaultVariables 默认变量定义
 * @param appVariables 应用层变量定义
 * @returns 合并后的变量定义
 */
function mergeVariables(
  defaultVariables: PromptTemplate['variables'],
  appVariables: PromptTemplateConfigFile['variables']
): PromptTemplate['variables'] {
  if (!appVariables || appVariables.length === 0) {
    return defaultVariables;
  }

  if (!defaultVariables || defaultVariables.length === 0) {
    return appVariables;
  }

  // 创建变量映射，应用层变量优先
  const variableMap = new Map<string, VariableDefinition>();

  // 先添加默认变量
  for (const variable of defaultVariables) {
    variableMap.set(variable.name, variable);
  }

  // 覆盖或添加应用层变量
  for (const variable of appVariables) {
    variableMap.set(variable.name, variable);
  }

  return Array.from(variableMap.values());
}

/**
 * 合并片段列表
 * 应用层片段会追加到默认片段列表中
 *
 * @param defaultFragments 默认片段列表
 * @param appFragments 应用层片段列表
 * @returns 合并后的片段列表
 */
function mergeFragments(
  defaultFragments: PromptTemplate['fragments'],
  appFragments: PromptTemplateConfigFile['fragments']
): PromptTemplate['fragments'] {
  if (!appFragments || appFragments.length === 0) {
    return defaultFragments;
  }

  if (!defaultFragments || defaultFragments.length === 0) {
    return appFragments;
  }

  // 合并片段，去重
  const fragmentSet = new Set([...defaultFragments, ...appFragments]);
  return Array.from(fragmentSet);
}

/**
 * 加载并合并提示词模板
 * 便捷方法，一次性完成加载和合并
 *
 * @param content 配置文件内容
 * @param format 配置格式
 * @param defaultTemplate 默认模板
 * @returns 合并后的模板
 */
export function loadAndMergePromptTemplate(
  content: string,
  format: ConfigFormat,
  defaultTemplate: PromptTemplate
): PromptTemplate {
  const appConfig = loadPromptTemplateConfig(content, format);
  return mergePromptTemplateConfig(defaultTemplate, appConfig);
}
