# LLM类型需求分析与设计

## 需求分析

### 核心需求
1. 定义LLM客户端的配置和接口
2. 支持多种LLM提供商
3. 定义LLM请求和响应结构
4. 支持LLM调用参数配置

### 功能需求
1. LLM提供商包括OpenAI、Anthropic、Gemini、Mock等
2. LLM请求支持消息、参数、工具调用
3. LLM响应支持文本、工具调用、token使用
4. LLM配置支持模型、温度、最大token等参数

### 非功能需求
1. 类型安全的LLM定义
2. 支持LLM验证
3. 易于扩展新的LLM提供商

## 设计说明

### 核心类型

#### LLMProvider
LLM提供商枚举。

**类型值**：
- OPENAI: OpenAI
- ANTHROPIC: Anthropic
- GEMINI: Gemini
- MOCK: Mock
- HUMAN_RELAY: 人工中继

#### LLMConfig
LLM配置类型。

**属性**：
- provider: LLM提供商
- model: 模型名称
- apiKey: API密钥
- baseUrl: 可选的基础URL
- timeout: 超时时间（毫秒）
- maxRetries: 最大重试次数
- retryDelay: 重试延迟（毫秒）

#### LLMRequest
LLM请求类型。

**属性**：
- messages: 消息数组
- model: 模型名称
- temperature: 温度参数
- maxTokens: 最大token数
- topP: Top-P采样参数
- frequencyPenalty: 频率惩罚
- presencePenalty: 存在惩罚
- stopSequences: 停止序列
- tools: 可用的工具定义
- toolChoice: 工具选择策略
- responseFormat: 响应格式

#### LLMMessage
LLM消息类型。

**属性**：
- role: 角色（system、user、assistant、tool）
- content: 消息内容
- toolCalls: 工具调用数组（assistant角色）
- toolCallId: 工具调用ID（tool角色）

#### LLMToolCall
LLM工具调用类型。

**属性**：
- id: 工具调用ID
- type: 类型（function）
- function: 函数调用信息
  - name: 函数名称
  - arguments: 函数参数（JSON字符串）

#### LLMResponse
LLM响应类型。

**属性**：
- id: 响应ID
- model: 模型名称
- choices: 选择数组
- usage: Token使用情况
- finishReason: 完成原因
- created: 创建时间戳

#### LLMChoice
LLM选择类型。

**属性**：
- index: 选择索引
- message: 消息
- finishReason: 完成原因

#### LLMUsage
LLM Token使用类型。

**属性**：
- promptTokens: 提示token数
- completionTokens: 完成token数
- totalTokens: 总token数

#### LLMFinishReason
LLM完成原因枚举。

**类型值**：
- STOP: 正常停止
- LENGTH: 达到最大长度
- TOOL_CALLS: 工具调用
- CONTENT_FILTER: 内容过滤
- ERROR: 错误

#### LLMWrapper
LLM包装器接口。

**方法**：
- chat(request: LLMRequest): Promise<LLMResponse>
- stream(request: LLMRequest): AsyncIterable<LLMResponseChunk>

#### LLMResponseChunk
LLM流式响应块类型。

**属性**：
- id: 响应ID
- model: 模型名称
- choices: 选择数组
- delta: 增量内容
- finishReason: 完成原因

### 设计原则

1. **提供商抽象**：统一的接口支持多种提供商
2. **类型安全**：严格的类型定义
3. **可扩展**：易于添加新的提供商
4. **流式支持**：支持流式和非流式调用

### 依赖关系

- 依赖common类型定义基础类型
- 被execution类型引用
- 被core/llm模块引用