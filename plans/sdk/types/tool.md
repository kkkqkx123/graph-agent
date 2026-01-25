# Tool类型需求分析与设计

## 需求分析

### 核心需求
1. 定义工具的基本信息和参数schema
2. 支持工具与执行引擎的关联
3. 提供工具定义用于LLM调用
4. 不关心工具的具体实现细节

### 功能需求
1. 工具定义包含名称、描述、参数schema
2. 工具支持元数据（分类、标签等）
3. 工具定义可用于生成LLM工具调用schema
4. 工具执行由应用层负责

### 非功能需求
1. 类型安全的工具定义
2. 简洁的工具引用
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
- description: 工具描述
- parameters: 参数schema（JSON Schema格式）
- metadata: 工具元数据

**设计说明**：
- 只定义工具的基本信息和参数schema
- 不包含执行相关的配置（timeout、retry等）
- 不包含网络相关的配置（url、headers等）
- 主要用于LLM调用时提供工具定义

#### ToolParameters
工具参数schema类型（JSON Schema格式）。

**属性**：
- properties: 参数属性定义
- required: 必需参数列表

**设计说明**：
- 默认为object类型，不需要显式指定
- 简化定义，减少冗余

#### ToolProperty
工具参数属性类型。

**属性**：
- type: 参数类型（string、number、boolean、array、object）
- description: 参数描述
- default: 默认值（可选）
- enum: 枚举值（可选）
- format: 格式约束（可选，如uri、email等）

#### ToolMetadata
工具元数据类型。

**属性**：
- category: 工具分类
- tags: 标签数组
- documentationUrl: 文档URL（可选）

#### ToolSchema
LLM工具调用schema类型。

**属性**：
- name: 工具名称
- description: 工具描述
- parameters: 参数schema

**设计说明**：
- 用于生成LLM工具调用所需的schema
- 直接映射到Tool类型

### 设计原则

1. **引用优先**：工具定义只提供引用，不包含实现细节
2. **执行分离**：工具执行由应用层负责，SDK只负责定义
3. **简洁性**：只包含必要的信息，避免过度设计
4. **LLM友好**：工具定义可直接转换为LLM工具调用schema

### 与应用层的职责划分

#### SDK负责：
- 定义工具的基本信息（name、description）
- 定义工具的参数schema
- 提供工具引用给LLM调用
- 生成LLM工具调用schema

#### 应用层负责：
- 工具的具体实现
- 工具的执行逻辑
- 工具的网络配置（url、headers等）
- 工具的执行策略（timeout、retry等）

### 使用示例

```typescript
// 1. 定义工具
const tool: Tool = {
  id: 'calculator',
  name: 'calculator',
  type: ToolType.BUILTIN,
  description: 'A tool for performing basic mathematical calculations',
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'Mathematical expression to calculate'
      },
      precision: {
        type: 'integer',
        description: 'Number of decimal places',
        default: 2
      }
    },
    required: ['expression']
  },
  metadata: {
    category: 'math',
    tags: ['calculator', 'math']
  }
};

// 2. 生成LLM工具调用schema
const toolSchema: ToolSchema = {
  name: tool.name,
  description: tool.description,
  parameters: tool.parameters
};

// 3. LLM调用时使用
const llmRequest: LLMRequest = {
  profileId: 'openai-gpt4',
  messages: [...],
  tools: [toolSchema]
};
```

### 依赖关系

- 依赖common类型定义基础类型
- 被llm类型引用（LLMRequest中的tools）
- 被execution类型引用
- 被node类型引用（ToolNodeConfig）