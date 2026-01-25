/**
 * 工具模块Schema定义
 * 基于configs/tools目录的配置文件结构
 */

import { z } from 'zod';

/**
 * 参数属性Schema
 */
const ParameterPropertySchema = z.object({
  type: z.enum(['string', 'number', 'integer', 'boolean', 'array', 'object']),
  description: z.string().optional(),
  default: z.any().optional(),
  enum: z.array(z.any()).optional(),
  minimum: z.number().optional(),
  maximum: z.number().optional(),
  format: z.string().optional(),
});

/**
 * 参数Schema定义
 */
const ParametersSchemaSchema = z.object({
  type: z.literal('object'),
  properties: z.record(z.string(), ParameterPropertySchema),
  required: z.array(z.string()).optional(),
});

/**
 * 状态配置Schema
 */
const StateConfigSchema = z.object({
  manager_type: z.enum(['memory', 'redis', 'file']).optional(),
  ttl: z.number().optional(),
  auto_cleanup: z.boolean().optional(),
});

/**
 * 元数据Schema
 */
const MetadataSchema = z.object({
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  documentation_url: z.string().optional(),
  server_info: z.string().optional(),
});

/**
 * REST工具特定配置Schema
 */
const RestToolConfigSchema = z.object({
  api_url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional(),
  auth_method: z.enum(['none', 'api_key', 'bearer', 'basic']).optional(),
  api_key: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  retry_count: z.number().optional(),
  retry_delay: z.number().optional(),
});

/**
 * MCP工具特定配置Schema
 */
const McpToolConfigSchema = z.object({
  mcp_server_url: z.string().url(),
  dynamic_schema: z.boolean().optional(),
  refresh_interval: z.number().optional(),
});

/**
 * 示例配置Schema
 */
const ExampleSchema = z.object({
  description: z.string().optional(),
  parameters: z.record(z.string(), z.any()),
});

/**
 * 单个工具配置Schema
 */
export const ToolConfigSchema = z.object({
  // 基本配置
  name: z.string(),
  tool_type: z.enum(['builtin', 'native', 'rest', 'mcp']),
  description: z.string(),
  function_path: z.string().optional(),
  enabled: z.boolean().optional().default(true),
  timeout: z.number().optional().default(30),

  // 参数定义
  parameters_schema: ParametersSchemaSchema.optional(),

  // 状态配置
  state_config: StateConfigSchema.optional(),

  // 元数据
  metadata: MetadataSchema.optional(),

  // 示例
  examples: z.array(ExampleSchema).optional(),

  // REST工具特定配置
  ...RestToolConfigSchema.partial().shape,

  // MCP工具特定配置
  ...McpToolConfigSchema.partial().shape,
});

/**
 * 工具类型配置Schema（用于__registry__.toml）
 */
const ToolTypeConfigSchema = z.object({
  class_path: z.string(),
  description: z.string(),
  enabled: z.boolean(),
  config_directory: z.string(),
  config_files: z.array(z.string()),
});

/**
 * 工具集配置Schema（用于__registry__.toml）
 */
const ToolSetConfigSchema = z.object({
  description: z.string(),
  enabled: z.boolean(),
  tools: z.array(z.string()),
});

/**
 * 自动发现配置Schema
 */
const AutoDiscoveryConfigSchema = z.object({
  enabled: z.boolean(),
  scan_directories: z.array(z.string()),
  file_patterns: z.array(z.string()),
  exclude_patterns: z.array(z.string()),
});

/**
 * 工具注册表配置Schema（用于__registry__.toml）
 */
export const ToolRegistrySchema = z.object({
  metadata: z.object({
    name: z.string(),
    version: z.string(),
    description: z.string(),
    author: z.string(),
  }),
  tool_types: z.record(z.string(), ToolTypeConfigSchema),
  tool_sets: z.record(z.string(), ToolSetConfigSchema),
  auto_discovery: AutoDiscoveryConfigSchema,
});

/**
 * 工具模块Schema
 * 统一管理所有工具相关配置
 */
export const ToolSchema = z.object({
  // 工具注册表配置
  registry: ToolRegistrySchema.optional(),

  // 工具配置集合
  tools: z.record(z.string(), ToolConfigSchema).optional(),

  // 注册表标识
  _registry: z.string().optional(),
});

/**
 * 工具模块配置类型
 */
export type ToolModuleConfig = z.infer<typeof ToolSchema>;
