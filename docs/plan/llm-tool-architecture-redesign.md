# LLM与Tool模块架构重新设计

## 1. 当前架构问题分析

### 1.1 依赖关系混乱

**当前问题**：
- [`tool-converter.ts`](packages/common-utils/src/llm/tool-converter.ts)位于`packages/common-utils/src/llm/`目录下
- LLM客户端直接依赖Tool类型定义
- Tool模块和LLM模块的职责边界不清晰

**依赖流向**：
```
Tool模块 (sdk/core/tools)
    ↓
Tool类型定义 (packages/types/src/tool)
    ↓
LLM模块 (packages/common-utils/src/llm)
    ↓
tool-converter.ts (转换逻辑)
```

### 1.2 职责混淆

**问题**：
- 工具转换逻辑混在LLM模块中
- 没有明确区分"工具定义验证"和"LLM响应解析"
- 缺少清晰的模块边界

## 2. 核心原则

### 2.1 单向依赖原则

```
Tool模块 (完全独立)
    ↓
Tool类型定义 (共享)
    ↓
LLM模块 (依赖Tool类型)
```

**规则**：
1. Tool模块不依赖任何LLM相关代码
2. LLM模块可以依赖Tool类型定义
3. 转换逻辑属于LLM模块的职责

### 2.2 职责分离原则

| 模块 | 职责 | 不负责 |
|------|------|--------|
| Tool模块 | 工具注册、管理、执行 | LLM集成、格式转换 |
| LLM模块 | LLM调用、响应解析、工具格式转换 | 工具执行、工具管理 |

### 2.3 唯一来源原则

- 工具定义：Tool模块是唯一来源
- 工具类型：`packages/types/src/tool`是唯一类型定义
- 转换逻辑：LLM模块中的转换器是唯一实现

## 3. 运行时检查的职责明确

### 3.1 工具定义验证（Tool模块职责）

**目的**：验证工具定义的完整性和正确性

**位置**：[`ToolRegistry.validate()`](sdk/core/tools/tool-registry.ts:134-291)

**检查内容**：
- 工具名称、类型、描述是否存在
- 参数schema结构是否正确
- required参数是否在properties中定义
- config字段是否符合工具类型要求

**示例**：
```typescript
// 在ToolRegistry中
validate(tool: Tool): boolean {
  // 验证必需字段
  if (!tool.name || typeof tool.name !== 'string') {
    throw new ConfigurationValidationError(...);
  }
  
  // 验证参数schema
  if (!tool.parameters?.properties) {
    throw new ConfigurationValidationError(...);
  }
  
  // 验证required参数
  for (const required of tool.parameters.required) {
    if (!(required in tool.parameters.properties)) {
      throw new ConfigurationValidationError(...);
    }
  }
  
  return true;
}
```

### 3.2 参数验证（Tool执行器职责）

**目的**：验证工具调用参数是否符合schema定义

**位置**：Tool执行器（`@modular-agent/tool-executors`包）

**检查内容**：
- 必需参数是否提供
- 参数类型是否正确
- 枚举值是否有效
- 约束条件是否满足（minLength、maxLength、minimum、maximum等）

**示例**：
```typescript
// 在Tool执行器中
validateParameters(tool: Tool, input: Record<string, any>): ValidationResult {
  const errors: string[] = [];
  
  // 检查必需参数
  for (const required of tool.parameters.required) {
    if (!(required in input)) {
      errors.push(`Missing required parameter: ${required}`);
    }
  }
  
  // 验证每个参数
  for (const [key, value] of Object.entries(input)) {
    const prop = tool.parameters.properties[key];
    if (prop) {
      const propErrors = this.validateValue(key, value, prop);
      errors.push(...propErrors);
    }
  }
  
  return { valid: errors.length === 0, errors };
}
```

### 3.3 LLM响应解析（LLM客户端职责）

**目的**：解析LLM返回的工具调用信息

**位置**：LLM客户端（`packages/common-utils/src/llm/clients/`）

**检查内容**：
- 解析LLM返回的工具调用格式
- 提取工具名称和参数
- 转换为统一的`LLMToolCall`格式

**示例**：
```typescript
// 在AnthropicClient中
protected parseResponse(data: any): LLMResult {
  const toolCalls = this.extractToolCalls(data.content);
  
  return {
    id: data.id,
    model: data.model,
    content: this.extractContent(data.content),
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    // ...
  };
}

private extractToolCalls(content: any[]): LLMToolCall[] {
  return content
    .filter(item => item.type === 'tool_use')
    .map(item => ({
      id: item.id,
      type: 'function',
      function: {
        name: item.name,
        arguments: JSON.stringify(item.input || {})
      }
    }));
}
```

### 3.4 工具格式转换（LLM模块职责）

