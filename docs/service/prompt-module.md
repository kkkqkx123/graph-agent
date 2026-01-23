# Prompt 模块功能文档

## 概述

Prompt 模块是 Modular Agent Framework 的核心组件之一，负责提示词的管理、处理和构建。该模块提供了完整的提示词生命周期管理，从存储、验证到动态构建和变量替换。

## 模块架构

### 分层设计

Prompt 模块遵循框架的 3 层架构：

1. **Domain 层** (`src/domain/prompts/`)
   - 定义核心实体：`Prompt`
   - 定义值对象：`PromptId`, `PromptType`, `PromptStatus`
   - 定义仓储接口：`IPromptRepository`

2. **Services 层** (`src/services/prompts/`)
   - 提供业务服务：`PromptBuilder`, `TemplateProcessor`
   - 提供工具服务：`PromptReferenceParser`, `PromptReferenceValidator`

3. **Infrastructure 层** (`src/infrastructure/persistence/repositories/prompt-repository.ts`)
   - 实现仓储接口
   - 处理持久化细节

## 核心功能

### 1. Prompt 实体管理

#### 1.1 Prompt 实体
```typescript
// 创建提示词
const prompt = Prompt.create({
  name: '代码生成器',
  type: PromptType.SYSTEM,
  content: '你是一个专业的代码生成助手...',
  category: 'system',
  description: '用于代码生成的系统提示词',
  variables: [
    { name: 'language', type: 'string', required: true, description: '编程语言' },
    { name: 'framework', type: 'string', required: false, description: '框架名称' }
  ]
});

// 激活提示词
const activatedPrompt = prompt.activate();

// 更新内容
const updatedPrompt = prompt.updateContent('新的提示词内容...');

// 更新元数据
const promptWithMetadata = prompt.updateMetadata({ 
  author: '开发团队', 
  version: '2.0' 
});
```

#### 1.2 Prompt 状态管理
- **DRAFT**: 草稿状态
- **ACTIVE**: 激活状态（可用）
- **INACTIVE**: 禁用状态
- **DEPRECATED**: 弃用状态

#### 1.3 Prompt 验证
- 内容长度验证（最大/最小长度）
- 禁止词汇检查
- 必需关键词验证
- 变量格式验证

### 2. 模板处理功能

#### 2.1 TemplateProcessor
`TemplateProcessor` 负责模板的加载、验证和渲染：

```typescript
// 处理模板
const result = await templateProcessor.processTemplate(
  'system',           // 类别
  'coder',            // 名称
  {                   // 变量
    language: 'TypeScript',
    framework: 'React'
  }
);

// 结果包含渲染后的内容和使用的变量
const { content, variables } = result;
```

#### 2.2 模板组合功能
支持复合模板，可以引用其他模板片段：

```toml
# 模板配置示例
[template]
system = "system.coder"
rules = "rules.code_quality"
examples = "examples.react_patterns"
```

#### 2.3 变量验证
- 必需变量检查
- 变量类型验证
- 默认值支持

### 3. 提示词构建功能

#### 3.1 PromptBuilder
`PromptBuilder` 是工作流中构建提示词的主要入口：

```typescript
// 构建提示词配置
const buildConfig: PromptBuildConfig = {
  source: {
    type: 'template',
    category: 'system',
    name: 'coder',
    variables: { language: 'TypeScript' }
  },
  systemPrompt: {
    type: 'direct',
    content: '你是一个专业的代码生成助手。'
  },
  contextProcessor: 'llm',
  variables: { framework: 'React' }
};

// 构建消息列表
const messages = await promptBuilder.buildMessages(
  buildConfig,
  executionContext
);
```

#### 3.2 提示词来源类型
支持两种提示词来源：

```typescript
// 1. 直接内容
const directSource: PromptSource = {
  type: 'direct',
  content: '直接提示词内容'
};

// 2. 模板引用
const templateSource: PromptSource = {
  type: 'template',
  category: 'system',
  name: 'coder',
  variables: { language: 'TypeScript' }
};
```

#### 3.3 上下文处理器
支持自定义上下文处理器：

```typescript
// 注册上下文处理器
promptBuilder.registerContextProcessor('custom', (promptState, variables) => {
  // 处理逻辑
  const processedVariables = new Map(variables);
  processedVariables.set('processed', true);
  
  return {
    promptState: promptState.addSystemMessage('处理完成'),
    variables: processedVariables
  };
});
```

### 4. 引用解析和验证

#### 4.1 PromptReferenceParser
解析提示词引用格式：

```typescript
// 解析引用
const reference = promptReferenceParser.parse('system.coder.code_style');
// 结果: { category: 'system', name: 'coder.code_style' }

// 验证引用格式
const isValid = promptReferenceParser.isValid('system.coder'); // true
```

#### 4.2 PromptReferenceValidator
提供详细的验证结果：

