/**
 * LLM模块Schema定义
 * 基于 configs/llms 目录的实际配置结构
 * 统一管理提供商、模型、重试、池、任务组等所有LLM相关配置
 */

import { z } from 'zod';

// ============================================================================
// 提供商和模型相关Schema
// ============================================================================

/**
 * 默认请求头Schema
 */
const DefaultHeadersSchema = z.record(z.string(), z.string());

/**
 * 功能支持Schema
 */
const FeaturesSchema = z.object({
  function_calling: z.boolean().optional(),
  streaming: z.boolean().optional(),
  vision: z.boolean().optional(),
  responses_api: z.boolean().optional(),
  caching: z.boolean().optional(),
  thinking_budget: z.boolean().optional(),
  cached_content: z.boolean().optional(),
  json_mode: z.boolean().optional(),
  code_execution: z.boolean().optional(),
});

/**
 * 默认参数Schema
 */
const DefaultsSchema = z.object({
  temperature: z.number().optional(),
  max_tokens: z.number().optional(),
  top_p: z.number().optional(),
  top_k: z.number().optional(),
  frequency_penalty: z.number().optional(),
  presence_penalty: z.number().optional(),
  candidate_count: z.number().optional(),
  stream: z.boolean().optional(),
});

/**
 * 错误处理Schema
 */
const ErrorHandlingSchema = z.object({
  retry_on_rate_limit: z.boolean().optional(),
  retry_on_server_error: z.boolean().optional(),
  max_retry_backoff: z.number().optional(),
});

/**
 * 提供商限流配置Schema
 */
const ProviderRateLimitingSchema = z.object({
  requests_per_minute: z.number().optional(),
  tokens_per_minute: z.number().optional(),
});

/**
 * 提供商降级配置Schema
 */
const ProviderFallbackConfigSchema = z.object({
  enabled: z.boolean().optional(),
  max_attempts: z.number().optional(),
});

/**
 * 元数据Schema
 */
const MetadataSchema = z.object({
  provider: z.string().optional(),
  version: z.string().optional(),
  description: z.string().optional(),
  supported_features: z.array(z.string()).optional(),
  unsupported_features: z.array(z.string()).optional(),
});

/**
 * API端点配置Schema
 */
const ApiEndpointsSchema = z.object({
  chat_completions: z.string().optional(),
  responses: z.string().optional(),
});

/**
 * 模型限制Schema
 */
const LimitsSchema = z.object({
  max_input_tokens: z.number().optional(),
  max_output_tokens: z.number().optional(),
});

/**
 * 模型特定参数Schema
 */
const ParametersSchema = z.object({
  temperature: z.number().optional(),
  max_tokens: z.number().optional(),
  timeout: z.number().optional(),
});

/**
 * 提供商通用配置Schema
 */
const ProviderCommonConfigSchema = z.object({
  // 基础配置
  provider: z.string(),
  model_type: z.string().optional(),
  clientType: z.enum(['native', 'openai-compatible']).optional(),

  // API配置
  base_url: z.string().optional(),
  api_version: z.string().optional(),
  api_key: z.string().optional(),
  api_format: z.enum(['chat_completion', 'responses']).optional(),

  // HTTP客户端配置
  timeout: z.number().optional(),
  max_retries: z.number().optional(),
  retry_delay: z.number().optional(),
  backoff_factor: z.number().optional(),
  pool_connections: z.number().optional(),

  // 默认请求头
  default_headers: DefaultHeadersSchema.optional(),

  // 功能支持
  features: FeaturesSchema.optional(),

  // 默认参数
  defaults: DefaultsSchema.optional(),

  // 错误处理
  error_handling: ErrorHandlingSchema.optional(),

  // 支持的模型列表
  models: z.array(z.string()).optional(),

  // 限流配置
  rate_limiting: ProviderRateLimitingSchema.optional(),

  // 降级配置
  fallback_config: ProviderFallbackConfigSchema.optional(),

  // 元数据
  metadata: MetadataSchema.optional(),
});

/**
 * 模型特定配置Schema
 */
const ModelConfigSchema = z.object({
  // 继承配置
  inherits_from: z.string().optional(),

  // 模型特定配置
  models: z.array(z.string()).optional(),

  // 模型特定参数
  parameters: ParametersSchema.optional(),

  // 功能支持
  features: FeaturesSchema.optional(),

  // API端点配置
  api_endpoints: ApiEndpointsSchema.optional(),

  // 模型限制
  limits: LimitsSchema.optional(),
});

// ============================================================================
// 重试配置Schema
// ============================================================================

/**
 * 重试错误类型配置Schema
 */
const RetryErrorsSchema = z.object({
  types: z.array(z.enum(['timeout', 'rate_limit', 'service_unavailable'])).optional(),
});

/**
 * 重试配置Schema
 */
const RetryConfigSchema = z.object({
  base_delay: z.number().min(0).optional(),
  max_delay: z.number().min(0).optional(),
  jitter: z.boolean().optional(),
  exponential_base: z.number().min(1).optional(),
  retry_on_status_codes: z.array(z.number()).optional(),
  retry_errors: RetryErrorsSchema.optional(),
});

// ============================================================================
// 池配置Schema
// ============================================================================

/**
 * 轮询策略Schema
 */