**目的**：将工具定义转换为LLM provider所需的格式

**位置**：[`tool-converter.ts`](packages/common-utils/src/llm/tool-converter.ts)

**检查内容**：
- 转换为provider特定的格式
- 确保格式符合API要求
- 添加必要的字段（如type: 'object'）

**示例**：
```typescript
// 在tool-converter.ts中
export function convertToolsToAnthropicFormat(tools: ToolSchema[]): AnthropicTool[] {
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: {
      type: 'object',  // 确保有type字段
      ...tool.parameters
    }
  }));
}
```

## 4. Anthropic SDK功能分析

### 4.1 不需要迁移的功能

#### 4.1.1 toolRunner（工具执行器）

**原因**：
- 当前系统已经有完整的工具执行架构（`@modular-agent/tool-executors`）
- 当前系统支持多种工具类型（STATELESS、STATEFUL、REST、MCP）
- 当前系统有自己的线程上下文和状态管理

**当前实现**：
- [`ToolService`](sdk/core/services/tool-service.ts) - 工具服务
- [`ToolRegistry`](sdk/core/tools/tool-registry.ts) - 工具注册表
- `@modular-agent/tool-executors` - 工具执行器包

#### 4.1.2 betaZodTool（Zod集成）

**原因**：
- Zod是外部依赖，增加复杂度
- 当前系统使用JSON Schema作为标准
- 不需要额外的类型验证库

**当前实现**：
- 使用标准的JSON Schema格式
- 在Tool执行器中进行运行时验证

#### 4.1.3 流式工具执行

**原因**：
- 当前系统已经有流式处理机制
- 工具执行是同步的，不需要流式
- 流式处理在LLM层面已经实现

**当前实现**：
- LLM客户端支持流式响应
- 工具执行是同步的，返回结果后继续

### 4.2 可以借鉴的功能

#### 4.2.1 工具定义格式

**借鉴点**：
- 完整的JSON Schema支持
- 清晰的工具描述
- 参数约束

**当前实现**：
- 已有基本的JSON Schema支持
- 需要增强类型定义（见第5节）

#### 4.2.2 工具元数据

**借鉴点**：
- 工具分类
- 工具标签
- 文档链接

**当前实现**：
- 已有`ToolMetadata`类型
- 需要更好地利用

## 5. 改进方案

### 5.1 模块架构设计

```
┌─────────────────────────────────────────────────────────┐
│                    packages/types                        │
│  ┌──────────────────────────────────────────────────┐   │
│  │  tool/                                           │   │
│  │  ├── definition.ts (Tool, ToolSchema)           │   │
│  │  ├── config.ts (ToolProperty, ToolParameters)   │   │
│  │  └── execution.ts (ToolExecutionResult)         │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                  sdk/core/tools                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  tool-registry.ts (工具注册和管理)               │   │
│  │  └── validate() (工具定义验证)                   │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│            @modular-agent/tool-executors                 │
│  ┌──────────────────────────────────────────────────┐   │
│  │  StatelessExecutor (无状态工具执行器)            │   │
│  │  StatefulExecutor (有状态工具执行器)             │   │
│  │  RestExecutor (REST工具执行器)                   │   │
│  │  McpExecutor (MCP工具执行器)                     │   │
│  │  └── validateParameters() (参数验证)             │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│          packages/common-utils/src/llm                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │  tool-converter.ts (工具格式转换)                │   │
│  │  ├── convertToolsToOpenAIFormat()                │   │
│  │  ├── convertToolsToAnthropicFormat()             │   │
│  │  └── convertToolsToGeminiFormat()                │   │
│  │                                                   │   │
│  │  clients/                                         │   │
│  │  ├── anthropic.ts (解析工具调用)                 │   │
│  │  ├── openai-chat.ts (解析工具调用)               │   │
│  │  └── gemini-native.ts (解析工具调用)             │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 5.2 依赖关系

```
Tool模块 (sdk/core/tools)
    ↓ 不依赖LLM
    ↓
Tool类型定义 (packages/types/src/tool)
    ↓ 被LLM模块依赖
    ↓
LLM模块 (packages/common-utils/src/llm)
    ↓ 依赖Tool类型
    ↓
tool-converter.ts (转换逻辑)
```

### 5.3 类型定义增强

#### 5.3.1 扩展ToolProperty类型

**位置**：`packages/types/src/tool/config.ts`

```typescript
export interface ToolProperty {
  // 基础类型
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null';
  
  // 描述信息
  description?: string;
  
  // 约束条件
  enum?: any[];
  const?: any;
  
  // 字符串约束
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  
  // 数值约束
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  
  // 数组约束
  items?: ToolProperty | ToolProperty[];
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  
  // 对象约束
  properties?: Record<string, ToolProperty>;
  required?: string[];
  additionalProperties?: boolean | ToolProperty;
  minProperties?: number;
  maxProperties?: number;
  
