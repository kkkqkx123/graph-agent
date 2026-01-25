# Core/LLM模块需求分析与设计

## 需求分析

### 核心需求
1. 提供统一的LLM调用接口
2. 支持多种LLM提供商（OpenAI、Anthropic、Gemini、Mock）
3. 支持流式和非流式调用
4. 支持LLM Profile配置复用
5. 支持自定义HTTP请求头

### 功能需求
1. LLM调用：支持generate和generateStream两种调用方式
2. Profile管理：LLM Profile的注册、查询、删除
3. 客户端工厂：根据provider创建对应的客户端
4. 重试机制：支持自动重试失败的请求
5. 超时控制：支持请求超时控制
6. 错误处理：统一的错误处理和转换

### 非功能需求
1. 接口统一：所有provider使用相同的接口
2. 性能优化：支持并发请求和流式传输
3. 错误友好：提供清晰的错误信息
4. 可扩展：易于添加新的provider

## 设计说明

### 模块结构

```
llm/
├── wrapper.ts           # LLM包装器
├── client-factory.ts    # 客户端工厂
├── base-client.ts       # LLM客户端基类
├── profile-manager.ts   # Profile管理器
└── clients/             # 各provider客户端实现
    ├── openai.ts
    ├── anthropic.ts
    ├── gemini.ts
    ├── mock.ts
    └── human-relay.ts
```

### 核心组件

#### LLMWrapper
LLM包装器，提供统一的LLM调用接口。

**职责**：
- 提供统一的LLM调用接口
- 管理LLM Profile
- 处理请求和响应的转换
- 处理重试和超时

**核心方法**：
- generate(request: LLMRequest): Promise<LLMResult>
- generateStream(request: LLMRequest): AsyncIterable<LLMResult>
- registerProfile(profile: LLMProfile): void
- getProfile(profileId: string): LLMProfile | undefined
- removeProfile(profileId: string): void

**设计说明**：
- LLMWrapper是LLM调用的统一入口
- 根据profileId获取对应的LLM Profile
- 根据provider创建对应的客户端
- 处理请求参数的合并和覆盖
- 处理响应结果的统一格式

#### ClientFactory
客户端工厂，负责创建不同provider的客户端实例。

**职责**：
- 根据provider创建对应的客户端
- 缓存客户端实例
- 管理客户端生命周期

**核心方法**：
- createClient(profile: LLMProfile): LLMClient
- getClient(profileId: string): LLMClient | undefined
- clearCache(): void

**设计说明**：
- 使用工厂模式创建客户端
- 缓存客户端实例以提高性能
- 支持客户端的复用

#### BaseLLMClient
LLM客户端基类，定义客户端的通用接口和实现。

**职责**：
- 定义客户端的通用接口
- 提供通用的请求处理逻辑
- 处理重试和超时
- 处理错误转换

**核心方法**：
- generate(request: LLMRequest): Promise<LLMResult>
- generateStream(request: LLMRequest): AsyncIterable<LLMResult>
- protected doGenerate(request: LLMRequest): Promise<LLMResult>
- protected doGenerateStream(request: LLMRequest): AsyncIterable<LLMResult>
- protected shouldRetry(error: any, retries: number): boolean
- protected getRetryDelay(retries: number): number

**设计说明**：
- 所有provider客户端继承自BaseLLMClient
- 提供统一的接口和通用逻辑
- 子类只需要实现doGenerate和doGenerateStream
- 处理重试、超时、错误转换等通用逻辑

#### ProfileManager
Profile管理器，负责LLM Profile的管理。

**职责**：
- 注册LLM Profile
- 查询LLM Profile
- 删除LLM Profile
- 验证LLM Profile

**核心方法**：
- register(profile: LLMProfile): void
- get(profileId: string): LLMProfile | undefined
- remove(profileId: string): void
- list(): LLMProfile[]
- validate(profile: LLMProfile): boolean

**设计说明**：
- 使用Map存储Profile
- 支持Profile的增删查
- 提供Profile验证功能

### Provider客户端实现

#### OpenAIClient
OpenAI客户端实现。

**职责**：
- 实现OpenAI API调用
- 处理OpenAI特定的请求和响应格式
- 支持流式和非流式调用

**核心方法**：
- protected doGenerate(request: LLMRequest): Promise<LLMResult>
- protected doGenerateStream(request: LLMRequest): AsyncIterable<LLMResult>

**设计说明**：
- 使用OpenAI SDK或HTTP客户端
- 处理OpenAI的请求和响应格式
- 支持自定义headers（用于第三方API渠道）

#### AnthropicClient
Anthropic客户端实现。

**职责**：
- 实现Anthropic API调用
- 处理Anthropic特定的请求和响应格式
- 支持流式和非流式调用

**核心方法**：
- protected doGenerate(request: LLMRequest): Promise<LLMResult>
- protected doGenerateStream(request: LLMRequest): AsyncIterable<LLMResult>

**设计说明**：
- 使用Anthropic SDK或HTTP客户端
- 处理Anthropic的请求和响应格式
- 支持自定义headers

#### GeminiClient
Gemini客户端实现。

**职责**：
- 实现Gemini API调用
- 处理Gemini特定的请求和响应格式
- 支持流式和非流式调用

**核心方法**：
- protected doGenerate(request: LLMRequest): Promise<LLMResult>
- protected doGenerateStream(request: LLMRequest): AsyncIterable<LLMResult>