```typescript
// 验证引用
const validationResult = promptReferenceValidator.validate('invalid.reference');
// 结果: { valid: false, error: '无效的类别...', errorCode: 'INVALID_CATEGORY' }

// 批量验证
const batchResults = promptReferenceValidator.validateBatch([
  'system.coder',
  'rules.code_quality',
  'invalid.reference'
]);
```

#### 4.3 支持的类别
- `system`: 系统提示词
- `rules`: 规则提示词
- `user_commands`: 用户命令
- `templates`: 模板

### 5. 工作流集成功能

#### 5.1 WorkflowContext 集成
Prompt 状态集成到工作流上下文中：

```typescript
// 创建工作流上下文（自动包含 PromptState）
const workflowContext = WorkflowContext.create('workflow-1', 'execution-1');

// 追加提示词历史
const updatedContext = workflowContext.appendPromptHistory(
  'user',
  '用户输入内容',
  undefined, // toolCalls
  undefined, // toolCallId
  { timestamp: new Date().toISOString() }
);

// 获取提示词状态
const promptState = workflowContext.promptState;
const history = promptState.history; // 获取历史记录
```

#### 5.2 PromptState 功能
`PromptState` 提供丰富的提示词状态管理：

```typescript
// 添加不同类型的消息
promptState.addUserInput('用户问题');
promptState.addAssistantOutput('助手回答');
promptState.addToolCall([{ id: 'tool-1', name: 'search', arguments: {} }]);
promptState.addToolResult('tool-1', '搜索结果');

// 历史记录管理
const recentHistory = promptState.getRecentHistory(10); // 最近10条记录
const userMessages = promptState.getHistoryByRole('user'); // 按角色筛选
const slicedHistory = promptState.getHistorySlice(5, 15); // 索引范围

// 格式转换
const openAIMessages = promptState.toOpenAIMessages(); // OpenAI 格式
const anthropicMessages = promptState.toAnthropicMessages(); // Anthropic 格式
```

#### 5.3 LLMNode 集成
在 LLM 节点中使用 prompt 模块：

```typescript
// LLMNode 配置
const llmNode = new LLMNode(
  nodeId,
  wrapperConfig,
  {
    type: 'template',
    category: 'system',
    name: 'coder'
  },
  {
    type: 'direct',
    content: '系统提示词'
  },
  'llm', // 上下文处理器名称
  0.7,   // temperature
  1024,  // maxTokens
  false  // stream
);
```

## API 参考

### PromptBuilder API

#### `buildMessages(config, context, contextProcessors?)`
构建提示词消息列表。

**参数**:
- `config: PromptBuildConfig` - 构建配置
- `context: Record<string, unknown>` - 工作流上下文变量
- `contextProcessors?: Map<string, ContextProcessor>` - 上下文处理器映射

**返回**: `Promise<LLMMessage[]>` - LLM 消息列表

#### `registerContextProcessor(name, processor)`
注册上下文处理器。

**参数**:
- `name: string` - 处理器名称
- `processor: ContextProcessor` - 处理器函数

#### `templateExists(category, name)`
检查模板是否存在。

**参数**:
- `category: string` - 模板类别
- `name: string` - 模板名称

**返回**: `Promise<boolean>` - 是否存在

### TemplateProcessor API

#### `processTemplate(category, name, variables?)`
处理模板并渲染变量。

**参数**:
- `category: string` - 模板类别
- `name: string` - 模板名称
- `variables: Record<string, unknown>` - 模板变量

**返回**: `Promise<TemplateProcessResult>` - 处理结果

#### `templateExists(category, name)`
检查模板是否存在。

**参数**:
- `category: string` - 模板类别
- `name: string` - 模板名称

**返回**: `Promise<boolean>` - 是否存在

#### `validateReference(reference)`
验证模板引用格式。

**参数**:
- `reference: string` - 引用字符串

**返回**: `boolean` - 是否有效

### PromptReferenceParser API

#### `parse(reference)`
解析提示词引用。

**参数**:
- `reference: string` - 引用字符串

**返回**: `PromptReference` - 解析结果

#### `isValid(reference)`
检查引用格式是否有效。

**参数**:
- `reference: string` - 引用字符串

**返回**: `boolean` - 是否有效

#### `getValidCategories()`
获取有效的类别列表。

**返回**: `string[]` - 类别列表

### PromptReferenceValidator API

#### `validate(reference)`
验证引用格式并提供详细结果。

**参数**:
- `reference: string` - 引用字符串

**返回**: `ValidationResult` - 验证结果

#### `validateBatch(references)`
批量验证引用。

**参数**:
- `references: string[]` - 引用字符串数组

**返回**: `Map<string, ValidationResult>` - 验证结果映射

#### `isValid(reference)`
检查引用是否有效。

**参数**:
- `reference: string` - 引用字符串

**返回**: `boolean` - 是否有效

#### `getValidCategories()`
获取有效的类别列表。

**返回**: `string[]` - 类别列表

## 类型定义