  // 复合类型
  anyOf?: ToolProperty[];
  oneOf?: ToolProperty[];
  allOf?: ToolProperty[];
  not?: ToolProperty;
  
  // 默认值
  default?: any;
  
  // 示例
  examples?: any[];
  
  // 自定义元数据
  title?: string;
  deprecated?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
}
```

#### 5.3.2 增强ToolSchema类型

**位置**：`packages/types/src/tool/definition.ts`

```typescript
export interface ToolSchema {
  name: string;
  description: string;
  parameters: ToolParameters;
  
  // 新增：工具元数据
  metadata?: {
    category?: string;
    tags?: string[];
    version?: string;
    documentationUrl?: string;
    examples?: ToolExample[];
    customFields?: Record<string, any>;
  };
}

export interface ToolExample {
  input: Record<string, any>;
  output: any;
  description?: string;
}
```

### 5.4 工具定义验证增强

**位置**：`sdk/core/tools/tool-registry.ts`

```typescript
validate(tool: Tool): boolean {
  // 现有验证逻辑...
  
  // 新增：验证参数schema的完整性
  this.validateParametersSchema(tool.parameters);
  
  return true;
}

/**
 * 验证参数schema的完整性
 */
private validateParametersSchema(params: ToolParameters): void {
  // 确保type字段存在
  if (!params.type || params.type !== 'object') {
    throw new ConfigurationValidationError(
      'Parameters must have type: "object"',
      { configType: 'tool', field: 'parameters.type' }
    );
  }
  
  // 验证每个属性
  if (params.properties) {
    for (const [key, prop] of Object.entries(params.properties)) {
      this.validateProperty(key, prop);
    }
  }
}

/**
 * 递归验证属性
 */
private validateProperty(name: string, prop: ToolProperty): void {
  // 验证type字段
  if (!prop.type) {
    throw new ConfigurationValidationError(
      `Property "${name}" must have a type`,
      { configType: 'tool', field: `parameters.properties.${name}.type` }
    );
  }
  
  // 递归验证嵌套对象
  if (prop.type === 'object' && prop.properties) {
    for (const [key, nestedProp] of Object.entries(prop.properties)) {
      this.validateProperty(`${name}.${key}`, nestedProp);
    }
  }
  
  // 递归验证数组元素
  if (prop.type === 'array' && prop.items) {
    if (Array.isArray(prop.items)) {
      prop.items.forEach((item, index) => {
        this.validateProperty(`${name}[${index}]`, item);
      });
    } else {
      this.validateProperty(`${name}[]`, prop.items);
    }
  }
}
```

### 5.5 工具格式转换增强

**位置**：`packages/common-utils/src/llm/tool-converter.ts`

```typescript
/**
 * 转换为 Anthropic 格式的工具定义
 */
export function convertToolsToAnthropicFormat(
  tools: ToolSchema[]
): AnthropicTool[] {
  if (!tools || tools.length === 0) {
    return [];
  }

  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: {
      type: 'object',  // 确保有type字段
      ...tool.parameters
    }
  }));
}

/**
 * 转换为 OpenAI 格式的工具定义
 */
export function convertToolsToOpenAIFormat(
  tools: ToolSchema[]
): OpenAITool[] {
  if (!tools || tools.length === 0) {
    return [];
  }

  return tools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }));
}

/**
 * 转换为 Gemini 格式的工具定义
 */
export function convertToolsToGeminiFormat(
  tools: ToolSchema[]
): GeminiTool[] {
  if (!tools || tools.length === 0) {
    return [];
  }

  return tools.map(tool => ({
    functionDeclarations: [{
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }]
  }));
}
```

### 5.6 参数验证增强

**位置**：`@modular-agent/tool-executors`包

```typescript
/**
 * 验证工具参数
 */