**设计说明**：
- 使用Gemini SDK或HTTP客户端
- 处理Gemini的请求和响应格式
- 支持自定义headers

#### MockClient
Mock客户端实现，用于测试和开发。

**职责**：
- 提供模拟的LLM响应
- 支持配置化的响应
- 用于测试和开发

**核心方法**：
- protected doGenerate(request: LLMRequest): Promise<LLMResult>
- protected doGenerateStream(request: LLMRequest): AsyncIterable<LLMResult>

**设计说明**：
- 返回预定义的模拟响应
- 支持延迟模拟
- 用于测试和开发

#### HumanRelayClient
人工中继客户端，用于人工介入场景。

**职责**：
- 等待人工输入
- 返回人工响应
- 用于需要人工审核的场景

**核心方法**：
- protected doGenerate(request: LLMRequest): Promise<LLMResult>
- protected doGenerateStream(request: LLMRequest): AsyncIterable<LLMResult>

**设计说明**：
- 触发人工交互事件
- 等待人工输入
- 返回人工响应

### 请求处理流程

#### 非流式调用流程
1. 用户调用LLMWrapper.generate(request)
2. LLMWrapper根据profileId获取LLM Profile
3. LLMWrapper合并request.parameters和Profile.parameters
4. LLMWrapper通过ClientFactory获取客户端
5. 客户端执行doGenerate(request)
6. 客户端处理重试和超时
7. 客户端转换响应格式为LLMResult
8. 返回LLMResult

#### 流式调用流程
1. 用户调用LLMWrapper.generateStream(request)
2. LLMWrapper根据profileId获取LLM Profile
3. LLMWrapper合并request.parameters和Profile.parameters
4. LLMWrapper通过ClientFactory获取客户端
5. 客户端执行doGenerateStream(request)
6. 客户端返回AsyncIterable<LLMResult>
7. 用户迭代获取流式结果

### 重试机制

#### 重试策略
- 最大重试次数：由Profile.maxRetries配置
- 重试延迟：由Profile.retryDelay配置
- 指数退避：支持指数退避策略

#### 可重试的错误
- 网络错误
- 超时错误
- 速率限制错误（429）
- 服务器错误（5xx）

#### 不可重试的错误
- 认证错误（401）
- 权限错误（403）
- 参数错误（400）
- 未找到错误（404）

### 错误处理

#### 错误类型
- 网络错误：NetworkError
- 超时错误：TimeoutError
- 认证错误：AuthenticationError
- 速率限制错误：RateLimitError
- 参数错误：ValidationError
- 服务器错误：ServerError

#### 错误转换
- 将provider特定的错误转换为SDK统一的错误类型
- 保留原始错误信息
- 提供清晰的错误消息

### 设计原则

1. **接口统一**：所有provider使用相同的接口
2. **配置复用**：使用Profile概念避免重复配置
3. **错误友好**：提供清晰的错误信息
4. **可扩展**：易于添加新的provider
5. **性能优化**：支持并发请求和流式传输

### 与其他模块的集成

#### 与Execution模块的集成
- LLMNodeExecutor调用LLMWrapper执行LLM调用
- LLMWrapper返回LLMResult给LLMNodeExecutor

#### 与State模块的集成
- LLMWrapper通过VariableManager解析prompt中的变量引用
- LLMWrapper通过HistoryManager记录LLM调用历史

#### 与Events模块的集成
- LLM调用开始时触发事件
- LLM调用完成时触发事件
- LLM调用失败时触发事件

### 依赖关系

- 依赖types层的LLM相关类型
- 被core/execution模块引用
- 被api/sdk模块引用

### 不包含的功能

以下功能不在llm模块中实现：
- ❌ LLM Profile的持久化（由应用层负责）
- ❌ LLM调用的监控和统计（由应用层负责）
- ❌ LLM调用的缓存（由应用层负责）
- ❌ LLM调用的限流（由应用层负责）

### 使用示例

```typescript
// 1. 创建LLM包装器
const llmWrapper = new LLMWrapper();

// 2. 注册LLM Profile
const profile: LLMProfile = {
  id: 'openai-gpt4',
  name: 'OpenAI GPT-4',
  provider: LLMProvider.OPENAI,
  model: 'gpt-4',
  apiKey: 'sk-xxx',
  parameters: {
    temperature: 0.7,
    maxTokens: 2000
  },
  headers: {
    'X-Custom-Header': 'value'
  },
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000
};
llmWrapper.registerProfile(profile);

// 3. 非流式调用
const request: LLMRequest = {
  profileId: 'openai-gpt4',
  messages: [
    { role: 'user', content: 'Hello' }
  ],
  parameters: {
    temperature: 0.8
  }
};
const result = await llmWrapper.generate(request);
console.log(result.content);

// 4. 流式调用
for await (const chunk of llmWrapper.generateStream(request)) {
  console.log(chunk.content);
}
```

### 注意事项

1. **API密钥安全**：API密钥应该通过环境变量或配置文件传入，不要硬编码
2. **超时控制**：合理设置超时时间，避免长时间等待
3. **重试策略**：合理设置重试次数和延迟，避免过度重试
4. **错误处理**：妥善处理各种错误情况，提供清晰的错误信息
5. **流式传输**：流式调用时注意及时释放资源
6. **自定义Headers**：自定义Headers用于第三方API渠道，注意安全性