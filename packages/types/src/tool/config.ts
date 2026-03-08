/**
 * 工具配置类型定义
 */

import type { Metadata } from '../common.js';

/**
 * 工具参数属性类型（基于JSON Schema Draft 2020-12）
 *
 * 注意：验证由LLM端负责，此类型仅用于格式转换和文档说明
 */
export interface ToolProperty {
  /** 参数类型（string、number、integer、boolean、array、object、null） */
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null';
  /** 参数描述 */
  description?: string;
  /** 默认值（可选） */
  default?: any;
  /** 枚举值（可选） */
  enum?: any[];
  /** 格式约束（可选，如uri、email、date、date-time等） */
  format?: string;
  /** 示例值（可选） */
  examples?: any[];

  // 字符串约束
  /** 最小长度 */
  minLength?: number;
  /** 最大长度 */
  maxLength?: number;
  /** 正则模式 */
  pattern?: string;

  // 数值约束
  /** 最小值 */
  minimum?: number;
  /** 最大值 */
  maximum?: number;

  // 对象结构
  /** 对象属性定义 */
  properties?: Record<string, ToolProperty>;
  /** 必需属性列表 */
  required?: string[];
  /** 额外属性定义 */
  additionalProperties?: boolean | ToolProperty;

  // 数组结构
  /** 数组元素类型定义 */
  items?: ToolProperty;

  // 允许其他 JSON Schema 字段（用于扩展）
  [key: string]: any;
}

/**
 * 工具参数schema类型（JSON Schema格式）
 */
export interface ToolParameters {
  /** 类型（固定为 object） */
  type?: 'object';
  /** 参数属性定义 */
  properties: Record<string, ToolProperty>;
  /** 必需参数列表 */
  required: string[];
  /** 额外属性定义 */
  additionalProperties?: boolean | ToolProperty;
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