const RotationSchema = z.object({
  strategy: z.enum(['round_robin', 'least_recently_used', 'weighted']),
  currentIndex: z.number().optional(),
});

/**
 * 健康检查Schema
 */
const HealthCheckSchema = z.object({
  interval: z.number().optional(),
  failure_threshold: z.number().optional(),
});

/**
 * 并发控制Schema
 */
const ConcurrencyControlSchema = z.object({
  enabled: z.boolean().optional(),
  maxConcurrency: z.number().optional(),
});

/**
 * 池限流配置Schema
 */
const PoolRateLimitingSchema = z.object({
  enabled: z.boolean().optional(),
  requestsPerMinute: z.number().optional(),
});

/**
 * 池降级配置Schema
 */
const PoolFallbackConfigSchema = z.object({
  strategy: z.string().optional(),
  maxInstanceAttempts: z.number().optional(),
});

/**
 * 实例配置Schema
 */
const InstanceSchema = z.object({
  name: z.string(),
  provider: z.string(),
  model: z.string(),
  weight: z.number().optional(),
});

/**
 * 轮询池配置Schema
 */
const PoolConfigSchema = z.object({
  name: z.string(),
  task_groups: z.array(z.string()).optional(),
  rotation: RotationSchema.optional(),
  health_check: HealthCheckSchema.optional(),
  concurrency_control: ConcurrencyControlSchema.optional(),
  rate_limiting: PoolRateLimitingSchema.optional(),
  fallback_config: PoolFallbackConfigSchema.optional(),
  instances: z.array(InstanceSchema).optional(),
});

// ============================================================================
// 任务组配置Schema
// ============================================================================

/**
 * 层级配置Schema
 *
 * 注意：每个层级只配置一个模型，不再使用数组
 */
const EchelonSchema = z.object({
  priority: z.number(),
  model: z.string(), // 单个模型名称
  provider: z.string(), // 模型提供商
});

/**
 * 任务组降级配置Schema
 */
const TaskGroupFallbackConfigSchema = z.object({
  strategy: z.enum(['echelon_down', 'pool_fallback', 'global_fallback']).optional(),
  maxAttempts: z.number().optional(),
  retryDelay: z.number().optional(),
});

/**
 * 熔断器配置Schema
 */
const CircuitBreakerSchema = z.object({
  failure_threshold: z.number().optional(),
  reset_timeout: z.number().optional(),
  half_open_requests: z.number().optional(),
});

/**
 * 任务组配置Schema
 */
const TaskGroupConfigSchema = z
  .object({
    name: z.string(),
    fallbackStrategy: z.string().optional(),
    maxAttempts: z.number().optional(),
    retryDelay: z.number().optional(),
    circuitBreaker: CircuitBreakerSchema.optional(),
  })
  .and(
    z.object({
      echelon1: EchelonSchema.optional(),
      echelon2: EchelonSchema.optional(),
      echelon3: EchelonSchema.optional(),
    })
  );

// ============================================================================
// LLM模块主Schema
// ============================================================================

/**
 * LLM模块Schema
 * 统一管理所有LLM相关配置
 */
export const LLMSchema = z.object({
  // 提供商配置
  providers: z.record(z.string(), ProviderCommonConfigSchema).optional(),

  // 模型配置
  models: z.record(z.string(), ModelConfigSchema).optional(),

  // 重试配置
  retry_config: RetryConfigSchema.optional(),

  // 池配置
  pools: z.record(z.string(), PoolConfigSchema).optional(),

  // 任务组配置
  task_groups: z.record(z.string(), TaskGroupConfigSchema).optional(),

  // 向后兼容
  groups: z.record(z.string(), z.object({})).optional(),
  _group: z.object({}).optional(),
  _registry: z.string().optional(),
});

// ============================================================================
// 导出类型
// ============================================================================

/**
 * LLM配置类型
 */
export type LLMConfig = z.infer<typeof LLMSchema>;

/**
 * 提供商配置类型
 */
export type ProviderCommonConfig = z.infer<typeof ProviderCommonConfigSchema>;

/**
 * 模型配置类型
 */
export type ModelConfig = z.infer<typeof ModelConfigSchema>;

/**
 * 重试配置类型
 */
export type RetryConfig = z.infer<typeof RetryConfigSchema>;

/**
 * 池配置类型
 */
export type PoolConfig = z.infer<typeof PoolConfigSchema>;

/**
 * 任务组配置类型
 */
export type TaskGroupConfig = z.infer<typeof TaskGroupConfigSchema>;

// ============================================================================
// 导出单个配置Schema（用于拆分后的配置文件）
// ============================================================================

/**
 * 单个提供商通用配置Schema（用于拆分后的配置文件）
 */
export const SingleProviderCommonSchema = ProviderCommonConfigSchema;

/**
 * 单个模型配置Schema（用于拆分后的配置文件）
 */
export const SingleModelSchema = ModelConfigSchema;

/**
 * 单个重试配置Schema（用于拆分后的配置文件）
 */
export const SingleRetrySchema = RetryConfigSchema;

/**
 * 单个池配置Schema（用于拆分后的配置文件）
 */
export const SinglePoolSchema = PoolConfigSchema;

/**
 * 单个任务组配置Schema（用于拆分后的配置文件）
 */
export const SingleTaskGroupSchema = TaskGroupConfigSchema;