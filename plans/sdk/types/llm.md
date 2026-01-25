# LLM类型需求分析与设计

## 需求分析

### 核心需求
1. 定义LLM配置文件（Profile），支持独立配置和复用
2. 支持多种LLM提供商
3. 定义简化的LLM请求和响应结构
4. 支持HTTP请求头自定义

### 功能需求
1. LLM提供商包括OpenAI、Anthropic、Gemini、Mock等
2. LLM Profile包含provider、model、parameters、headers等配置
3. LLM请求支持消息和参数对象
4. LLM响应整合choices和finishReason为统一结果
5. 支持流式和非流式调用

### 非功能需求
1. 简化配置，parameters使用Record类型避免类型约束
2. 支持第三方API渠道的自定义headers
3. 易于扩展新的LLM提供商
4. LLM Profile可被LLM Node引用

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

#### LLMProfile
LLM配置文件类型，用于独立配置和复用。

**属性**：
- id: Profile唯一标识符
- name: Profile名称
- provider: LLM提供商
- model: 模型名称
- apiKey: API密钥
- baseUrl: 可选的基础URL（用于第三方API渠道）
- parameters: 模型参数对象（temperature、maxTokens等，不强制类型）
- headers: 自定义HTTP请求头（用于第三方API渠道）
- timeout: 超时时间（毫秒）
- maxRetries: 最大重试次数
- retryDelay: 重试延迟（毫秒）
- metadata: 可选的元数据

**设计说明**：
- parameters使用Record<string, any>类型，避免不同提供商参数键不同的问题
- headers支持自定义，用于第三方API渠道的特殊认证或配置
- Profile可被LLM Node直接引用，简化配置

#### LLMRequest
LLM请求类型。

**属性**：
- profileId: 引用的LLM Profile ID（可选，如果不提供则使用默认配置）
- messages: 消息数组
- parameters: 请求参数对象（覆盖Profile中的parameters）
- tools: 可用的工具定义
- stream: 是否流式传输

**设计说明**：
- profileId用于引用LLM Profile，简化配置
- parameters可以覆盖Profile中的参数
- 不包含model、temperature等具体参数，统一放在parameters对象中

#### LLMMessage
LLM消息类型。

**属性**：
- role: 角色（system、user、assistant、tool）
- content: 消息内容（字符串或对象）
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

#### LLMResult
LLM响应结果类型（整合choices和finishReason）。

**属性**：
- id: 响应ID
- model: 模型名称
- content: 响应内容文本
- message: 完整的LLMMessage对象
- toolCalls: 工具调用数组
- usage: Token使用情况
- finishReason: 完成原因
- duration: 响应时间（毫秒）
- metadata: 响应元数据

**设计说明**：
- 整合了原来的LLMChoice，直接提供content和message
- finishReason直接在结果中，不需要单独的枚举
- 简化了响应结构，便于使用

#### LLMUsage
LLM Token使用类型。

**属性**：
- promptTokens: 提示token数
- completionTokens: 完成token数
- totalTokens: 总token数
- promptTokensCost: 提示token成本（可选）
- completionTokensCost: 完成token成本（可选）
- totalCost: 总成本（可选）

#### LLMClient
LLM客户端接口。

**方法**：
- generate(request: LLMRequest): Promise<LLMResult>
- generateStream(request: LLMRequest): AsyncIterable<LLMResult>

**设计说明**：
- 参考BaseLLMClient的设计
- generate用于非流式调用
- generateStream用于流式调用，返回AsyncIterable

#### LLMClientConfig
LLM客户端配置类型。

**属性**：
- provider: LLM提供商
- apiKey: API密钥
- baseUrl: 基础URL
- timeout: 超时时间
- maxRetries: 最大重试次数
- retryDelay: 重试延迟

### LLM Node配置简化

#### LLMNodeConfig（简化版）
LLM节点配置类型。

**属性**：
- profileId: 引用的LLM Profile ID
- prompt: 提示词（消息数组或变量引用）
- parameters: 可选的参数覆盖

**设计说明**：
- 通过profileId引用LLM Profile，避免重复配置
- prompt支持变量引用，如{{variableName}}
- parameters可以覆盖Profile中的参数

### 设计原则

1. **配置分离**：LLM Profile独立配置，可被多个Node引用
2. **参数灵活**：parameters使用Record类型，避免类型约束
3. **Header支持**：支持自定义HTTP请求头，适配第三方API渠道
4. **响应简化**：整合choices和finishReason，简化使用
5. **提供商抽象**：统一的接口支持多种提供商

### 依赖关系

- 依赖common类型定义基础类型
- 被node类型引用（LLMNodeConfig）
- 被execution类型引用
- 被core/llm模块引用

### 使用示例

```typescript
// 1. 定义LLM Profile
const llmProfile: LLMProfile = {
  id: 'openai-gpt4',
  name: 'OpenAI GPT-4',
  provider: LLMProvider.OPENAI,
  model: 'gpt-4',
  apiKey: 'sk-xxx',
  parameters: {
    temperature: 0.7,
    maxTokens: 2000,
    topP: 1.0
  },
  headers: {
    'X-Custom-Header': 'value' // 第三方API渠道
  },
  timeout: 30000,
  maxRetries: 3
};

// 2. LLM Node引用Profile
const llmNode: Node = {
  id: 'llm-1',
  type: NodeType.LLM,
  name: 'LLM Call',
  config: {
    profileId: 'openai-gpt4',
    prompt: [
      { role: 'user', content: 'Process this: {{input}}' }
    ],
    parameters: {
      temperature: 0.9 // 覆盖Profile中的temperature
    }
  }
};

// 3. 执行LLM请求
const request: LLMRequest = {
  profileId: 'openai-gpt4',
  messages: [
    { role: 'user', content: 'Hello' }
  ],
  parameters: {
    temperature: 0.8
  }
};

const result: LLMResult = await llmClient.generate(request);
console.log(result.content);
```