# Workflow配置目录结构说明

## 目录结构

```
configs/workflows/
├── defaults.toml           # 工作流默认参数配置（全局默认值）
├── base/                    # 基础子工作流（无状态、可复用）
│   ├── llm-call.toml       # LLM调用基础操作
│   ├── tool-execution.toml # 工具执行基础操作
│   └── data-transform.toml # 数据转换基础操作
├── features/                # 功能完整工作流
│   ├── data-processing/    # 数据处理工作流
│   ├── analysis/           # 分析工作流
│   └── ...
└── business/               # 业务完整工作流
    └── ...
```

## 层次说明

### 1. 基础子工作流 (base/)
**特点**：
- 封装多个节点/边才能实现的基础操作
- 无状态，可独立测试
- 可被功能工作流和业务工作流引用
- 必须符合子工作流标准
- **不需要 start/end 节点**（由业务工作流提供）

**示例**：
- `llm-call.toml`: LLM调用+工具执行
- `tool-execution.toml`: 工具调用+结果验证
- `data-transform.toml`: 数据转换+格式化

**重要说明**：
- 基础子工作流不需要包含 start 和 end 节点
- start/end 节点由业务工作流提供，用于初始化上下文和收集结果
- 子工作流通过入度/出度确定入口和出口节点
- 子工作流验证器（SubWorkflowValidator）会检查入度/出度是否符合标准

### 2. 功能工作流 (features/)
**特点**：
- 按功能领域划分
- 可引用基础子工作流
- 实现特定功能逻辑
- 可被业务工作流引用

**示例**：
- `data-processing/data-analysis.toml`: 数据分析功能
- `analysis/risk-analysis.toml`: 风险分析功能

### 3. 业务工作流 (business/)
**特点**：
- 完整的业务流程
- 可组合功能和基础子工作流
- 面向具体业务场景
- 可直接执行

## 默认配置系统

### defaults.toml 配置文件

`defaults.toml` 提供工作流的全局默认参数配置，支持多层级覆盖机制，避免重复配置。

#### 配置优先级

参数值的优先级从高到低：

1. **调用时传入的参数** - 最高优先级
2. **工作流级别默认配置** - 在工作流配置文件中定义
3. **目录级别默认配置** - 在 `defaults.toml` 的 `[base]`, `[features]`, `[business]` 中定义
4. **全局默认配置** - 在 `defaults.toml` 的 `[defaults]` 中定义

#### 配置结构

```toml
# 全局默认配置（适用于所有工作流）
[defaults]
[defaults.llm]
wrapper_type = "pool"
wrapper_name = "default_pool"
wrapper_provider = "openai"
wrapper_model = "gpt-4o-mini"
temperature = 0.7
max_tokens = 2048

# 基础子工作流默认配置
[base.llm_call]
wrapper_type = "pool"
wrapper_name = "default_pool"

# 功能工作流默认配置
[features.data_processing]
batch_size = 100
parallel_workers = 4

# 业务工作流默认配置
[business.common]
enable_logging = true
enable_metrics = true

# 预设场景配置
[presets.fast]
wrapper_type = "direct"
wrapper_provider = "openai"
wrapper_model = "gpt-4o-mini"

[presets.high_quality]
wrapper_type = "direct"
wrapper_provider = "openai"
wrapper_model = "gpt-4o"

# 环境特定配置
[environments.development]
wrapper_type = "direct"
wrapper_provider = "mock"

[environments.production]
wrapper_type = "pool"
wrapper_name = "high_availability_pool"
```

#### 配置分类说明

**1. 全局默认配置 (`[defaults]`)**
- 适用于所有工作流的通用默认值
- 包括 LLM 调用、提示词、工具执行等基础配置
- 作为最低优先级的后备值

**2. 目录级别默认配置**
- `[base.*]` - 基础子工作流的默认配置
- `[features.*]` - 功能工作流的默认配置
- `[business.*]` - 业务工作流的默认配置
- 覆盖全局默认配置

**3. 预设场景配置 (`[presets]`)**
- 提供常用场景的预设配置
- 如快速响应、高质量、经济、高可用等
- 可通过参数引用使用

**4. 环境特定配置 (`[environments]`)**
- 针对不同环境的配置
- 如开发、测试、生产环境
- 支持环境变量覆盖

### 使用示例

#### 1. 使用全局默认配置

```typescript
// 不传参数，使用 defaults.toml 中的全局默认值
const workflow = await workflowManagement.loadWorkflow('base_llm_call');
// 实际使用：wrapper_type="pool", wrapper_name="default_pool"
```

#### 2. 覆盖部分参数

```typescript
// 只覆盖 wrapper_type，其他参数使用默认值
const workflow = await workflowManagement.loadWorkflow('base_llm_call', {
  wrapper_type: 'direct',
  wrapper_provider: 'gemini',
  wrapper_model: 'gemini-2.5-pro'
});
// 实际使用：wrapper_type="direct", wrapper_provider="gemini",
//          wrapper_model="gemini-2.5-pro", temperature=0.7（默认值）
```

#### 3. 使用预设场景

```typescript
// 使用快速响应预设
const workflow = await workflowManagement.loadWorkflow('base_llm_call', {
  preset: 'fast'
});
// 实际使用：wrapper_type="direct", wrapper_model="gpt-4o-mini", temperature=0.5
```

#### 4. 工作流级别默认配置

在工作流配置文件中定义默认值：

```toml
# configs/workflows/features/data-processing/analysis.toml
[workflow]
id = "data_analysis"
name = "数据分析"

[workflow.parameters]
# 定义参数默认值
wrapper_type = "direct"
wrapper_provider = "openai"
wrapper_model = "gpt-4o"
```

### 配置合并规则

1. **深度合并**：嵌套对象会递归合并
2. **数组替换**：数组参数会被完全替换，不会合并
3. **类型保持**：保持参数的类型（字符串、数字、布尔值等）
4. **必需参数**：如果参数标记为 `required = true`，则必须提供值

### 最佳实践

1. **合理设置默认值**：在 `defaults.toml` 中设置合理的全局默认值
2. **按需覆盖**：只在需要时覆盖特定参数，避免过度配置
3. **使用预设**：对于常见场景，使用预设配置而不是手动设置
4. **环境隔离**：使用环境特定配置区分开发和生产环境
5. **文档化配置**：在配置文件中添加注释说明参数用途
