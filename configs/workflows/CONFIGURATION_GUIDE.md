# 工作流配置系统设计文档

## 概述

工作流配置系统提供了一套灵活的默认值管理机制，支持多层级配置覆盖，避免重复配置，提高配置的可维护性和复用性。

## 工作流类型说明

### 业务工作流（business/）
- 完整的业务流程，可直接执行
- **必须包含 start 和 end 节点**
- start 节点负责初始化上下文和状态
- end 节点负责收集结果和清理资源
- 可引用基础子工作流和功能工作流

### 基础子工作流（base/）
- 封装基础操作，可被其他工作流引用
- **不需要 start 和 end 节点**
- 通过入度/出度确定入口和出口节点
- 必须符合子工作流标准（入度/出度 <= 1）

### 功能工作流（features/）
- 按功能领域划分的工作流
- 可引用基础子工作流
- 如果作为独立工作流执行，需要包含 start/end 节点
- 如果作为子工作流引用，不需要 start/end 节点

## 设计目标

1. **减少重复配置**：通过默认值系统避免每次调用都传递完整参数
2. **保持灵活性**：支持在任意层级覆盖默认值
3. **易于维护**：集中管理默认配置，便于统一修改
4. **向后兼容**：不影响现有调用方式
5. **环境隔离**：支持不同环境的配置差异

## 配置文件结构

```
configs/workflows/
├── defaults.toml              # 全局默认配置
├── README.md                  # 目录结构说明
├── CONFIGURATION_GUIDE.md     # 本文档
├── base/                      # 基础子工作流
│   └── llm-call.toml
├── features/                  # 功能工作流
│   └── ...
├── business/                  # 业务工作流
│   └── ...
└── examples/                  # 配置示例
    ├── simple-chat.toml
    └── ...
```

## defaults.toml 配置详解

### 配置层级

```
调用参数 (最高优先级)
    ↓
工作流级别配置
    ↓
目录级别配置 (base/features/business)
    ↓
全局默认配置 (最低优先级)
```

### 配置分类

#### 1. 全局默认配置 (`[defaults]`)

适用于所有工作流的通用默认值：

```toml
[defaults]
[defaults.llm]
wrapper_type = "pool"
wrapper_name = "default_pool"
wrapper_provider = "openai"
wrapper_model = "gpt-4o-mini"
temperature = 0.7
max_tokens = 2048
stream = false
tool_timeout = 30000

[defaults.llm.prompt]
type = "direct"
content = ""

[defaults.llm.system_prompt]
type = "direct"
content = ""
```

**适用场景**：
- 所有工作流共用的基础配置
- LLM 调用的通用参数
- 提示词的默认结构

#### 2. 目录级别默认配置

针对不同类型工作流的特定默认值：

```toml
[base]
[base.llm_call]
wrapper_type = "pool"
wrapper_name = "default_pool"
temperature = 0.7
max_tokens = 2048
tool_timeout = 30000

[base.tool_execution]
tool_timeout = 30000
retry_count = 3
retry_delay = 1000

[features]
[features.data_processing]
batch_size = 100
parallel_workers = 4
timeout = 60000

[features.analysis]
confidence_threshold = 0.8
include_details = true
export_format = "json"

[business]
[business.common]
enable_logging = true
enable_metrics = true
enable_tracing = false
max_execution_time = 300000
```

**适用场景**：
- 基础子工作流的特定配置
- 功能工作流的领域特定配置
- 业务工作流的业务规则配置

#### 3. 预设场景配置 (`[presets]`)

提供常用场景的预设配置：

```toml
[presets]
[presets.fast]
wrapper_type = "direct"
wrapper_provider = "openai"
wrapper_model = "gpt-4o-mini"
temperature = 0.5
max_tokens = 1024

[presets.high_quality]
wrapper_type = "direct"
wrapper_provider = "openai"
wrapper_model = "gpt-4o"
temperature = 0.7
max_tokens = 4096

[presets.economy]
wrapper_type = "pool"
wrapper_name = "economy_pool"
temperature = 0.7
max_tokens = 2048

[presets.high_availability]
wrapper_type = "pool"
wrapper_name = "high_availability_pool"
temperature = 0.7
max_tokens = 2048
```

