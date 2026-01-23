/**
 * 配置类型定义
 * 直接从现有 Schema 模块导入，确保类型一致性
 */

import { z } from 'zod';

// 导入现有 Schema
import { DatabaseSchema, DatabaseConfig } from './loading/schemas/database-schema';
import { LLMSchema } from './loading/schemas/llm-schema';
import { ToolSchema } from './loading/schemas/tool-schema';
import { PromptSchema } from './loading/schemas/prompt-schema';
import { PoolSchema } from './loading/schemas/pool-schema';
import { TaskGroupSchema } from './loading/schemas/task-group-schema';
import { WorkflowFunctionSchema } from './loading/schemas/workflow-function-schema';
import { WorkflowConfigSchema } from './loading/schemas/workflow-schema';
import { GlobalSchema, GlobalConfig } from './loading/schemas/global-schema';
import { LLMRetrySchema, LLMRetryConfig } from './loading/schemas/llm-retry-schema';

/**
 * HTTP 配置 Schema
 * 新增：用于 HTTP 客户端的配置
 */
export const HttpConfigSchema = z.object({
  timeout: z.number().default(30000),
  user_agent: z.string().default('WorkflowAgent/1.0.0'),
  rate_limit: z.object({
    capacity: z.number().default(100),
    refill_rate: z.number().default(10),
  }),
  retry: z.object({
    max_retries: z.number().default(3),
    base_delay: z.number().default(1000),
    max_delay: z.number().default(30000),
    backoff_multiplier: z.number().default(2),
  }),
  circuit_breaker: z.object({
    failure_threshold: z.number().default(5),
    success_threshold: z.number().default(3),
    timeout: z.number().default(60000),
    reset_timeout: z.number().default(30000),
  }),
  log: z.object({
    enabled: z.boolean().default(false),
  }),
});

/**
 * LLM 运行时配置 Schema
 * 新增：用于 LLM 客户端的运行时配置（与 Schema 分离）
 */
export const LLMRuntimeConfigSchema = z.object({
  rate_limit: z.object({
    capacity: z.number().default(100),
    refill_rate: z.number().default(10),
    max_requests: z.number().default(60),
    window_size_ms: z.number().default(60000),
  }),
  openai: z.object({
    api_key: z.string(),
    default_model: z.string(),
    supported_models: z.array(z.string()),
    models: z.record(z.string(), z.any()),
  }),
  anthropic: z.object({
    api_key: z.string(),
    default_model: z.string(),
    supported_models: z.array(z.string()),
    models: z.record(z.string(), z.any()),
  }),
  gemini: z.object({
    api_key: z.string(),
    default_model: z.string(),
    supported_models: z.array(z.string()),
    models: z.record(z.string(), z.any()),
  }),
  gemini_openai: z.object({
    api_key: z.string(),
    default_model: z.string(),
    supported_models: z.array(z.string()),
    models: z.record(z.string(), z.any()),
  }),
  openai_response: z.object({
    api_key: z.string(),
    default_model: z.string(),
    supported_models: z.array(z.string()),
    models: z.record(z.string(), z.any()),
  }),
  human_relay: z.object({
    supported_models: z.array(z.string()),
  }),
  mock: z.object({
    api_key: z.string(),
    default_model: z.string(),
    supported_models: z.array(z.string()),
    models: z.record(z.string(), z.any()),
  }),
});

/**
 * Prompts 运行时配置 Schema
 * 新增：用于 Prompts 的运行时配置
 */
export const PromptsRuntimeConfigSchema = z.record(
  z.string(),
  z.record(z.string(), z.string())
);

/**
 * Tools 运行时配置 Schema
 * 新增：用于 Tools 的运行时配置
 */
export const ToolsRuntimeConfigSchema = z.object({
  builtin: z.record(z.string(), z.any()),
  native: z.record(z.string(), z.any()),
  rest: z.record(z.string(), z.any()),
  mcp: z.record(z.string(), z.any()),
});

/**
 * Workflows 运行时配置 Schema
 * 新增：用于 Workflows 的运行时配置
 */
export const WorkflowsRuntimeConfigSchema = z.object({
  defaults: z.record(z.string(), z.any()),
});

/**
 * Functions 运行时配置 Schema
 * 新增：用于 Functions 的运行时配置
 */
export const FunctionsRuntimeConfigSchema = z.record(z.string(), z.any());

/**
 * 全局配置 Schema
 * 整合所有模块的配置
 */
