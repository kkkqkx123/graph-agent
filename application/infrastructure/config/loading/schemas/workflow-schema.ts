/**
 * 工作流配置Schema定义
 * 统一管理工作流定义、函数类型、函数集等所有工作流相关配置
 * 支持子工作流、参数化配置、节点和边定义
 */

import { z } from 'zod';

// ============================================================================
// 工作流定义相关Schema
// ============================================================================

/**
 * Wrapper配置Schema
 * 支持结构化的wrapper配置，替代字符串格式
 */
export const WrapperConfigSchema = z.object({
  type: z.enum(['pool', 'group', 'direct']),
  name: z.string().optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
}).refine(
  (data) => {
    // 验证必需字段
    if (data.type === 'pool' || data.type === 'group') {
      return data.name !== undefined;
    }
    if (data.type === 'direct') {
      return data.provider !== undefined && data.model !== undefined;
    }
    return false;
  },
  {
    message: 'wrapper配置验证失败：pool/group类型需要name字段，direct类型需要provider和model字段',
  }
);

/**
 * 参数定义Schema
 */
export const ParameterDefinitionSchema = z.object({
  type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
  default: z.any().optional(),
  description: z.string(),
  required: z.boolean().optional().default(false),
});

/**
 * 提示词配置Schema
 */
export const PromptConfigSchema = z.object({
  type: z.enum(['direct', 'template']),
  content: z.string(),
});

/**
 * 节点重试策略配置Schema
 */
export const NodeRetryStrategyConfigSchema = z.object({
  /** 是否启用重试 */
  enabled: z.boolean().optional().default(false),
  /** 最大重试次数 */
  maxRetries: z.number().optional().default(0),
  /** 重试延迟（毫秒） */
  retryDelay: z.number().optional().default(1000),
  /** 是否使用指数退避 */
  useExponentialBackoff: z.boolean().optional().default(false),
  /** 指数退避的基数 */
  exponentialBase: z.number().optional().default(2),
  /** 最大重试延迟（毫秒） */
  maxRetryDelay: z.number().optional().default(60000),
}).optional();

/**
 * 节点配置Schema
 */
export const NodeConfigSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string().optional(),
  config: z.record(z.string(), z.any()),
  /** 节点重试策略配置 */
  retryStrategy: NodeRetryStrategyConfigSchema,
});

/**
 * 边配置Schema
 */
export const EdgeConfigSchema = z.object({
  from: z.string(),
  to: z.string(),
  condition: z.string().optional(),
});

/**
 * 工作流配置Schema
 *
 * 注意：子工作流合并后，所有节点共享同一个上下文，不需要显式的输入输出映射。
 * 节点之间通过上下文变量传递数据（如 context.getVariable('llm_result')）。
 */
export const WorkflowConfigSchema = z.object({
  workflow: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    version: z.string(),

    // 可配置参数（用于在具体工作流中通过参数修改内部逻辑）
    parameters: z.record(z.string(), ParameterDefinitionSchema).optional(),

    // 节点定义
    nodes: z.array(NodeConfigSchema),

    // 边定义
    edges: z.array(EdgeConfigSchema),
  }),
});

/**
 * 子工作流引用配置Schema
 */
export const SubWorkflowReferenceConfigSchema = z.object({
  reference_id: z.string(),
  workflow_id: z.string(),

  // 参数覆盖
  parameters: z.record(z.string(), z.any()).optional(),

  // 输入映射
  input_mapping: z.record(z.string(), z.string()).optional(),

  // 输出映射
  output_mapping: z.record(z.string(), z.string()).optional(),
});

// ============================================================================
// 工作流函数相关Schema
// ============================================================================

/**
 * 函数类型配置Schema
 */
const FunctionTypeConfigSchema = z.object({
  class_path: z.string(),
  description: z.string(),
  enabled: z.boolean(),
});

/**
 * 函数集配置Schema
 */
const FunctionSetConfigSchema = z.object({
  description: z.string(),
  enabled: z.boolean(),
  functions: z.array(z.string()),
});

/**
 * 自动发现配置Schema
 */
const AutoDiscoveryConfigSchema = z.object({
  enabled: z.boolean().optional(),
  scan_directories: z.array(z.string()).optional(),
  file_patterns: z.array(z.string()).optional(),
  exclude_patterns: z.array(z.string()).optional(),
});

// ============================================================================
// 工作流模块主Schema
// ============================================================================

/**
 * 工作流模块Schema
 * 统一管理所有工作流相关配置
 */
export const WorkflowSchema = z.object({
  // 工作流定义
  workflows: z.record(z.string(), WorkflowConfigSchema).optional(),

  // 函数类型配置
  function_types: z.record(z.string(), FunctionTypeConfigSchema).optional(),

  // 函数集配置
  function_sets: z.record(z.string(), FunctionSetConfigSchema).optional(),

  // 自动发现配置
  auto_discovery: AutoDiscoveryConfigSchema.optional(),

  // 默认配置
  defaults: z.record(z.string(), z.any()).optional(),

  // 注册表标识
  _registry: z.string().optional(),
});

// ============================================================================
// 导出类型
// ============================================================================

/**
 * 工作流配置类型
 */
export type WorkflowConfig = z.infer<typeof WorkflowConfigSchema>;

/**
 * 参数定义类型
 */
export type ParameterDefinition = z.infer<typeof ParameterDefinitionSchema>;

/**
 * 节点配置类型
 */
export type NodeConfig = z.infer<typeof NodeConfigSchema>;

/**
 * 边配置类型
 */
export type EdgeConfig = z.infer<typeof EdgeConfigSchema>;

/**
 * 子工作流引用配置类型
 */
export type SubWorkflowReferenceConfig = z.infer<typeof SubWorkflowReferenceConfigSchema>;

/**
 * Wrapper配置类型
 */
export type WrapperConfig = z.infer<typeof WrapperConfigSchema>;

/**
 * 节点重试策略配置类型
 */
export type NodeRetryStrategyConfig = z.infer<typeof NodeRetryStrategyConfigSchema>;

/**
 * 工作流模块配置类型
 */
export type WorkflowModuleConfig = z.infer<typeof WorkflowSchema>;

/**
 * 函数类型配置类型
 */
export type FunctionTypeConfig = z.infer<typeof FunctionTypeConfigSchema>;

/**
 * 函数集配置类型
 */
export type FunctionSetConfig = z.infer<typeof FunctionSetConfigSchema>;

// ============================================================================
// 导出单个配置Schema（用于拆分后的配置文件）
// ============================================================================

/**
 * 单个工作流配置Schema（用于拆分后的配置文件）
 */
export const SingleWorkflowSchema = WorkflowConfigSchema;

/**
 * 单个函数类型配置Schema（用于拆分后的配置文件）
 */
export const SingleFunctionTypeSchema = FunctionTypeConfigSchema;

/**
 * 单个函数集配置Schema（用于拆分后的配置文件）
 */
export const SingleFunctionSetSchema = FunctionSetConfigSchema;