**适用场景**：
- 快速响应场景（使用最快的模型）
- 高质量场景（使用最强的模型）
- 经济场景（使用成本最低的模型）
- 高可用场景（使用高可用池）

#### 4. 环境特定配置 (`[environments]`)

针对不同环境的配置：

```toml
[environments]
[environments.development]
wrapper_type = "direct"
wrapper_provider = "mock"
wrapper_model = "mock-model"
temperature = 0.7
max_tokens = 1024
enable_debug = true

[environments.testing]
wrapper_type = "direct"
wrapper_provider = "openai"
wrapper_model = "gpt-4o-mini"
temperature = 0.7
max_tokens = 2048
enable_debug = true

[environments.production]
wrapper_type = "pool"
wrapper_name = "high_availability_pool"
temperature = 0.7
max_tokens = 2048
enable_debug = false
enable_metrics = true
enable_tracing = true
```

**适用场景**：
- 开发环境（使用 mock 模型）
- 测试环境（使用快速模型）
- 生产环境（使用高可用配置）

## 工作流配置文件设计

### 基本结构

```toml
[workflow]
id = "workflow_id"
name = "工作流名称"
description = "工作流描述"
version = "1.0.0"

# 参数定义
[workflow.parameters]
# 参数配置...

# 节点定义
[[workflow.nodes]]
# 节点配置...

# 边定义
[[workflow.edges]]
# 边配置...
```

### 参数定义

#### 必需参数

```toml
[workflow.parameters.prompt]
type = "string"
required = true
description = "用户输入的对话内容"
```

#### 可选参数（使用默认值）

```toml
[workflow.parameters.system_prompt]
type = "string"
default = ""
description = "系统提示词（可选）"
```

#### 引用默认配置

```toml
[workflow.parameters.wrapper_type]
type = "string"
default = "{{defaults.llm.wrapper_type}}"
description = "Wrapper类型（使用默认值）"
```

### 节点配置

#### 使用参数引用

```toml
[[workflow.nodes]]
id = "llm_node"
type = "llm"
name = "LLM对话"

[workflow.nodes.config]
# 使用参数引用，实际值由参数替换器填充
wrapper_type = "{{parameters.wrapper_type}}"
wrapper_name = "{{parameters.wrapper_name}}"
wrapper_provider = "{{parameters.wrapper_provider}}"
wrapper_model = "{{parameters.wrapper_model}}"

[workflow.nodes.config.prompt]
type = "direct"
content = "{{parameters.prompt}}"

temperature = "{{parameters.temperature}}"
max_tokens = "{{parameters.max_tokens}}"
```

#### 使用默认值

```toml
[[workflow.nodes]]
id = "llm_node"
type = "llm"
name = "LLM对话"

[workflow.nodes.config]
# 直接使用默认值，不通过参数
wrapper_type = "pool"
wrapper_name = "default_pool"

[workflow.nodes.config.prompt]
type = "direct"
content = "{{parameters.prompt}}"
```

## 配置合并规则

### 1. 深度合并

嵌套对象会递归合并：

```toml
# defaults.toml
[defaults.llm]
wrapper_type = "pool"
wrapper_name = "default_pool"
temperature = 0.7
max_tokens = 2048

# 调用时传入
{
  wrapper_type: "direct",
  wrapper_provider: "openai",
  wrapper_model: "gpt-4o"
}

# 合并结果
{
  wrapper_type: "direct",        # 覆盖
  wrapper_provider: "openai",    # 新增
  wrapper_model: "gpt-4o",       # 新增
  temperature: 0.7,              # 保留默认值
  max_tokens: 2048               # 保留默认值
}
```

### 2. 数组替换

数组参数会被完全替换，不会合并：

```toml
# defaults.toml
[defaults.tools]
allowed_tools = ["calculator", "time_tool"]

# 调用时传入
{
  allowed_tools: ["search", "weather"]
}

# 合并结果
{
  allowed_tools: ["search", "weather"]  # 完全替换
}
```

