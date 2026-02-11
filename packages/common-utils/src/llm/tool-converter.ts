/**
 * LLM 工具定义转换工具
 * 提供不同 LLM 提供商的工具定义格式转换
 */

import type { ToolSchema } from '@modular-agent/types/tool';

/**
 * OpenAI 格式的工具定义
 */
export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: any;
  };
}

/**
 * Anthropic 格式的工具定义
 */
export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: any;
}

/**
 * Gemini 格式的工具定义
 */
export interface GeminiTool {
  functionDeclarations: Array<{
    name: string;
    description: string;
    parameters: any;
  }>;
}

/**
 * 转换为 OpenAI 格式的工具定义
 *
 * @example
 * const tools = convertToolsToOpenAIFormat([
 *   { name: 'search', description: 'Search web', parameters: {...} }
 * ]);
 * // 结果: [{ type: 'function', function: { name: 'search', description: 'Search web', parameters: {...} } }]
 */
export function convertToolsToOpenAIFormat(tools: ToolSchema[]): OpenAITool[] {
  if (!tools || tools.length === 0) {
    return [];
  }

  return tools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }));
}

/**
 * 转换为 Anthropic 格式的工具定义
 *
 * @example
 * const tools = convertToolsToAnthropicFormat([
 *   { name: 'search', description: 'Search web', parameters: {...} }
 * ]);
 * // 结果: [{ name: 'search', description: 'Search web', input_schema: {...} }]
 */
export function convertToolsToAnthropicFormat(tools: ToolSchema[]): AnthropicTool[] {
  if (!tools || tools.length === 0) {
    return [];
  }

  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters
  }));
}

/**
 * 转换为 Gemini 格式的工具定义
 *
 * @example
 * const tools = convertToolsToGeminiFormat([
 *   { name: 'search', description: 'Search web', parameters: {...} }
 * ]);
 * // 结果: [{ functionDeclarations: [{ name: 'search', description: 'Search web', parameters: {...} }] }]
 */
export function convertToolsToGeminiFormat(tools: ToolSchema[]): GeminiTool[] {
  if (!tools || tools.length === 0) {
    return [];
  }

  return tools.map(tool => ({
    functionDeclarations: [{
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }]
  }));
}

/**
 * 根据提供商类型转换工具定义
 *
 * @param tools 工具定义数组
 * @param provider LLM 提供商类型
 * @returns 转换后的工具定义
 */
export function convertToolsByProvider(
  tools: ToolSchema[],
  provider: string
): OpenAITool[] | AnthropicTool[] | GeminiTool[] {
  if (!tools || tools.length === 0) {
    return [];
  }

  switch (provider) {
    case 'ANTHROPIC':
      return convertToolsToAnthropicFormat(tools);
    case 'GEMINI_NATIVE':
    case 'GEMINI_OPENAI':
      return convertToolsToGeminiFormat(tools);
    case 'OPENAI_CHAT':
    case 'OPENAI_RESPONSE':
    default:
      return convertToolsToOpenAIFormat(tools);
  }
}

/**
 * 判断工具定义是否为空
 */
export function isEmptyTools(tools?: ToolSchema[]): boolean {
  return !tools || tools.length === 0;
}