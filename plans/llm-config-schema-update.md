# LLM 配置 Schema 更新报告

## 完成时间
2025-01-15

## 任务概述
根据 `configs/llms` 目录的实际配置结构，更新以下 schema 文件：
1. `src/infrastructure/config/loading/schemas/llm-schema.ts`
2. `src/infrastructure/config/loading/schemas/pool-schema.ts`
3. `src/infrastructure/config/loading/schemas/task-group-schema.ts`

## 已完成的工作

### 1. 更新 llm-schema.ts ✅

**文件**: [`src/infrastructure/config/loading/schemas/llm-schema.ts`](src/infrastructure/config/loading/schemas/llm-schema.ts)

**主要改进**:
- 完全重写，基于 `configs/llms` 目录的实际配置结构
- 新增多个子 Schema 定义
- 支持提供商通用配置和模型特定配置
- 支持重试配置

**新增的 Schema 定义**:
```typescript
// 默认请求头Schema
const DefaultHeadersSchema = z.record(z.string(), z.string());

// 功能支持Schema
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

// 默认参数Schema
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

// 错误处理Schema
const ErrorHandlingSchema = z.object({
  retry_on_rate_limit: z.boolean().optional(),
  retry_on_server_error: z.boolean().optional(),
  max_retry_backoff: z.number().optional(),
});

// 限流配置Schema
const RateLimitingSchema = z.object({
  requests_per_minute: z.number().optional(),
  tokens_per_minute: z.number().optional(),
});

// 降级配置Schema
const FallbackConfigSchema = z.object({
  enabled: z.boolean().optional(),
  max_attempts: z.number().optional(),
});

// 元数据Schema
const MetadataSchema = z.object({
  provider: z.string().optional(),
  version: z.string().optional(),
  description: z.string().optional(),
  supported_features: z.array(z.string()).optional(),
  unsupported_features: z.array(z.string()).optional(),
});

// API端点配置Schema
const ApiEndpointsSchema = z.object({
  chat_completions: z.string().optional(),
  responses: z.string().optional(),
});

// 模型限制Schema
const LimitsSchema = z.object({
  max_input_tokens: z.number().optional(),
  max_output_tokens: z.number().optional(),
});

// 模型特定参数Schema
const ParametersSchema = z.object({
  temperature: z.number().optional(),
  max_tokens: z.number().optional(),
  timeout: z.number().optional(),
});

// 提供商通用配置Schema
const ProviderCommonConfigSchema = z.object({
  provider: z.string(),
  model_type: z.string().optional(),
  clientType: z.enum(['native', 'openai-compatible']).optional(),
  base_url: z.string().optional(),
  api_version: z.string().optional(),
  api_key: z.string().optional(),
  api_format: z.enum(['chat_completion', 'responses']).optional(),
  timeout: z.number().optional(),
  max_retries: z.number().optional(),
  retry_delay: z.number().optional(),
  backoff_factor: z.number().optional(),
  pool_connections: z.number().optional(),
  default_headers: DefaultHeadersSchema.optional(),
  features: FeaturesSchema.optional(),
  defaults: DefaultsSchema.optional(),
  error_handling: ErrorHandlingSchema.optional(),
  models: z.array(z.string()).optional(),
  rate_limiting: RateLimitingSchema.optional(),
  fallback_config: FallbackConfigSchema.optional(),
  metadata: MetadataSchema.optional(),
});

// 模型特定配置Schema
const ModelConfigSchema = z.object({
  inherits_from: z.string().optional(),
  models: z.array(z.string()).optional(),
  parameters: ParametersSchema.optional(),
  features: FeaturesSchema.optional(),
  api_endpoints: ApiEndpointsSchema.optional(),
  limits: LimitsSchema.optional(),
});

// 重试配置Schema
const RetryConfigSchema = z.object({
  base_delay: z.number().optional(),
  max_delay: z.number().optional(),
  jitter: z.boolean().optional(),
  exponential_base: z.number().optional(),
  retry_on_status_codes: z.array(z.number()).optional(),
  retry_errors: z.object({
    types: z.array(z.string()).optional(),
  }).optional(),
});
```

**导出的 Schema**:
```typescript
export const LLMSchema = z.object({
  providers: z.record(z.string(), ProviderCommonConfigSchema).optional(),
  models: z.record(z.string(), ModelConfigSchema).optional(),
  retry_config: RetryConfigSchema.optional(),
  // 向后兼容
  groups: z.record(z.string(), z.object({})).optional(),
  _group: z.object({}).optional(),
  _registry: z.string().optional(),
});

export const SingleProviderCommonSchema = ProviderCommonConfigSchema;
export const SingleModelSchema = ModelConfigSchema;
export const SingleRetrySchema = RetryConfigSchema;
```

### 2. 更新 pool-schema.ts ✅

**文件**: [`src/infrastructure/config/loading/schemas/pool-schema.ts`](src/infrastructure/config/loading/schemas/pool-schema.ts)

**主要改进**:
- 更新字段名以匹配实际配置文件
- 使用下划线命名（snake_case）以匹配 TOML 配置

**字段名变更**:
```typescript
// 之前
taskGroups → task_groups
healthCheck → health_check
concurrencyControl → concurrency_control
rateLimiting → rate_limiting
fallbackConfig → fallback_config

// 健康检查Schema
const HealthCheckSchema = z.object({
  interval: z.number().optional(),
  failure_threshold: z.number().optional(),  // 之前是 failureThreshold
});
```