### 3. 类型保持

保持参数的类型：

```toml
# defaults.toml
temperature = 0.7        # 数字
max_tokens = 2048        # 数字
stream = false           # 布尔值

# 调用时传入
{
  temperature: "0.8"     # 字符串
}

# 合并结果
{
  temperature: "0.8",    # 保持字符串类型
  max_tokens: 2048,      # 保持数字类型
  stream: false          # 保持布尔类型
}
```

### 4. 必需参数

如果参数标记为 `required = true`，则必须提供值：

```toml
[workflow.parameters.prompt]
type = "string"
required = true
description = "必需参数"
```

## 使用示例

### 示例 1：使用全局默认配置

```typescript
// 不传参数，使用 defaults.toml 中的全局默认值
const workflow = await workflowManagement.loadWorkflow('simple_chat', {
  prompt: "你好，请介绍一下自己"
});

// 实际使用的配置：
// {
//   wrapper_type: "pool",
//   wrapper_name: "default_pool",
//   wrapper_provider: "openai",
//   wrapper_model: "gpt-4o-mini",
//   temperature: 0.7,
//   max_tokens: 2048,
//   prompt: "你好，请介绍一下自己"
// }
```

### 示例 2：覆盖部分参数

```typescript
// 只覆盖 wrapper 相关参数，其他参数使用默认值
const workflow = await workflowManagement.loadWorkflow('simple_chat', {
  prompt: "你好",
  wrapper_type: "direct",
  wrapper_provider: "gemini",
  wrapper_model: "gemini-2.5-pro"
});

// 实际使用的配置：
// {
//   wrapper_type: "direct",           # 覆盖
//   wrapper_provider: "gemini",       # 覆盖
//   wrapper_model: "gemini-2.5-pro",  # 覆盖
//   temperature: 0.7,                 # 使用默认值
//   max_tokens: 2048,                 # 使用默认值
//   prompt: "你好"                    # 传入值
// }
```

### 示例 3：使用预设场景

```typescript
// 使用快速响应预设
const workflow = await workflowManagement.loadWorkflow('simple_chat', {
  prompt: "快速回答",
  preset: "fast"
});

// 实际使用的配置（来自 presets.fast）：
// {
//   wrapper_type: "direct",
//   wrapper_provider: "openai",
//   wrapper_model: "gpt-4o-mini",
//   temperature: 0.5,
//   max_tokens: 1024,
//   prompt: "快速回答"
// }
```

### 示例 4：使用环境配置

```typescript
// 使用生产环境配置
const workflow = await workflowManagement.loadWorkflow('simple_chat', {
  prompt: "生产环境调用",
  environment: "production"
});

// 实际使用的配置（来自 environments.production）：
// {
//   wrapper_type: "pool",
//   wrapper_name: "high_availability_pool",
//   temperature: 0.7,
//   max_tokens: 2048,
//   enable_debug: false,
//   enable_metrics: true,
//   enable_tracing: true,
//   prompt: "生产环境调用"
// }
```

### 示例 5：完整自定义

```typescript
// 所有参数都自定义
const workflow = await workflowManagement.loadWorkflow('simple_chat', {
  prompt: "详细分析",
  wrapper_type: "direct",
  wrapper_provider: "openai",
  wrapper_model: "gpt-4o",
  temperature: 0.8,
  max_tokens: 4096,
  stream: true
});

// 所有参数都使用传入的值，不使用默认值
```

## 实现要点

### 1. 配置加载流程

```typescript
async loadWorkflowConfig(
  workflowId: string,
  parameters?: Record<string, any>
): Promise<WorkflowConfig> {
  // 1. 加载默认配置
  const defaultConfig = await this.loadDefaultConfig();
  
  // 2. 加载工作流特定配置
  const workflowConfig = await this.loadRawConfig(workflowId);
  
  // 3. 确定工作流类型（base/features/business）
  const workflowType = this.determineWorkflowType(workflowId);
  
  // 4. 获取目录级别默认配置
  const directoryDefaults = defaultConfig[workflowType] || {};
  
  // 5. 合并配置：调用参数 > 工作流配置 > 目录默认 > 全局默认
  const mergedConfig = this.mergeConfigs(
    parameters || {},
    workflowConfig.parameters || {},
    directoryDefaults,
    defaultConfig.defaults || {}
  );
  
  // 6. 替换参数引用
  const finalConfig = ParameterReplacer.replace(
    workflowConfig,
    mergedConfig
  );
  
  return finalConfig as WorkflowConfig;
}
```

