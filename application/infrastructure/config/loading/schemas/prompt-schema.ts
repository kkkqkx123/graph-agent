/**
 * 提示模块Schema定义
 * 统一管理所有提示相关配置
 */

import { z } from 'zod';

// ============================================================================
// 提示相关Schema
// ============================================================================

/**
 * 变量定义Schema
 */
const VariableSchema = z.object({
  required: z.boolean(),
  description: z.string().optional(),
});

/**
 * 元数据Schema
 */
const MetadataSchema = z.object({
  role: z.string().optional(),
  priority: z.number().optional(),
});

/**
 * 单个提示配置Schema
 */
export const PromptConfigSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  content: z.string().optional(),
  template: z.record(z.string(), z.string()).optional(),
  variables: z.record(z.string(), VariableSchema).optional(),
  metadata: MetadataSchema.optional(),
});

// ============================================================================
// 提示模块主Schema
// ============================================================================

/**
 * 提示模块Schema
 * 统一管理所有提示相关配置
 */
export const PromptSchema = z.object({
  // 规则提示
  rules: z.record(z.string(), PromptConfigSchema).optional(),

  // 系统提示
  system: z.record(z.string(), PromptConfigSchema).optional(),

  // 模板提示
  templates: z.record(z.string(), PromptConfigSchema).optional(),

  // 用户命令提示
  user_commands: z.record(z.string(), PromptConfigSchema).optional(),

  // 注册表标识
  _registry: z.string().optional(),
});

// ============================================================================
// 导出类型
// ============================================================================

/**
 * 提示配置类型
 */
export type PromptConfig = z.infer<typeof PromptConfigSchema>;

/**
 * 提示模块配置类型
 */
export type PromptModuleConfig = z.infer<typeof PromptSchema>;

// ============================================================================
// 导出单个配置Schema（用于拆分后的配置文件）
// ============================================================================

/**
 * 单个提示配置Schema（用于拆分后的配置文件）
 */
export const SinglePromptSchema = PromptConfigSchema;