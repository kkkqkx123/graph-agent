/**
 * 工具定义类型
 */

import type { ID, Metadata } from '../common';
import type { ToolType } from './state';
import type { ToolParameters, ToolMetadata } from './config';
import type { ToolConfig } from './tool-config';

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