### 2. 配置合并算法

```typescript
private mergeConfigs(...configs: Record<string, any>[]): Record<string, any> {
  const result: Record<string, any> = {};
  
  // 从低优先级到高优先级依次合并
  for (const config of configs) {
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        // 深度合并对象
        result[key] = this.mergeConfigs(result[key] || {}, value);
      } else {
        // 直接替换值
        result[key] = value;
      }
    }
  }
  
  return result;
}
```

### 3. 预设处理

```typescript
private async applyPreset(
  parameters: Record<string, any>,
  defaultConfig: Record<string, any>
): Promise<Record<string, any>> {
  if (parameters.preset && defaultConfig.presets) {
    const presetConfig = defaultConfig.presets[parameters.preset];
    if (presetConfig) {
      // 预设配置与调用参数合并，调用参数优先
      return { ...presetConfig, ...parameters };
    }
  }
  return parameters;
}
```

### 4. 环境配置处理

```typescript
private async applyEnvironment(
  parameters: Record<string, any>,
  defaultConfig: Record<string, any>
): Promise<Record<string, any>> {
  const env = parameters.environment || process.env.NODE_ENV || 'development';
  const envConfig = defaultConfig.environments?.[env];
  
  if (envConfig) {
    // 环境配置与调用参数合并，调用参数优先
    return { ...envConfig, ...parameters };
  }
  
  return parameters;
}
```

## 最佳实践

### 1. 合理设置默认值

在 `defaults.toml` 中设置合理的全局默认值：

```toml
[defaults.llm]
# 使用成本较低但性能良好的模型作为默认
wrapper_type = "pool"
wrapper_name = "default_pool"
temperature = 0.7  # 平衡创造性和准确性
max_tokens = 2048  # 适中的输出长度
```

### 2. 按需覆盖

只在需要时覆盖特定参数，避免过度配置：

```typescript
// ❌ 不推荐：覆盖所有参数
const workflow = await workflowManagement.loadWorkflow('simple_chat', {
  prompt: "你好",
  wrapper_type: "direct",
  wrapper_provider: "openai",
  wrapper_model: "gpt-4o-mini",
  temperature: 0.7,
  max_tokens: 2048,
  stream: false,
  tool_timeout: 30000
});

// ✅ 推荐：只覆盖需要改变的参数
const workflow = await workflowManagement.loadWorkflow('simple_chat', {
  prompt: "你好",
  wrapper_type: "direct",
  wrapper_provider: "openai",
  wrapper_model: "gpt-4o-mini"
});
```

### 3. 使用预设

对于常见场景，使用预设配置：

```typescript
// ✅ 推荐：使用预设
const workflow = await workflowManagement.loadWorkflow('simple_chat', {
  prompt: "快速回答",
  preset: "fast"
});

// ✅ 推荐：使用预设并覆盖部分参数
const workflow = await workflowManagement.loadWorkflow('simple_chat', {
  prompt: "详细分析",
  preset: "high_quality",
  max_tokens: 8192  // 覆盖预设的 max_tokens
});
```

### 4. 环境隔离

使用环境特定配置区分开发和生产环境：

```toml
# defaults.toml
[environments.development]
wrapper_type = "direct"
wrapper_provider = "mock"
enable_debug = true

[environments.production]
wrapper_type = "pool"
wrapper_name = "high_availability_pool"
enable_debug = false
enable_metrics = true
```

```typescript
// 开发环境
const workflow = await workflowManagement.loadWorkflow('simple_chat', {
  prompt: "测试",
  environment: "development"
});

// 生产环境
const workflow = await workflowManagement.loadWorkflow('simple_chat', {
  prompt: "生产调用",
  environment: "production"
});
```

