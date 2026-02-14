/**
 * 工具配置类型定义
 */

import type { Metadata } from '../common';

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