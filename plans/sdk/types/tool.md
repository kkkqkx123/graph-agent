# Tool类型需求分析与设计

## 需求分析

### 核心需求
1. 定义工具的结构和配置
2. 支持不同类型的工具执行器
3. 定义工具执行和结果
4. 支持工具参数验证

### 功能需求
1. 工具类型包括内置、本地、REST、MCP等
2. 工具支持输入输出定义
3. 工具支持超时和重试配置
4. 工具执行结果包含输出和元数据

### 非功能需求
1. 类型安全的工具定义
2. 支持工具验证
3. 易于扩展新的工具类型

## 设计说明

### 核心类型

#### ToolType
工具类型枚举。

**类型值**：
- BUILTIN: 内置工具
- NATIVE: 本地工具
- REST: REST API工具
- MCP: MCP协议工具

#### Tool
工具定义类型。

**属性**：
- id: 工具唯一标识符
- name: 工具名称
- type: 工具类型
- description: 可选的工具描述
- config: 工具配置，根据工具类型不同而不同
- inputs: 输入定义
- outputs: 输出定义
- metadata: 可选的元数据

#### ToolConfig
工具配置联合类型，根据工具类型有不同的配置结构。

**配置类型**：
- BuiltinToolConfig: 内置工具配置
- NativeToolConfig: 本地工具配置
- RestToolConfig: REST工具配置
- McpToolConfig: MCP工具配置

#### BuiltinToolConfig
内置工具配置类型。

**属性**：
- builtinFunction: 内置函数名称
- parameters: 函数参数对象

#### NativeToolConfig
本地工具配置类型。

**属性**：
- executablePath: 可执行文件路径
- arguments: 命令行参数
- workingDirectory: 工作目录
- timeout: 超时时间（毫秒）
- retries: 重试次数

#### RestToolConfig
REST工具配置类型。

**属性**：
- url: API URL
- method: HTTP方法（GET、POST、PUT、DELETE等）
- headers: 请求头
- timeout: 超时时间（毫秒）
- retries: 重试次数

#### McpToolConfig
MCP工具配置类型。

**属性**：
- serverName: MCP服务器名称
- toolName: 工具名称
- parameters: 工具参数对象
- timeout: 超时时间（毫秒）

#### ToolInput
工具输入定义类型。

**属性**：
- name: 输入参数名称
- type: 输入类型
- required: 是否必需
- defaultValue: 默认值
- description: 输入描述
- validation: 验证规则

#### ToolOutput
工具输出定义类型。

**属性**：
- name: 输出参数名称
- type: 输出类型
- description: 输出描述

#### ToolExecution
工具执行类型。

**属性**：
- toolId: 工具ID
- parameters: 执行参数
- executionId: 执行ID
- startTime: 开始时间
- endTime: 结束时间
- status: 执行状态

#### ToolResult
工具结果类型。

**属性**：
- executionId: 执行ID
- success: 是否成功
- output: 输出数据
- error: 错误信息（如果有）
- executionTime: 执行时间（毫秒）
- metadata: 结果元数据

#### ToolStatus
工具状态枚举。

**状态值**：
- AVAILABLE: 可用
- UNAVAILABLE: 不可用
- DEPRECATED: 已弃用

### 设计原则

1. **类型安全**：使用联合类型确保配置正确性
2. **可扩展**：易于添加新的工具类型
3. **灵活性**：支持自定义输入输出定义
4. **验证友好**：结构清晰，易于验证

### 依赖关系

- 依赖common类型定义ID、基础类型
- 被execution类型引用
- 被repositories类型引用