**完整的 PoolConfigSchema**:
```typescript
const PoolConfigSchema = z.object({
  name: z.string(),
  task_groups: z.array(z.string()).optional(),
  rotation: RotationSchema.optional(),
  health_check: HealthCheckSchema.optional(),
  concurrency_control: ConcurrencyControlSchema.optional(),
  rate_limiting: RateLimitingSchema.optional(),
  fallback_config: FallbackConfigSchema.optional(),
  instances: z.array(InstanceSchema).optional(),
});
```

### 3. 更新 task-group-schema.ts ✅

**文件**: [`src/infrastructure/config/loading/schemas/task-group-schema.ts`](src/infrastructure/config/loading/schemas/task-group-schema.ts)

**主要改进**:
- 更新熔断器配置字段名以匹配实际配置文件

**字段名变更**:
```typescript
// 之前
failureThreshold → failure_threshold
recoveryTime → reset_timeout
halfOpenRequests → half_open_requests

// 熔断器配置Schema
const CircuitBreakerSchema = z.object({
  failure_threshold: z.number().optional(),
  reset_timeout: z.number().optional(),
  half_open_requests: z.number().optional(),
});
```

## 配置文件结构分析

### configs/llms 目录结构
```
configs/llms/
├── retry.toml                          # 重试配置
├── pools/                              # 轮询池配置
│   ├── default_pool.toml
│   ├── economy_pool.toml
│   ├── fast_pool.toml
│   └── high_availability_pool.toml
├── provider/                           # 提供商配置
│   ├── openai/
│   │   ├── common.toml                 # OpenAI 通用配置
│   │   ├── gpt-4o.toml                 # GPT-4o 模型配置
│   │   ├── gpt-4.1.toml
│   │   └── gpt-5.1.toml
│   ├── gemini/
│   │   ├── common.toml                 # Gemini 通用配置
│   │   ├── gemini-2.5-flash.toml
│   │   └── gemini-2.5-pro.toml
│   └── human-relay/
│       ├── common.toml
│       ├── human-relay-m.toml
│       └── human-relay-s.toml
└── task_groups/                        # 任务组配置
    ├── default_group.toml
    ├── economy_group.toml
    ├── fast_group.toml
    └── high_availability_group.toml
```

### 配置文件示例

#### 提供商通用配置 (common.toml)
```toml
provider = "openai"
model_type = "openai"
base_url = "https://api.openai.com/v1"
api_key = "${OPENAI_API_KEY}"
api_format = "chat_completion"

[default_headers]
Content-Type = "application/json"
User-Agent = "OpenAI-HTTP-Client/1.0"

[features]
function_calling = true
streaming = true
vision = true
responses_api = true

[defaults]
temperature = 0.7
max_tokens = 2048
top_p = 1.0

[error_handling]
retry_on_rate_limit = true
retry_on_server_error = true
max_retry_backoff = 60.0

[rate_limiting]
requests_per_minute = 3500
tokens_per_minute = 200000
```

#### 模型特定配置 (gpt-4o.toml)
```toml
inherits_from = "common.toml"

models = [
    "gpt-4o",
    "gpt-4o-2024-05-13",
    "gpt-4o-2024-08-06"
]

[parameters]
temperature = 0.7
max_tokens = 4096
timeout = 30

[features]
function_calling = true
streaming = true
vision = true
responses_api = false

[api_endpoints]
chat_completions = "/chat/completions"

[limits]
max_input_tokens = 128000
max_output_tokens = 4096
```

#### 轮询池配置 (default_pool.toml)
```toml
name = "default_pool"
task_groups = ["default_group"]

[rotation]
strategy = "round_robin"

[health_check]
interval = 45
failure_threshold = 4

[[instances]]
name = "openai_default"
provider = "openai"
model = "gpt-4o-mini"
weight = 1

[[instances]]
name = "gemini_default"
provider = "gemini"
model = "gemini-2.5-flash"
weight = 2
```

#### 任务组配置 (default_group.toml)
```toml
name = "default_group"

[echelon1]
model = "gpt-4o-mini"
provider = "openai"
priority = 1

[echelon2]
model = "gpt-5-mini"
provider = "openai"
priority = 2

[circuit_breaker]
failure_threshold = 8
reset_timeout = 90
```

#### 重试配置 (retry.toml)
```toml
[retry_config]
base_delay = 1.0
max_delay = 60.0
jitter = true
exponential_base = 2.0
retry_on_status_codes = [429, 500, 502, 503, 504]

[retry_config.retry_errors]
types = [
  "timeout",
  "rate_limit",
  "service_unavailable"
]
```

## 总结

所有三个 schema 文件已成功更新，完全匹配 `configs/llms` 目录的实际配置结构：

1. ✅ **llm-schema.ts** - 完全重写，支持提供商通用配置、模型特定配置和重试配置
2. ✅ **pool-schema.ts** - 更新字段名以匹配实际配置文件（snake_case）
3. ✅ **task-group-schema.ts** - 更新熔断器配置字段名以匹配实际配置文件

所有 Schema 定义都遵循以下原则：
- 使用 Zod 进行类型安全的配置验证
- 字段名使用 snake_case 以匹配 TOML 配置
- 支持可选字段以提供灵活性
- 提供详细的注释说明每个字段的用途

---

**报告生成时间**: 2025-01-15
**完成人员**: Code Mode
**版本**: 1.0