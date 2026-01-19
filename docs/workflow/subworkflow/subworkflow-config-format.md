# 子工作流配置文件格式规范

## 概述

本文档定义了子工作流配置文件的格式规范。子工作流是可复用的工作流组件，通过参数化配置实现灵活性和可组合性。

## 设计原则

1. **参数化配置**：子工作流通过参数接收外部配置，而非硬编码
2. **无状态性**：子工作流应该是无状态的，不依赖外部状态
3. **可组合性**：子工作流可以组合成更大的工作流
4. **静态验证**：子工作流的标准（入口/出口）由验证模块根据配置计算，而非在配置中声明
5. **上下文共享**：子工作流合并后，所有节点共享同一个上下文，通过上下文变量传递数据。需要不同的上下文始终使用单独的节点处理

## 配置文件结构

### 基本结构

```toml
[workflow]
id = "workflow_id"
name = "工作流名称"
description = "工作流描述"
version = "1.0.0"

# 可配置参数（用于在具体工作流中通过参数修改内部逻辑）
[workflow.parameters]
# 参数定义...

# 定义工作流节点
[[workflow.nodes]]
# 节点定义...

# 定义边连接
[[workflow.edges]]
# 边定义...
```

**注意**：子工作流合并后，所有节点共享同一个上下文，不需要显式的输入输出映射。节点之间通过上下文变量传递数据（如 `context.getVariable('llm_result')`）。

### 参数定义

**重要**：TOML不支持内联表格的多行格式，必须使用标准表格格式。

参数定义使用以下格式：

```toml
[workflow.parameters.parameter_name]
type = "string"           # 参数类型：string | number | boolean | object | array
default = "default_value" # 默认值（可选）
description = "参数描述"   # 参数描述
required = false          # 是否必需（可选，默认false）
```

#### 参数类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `string` | 字符串 | `"hello"` |
| `number` | 数字 | `42` |
| `boolean` | 布尔值 | `true` |
| `object` | 对象 | `{ key = "value" }` |
| `array` | 数组 | `[1, 2, 3]` |

### 参数引用

在节点配置中，使用 `{{parameters.parameter_name}}` 语法引用参数：

```toml
[[workflow.nodes]]
id = "llm_node"
type = "llm"

[workflow.nodes.config]
llm_provider = "{{parameters.llm_provider}}"
model = "{{parameters.model}}"
temperature = "{{parameters.temperature}}"
```

## 上下文传递机制

### 设计理念

子工作流合并后，所有节点共享同一个上下文，通过上下文变量传递数据：

- **状态上下文**：工作流执行状态、变量、节点结果等
- **提示词上下文**：消息历史、系统提示词等

### 上下文变量使用

节点通过 `context.getVariable('variable_name')` 和 `context.setVariable('variable_name', value)` 访问和修改上下文变量：

```typescript
// 在节点中读取上下文变量
const messages = context.getVariable('messages') || [];
const userPrompt = context.getVariable('user_input');

// 在节点中设置上下文变量
context.setVariable('llm_result', result);
context.setVariable('tool_calls', toolCalls);
```

### 上下文变量命名规范

建议使用有意义的变量名，避免冲突：

- `messages`: 消息历史
- `user_input`: 用户输入
- `llm_result`: LLM执行结果
- `tool_calls`: 工具调用记录
- `tool_results`: 工具执行结果
- `errors`: 错误信息

## 节点配置

### LLM 节点

LLM节点使用结构化的wrapper配置，支持三种类型的wrapper：

#### Wrapper配置方式

由于TOML不支持嵌套的对象参数定义，wrapper配置使用多个独立参数：

```toml
# 参数定义
[workflow.parameters.wrapper_type]
type = "string"
default = "pool"
description = "Wrapper类型：pool | group | direct"

[workflow.parameters.wrapper_name]
type = "string"
default = "default_pool"
description = "Wrapper名称（pool或group类型）"

[workflow.parameters.wrapper_provider]
type = "string"
description = "提供商名称（direct类型）"

[workflow.parameters.wrapper_model]
type = "string"
description = "模型名称（direct类型）"
```

#### LLM节点配置示例

