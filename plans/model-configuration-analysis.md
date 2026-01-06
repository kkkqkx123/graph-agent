# 模型配置结构分析报告

## 当前配置结构分析

### 1. Provider配置结构 (`configs/llms/provider/`)

#### 目录组织
```
configs/llms/provider/
├── openai/
│   ├── common.toml          # OpenAI通用配置
│   ├── gpt-4o.toml          # GPT-4o特定配置
│   ├── gpt-4.1.toml         # GPT-4.1特定配置
│   └── gpt-5.1.toml         # GPT-5.1特定配置
├── gemini/
│   ├── common.toml
│   ├── gemini-2.5-flash.toml
│   └── gemini-2.5-pro.toml
└── human_relay/
    ├── common.toml
    ├── human-relay-m.toml
    └── human-relay-s.toml
```

#### 配置文件结构

**common.toml（通用配置）**
```toml
provider = "openai"
model_type = "openai"

# API配置
base_url = "https://api.openai.com/v1"
api_version = "v1"
api_key = "${OPENAI_API_KEY}"
api_format = "chat_completion"

# HTTP客户端配置
timeout = 30
max_retries = 3
retry_delay = 1.0
backoff_factor = 2.0
pool_connections = 10

# 功能支持
[features]
function_calling = true
streaming = true
vision = true
responses_api = true

# 默认参数
[defaults]
temperature = 0.7
max_tokens = 2048
top_p = 1.0
frequency_penalty = 0.0
presence_penalty = 0.0

# 支持的模型列表
models = [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-5-mini",
    "gpt-5-nano",
    "gpt-5.1-codex",
    "gpt-5-codex",
    "gpt-5",
    "gpt-5.1",
]

# 限流配置
[rate_limiting]
requests_per_minute = 3500
tokens_per_minute = 90000
```

**模型特定配置（如gpt-4o.toml）**
```toml
inherits_from = "common.toml"

# 模型特定配置
models = [
    "gpt-4o",
    "gpt-4o-2024-05-13",
    "gpt-4o-2024-08-06"
]

# 模型特定参数
[parameters]
temperature = 0.7
max_tokens = 4096
timeout = 30

# 功能支持
[features]
function_calling = true
streaming = true
vision = true
responses_api = false  # GPT-4o不支持Responses API

# API端点配置
[api_endpoints]
chat_completions = "/chat/completions"

# 模型限制
[limits]
max_input_tokens = 128000
max_output_tokens = 4096
```

### 2. Pools配置结构 (`configs/llms/pools.toml`)

```toml
[pools.fast_pool]
name = "fast_pool"
task_groups = ["fast_group"]

[pools.fast_pool.rotation]
strategy = "round_robin"

[pools.fast_pool.health_check]
interval = 30
failure_threshold = 3

# 实例配置 - 这里已经包含了provider信息
[[pools.fast_pool.instances]]
name = "openai_gpt4o"
provider = "openai"      # ← 已经有provider字段
model = "gpt-4o"
weight = 1

[[pools.fast_pool.instances]]
name = "openai_gpt4o_mini"
provider = "openai"      # ← 已经有provider字段
model = "gpt-4o-mini"
weight = 2

[[pools.fast_pool.instances]]
name = "anthropic_claude35"
provider = "anthropic"   # ← 已经有provider字段
model = "claude-3-5-sonnet"
weight = 1
```

### 3. Task Groups配置结构 (`configs/llms/task_groups.toml`)

```toml
[task_groups.fast_group]
name = "fast_group"

[task_groups.fast_group.echelon1]
models = ["openai:gpt-4o", "anthropic:claude-3-5-sonnet"]  # ← 使用provider:model格式
priority = 1

[task_groups.fast_group.echelon2]
models = ["openai:gpt-4o-mini", "anthropic:claude-3-haiku"]
priority = 2
```

## 配置结构分析

### 关键发现

1. **Pools配置已经包含provider信息**
   - `instances`数组中的每个实例都有`provider`字段
   - 这个信息可以直接用于构建模型到提供商的映射

2. **Task Groups使用provider:model格式**
   - 模型名称格式为`provider:model`（如`openai:gpt-4o`）
   - 需要解析这种格式来提取提供商信息

3. **Provider配置按目录组织**
   - 每个提供商有自己的目录
   - 包含通用配置和模型特定配置
   - 使用`inherits_from`实现配置继承

### 当前实现的问题

#### 问题1: pool-manager.ts没有使用pools.toml中的instances配置
**当前实现：**
```typescript
// pool-manager.ts
private async buildModelProviderMap(config: Record<string, any>): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  
  // 尝试从modelProviders获取（但pools.toml中没有这个字段）
  if (config['modelProviders']) {
    for (const [model, provider] of Object.entries(config['modelProviders'])) {
      map.set(model, provider as string);
    }
  }
  
  // 从taskGroups获取，但taskGroups中的模型是provider:model格式
  const taskGroups = config['taskGroups'] || [];
  for (const taskGroupRef of taskGroups) {
    try {
      const models = await this.taskGroupManager.getModelsForGroup(taskGroupRef);
      // models是["openai:gpt-4o", "anthropic:claude-3-5-sonnet"]格式
      // 但这里直接当作模型名使用，没有解析provider
      for (const model of models) {
        if (!map.has(model)) {
          const provider = config['groupProviders']?.[groupName] || 
                          config['defaultProvider'];
          if (provider) {
            map.set(model, provider as string);
          }
        }
      }
    } catch (error) {
      console.error(`获取任务组 ${taskGroupRef} 的模型列表失败:`, error);
    }
  }
  
  return map;
}
```

