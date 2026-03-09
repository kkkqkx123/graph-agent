/**
 * ToolSchemaCleaner - 工具 Schema 清理器
 * 提供工具参数 Schema 的清理功能，适配不同 LLM 的兼容性要求
 *
 * 功能：
 * - 清理 Gemini 不兼容的字段
 * - 清理 Anthropic 不兼容的字段
 * - 清理 OpenAI 不兼容的字段
 * - 递归处理嵌套对象
 */

import type { ToolParameters, ToolProperty } from '@modular-agent/types';

/**
 * LLM 提供商类型
 */
export type LLMProvider = 'openai' | 'anthropic' | 'gemini';

/**
 * 需要移除的通用字段（所有 LLM 都不支持）
 */
const COMMON_UNSUPPORTED_FIELDS = new Set([
  '$schema',
  '$id',
  '$comment',
  '$defs',
  'definitions'
]);

/**
 * Gemini 不支持的字段
 */
const GEMINI_UNSUPPORTED_FIELDS = new Set([
  ...COMMON_UNSUPPORTED_FIELDS,
  'additionalProperties',
  'patternProperties',
  'propertyNames',
  'if',
  'then',
  'else',
  'allOf',
  'oneOf',
  'anyOf',
  'not',
  'contentMediaType',
  'contentEncoding',
  'examples',
  'default'  // Gemini 对 default 支持有限
]);

/**
 * Anthropic 不支持的字段
 */
const ANTHROPIC_UNSUPPORTED_FIELDS = new Set([
  ...COMMON_UNSUPPORTED_FIELDS,
  'patternProperties',
  'propertyNames',
  'if',
  'then',
  'else',
  'allOf',
  'oneOf',
  'anyOf',
  'not'
]);

/**
 * OpenAI 不支持的字段
 */
const OPENAI_UNSUPPORTED_FIELDS = new Set([
  ...COMMON_UNSUPPORTED_FIELDS,
  'patternProperties',
  'propertyNames',
  'if',
  'then',
  'else',
  'allOf',
  'oneOf',
  'anyOf',
  'not'
]);

/**
 * 清理单个属性定义
 *
 * @param property 属性定义
 * @param unsupportedFields 不支持的字段集合
 * @returns 清理后的属性定义
 */
function cleanProperty(
  property: ToolProperty,
  unsupportedFields: Set<string>
): ToolProperty {
  const cleaned: ToolProperty = {
    type: property.type
  };

  // 复制支持的字段
  if (property.description !== undefined) {
    cleaned.description = property.description;
  }
  if (property.enum !== undefined) {
    cleaned.enum = property.enum;
  }
  if (property.format !== undefined) {
    cleaned.format = property.format;
  }
  if (property.default !== undefined && !unsupportedFields.has('default')) {
    cleaned.default = property.default;
  }
  if (property.examples !== undefined && !unsupportedFields.has('examples')) {
    cleaned.examples = property.examples;
  }
  if (property.minLength !== undefined) {
    cleaned.minLength = property.minLength;
  }
  if (property.maxLength !== undefined) {
    cleaned.maxLength = property.maxLength;
  }
  if (property.minimum !== undefined) {
    cleaned.minimum = property.minimum;
  }
  if (property.maximum !== undefined) {
    cleaned.maximum = property.maximum;
  }
  if (property.pattern !== undefined) {
    cleaned.pattern = property.pattern;
  }

  // 处理数组类型
  if (property.type === 'array' && property.items) {
    cleaned.items = cleanProperty(property.items, unsupportedFields);
  }

  // 处理对象类型
  if (property.type === 'object') {
    if (property.properties) {
      cleaned.properties = {};
      for (const [key, value] of Object.entries(property.properties)) {
        cleaned.properties[key] = cleanProperty(value, unsupportedFields);
      }
    }
    if (property.required !== undefined) {
      cleaned.required = property.required;
    }
    // additionalProperties 处理
    if (
      property.additionalProperties !== undefined &&
      !unsupportedFields.has('additionalProperties')
    ) {
      if (typeof property.additionalProperties === 'boolean') {
        cleaned.additionalProperties = property.additionalProperties;
      } else {
        cleaned.additionalProperties = cleanProperty(
          property.additionalProperties,
          unsupportedFields
        );
      }
    }
  }

  return cleaned;
}