### PromptSource
```typescript
type PromptSource =
  | { type: 'direct'; content: string }
  | { type: 'template'; category: string; name: string; variables?: Record<string, any> };
```

### PromptBuildConfig
```typescript
interface PromptBuildConfig {
  source: PromptSource;
  systemPrompt?: PromptSource;
  contextProcessor?: string;
  variables?: Record<string, unknown>;
}
```

### TemplateProcessResult
```typescript
interface TemplateProcessResult {
  content: string;
  variables: Record<string, unknown>;
}
```

### PromptReference
```typescript
interface PromptReference {
  category: string;
  name: string;
}
```

### ValidationResult
```typescript
interface ValidationResult {
  valid: boolean;
  error?: string;
  errorCode?: string;
}
```

## 使用示例

### 示例 1: 基本使用
```typescript
import { PromptBuilder, TemplateProcessor } from '../services/prompts';

// 初始化服务
const promptBuilder = container.get<PromptBuilder>(TYPES.PromptBuilder);
const templateProcessor = container.get<TemplateProcessor>(TYPES.TemplateProcessor);

// 处理模板
const templateResult = await templateProcessor.processTemplate(
  'system',
  'coder',
  { language: 'TypeScript', task: '创建组件' }
);

console.log(templateResult.content); // 渲染后的提示词
```

### 示例 2: 工作流集成
```typescript
// 在 LLMNode 中使用
async execute(context: WorkflowExecutionContext): Promise<NodeExecutionResult> {
  const promptBuilder = context.getService<PromptBuilder>('PromptBuilder');
  
  const buildConfig: PromptBuildConfig = {
    source: {
      type: 'template',
      category: 'system',
      name: 'coder',
      variables: { language: 'TypeScript' }
    },
    systemPrompt: {
      type: 'direct',
      content: '你是一个专业的代码生成助手。'
    },
    contextProcessor: 'llm',
    variables: context.getAllVariables()
  };
  
  const messages = await promptBuilder.buildMessages(buildConfig, context.getAllVariables());
  
  // 使用 messages 调用 LLM...
}
```

### 示例 3: 自定义上下文处理器
```typescript
// 创建自定义处理器
const customProcessor: ContextProcessor = (promptState, variables) => {
  // 添加处理逻辑
  const processedVariables = new Map(variables);
  processedVariables.set('processedAt', new Date().toISOString());
  
  // 添加系统消息
  const updatedPromptState = promptState.addSystemMessage('自定义处理完成');
  
  return {
    promptState: updatedPromptState,
    variables: processedVariables
  };
};

// 注册处理器
promptBuilder.registerContextProcessor('custom', customProcessor);
```

## 配置指南

### 模板文件结构
```
configs/prompts/
├── system/
│   ├── coder.toml
│   └── analyst.toml
├── rules/
│   ├── code_quality.toml
│   └── security.toml
├── user_commands/
│   └── commands.toml
└── templates/
    └── patterns.toml
```

### 模板文件格式
```toml
# configs/prompts/system/coder.toml
name = "代码生成器"
content = """
你是一个专业的{{language}}开发助手。
请根据以下要求生成代码：
{{requirements}}
"""

[variables.language]
type = "string"
required = true
description = "编程语言"

[variables.requirements]
type = "string"
required = true
description = "代码需求描述"

[template]
rules = "rules.code_quality"
examples = "examples.best_practices"
```

## 最佳实践

1. **模板设计**
   - 使用清晰的变量命名
   - 提供变量描述和默认值
   - 保持模板内容简洁明了

2. **性能优化**
   - 缓存常用模板
   - 批量处理模板引用
   - 避免深层嵌套引用

3. **错误处理**
   - 验证所有必需变量
   - 提供清晰的错误信息
   - 实现优雅降级策略

4. **安全性**
   - 验证用户输入
   - 限制模板引用深度
   - 审核模板内容

## 故障排除

### 常见问题

1. **模板未找到**
   - 检查类别和名称是否正确
   - 确认模板文件存在
   - 验证文件权限

2. **变量验证失败**
   - 检查必需变量是否提供
   - 验证变量类型
   - 检查变量命名规范

3. **引用格式无效**
   - 使用 `PromptReferenceValidator.validate()` 获取详细错误
   - 检查类别是否在有效列表中
   - 验证名称格式

4. **性能问题**
   - 检查模板引用深度
   - 考虑缓存策略
   - 优化模板文件大小

## 扩展指南

### 添加新的模板类别
1. 在 `PromptReferenceParser` 和 `PromptReferenceValidator` 中添加新类别
2. 创建对应的目录结构
3. 更新文档

### 自定义上下文处理器
1. 实现 `ContextProcessor` 接口
2. 在 `PromptBuilder` 中注册处理器
3. 在配置中指定处理器名称

### 集成新的存储后端
1. 实现 `IPromptRepository` 接口
2. 更新基础设施层绑定
3. 配置连接参数

---

**版本**: 1.0.0  
**最后更新**: 2024年  
**维护团队**: Modular Agent Framework 开发团队