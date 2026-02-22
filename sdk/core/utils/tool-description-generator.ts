/**
 * ToolDescriptionGenerator - 工具描述生成器
 * 提供工具描述的生成功能，支持多种格式
 *
 * 功能：
 * - 支持表格格式（table）
 * - 支持单行格式（single-line）
 * - 支持列表格式（list）
 * - 支持批量生成工具列表描述
 */

import type { Tool } from '@modular-agent/types';
import { renderTemplate } from './template-renderer.js';
import {
  TOOL_DESCRIPTION_TABLE_TEMPLATE,
  TOOL_DESCRIPTION_SINGLE_LINE_TEMPLATE,
  TOOL_DESCRIPTION_LIST_TEMPLATE
} from '@modular-agent/prompt-templates';

/**
 * 工具描述格式类型
 */
export type ToolDescriptionFormat = 'table' | 'single-line' | 'list';

/**
 * 生成单个工具的描述
 *
 * @param tool 工具对象
 * @param format 描述格式
 * @returns 工具描述字符串
 *
 * @example
 * ```ts
 * const tool = { id: 'tool1', name: 'Calculator', description: 'Performs calculations' };
 * const description = generateToolDescription(tool, 'single-line');
 * // 结果: 'Calculator: Performs calculations'
 * ```
 */
export function generateToolDescription(tool: Tool, format: ToolDescriptionFormat): string {
  const variables = {
    toolName: tool.name,
    toolId: tool.id,
    toolDescription: tool.description || 'No description'
  };

  switch (format) {
    case 'table':
      return renderTemplate(TOOL_DESCRIPTION_TABLE_TEMPLATE.content, variables);
    case 'single-line':
      return renderTemplate(TOOL_DESCRIPTION_SINGLE_LINE_TEMPLATE, variables);
    case 'list':
      return renderTemplate(TOOL_DESCRIPTION_LIST_TEMPLATE, variables);
    default:
      // 默认使用单行格式
      return renderTemplate(TOOL_DESCRIPTION_SINGLE_LINE_TEMPLATE, variables);
  }
}

/**
 * 生成工具列表描述
 * 将多个工具的描述合并为一个字符串
 *
 * @param tools 工具数组
 * @param format 描述格式
 * @param options 可选配置
 * @returns 工具列表描述字符串
 *
 * @example
 * ```ts
 * const tools = [
 *   { id: 'tool1', name: 'Calculator', description: 'Performs calculations' },
 *   { id: 'tool2', name: 'Weather', description: 'Gets weather information' }
 * ];
 * const description = generateToolListDescription(tools, 'list');
 * // 结果:
 * // - Calculator: Performs calculations
 * // - Weather: Gets weather information
 * ```
 */
export function generateToolListDescription(
  tools: Tool[],
  format: ToolDescriptionFormat,
  options?: {
    /** 是否包含表头（仅 table 格式有效） */
    includeHeader?: boolean;
    /** 自定义分隔符（仅 single-line 格式有效） */
    separator?: string;
  }
): string {
  if (!tools || tools.length === 0) {
    return '';
  }

  const descriptions = tools.map(tool => generateToolDescription(tool, format));

  switch (format) {
    case 'table':
      // 表格格式：每行一个工具描述
      if (options?.includeHeader) {
        const header = '| 工具名称 | 工具ID | 说明 |\n|----------|--------|------|';
        return `${header}\n${descriptions.join('\n')}`;
      }
      return descriptions.join('\n');

    case 'single-line':
      // 单行格式：使用分隔符连接
      const separator = options?.separator || '\n';
      return descriptions.join(separator);

    case 'list':
      // 列表格式：每行一个工具描述
      return descriptions.join('\n');

    default:
      return descriptions.join('\n');
  }
}

/**
 * 生成工具表格行（用于工具可见性声明）
 *
 * @param tool 工具对象
 * @returns 表格行字符串
 *
 * @example
 * ```ts
 * const tool = { id: 'tool1', name: 'Calculator', description: 'Performs calculations' };
 * const row = generateToolTableRow(tool);
 * // 结果: '| Calculator | tool1 | Performs calculations |'
 * ```
 */
export function generateToolTableRow(tool: Tool): string {
  return generateToolDescription(tool, 'table');
}

/**
 * 生成工具表格（包含表头）
 *
 * @param tools 工具数组
 * @returns 完整的表格字符串
 *
 * @example
 * ```ts
 * const tools = [
 *   { id: 'tool1', name: 'Calculator', description: 'Performs calculations' }
 * ];
 * const table = generateToolTable(tools);
 * // 结果:
 * // | 工具名称 | 工具ID | 说明 |
 * // |----------|--------|------|
 * // | Calculator | tool1 | Performs calculations |
 * ```
 */
export function generateToolTable(tools: Tool[]): string {
  return generateToolListDescription(tools, 'table', { includeHeader: true });
}