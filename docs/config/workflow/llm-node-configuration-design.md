# LLM节点配置设计文档

## 目录
1. [当前选项和变量替换处理机制分析](#当前选项和变量替换处理机制分析)
2. [LLM节点配置文件结构设计](#llm节点配置文件结构设计)
3. [节点配置规则设计](#节点配置规则设计)
4. [节点配置加载器设计](#节点配置加载器设计)
5. [预定义LLM节点设计](#预定义llm节点设计)
6. [使用示例](#使用示例)

---

## 当前选项和变量替换处理机制分析

### 1.1 选项处理机制

选项（options）是模板级别的配置参数，用于控制模板的行为和输出格式。选项处理遵循以下机制：

**选项定义位置：**
- 在模板定义文件中，通过 `[options]` 部分定义可用的选项
- 每个选项包含类型、默认值和描述信息

**选项传递路径：**
1. 用户在LLM节点配置中指定选项值
2. 选项通过 PromptSource 传递到 TemplateProcessor
3. TemplateProcessor 在 processTemplateDefinition 方法中应用选项
4. 选项影响变量的处理和模板的渲染行为

**选项应用逻辑：**
- 选项主要用于条件性地包含或排除某些内容
- 例如：`include_rules` 选项控制是否包含规则提示词
- 选项值会覆盖模板中定义的默认值
- 选项处理会修改最终的变量集合，影响渲染结果

### 1.2 变量替换处理机制

变量替换采用双大括号语法（`{{variable}}`），处理流程如下：

**变量来源：**
- 工作流执行上下文中的变量（通过 context.getVariable() 获取）
- LLM节点配置中定义的静态变量
- 模板处理过程中动态生成的变量
- 上下文处理器处理后的变量

**变量优先级：**
1. LLM节点配置中的静态变量（最高优先级）
2. 上下文处理器处理后的变量
3. 工作流执行上下文中的变量
4. 模板默认值（最低优先级）

**变量验证机制：**
- 模板定义中可以指定必需变量
- 在模板处理前验证所有必需变量是否提供
- 缺少必需变量时抛出错误，阻止执行

**变量渲染过程：**
1. 收集所有变量来源，合并成变量集合
2. 按优先级解决变量冲突
3. 将变量值转换为字符串
4. 使用正则表达式全局替换模板中的占位符
5. 返回渲染后的内容

### 1.3 上下文处理器机制

上下文处理器用于动态修改变量集合，主要特点：

**处理器类型：**
- `llm` 处理器：处理LLM相关的上下文，如消息历史
- 自定义处理器：用户可以根据需求实现特定的上下文处理逻辑

**处理流程：**
1. 在 PromptBuilder 中创建 PromptContext
2. 将当前变量集合传递给上下文处理器
3. 处理器可以添加、修改或删除变量
4. 返回处理后的变量集合
5. 使用处理后的变量进行模板渲染

**典型应用场景：**
- 添加对话历史到提示词中
- 动态计算某些变量值
- 根据执行状态调整提示词内容

---

## LLM节点配置文件结构设计

### 2.1 配置目录结构

建议采用分层目录结构，按节点类型和用途组织配置文件：

```
configs/
└── nodes/
    ├── builtin/              # 系统预定义节点
    │   ├── llm/              # LLM相关节点
    │   ├── tool/             # 工具执行节点
    │   └── routing/          # 路由节点
    └── custom/               # 用户自定义节点
```

### 2.2 配置文件结构

LLM节点配置文件采用TOML格式，包含以下主要部分：

**节点元数据部分：**
- 节点ID、名称、描述等基本信息
- 节点类型和版本信息
- 标签分类

**LLM配置部分：**
- 包装器名称（支持轮询池、任务组、直接LLM）
- 温度、最大令牌数等生成参数
- 是否启用流式响应

**提示词配置部分：**
- 提示词类型（直接内容或模板引用）
- 系统提示词配置（可选）
- 用户提示词配置
- 模板选项和变量

**输入输出模式：**
- 定义节点期望的输入数据结构
- 定义节点输出的数据结构
- 支持JSON Schema格式

**错误处理配置：**
- 重试次数和延迟
- 降级节点配置

**元数据信息：**
- 作者、创建时间、更新时间
- 弃用标记

### 2.3 提示词配置类型

**直接内容类型：**
适用于简单的、固定的提示词内容。直接在配置文件中编写提示词文本，支持多行字符串和变量占位符。

**模板引用类型：**
适用于复杂的、可复用的提示词场景。通过引用预定义的模板，结合选项和变量来生成最终的提示词。

**分离配置类型：**
系统提示词和用户提示词可以分别配置，支持不同的来源类型。这种灵活性允许系统提示词使用模板，而用户提示词使用直接内容，或反之亦然。

---

## 节点配置规则设计

### 3.1 配置验证规则

配置规则系统负责验证节点配置的正确性和完整性：

**结构验证：**
- 验证必需的字段是否存在
- 验证字段类型是否正确
- 验证枚举值是否在允许范围内

**业务规则验证：**
- 节点ID格式验证（只允许字母、数字、下划线和连字符）
- 名称和描述长度限制
- 标签数量和长度限制
- 温度参数范围验证（0-2之间）
- 最大令牌数范围验证（1-128000之间）
- 重试次数和延迟限制

**条件验证：**
- 根据提示词类型验证必需字段
- direct类型需要content字段
- template类型需要category和name字段

**依赖验证：**
- 验证引用的包装器是否存在
- 验证引用的模板是否存在
- 验证引用的提示词是否存在

### 3.2 规则应用机制

规则系统在配置加载阶段应用：

1. **预处理阶段：**
   - 根据文件路径调整优先级
   - 内置节点优先级高于自定义节点
   - LLM节点优先级可以进一步调整

2. **验证阶段：**
   - 使用JSON Schema验证配置结构
   - 应用业务规则进行额外验证
   - 收集所有验证错误并报告

3. **合并阶段：**
   - 按节点ID组织配置
   - 使用深度合并策略处理冲突
   - 添加加载元数据（文件路径、加载时间等）

### 3.3 规则配置

规则配置包括：
- 支持的文件模式（如 `nodes/**/*.toml`）
- 加载优先级
- 依赖模块（需要预先加载全局配置、LLM配置、提示词配置）
- 合并策略（深度合并）

---

## 节点配置加载器设计

### 4.1 加载器职责

节点配置加载器负责从文件系统加载节点配置：

**文件发现：**
- 扫描指定目录下的TOML文件
- 支持递归子目录扫描
- 按文件路径分类（builtin vs custom）

**文件解析：**
- 读取文件内容
- 解析TOML格式
- 处理解析错误（记录日志并跳过无效文件）

**配置处理：**
- 提取节点ID作为配置键
- 验证配置完整性
- 添加文件路径等元数据
- 按节点ID组织配置数据

**依赖管理：**
- 声明对全局配置、LLM配置、提示词配置的依赖
- 确保依赖模块先加载
- 处理循环依赖检测

### 4.2 加载流程

1. **预处理：**
   - 接收配置文件列表
   - 根据文件路径调整优先级
   - 返回处理后的文件列表

2. **配置加载：**
   - 逐个读取文件内容
   - 解析TOML格式
   - 处理解析错误
   - 返回解析后的配置对象

3. **配置合并：**
   - 按节点ID分组配置
   - 验证每个配置的有效性
   - 添加元数据信息
   - 返回合并后的配置对象

4. **元数据提取：**
   - 统计节点数量
   - 生成模块描述
   - 提取其他元数据信息

### 4.3 配置服务

配置服务提供节点配置的查询和管理功能：

**查询功能：**
- 根据节点ID获取配置
- 获取所有节点配置
- 按节点类型筛选配置
- 验证配置的有效性

**管理功能：**
- 缓存配置数据
- 处理配置更新
- 提供配置统计信息

---

## 预定义LLM节点设计

### 5.1 设计理念

预定义LLM节点的设计遵循以下原则：

**最小化逻辑：**
- 预定义节点不包含具体业务逻辑
- 只负责加载配置和调用LLM节点函数
- 所有配置通过外部配置文件管理

**最大化复用：**
- 复用现有的LLM节点函数实现
- 复用配置加载和服务机制
- 复用错误处理和降级机制

**标准化接口：**
- 统一的节点接口（继承BaseWorkflowNode）
- 统一的配置结构
- 统一的错误处理模式

### 5.2 节点结构

预定义LLM节点包含以下组件：

**节点类：**
- 继承自BaseWorkflowNode
- 实现execute方法
- 注入LLM节点函数和配置服务

**配置依赖：**
- 依赖NodeConfigService获取配置
- 依赖LLMNodeFunction执行实际逻辑
- 依赖配置中的错误处理设置

**执行流程：**
1. 从配置服务加载节点配置
2. 将配置转换为LLMNodeConfig格式
3. 调用LLM节点函数执行
4. 根据配置处理错误和降级
5. 返回执行结果

### 5.3 节点注册

预定义节点需要在系统中注册：

**自动注册：**
- 通过依赖注入容器自动注册
- 使用@injectable()装饰器
- 在模块初始化时注册

**手动注册：**
- 在节点管理器中手动注册
- 提供节点ID和实例的映射
- 支持动态节点添加

---

## 使用示例

### 6.1 配置文件示例

**代码审查节点配置：**
```toml
[node]
id = "code_review_node"
name = "代码审查节点"
description = "用于审查代码质量的LLM节点"
type = "llm"
version = "1.0.0"
tags = ["code", "review", "llm"]

[node.llm]
wrapper_name = "openai:gpt-4"
temperature = 0.3
max_tokens = 2000

[node.prompt.system]
type = "template"
category = "system"
name = "coder"

[node.prompt.user]
type = "template"
category = "templates"
name = "code_review"
options = { include_rules = true }

[node.prompt.variables]
code = "{{input.code}}"
language = "{{input.language}}"

[node.input_schema]
required = ["code"]

[node.input_schema.properties]
code = { type = "string", description = "要审查的代码" }
language = { type = "string", description = "编程语言", default = "typescript" }

[node.output_schema]
required = ["review_result", "suggestions"]

[node.output_schema.properties]
review_result = { type = "string", description = "审查结果" }
suggestions = { type = "array", items = { type = "string" } }
score = { type = "number", description = "代码质量评分" }
```

**数据分析节点配置：**
```toml
[node]
id = "data_analysis_node"
name = "数据分析节点"
description = "用于数据分析的LLM节点"
type = "llm"
version = "1.0.0"
tags = ["data", "analysis", "llm"]

[node.llm]
wrapper_name = "pool:data_analysis_pool"
temperature = 0.5
max_tokens = 4000

[node.prompt]
type = "direct"
content = """
请分析以下数据：
{{input.data}}

数据格式：{{input.format}}

请提供：
1. 数据摘要和统计信息
2. 关键发现和模式
3. 异常值检测
4. 可视化建议
5. 进一步分析建议
"""

[node.input_schema]
required = ["data"]

[node.input_schema.properties]
data = { type = "string", description = "要分析的数据" }
format = { type = "string", description = "数据格式", default = "csv" }

[node.output_schema]
required = ["summary", "findings"]

[node.output_schema.properties]
summary = { type = "string", description = "数据摘要" }
findings = { type = "array", items = { type = "string" } }
visualization_suggestions = { type = "array", items = { type = "string" } }
```

### 6.2 工作流中使用节点

**在工作流配置中引用节点：**
```toml
[workflow]
name = "code_review_workflow"
description = "代码审查工作流"

[[workflow.nodes]]
id = "start"
type = "start"

[[workflow.nodes]]
id = "review_code"
type = "node"
node_id = "code_review_node"  # 引用预定义节点

[[workflow.nodes]]
id = "end"
type = "end"

[[workflow.edges]]
from = "start"
to = "review_code"

[[workflow.edges]]
from = "review_code"
to = "end"
```

**动态创建节点：**
```typescript
// 从配置创建节点实例
const nodeConfig = await nodeConfigService.getNodeConfig('code_review_node')
const node = nodeFactory.createNode(nodeConfig)

// 执行节点
const result = await node.execute(context)
```

### 6.3 节点配置最佳实践

**配置组织：**
- 将相关节点配置放在同一目录
- 使用描述性的节点ID和名称
- 为节点添加合适的标签

**提示词配置：**
- 复杂提示词使用模板引用
- 简单提示词使用直接内容
- 合理使用模板选项控制行为
- 定义清晰的模板变量

**错误处理：**
- 为关键节点配置重试机制
- 提供降级节点处理失败情况
- 定义清晰的错误边界

**模式定义：**
- 为节点定义输入输出模式
- 使用模式验证数据完整性
- 提供清晰的字段描述

**文档和元数据：**
- 为节点添加详细描述
- 记录作者和创建时间
- 标记弃用的节点
- 维护更新历史