/**
 * 清理工具参数 Schema
 *
 * @param parameters 工具参数 Schema
 * @param unsupportedFields 不支持的字段集合
 * @returns 清理后的参数 Schema
 */
function cleanParameters(
  parameters: ToolParameters,
  unsupportedFields: Set<string>
): ToolParameters {
  const cleaned: ToolParameters = {
    type: 'object',
    properties: {},
    required: parameters.required || []
  };

  for (const [key, value] of Object.entries(parameters.properties)) {
    cleaned.properties[key] = cleanProperty(value, unsupportedFields);
  }

  return cleaned;
}

/**
 * 为 Gemini 清理工具参数 Schema
 * 移除 Gemini 不支持的字段
 *
 * @param parameters 工具参数 Schema
 * @returns 清理后的参数 Schema
 *
 * @example
 * ```ts
 * const parameters = {
 *   type: 'object',
 *   properties: {
 *     name: { type: 'string', description: 'Name', $schema: '...' }
 *   },
 *   required: ['name'],
 *   additionalProperties: false
 * };
 * const cleaned = cleanForGemini(parameters);
 * // 结果: additionalProperties 和 $schema 被移除
 * ```
 */
export function cleanForGemini(parameters: ToolParameters): ToolParameters {
  return cleanParameters(parameters, GEMINI_UNSUPPORTED_FIELDS);
}

/**
 * 为 Anthropic 清理工具参数 Schema
 * 移除 Anthropic 不支持的字段
 *
 * @param parameters 工具参数 Schema
 * @returns 清理后的参数 Schema
 */
export function cleanForAnthropic(parameters: ToolParameters): ToolParameters {
  return cleanParameters(parameters, ANTHROPIC_UNSUPPORTED_FIELDS);
}

/**
 * 为 OpenAI 清理工具参数 Schema
 * 移除 OpenAI 不支持的字段
 *
 * @param parameters 工具参数 Schema
 * @returns 清理后的参数 Schema
 */
export function cleanForOpenAI(parameters: ToolParameters): ToolParameters {
  return cleanParameters(parameters, OPENAI_UNSUPPORTED_FIELDS);
}

/**
 * 根据提供商清理工具参数 Schema
 *
 * @param parameters 工具参数 Schema
 * @param provider LLM 提供商
 * @returns 清理后的参数 Schema
 */
export function cleanForProvider(
  parameters: ToolParameters,
  provider: LLMProvider
): ToolParameters {
  switch (provider) {
    case 'gemini':
      return cleanForGemini(parameters);
    case 'anthropic':
      return cleanForAnthropic(parameters);
    case 'openai':
      return cleanForOpenAI(parameters);
    default:
      return cleanForOpenAI(parameters);
  }
}

/**
 * 清理工具定义
 * 返回一个新的工具定义，参数 Schema 已清理
 *
 * @param tool 工具对象
 * @param provider LLM 提供商
 * @returns 清理后的工具对象
 */
export function cleanToolForProvider<T extends { parameters: ToolParameters }>(
  tool: T,
  provider: LLMProvider
): T {
  return {
    ...tool,
    parameters: cleanForProvider(tool.parameters, provider)
  };
}

/**
 * 批量清理工具定义
 *
 * @param tools 工具数组
 * @param provider LLM 提供商
 * @returns 清理后的工具数组
 */
export function cleanToolsForProvider<T extends { parameters: ToolParameters }>(
  tools: T[],
  provider: LLMProvider
): T[] {
  return tools.map(tool => cleanToolForProvider(tool, provider));
}
