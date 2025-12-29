/**
 * 提示模块Schema定义
 * 基于现有的prompt-rule.ts和prompt-loader.ts实现
 */

import { z } from 'zod';

/**
 * 变量定义Schema
 */
const VariableSchema = z.object({
  required: z.boolean(),
  description: z.string().optional()
});

/**
 * 元数据Schema
 */
const MetadataSchema = z.object({
  role: z.string().optional(),
  priority: z.number().optional()
});

/**
 * 提示模块Schema
 */
export const PromptSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  content: z.string().optional(),
  template: z.record(z.string(), z.string()).optional(),
  variables: z.record(z.string(), VariableSchema).optional(),
  metadata: MetadataSchema.optional(),
  _registry: z.string().optional()
});