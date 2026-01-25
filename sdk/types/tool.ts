/**
 * Tool类型定义
 * 定义工具的基本信息和参数schema
 */

/**
 * 工具类型枚举
 */
export enum ToolType {
  /** 内置工具 */
  BUILTIN = 'BUILTIN',
  /** 本地工具 */
  NATIVE = 'NATIVE',
  /** REST API工具 */
  REST = 'REST',
  /** MCP协议工具 */
  MCP = 'MCP'
}

/**
 * 工具参数属性类型
 */
export interface ToolProperty {
  /** 参数类型（string、number、boolean、array、object） */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  /** 参数描述 */
  description?: string;
  /** 默认值（可选） */
  default?: any;
  /** 枚举值（可选） */
  enum?: any[];
  /** 格式约束（可选，如uri、email等） */
  format?: string;
}

/**
 * 工具参数schema类型（JSON Schema格式）
 */
export interface ToolParameters {
  /** 参数属性定义 */
  properties: Record<string, ToolProperty>;
  /** 必需参数列表 */
  required: string[];
}

/**
 * 工具元数据类型
 */
export interface ToolMetadata {
  /** 工具分类 */
  category?: string;
  /** 标签数组 */
  tags?: string[];
  /** 文档URL（可选） */
  documentationUrl?: string;
}

/**
 * 工具定义类型
 */
export interface Tool {
  /** 工具唯一标识符 */
  id: string;
  /** 工具名称 */
  name: string;
  /** 工具类型 */
  type: ToolType;
  /** 工具描述 */
  description: string;
  /** 参数schema（JSON Schema格式） */
  parameters: ToolParameters;
  /** 工具元数据 */
  metadata?: ToolMetadata;
}

/**
 * LLM工具调用schema类型
 */
export interface ToolSchema {
  /** 工具名称 */
  name: string;
  /** 工具描述 */
  description: string;
  /** 参数schema */
  parameters: ToolParameters;
}