### 5. 文档化配置

在配置文件中添加注释说明参数用途：

```toml
[defaults.llm]
# LLM 调用的默认配置
wrapper_type = "pool"           # 使用轮询池实现负载均衡
wrapper_name = "default_pool"   # 默认轮询池名称
temperature = 0.7               # 温度参数：0-1，越高越随机
max_tokens = 2048               # 最大输出令牌数
stream = false                  # 是否启用流式输出
tool_timeout = 30000            # 工具执行超时时间（毫秒）
```

### 6. 版本控制

在 `defaults.toml` 中添加版本信息：

```toml
# 配置文件版本
version = "1.0.0"
last_updated = "2025-01-15"
```

### 7. 配置验证

在加载配置时进行验证：

```typescript
private validateConfig(config: Record<string, any>): void {
  // 验证必需参数
  if (!config.wrapper_type) {
    throw new Error('wrapper_type 是必需参数');
  }
  
  // 验证参数类型
  if (config.temperature && typeof config.temperature !== 'number') {
    throw new Error('temperature 必须是数字');
  }
  
  // 验证参数范围
  if (config.temperature && (config.temperature < 0 || config.temperature > 1)) {
    throw new Error('temperature 必须在 0-1 之间');
  }
}
```

## 迁移指南

### 从旧配置迁移

如果现有工作流没有使用默认配置系统，可以逐步迁移：

#### 步骤 1：识别重复配置

找出工作流中重复出现的参数：

```toml
# 旧配置
[[workflow.nodes]]
id = "llm_node_1"
type = "llm"
[workflow.nodes.config]
wrapper_type = "direct"
wrapper_provider = "openai"
wrapper_model = "gpt-4o-mini"
temperature = 0.7
max_tokens = 2048

[[workflow.nodes]]
id = "llm_node_2"
type = "llm"
[workflow.nodes.config]
wrapper_type = "direct"
wrapper_provider = "openai"
wrapper_model = "gpt-4o-mini"
temperature = 0.7
max_tokens = 2048
```

#### 步骤 2：提取到默认配置

将重复配置提取到 `defaults.toml`：

```toml
# defaults.toml
[defaults.llm]
wrapper_type = "direct"
wrapper_provider = "openai"
wrapper_model = "gpt-4o-mini"
temperature = 0.7
max_tokens = 2048
```

#### 步骤 3：简化工作流配置

使用参数引用简化工作流配置：

```toml
# 新配置
[[workflow.nodes]]
id = "llm_node_1"
type = "llm"
[workflow.nodes.config]
wrapper_type = "{{parameters.wrapper_type}}"
wrapper_provider = "{{parameters.wrapper_provider}}"
wrapper_model = "{{parameters.wrapper_model}}"
temperature = "{{parameters.temperature}}"
max_tokens = "{{parameters.max_tokens}}"

[[workflow.nodes]]
id = "llm_node_2"
type = "llm"
[workflow.nodes.config]
wrapper_type = "{{parameters.wrapper_type}}"
wrapper_provider = "{{parameters.wrapper_provider}}"
wrapper_model = "{{parameters.wrapper_model}}"
temperature = "{{parameters.temperature}}"
max_tokens = "{{parameters.max_tokens}}"
```

#### 步骤 4：测试验证

确保迁移后的配置行为一致：

```typescript
// 测试旧配置
const oldWorkflow = await workflowManagement.loadWorkflow('old_workflow', {
  prompt: "测试"
});

// 测试新配置
const newWorkflow = await workflowManagement.loadWorkflow('new_workflow', {
  prompt: "测试"
});

// 验证结果一致
```

## 总结

工作流配置系统通过多层级默认值管理，实现了：

1. **减少重复配置**：通过默认值系统避免重复
2. **提高灵活性**：支持任意层级覆盖
3. **易于维护**：集中管理默认配置
4. **向后兼容**：不影响现有调用方式
5. **环境隔离**：支持不同环境配置

合理使用默认配置系统可以显著提高工作流配置的可维护性和复用性。