/**
 * Schema定义导出
 * 集中管理所有模块的Schema定义
 *
 * Schema与配置目录对应关系：
 * - global-schema.ts      → configs/global.toml
 * - database-schema.ts    → configs/database/
 * - llm-schema.ts         → configs/llms/
 * - tool-schema.ts        → configs/tools/
 * - prompt-schema.ts      → configs/prompts/
 * - workflow-schema.ts    → configs/workflows/
 */

// ============================================================================
// 导出所有Schema
// ============================================================================

export { GlobalSchema, GlobalConfig } from './global-schema';
export { DatabaseSchema, DatabaseConfig } from './database-schema';
export {
  LLMSchema,
  LLMConfig,
  ProviderCommonConfig,
  ModelConfig,
  RetryConfig,
  PoolConfig,
  TaskGroupConfig,
  SingleProviderCommonSchema,
  SingleModelSchema,
  SingleRetrySchema,
  SinglePoolSchema,
  SingleTaskGroupSchema,
} from './llm-schema';
export {
  ToolSchema,
  ToolConfigSchema,
  ToolRegistrySchema,
  ToolModuleConfig,
} from './tool-schema';
export {
  PromptSchema,
  PromptConfig,
  PromptModuleConfig,
  SinglePromptSchema,
} from './prompt-schema';
export {
  WorkflowSchema,
  WorkflowConfig,
  ParameterDefinition,
  NodeConfig,
  EdgeConfig,
  SubWorkflowReferenceConfig,
  WrapperConfig,
  NodeRetryStrategyConfig,
  WorkflowModuleConfig,
  FunctionTypeConfig,
  FunctionSetConfig,
  SingleWorkflowSchema,
  SingleFunctionTypeSchema,
  SingleFunctionSetSchema,
} from './workflow-schema';

// ============================================================================
// 导入所有Schema用于注册
// ============================================================================

import { GlobalSchema } from './global-schema';
import { DatabaseSchema } from './database-schema';
import { LLMSchema } from './llm-schema';
import { ToolSchema } from './tool-schema';
import { PromptSchema } from './prompt-schema';
import { WorkflowSchema } from './workflow-schema';

// ============================================================================
// Schema映射表
// ============================================================================

/**
 * 所有Schema的映射表
 * 用于动态加载和注册
 *
 * 映射规则：
 * - 键名与配置目录名称保持一致
 * - global.toml 使用 'global' 键
 * - 其他目录使用目录名称（如 'llms', 'tools', 'workflows'）
 */
export const SCHEMA_MAP = {
  global: GlobalSchema,
  database: DatabaseSchema,
  llms: LLMSchema,
  tools: ToolSchema,
  prompts: PromptSchema,
  workflows: WorkflowSchema,
} as const;

/**
 * Schema映射表类型
 */
export type SchemaMap = typeof SCHEMA_MAP;

/**
 * Schema键名类型
 */
export type SchemaKey = keyof SchemaMap;

/**
 * 获取指定键名的Schema
 */
export function getSchema(key: SchemaKey) {
  return SCHEMA_MAP[key];
}

/**
 * 获取所有Schema键名
 */
export function getSchemaKeys(): SchemaKey[] {
  return Object.keys(SCHEMA_MAP) as SchemaKey[];
}

/**
 * 检查是否存在指定键名的Schema
 */
export function hasSchema(key: string): key is SchemaKey {
  return key in SCHEMA_MAP;
}