```toml
[[workflow.nodes]]
id = "llm_node"
type = "llm"
name = "LLM调用"

[workflow.nodes.config]
# LLM包装器配置（结构化对象）
wrapper_type = "{{parameters.wrapper_type}}"
wrapper_name = "{{parameters.wrapper_name}}"
wrapper_provider = "{{parameters.wrapper_provider}}"
wrapper_model = "{{parameters.wrapper_model}}"

# 提示词配置
[workflow.nodes.config.prompt]
type = "direct"
content = "{{parameters.prompt}}"

# 系统提示词（可选）
[workflow.nodes.config.system_prompt]
type = "direct"
content = "{{parameters.system_prompt}}"
```

#### Wrapper类型说明

| 类型 | 配置参数 | 说明 | 示例 |
|------|---------|------|------|
| `pool` | `wrapper_name` | 使用轮询池 | `type="pool", name="default_pool"` |
| `group` | `wrapper_name` | 使用任务组 | `type="group", name="default_group"` |
| `direct` | `wrapper_provider`, `wrapper_model` | 直接使用模型 | `type="direct", provider="openai", model="gpt-4o"` |

#### Wrapper配置优势

1. **类型安全**：使用结构化配置，避免字符串拼接错误
2. **自动参数继承**：wrapper服务可以自动获取模型的默认参数
3. **易于维护**：配置清晰，易于理解和修改
4. **向后兼容**：支持旧的字符串格式（通过转换）

### 工具调用节点

```toml
[[workflow.nodes]]
id = "tool_call_node"
type = "tool"
name = "工具调用"

[workflow.nodes.config]
# 工具名称
tool_name = "{{parameters.tool_name}}"

# 工具参数
tool_parameters = "{{parameters.tool_parameters}}"

# 超时时间（毫秒）
timeout = "{{parameters.timeout}}"
```

### 条件节点

```toml
[[workflow.nodes]]
id = "check_condition"
type = "condition"
name = "条件检查"

[workflow.nodes.config]
# 条件类型
condition_type = "tool_calls_check"
```

## 边配置

### 基本边

```toml
[[workflow.edges]]
from = "node_id_1"
to = "node_id_2"
```

### 条件边

```toml
[[workflow.edges]]
from = "check_condition"
to = "tool_call_node"
condition = "has_tool_calls"  # 条件函数名称
```

### 条件函数引用

条件函数通过名称引用，函数在 `src/services/workflow/functions/conditions/` 目录中定义：

| 函数名称 | 文件 | 说明 |
|---------|------|------|
| `has_tool_calls` | `has-tool-calls.function.ts` | 检查是否有工具调用 |
| `no_tool_calls` | `no-tool-calls.function.ts` | 检查是否没有工具调用 |
| `has_errors` | `has-errors.function.ts` | 检查是否有错误 |

## 子工作流标准（由验证模块计算）

子工作流的标准（入口/出口）不由配置文件声明，而是由 `SubWorkflowValidator` 根据工作流结构计算：

### 入口标准

- **入度（In-Degree）**：工作流入口节点的入边数量
  - `0`：可以作为起始子工作流（无前置依赖）
  - `1`：可以作为中间子工作流（接收前置工作流输出）

- **入口节点类型**：工作流入口节点的类型
  - 例如：`llm`, `tool`, `condition` 等

### 出口标准

- **出度（Out-Degree）**：工作流出口节点的出边数量
  - `0`：可以作为结束子工作流（无后置依赖）
  - `1`：可以作为中间子工作流（传递输出给后续工作流）

- **出口节点类型**：工作流出口节点的类型
  - 例如：`data-transform`, `end` 等

### 状态标准

- **无状态性**：子工作流不依赖外部状态
- **无外部依赖**：子工作流不依赖外部资源或服务

### 工作流类型

根据入度和出度，子工作流分为以下类型：

| 类型 | 入度 | 出度 | 说明 |
|------|------|------|------|
| `start` | 0 | 1 | 起始子工作流 |
| `middle` | 1 | 1 | 中间子工作流 |
| `end` | 1 | 0 | 结束子工作流 |
| `independent` | 0 | 0 | 独立工作流（不能引用） |
| `invalid` | >1 | >1 | 无效工作流 |

**注意**：`flexible` 类型已被移除，因为过于宽泛，无法明确子工作流角色，增加了父工作流处理复杂性。

## 示例：LLM调用基础子工作流