**问题：**
- 没有使用`instances`配置中的`provider`字段
- 没有解析`provider:model`格式的模型名称
- 依赖不存在的`modelProviders`、`groupProviders`、`defaultProvider`字段

#### 问题2: pool-schema与实际配置不匹配
**当前schema：**
```typescript
const PoolConfigSchema = z.object({
  name: z.string(),
  taskGroups: z.array(z.string()),
  rotation: RotationSchema.optional(),
  healthCheck: HealthCheckSchema.optional(),
  concurrencyControl: ConcurrencyControlSchema.optional(),
  rateLimiting: RateLimitingSchema.optional(),
  fallbackConfig: FallbackConfigSchema.optional(),
  modelProviders: z.record(z.string(), z.string()).optional(),      // ← 不存在
  groupProviders: z.record(z.string(), z.string()).optional(),      // ← 不存在
  defaultProvider: z.string().optional(),                           // ← 不存在
});
```

**实际配置：**
```toml
[pools.fast_pool]
name = "fast_pool"
task_groups = ["fast_group"]

[[pools.fast_pool.instances]]  # ← 实际使用instances
name = "openai_gpt4o"
provider = "openai"
model = "gpt-4o"
weight = 1
```

#### 问题3: Task Group Manager返回的模型格式
**task_groups.toml中的格式：**
```toml
models = ["openai:gpt-4o", "anthropic:claude-3-5-sonnet"]
```

**期望的格式：**
```typescript
// 应该返回纯模型名，还是返回provider:model格式？
// 如果返回provider:model格式，需要解析
// 如果返回纯模型名，需要从其他地方获取provider信息
```

## 推荐的改进方案

### 方案1: 使用instances配置（推荐）

**优点：**
- 直接使用现有配置结构
- 不需要修改配置文件
- 配置清晰明确

**实现：**
```typescript
private async buildModelProviderMap(config: Record<string, any>): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  
  // 从instances配置中提取模型到提供商的映射
  const instances = config['instances'] || [];
  for (const instance of instances) {
    const model = instance['model'];
    const provider = instance['provider'];
    if (model && provider) {
      map.set(model, provider);
    }
  }
  
  // 如果instances中没有，尝试从taskGroups解析
  const taskGroups = config['taskGroups'] || [];
  for (const taskGroupRef of taskGroups) {
    try {
      const models = await this.taskGroupManager.getModelsForGroup(taskGroupRef);
      for (const modelRef of models) {
        // 解析provider:model格式
        const parts = modelRef.split(':');
        if (parts.length === 2) {
          const [provider, modelName] = parts;
          if (!map.has(modelName)) {
            map.set(modelName, provider);
          }
        }
      }
    } catch (error) {
      console.error(`获取任务组 ${taskGroupRef} 的模型列表失败:`, error);
    }
  }
  
  return map;
}
```

### 方案2: 修改pool-schema以匹配实际配置

```typescript
const InstanceSchema = z.object({
  name: z.string(),
  provider: z.string(),
  model: z.string(),
  weight: z.number().optional(),
});

const PoolConfigSchema = z.object({
  name: z.string(),
  taskGroups: z.array(z.string()),
  rotation: RotationSchema.optional(),
  healthCheck: HealthCheckSchema.optional(),
  concurrencyControl: ConcurrencyControlSchema.optional(),
  rateLimiting: RateLimitingSchema.optional(),
  fallbackConfig: FallbackConfigSchema.optional(),
  instances: z.array(InstanceSchema).optional(),  // ← 添加instances字段
});
```

### 方案3: 统一模型名称格式

**选项A: Task Group Manager返回纯模型名**
```typescript
// task-group-manager.ts
async getModelsForGroup(groupName: string): Promise<string[]> {
  // 从配置中获取models = ["openai:gpt-4o", "anthropic:claude-3-5-sonnet"]
  // 返回纯模型名 = ["gpt-4o", "claude-3-5-sonnet"]
  // provider信息需要从其他地方获取
}
```

**选项B: Task Group Manager返回provider:model格式**
```typescript
// task-group-manager.ts
async getModelsForGroup(groupName: string): Promise<string[]> {
  // 返回原始格式 = ["openai:gpt-4o", "anthropic:claude-3-5-sonnet"]
  // 调用方负责解析
}
```

## 推荐方案

**推荐使用方案1 + 方案2的组合：**

1. **修改pool-schema**以匹配实际配置结构
2. **修改buildModelProviderMap**以使用instances配置
3. **支持provider:model格式**的解析作为后备方案

这样可以：
- ✅ 充分利用现有配置
- ✅ 不需要修改配置文件
- ✅ 提供灵活的配置方式
- ✅ 保持向后兼容性

## 配置示例

### 使用instances配置（主要方式）
```toml
[pools.my_pool]
name = "my_pool"
task_groups = ["group1"]

[[pools.my_pool.instances]]
name = "openai_gpt4o"
provider = "openai"
model = "gpt-4o"
weight = 1

[[pools.my_pool.instances]]
name = "anthropic_claude"
provider = "anthropic"
model = "claude-3-5-sonnet"
weight = 1
```

### 使用task_groups配置（后备方式）
```toml
[task_groups.group1]
name = "group1"

[task_groups.group1.echelon1]
models = ["openai:gpt-4o", "anthropic:claude-3-5-sonnet"]
priority = 1
```

## 总结

当前配置结构已经包含了所有必要的信息：
- **instances配置**提供了明确的provider信息
- **task_groups配置**使用provider:model格式

需要做的是：
1. 修改pool-schema以匹配实际配置
2. 修改pool-manager.ts以正确解析配置
3. 支持两种配置方式的混合使用