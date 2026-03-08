/**
 * 工具定义类型
 * 定义 app 层特有的工具定义接口和配置
 */

// 从 SDK 导入通用类型
export type { ToolOutput } from '@modular-agent/types';

/**
 * 工具定义接口
 * 所有工具必须实现此接口
 */
export interface ToolDefinition {
  /** 工具唯一标识符 */
  id: string;
  /** 工具名称 */
  name: string;
  /** 工具描述 */
  description: string;
  /** 参数schema (JSON Schema格式) */
  parameters: Record<string, any>;
  /** 工具类型 */
  type: 'STATELESS' | 'STATEFUL';
  /** 版本号（可选，用于 FunctionRegistry） */
  version?: string;
  /** 执行函数（无状态工具） */
  execute?: (parameters: Record<string, any>) => Promise<import('@modular-agent/types').ToolOutput>;
  /** 工厂函数（有状态工具） */
  factory?: () => { execute: (parameters: Record<string, any>) => Promise<import('@modular-agent/types').ToolOutput> };
}

/**
 * 工具注册配置
 */
export interface ToolRegistryConfig {
  /** 工作目录 */
  workspaceDir?: string;
  /** 内存文件路径 */
  memoryFile?: string;
}