```toml
# LLM调用基础子工作流
# 封装LLM工具调用+工具执行的基础操作

[workflow]
id = "base_llm_call"
name = "LLM调用基础操作"
description = "封装LLM调用和工具执行的基础操作"
version = "1.0.0"

# 可配置参数
[workflow.parameters.wrapper_type]
type = "string"
default = "pool"
description = "Wrapper类型：pool | group | direct"

[workflow.parameters.wrapper_name]
type = "string"
default = "default_pool"
description = "Wrapper名称（pool或group类型）"

[workflow.parameters.wrapper_provider]
type = "string"
description = "提供商名称（direct类型）"

[workflow.parameters.wrapper_model]
type = "string"
description = "模型名称（direct类型）"

[workflow.parameters.prompt]
type = "string"
required = true
description = "LLM提示词"

[workflow.parameters.system_prompt]
type = "string"
default = ""
description = "系统提示词"

[workflow.parameters.tool_timeout]
type = "number"
default = 30000
description = "工具执行超时时间（毫秒）"

# 定义工作流节点
[[workflow.nodes]]
id = "llm_node"
type = "llm"
name = "LLM调用"

[workflow.nodes.config]
# LLM包装器配置（结构化对象）
wrapper_type = "{{parameters.wrapper_type}}"
wrapper_name = "{{parameters.wrapper_name}}"
wrapper_provider = "{{parameters.wrapper_provider}}"
wrapper_model = "{{parameters.wrapper_model}}"

# 提示词配置
[workflow.nodes.config.prompt]
type = "direct"
content = "{{parameters.prompt}}"

[workflow.nodes.config.system_prompt]
type = "direct"
content = "{{parameters.system_prompt}}"

[[workflow.nodes]]
id = "check_tool_calls"
type = "condition"
name = "检查工具调用"

[workflow.nodes.config]
condition_type = "tool_calls_check"

[[workflow.nodes]]
id = "tool_executor"
type = "tool"
name = "工具执行器"

[workflow.nodes.config]
tool_name = "auto"
tool_parameters = "auto"
timeout = "{{parameters.tool_timeout}}"

# 定义边连接
[[workflow.edges]]
from = "llm_node"
to = "check_tool_calls"

[[workflow.edges]]
from = "check_tool_calls"
to = "tool_executor"
condition = "has_tool_calls"
```

**说明**：
- LLM节点执行后，结果会存储在上下文变量中（如 `llm_result`）
- 工具调用节点执行后，结果会存储在上下文变量中（如 `tool_calls`、`tool_results`）
- 后续节点可以通过 `context.getVariable('llm_result')` 访问这些结果

## 配置验证

配置文件加载时会进行以下验证：

1. **语法验证**：TOML 语法正确性
2. **Schema 验证**：符合工作流配置 Schema
3. **参数验证**：参数定义完整且类型正确
4. **节点验证**：节点配置符合节点类型要求
5. **边验证**：边连接有效且条件函数存在

## 子工作流引用

在父工作流中引用子工作流：

```toml
[[workflow.nodes]]
id = "llm_call_subworkflow"
type = "subworkflow"
name = "LLM调用子工作流"

[workflow.nodes.config]
reference_id = "llm_call_ref"
workflow_id = "base_llm_call"

# 参数覆盖
parameters = {
  wrapper_type = "direct",
  wrapper_provider = "openai",
  wrapper_model = "gpt-4o",
  prompt = "分析以下数据：{{context.data}}"
}
```

**注意**：
- 子工作流合并后，不需要 `input_mapping` 和 `output_mapping`
- 所有节点共享同一个上下文，通过上下文变量传递数据
- 参数覆盖用于修改子工作流的内部配置（如LLM提供商、温度等）

## 注意事项

1. **参数引用**：参数引用使用 `{{parameters.xxx}}` 语法，确保参数已定义
2. **默认值**：为可选参数提供合理的默认值
3. **类型一致性**：确保参数类型与节点配置期望的类型一致
4. **上下文变量**：节点通过 `context.getVariable()` 和 `context.setVariable()` 访问和修改上下文
5. **变量命名**：使用有意义的变量名，避免冲突
6. **条件函数**：确保引用的条件函数已注册
7. **版本管理**：子工作流变更时更新版本号
8. **无状态性**：子工作流应该是无状态的，不依赖外部状态
9. **Wrapper配置**：使用结构化的wrapper配置，避免字符串拼接错误
10. **参数继承**：wrapper服务会自动获取模型的默认参数，无需手动配置