/**
 * 工具执行器辅助函数
 */

import type { Tool, ToolParameters, ToolType, ToolOutput } from '@modular-agent/types';

/**
 * 工具定义（app层使用的简化格式）
 * 用于从 app 层工具定义转换为 SDK Tool 格式
 */
export interface ToolDefinitionLike {
  /** 工具唯一标识符 */
  id: string;
  /** 工具名称 */
  name: string;
  /** 工具描述 */
  description: string;
  /** 参数schema (JSON Schema格式) */
  parameters: Record<string, any>;
  /** 工具类型 */
  type: ToolType;
  /** 版本号（可选） */
  version?: string;
  /** 执行函数（无状态工具） */
  execute?: (parameters: Record<string, any>) => Promise<ToolOutput>;
  /** 工厂函数（有状态工具） */
  factory?: () => { execute: (parameters: Record<string, any>) => Promise<ToolOutput> };
}

/**
 * 将工具定义转换为 SDK Tool 格式
 * @param toolDef app 层工具定义
 * @returns SDK Tool 格式
 */
export function toSdkTool(toolDef: ToolDefinitionLike): Tool {
  const tool: Tool = {
    id: toolDef.id,
    name: toolDef.name,
    type: toolDef.type,
    description: toolDef.description,
    parameters: toolDef.parameters as ToolParameters
  };

  // 根据类型设置config
  if (toolDef.type === 'STATELESS' && toolDef.execute) {
    tool.config = {
      execute: toolDef.execute,
      version: toolDef.version,
      description: toolDef.description
    };
  } else if (toolDef.type === 'STATEFUL' && toolDef.factory) {
    tool.config = {
      factory: {
        create: toolDef.factory
      }
    };
  }

  return tool;
}

/**
 * 批量转换工具定义为 SDK Tool 格式
 * @param toolDefs app 层工具定义数组
 * @returns SDK Tool 格式数组
 */
export function toSdkTools(toolDefs: ToolDefinitionLike[]): Tool[] {
  return toolDefs.map(toSdkTool);
}