export const AppConfigSchema = z.object({
  global: GlobalSchema,
  database: DatabaseSchema,
  llm: LLMSchema,
  llm_retry: LLMRetrySchema,
  tools: ToolSchema,
  prompts: PromptSchema,
  pool: PoolSchema,
  taskGroup: TaskGroupSchema,
  workflow_functions: WorkflowFunctionSchema,
  workflow: WorkflowConfigSchema,
  http: HttpConfigSchema,
  llm_runtime: LLMRuntimeConfigSchema,
  prompts_runtime: PromptsRuntimeConfigSchema,
  tools_runtime: ToolsRuntimeConfigSchema,
  workflows_runtime: WorkflowsRuntimeConfigSchema,
  functions_runtime: FunctionsRuntimeConfigSchema,
});

/**
 * 从 Schema 推断类型
 */
export type HttpConfig = z.infer<typeof HttpConfigSchema>;
export type LLMRuntimeConfig = z.infer<typeof LLMRuntimeConfigSchema>;
export type PromptsRuntimeConfig = z.infer<typeof PromptsRuntimeConfigSchema>;
export type ToolsRuntimeConfig = z.infer<typeof ToolsRuntimeConfigSchema>;
export type WorkflowsRuntimeConfig = z.infer<typeof WorkflowsRuntimeConfigSchema>;
export type FunctionsRuntimeConfig = z.infer<typeof FunctionsRuntimeConfigSchema>;
export type AppConfig = z.infer<typeof AppConfigSchema>;

/**
 * 类型安全的配置访问器
 * 提供编译时类型检查和 IDE 自动补全
 */
export class TypedConfig {
  private config: Partial<AppConfig> = {};

  /**
   * 设置配置（用于初始化）
   */
  setConfig(config: Partial<AppConfig>): void {
    this.config = config;
  }

  /**
   * 获取全局配置
   */
  get global(): GlobalConfig {
    return this.config.global as GlobalConfig;
  }

  /**
   * 获取数据库配置
   */
  get database(): DatabaseConfig {
    return this.config.database as DatabaseConfig;
  }

  /**
   * 获取 LLM 重试配置
   */
  get llm_retry(): LLMRetryConfig {
    return this.config.llm_retry as LLMRetryConfig;
  }

  /**
   * 获取 LLM 配置
   */
  get llm(): z.infer<typeof LLMSchema> {
    return this.config.llm as z.infer<typeof LLMSchema>;
  }

  /**
   * 获取 Tools 配置
   */
  get tools(): z.infer<typeof ToolSchema> {
    return this.config.tools as z.infer<typeof ToolSchema>;
  }

  /**
   * 获取 Prompts 配置
   */
  get prompts(): z.infer<typeof PromptSchema> {
    return this.config.prompts as z.infer<typeof PromptSchema>;
  }

  /**
   * 获取 Pool 配置
   */
  get pool(): z.infer<typeof PoolSchema> {
    return this.config.pool as z.infer<typeof PoolSchema>;
  }

  /**
   * 获取 TaskGroup 配置
   */
  get taskGroup(): z.infer<typeof TaskGroupSchema> {
    return this.config.taskGroup as z.infer<typeof TaskGroupSchema>;
  }

  /**
   * 获取 Workflow Functions 配置
   */
  get workflow_functions(): z.infer<typeof WorkflowFunctionSchema> {
    return this.config.workflow_functions as z.infer<typeof WorkflowFunctionSchema>;
  }

  /**
   * 获取 Workflow 配置
   */
  get workflow(): z.infer<typeof WorkflowConfigSchema> {
    return this.config.workflow as z.infer<typeof WorkflowConfigSchema>;
  }

  /**
   * 获取 HTTP 配置
   */
  get http(): HttpConfig {
    return this.config.http as HttpConfig;
  }

  /**
   * 获取 LLM 运行时配置
   */
  get llm_runtime(): LLMRuntimeConfig {
    return this.config.llm_runtime as LLMRuntimeConfig;
  }

  /**
   * 获取 Prompts 运行时配置
   */
  get prompts_runtime(): PromptsRuntimeConfig {
    return this.config.prompts_runtime as PromptsRuntimeConfig;
  }

  /**
   * 获取 Tools 运行时配置
   */
  get tools_runtime(): ToolsRuntimeConfig {
    return this.config.tools_runtime as ToolsRuntimeConfig;
  }

  /**
   * 获取 Workflows 运行时配置
   */
  get workflows_runtime(): WorkflowsRuntimeConfig {
    return this.config.workflows_runtime as WorkflowsRuntimeConfig;
  }

  /**
   * 获取 Functions 运行时配置
   */
  get functions_runtime(): FunctionsRuntimeConfig {
    return this.config.functions_runtime as FunctionsRuntimeConfig;
  }
}

/**
 * 类型安全的配置访问器实例
 */
export const typedConfig = new TypedConfig();