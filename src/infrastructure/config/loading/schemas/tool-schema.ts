/**
 * 工具模块Schema定义
 * 基于现有的tool-rule.ts和tool-loader.ts实现
 */

import { z } from 'zod';

/**
 * 工具类型配置Schema
 */
const ToolTypeConfigSchema = z.object({
  class_path: z.string(),
  description: z.string(),
  enabled: z.boolean()
});

/**
 * 工具集配置Schema
 */
const ToolSetConfigSchema = z.object({
  description: z.string(),
  enabled: z.boolean(),
  tools: z.array(z.string())
});

/**
 * 工具模块Schema
 */
export const ToolSchema = z.object({
  tool_types: z.record(z.string(), ToolTypeConfigSchema).optional(),
  tool_sets: z.record(z.string(), ToolSetConfigSchema).optional(),
  auto_discovery: z.object({}).optional(),
  _registry: z.string().optional()
});