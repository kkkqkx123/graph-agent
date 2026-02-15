/**
 * 工具描述工具函数
 * 提供工具描述的生成功能
 */

import type { Tool, ToolSchema } from '@modular-agent/types';

/**
 * 获取工具Schema列表
 * @param tools 工具数组
 * @returns 工具Schema数组
 */
export function getToolSchemas(tools: Tool[]): ToolSchema[] {
  if (tools.length === 0) {
    return [];
  }

  return tools.map(tool => convertToSchema(tool));
}

/**
 * 获取工具描述文本
 * @param tools 工具数组
 * @returns 工具描述文本，如果没有工具则返回null
 */
export function getToolDescriptionText(tools: Tool[]): string | null {
  if (tools.length === 0) {
    return null;
  }

  const descriptions = tools
    .map(tool => `- ${tool.name}: ${tool.description}`)
    .join('\n');

  return `可用工具:\n${descriptions}`;
}

/**
 * 转换工具定义为Schema
 * @param tool 工具定义
 * @returns 工具Schema
 */
function convertToSchema(tool: Tool): ToolSchema {
  return {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters
  };
}