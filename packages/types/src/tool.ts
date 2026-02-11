/**
 * Tool类型定义
 * 定义工具的基本信息和参数schema
 */

import type { ID, Timestamp, Metadata } from './common';

/**
 * 工具类型枚举
 */
export enum ToolType {
  /** 无状态工具（应用层提供的纯函数） */
  STATELESS = 'STATELESS',
  /** 有状态工具（应用层提供的类/对象，通过ThreadContext隔离） */
  STATEFUL = 'STATEFUL',
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
  /** 自定义字段 */
  customFields?: Metadata;
}

/**
 * 工具定义类型
 */
export interface Tool {
  /** 工具唯一标识符 */
  id: ID;
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
  /** 工具配置（类型特定） */
  config?: ToolConfig;
  /** 工具调用时是否创建检查点（新增） */
  createCheckpoint?: boolean | 'before' | 'after' | 'both';
  /** 检查点描述模板（新增） */
  checkpointDescriptionTemplate?: string;
}

/**
 * 工具配置类型（类型特定）
 */
export type ToolConfig =
  | StatelessToolConfig
  | StatefulToolConfig
  | RestToolConfig
  | McpToolConfig;

/**
 * 无状态工具配置
 */
export interface StatelessToolConfig {
  /** 执行函数 */
  execute: (parameters: Record<string, any>) => Promise<any>;
}

/**
 * 有状态工具工厂
 */
export interface StatefulToolFactory {
  /** 创建工具实例 */
  create(): any;
}

/**
 * 有状态工具配置
 */
export interface StatefulToolConfig {
  /** 工厂函数 */
  factory: StatefulToolFactory;
}

/**
 * REST工具配置
 */
export interface RestToolConfig {
  /** 基础URL */
  baseUrl?: string;
  /** 请求头 */
  headers?: Record<string, string>;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
}

/**
 * MCP工具配置
 */
export interface McpToolConfig {
  /** 服务器名称 */
  serverName: string;
  /** 服务器URL */
  serverUrl?: string;
  /** 超时时间（毫秒） */
  timeout?: number;
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

/**
 * 工具调用记录类型
 */
export interface ToolCall {
  /** 工具调用ID */
  id: ID;
  /** 工具名称 */
  toolName: string;
  /** 工具参数 */
  parameters: Record<string, any>;
  /** 调用结果 */
  result?: any;
  /** 错误信息 */
  error?: any;
  /** 调用时间 */
  timestamp: Timestamp;
  /** 执行时间（毫秒） */
  executionTime?: Timestamp;
}