validateParameters(
  tool: Tool,
  input: Record<string, any>
): ValidationResult {
  const errors: string[] = [];
  
  // 检查必需参数
  if (tool.parameters.required) {
    for (const required of tool.parameters.required) {
      if (!(required in input)) {
        errors.push(`Missing required parameter: ${required}`);
      }
    }
  }
  
  // 验证每个参数
  if (tool.parameters.properties) {
    for (const [key, value] of Object.entries(input)) {
      const prop = tool.parameters.properties[key];
      if (prop) {
        const propErrors = this.validateValue(key, value, prop);
        errors.push(...propErrors);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 验证单个值
 */
private validateValue(
  name: string,
  value: any,
  schema: ToolProperty
): string[] {
  const errors: string[] = [];
  
  // 类型验证
  if (!this.validateType(value, schema.type)) {
    errors.push(`Parameter "${name}" must be of type ${schema.type}`);
    return errors;
  }
  
  // 枚举验证
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`Parameter "${name}" must be one of: ${schema.enum.join(', ')}`);
  }
  
  // 字符串约束
  if (schema.type === 'string' && typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`Parameter "${name}" must be at least ${schema.minLength} characters`);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(`Parameter "${name}" must be at most ${schema.maxLength} characters`);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push(`Parameter "${name}" must match pattern: ${schema.pattern}`);
    }
  }
  
  // 数值约束
  if (schema.type === 'number' && typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`Parameter "${name}" must be at least ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`Parameter "${name}" must be at most ${schema.maximum}`);
    }
  }
  
  // 数组约束
  if (schema.type === 'array' && Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`Parameter "${name}" must have at least ${schema.minItems} items`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(`Parameter "${name}" must have at most ${schema.maxItems} items`);
    }
    if (schema.uniqueItems && new Set(value).size !== value.length) {
      errors.push(`Parameter "${name}" must have unique items`);
    }
  }
  
  return errors;
}
```

## 6. 实施计划

### 6.1 阶段一：类型定义增强（优先级：高）

**任务**：
1. 扩展`ToolProperty`类型定义
2. 增强`ToolSchema`类型，添加元数据支持
3. 添加`ToolExample`类型定义

**文件**：
- `packages/types/src/tool/config.ts`
- `packages/types/src/tool/definition.ts`

**预计工作量**：1-2小时

### 6.2 阶段二：工具定义验证增强（优先级：高）

**任务**：
1. 增强`ToolRegistry.validate()`方法
2. 添加参数schema验证
3. 添加递归属性验证

**文件**：
- `sdk/core/tools/tool-registry.ts`
- `sdk/core/tools/__tests__/tool-registry.test.ts`

**预计工作量**：2-3小时

### 6.3 阶段三：工具格式转换增强（优先级：中）

**任务**：
1. 确保转换函数添加必要的字段
2. 添加格式验证
3. 更新测试用例

**文件**：
- `packages/common-utils/src/llm/tool-converter.ts`
- `packages/common-utils/src/llm/__tests__/tool-converter.test.ts`

**预计工作量**：1-2小时

### 6.4 阶段四：参数验证增强（优先级：中）

**任务**：
1. 增强Tool执行器的参数验证
2. 添加完整的约束验证
3. 更新测试用例

**文件**：
- `packages/tool-executors/src/executors/base-executor.ts`
- `packages/tool-executors/src/executors/__tests__/base-executor.test.ts`

**预计工作量**：3-4小时

## 7. 关键设计决策

### 7.1 为什么tool-converter在LLM模块？

**原因**：
1. 转换逻辑是LLM provider特定的
2. 不同的LLM provider需要不同的格式
3. 转换逻辑不涉及工具执行，只是格式转换
4. 符合"LLM模块负责LLM相关逻辑"的原则

### 7.2 为什么不迁移toolRunner？

**原因**：
1. 当前系统已经有完整的工具执行架构
2. 当前系统支持更多工具类型
3. 当前系统有自己的线程上下文管理
4. toolRunner是Anthropic SDK的高级功能，不是必需的

### 7.3 为什么不使用Zod？

**原因**：
1. 增加外部依赖
2. JSON Schema是标准格式，足够使用
3. 当前系统已经有运行时验证
4. 保持简单，避免过度设计

### 7.4 为什么参数验证在Tool执行器中？

**原因**：
1. 参数验证是工具执行的职责
2. 不同的工具类型可能需要不同的验证逻辑
3. 验证失败应该阻止工具执行
4. 符合"验证在执行前进行"的原则

## 8. 总结

### 8.1 核心改进

1. **清晰的模块边界**：Tool模块和LLM模块职责明确
2. **单向依赖**：LLM模块依赖Tool模块，Tool模块不依赖LLM
3. **职责分离**：工具定义验证、参数验证、响应解析各司其职
4. **唯一来源**：工具定义、类型、转换逻辑都有唯一来源

### 8.2 不做的功能

1. **toolRunner**：当前系统已有完整的工具执行架构
2. **betaZodTool**：不需要额外的类型验证库
3. **流式工具执行**：当前系统已有流式处理机制

### 8.3 预期效果

1. **更清晰的架构**：模块职责明确，依赖关系清晰
2. **更好的可维护性**：修改一个模块不影响其他模块
3. **更强的类型安全**：完整的JSON Schema支持
4. **更好的错误处理**：明确的验证和错误报告

### 8.4 向后兼容

所有改进都保持向后兼容：
- 新增的字段都是可选的
- 现有工具定义仍然有效
- 转换函数保持相同的签名