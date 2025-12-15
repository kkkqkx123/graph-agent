# LLM 客户端架构重构方案

## 概述

本文档提出了一个架构重构方案，旨在解决当前 LLM 客户端实现中的问题，同时保持架构的清晰性和可扩展性。重构方案重点关注如何处理不同 API 之间的差异，特别是 Gemini 的思考预算等特有功能。

## 当前架构问题分析

### 1. 架构混乱点

1. **Gemini 客户端特殊处理**
   - 重写了 `makeRequest()` 方法
   - 在 URL 中直接包含 API 密钥
   - 使用原生 API 而非 OpenAI 兼容端点

2. **参数处理不一致**
   - 不同客户端处理参数的方式不同
   - 缺少统一的参数转换机制
   - 特有参数处理分散在各个客户端中

3. **功能支持不完整**
   - 高级参数支持不完整
   - 多模态支持缺失
   - 流式响应实现不统一

### 2. 可扩展性问题

1. **添加新供应商困难**
   - 需要重复实现大量通用功能
   - 特有功能处理模式不清晰

2. **API 版本升级困难**
   - 参数变更需要修改多个地方
   - 缺少向后兼容性保证

## 重构方案

### 1. 分层架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  Workflow       │  │  Session        │  │  Thread      │ │
│  │  Service        │  │  Service        │  │  Service     │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                    Domain Layer                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  LLM Request    │  │  LLM Response   │  │  Model       │ │
│  │  Entity         │  │  Entity         │  │  Config      │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  LLM Client     │  │  Provider       │  │  Parameter   │ │
│  │  Interface      │  │  Config         │  │  Adapter     │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                Infrastructure Layer                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  Base LLM       │  │  Parameter      │  │  Endpoint    │ │
│  │  Client         │  │  Mapper         │  │  Strategy    │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  HTTP           │  │  Provider       │  │  Feature     │ │
│  │  Client         │  │  Adapter        │  │  Registry    │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2. 核心组件设计

#### 2.1 参数映射系统

```typescript
// 参数映射接口
interface IParameterMapper {
  mapToProvider(request: LLMRequest, providerConfig: ProviderConfig): ProviderRequest;
  mapFromResponse(response: ProviderResponse): LLMResponse;
  getSupportedParameters(): ParameterDefinition[];
}

// 参数定义
interface ParameterDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  defaultValue?: any;
  description?: string;
  validation?: (value: any) => boolean;
}

// 供应商配置
interface ProviderConfig {
  name: string;
  apiType: 'openai-compatible' | 'native' | 'custom';
  endpointStrategy: EndpointStrategy;
  parameterMapper: IParameterMapper;
  featureSupport: FeatureSupport;
}
```

#### 2.2 端点策略系统

```typescript
// 端点策略接口
interface IEndpointStrategy {
  buildEndpoint(config: ProviderConfig, request: ProviderRequest): string;
  buildHeaders(config: ProviderConfig): Record<string, string>;
  handleAuthentication(request: any): any;
}

// OpenAI 兼容端点策略
class OpenAICompatibleEndpointStrategy implements IEndpointStrategy {
  buildEndpoint(config: ProviderConfig, request: ProviderRequest): string {
    return `${config.baseURL}/chat/completions`;
  }
  
  buildHeaders(config: ProviderConfig): Record<string, string> {
    return {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    };
  }
}

// Gemini 原生端点策略
class GeminiNativeEndpointStrategy implements IEndpointStrategy {
  buildEndpoint(config: ProviderConfig, request: ProviderRequest): string {
    return `${config.baseURL}/v1beta/models/${request.model}:generateContent?key=${config.apiKey}`;
  }
  
  buildHeaders(config: ProviderConfig): Record<string, string> {
    return {
      'Content-Type': 'application/json'
    };
  }
}
```

#### 2.3 功能注册系统

```typescript
// 功能注册表
class FeatureRegistry {
  private features = new Map<string, IFeature>();
  
  registerFeature(name: string, feature: IFeature): void {
    this.features.set(name, feature);
  }
  
  getFeature(name: string): IFeature | undefined {
    return this.features.get(name);
  }
  
  getSupportedFeatures(provider: string): string[] {
    // 返回供应商支持的功能列表
  }
}

// 功能接口
interface IFeature {
  name: string;
  isSupported(provider: string): boolean;
  applyToRequest(request: any, config: any): any;
  extractFromResponse(response: any): any;
}

// Gemini 思考预算功能
class GeminiThinkingBudgetFeature implements IFeature {
  name = 'thinking_budget';
  
  isSupported(provider: string): boolean {
    return provider === 'gemini';
  }
  
  applyToRequest(request: any, config: any): any {
    if (config.thinkingBudget) {
      request.extra_body = {
        ...request.extra_body,
        google: {
          ...request.extra_body?.google,
          thinking_config: {
            thinking_budget: config.thinkingBudget,
            include_thoughts: config.includeThoughts || false
          }
        }
      };
    }
    return request;
  }
  
  extractFromResponse(response: any): any {
    // 提取思考过程
    return {
      thoughts: response.candidates?.[0]?.content?.parts?.find(p => p.thought)?.thought,
      effortUsed: response.candidates?.[0]?.content?.parts?.find(p => p.thought)?.effortUsed
    };
  }
}
```

### 3. 重构后的客户端实现

#### 3.1 基础客户端重构

```typescript
@injectable()
export abstract class BaseLLMClient implements ILLMClient {
  constructor(
    @inject('HttpClient') protected httpClient: HttpClient,
    @inject('FeatureRegistry') protected featureRegistry: FeatureRegistry,
    @inject('ProviderConfig') protected providerConfig: ProviderConfig
  ) {}

  protected async makeRequest(request: LLMRequest): Promise<LLMResponse> {
    // 1. 参数映射
    const providerRequest = this.providerConfig.parameterMapper.mapToProvider(request, this.providerConfig);
    
    // 2. 应用功能特性
    const enhancedRequest = this.applyFeatures(providerRequest);
    
    // 3. 构建端点和头部
    const endpoint = this.providerConfig.endpointStrategy.buildEndpoint(this.providerConfig, enhancedRequest);
    const headers = this.providerConfig.endpointStrategy.buildHeaders(this.providerConfig);
    
    // 4. 发送请求
    const response = await this.httpClient.post(endpoint, enhancedRequest, { headers });
    
    // 5. 转换响应
    return this.providerConfig.parameterMapper.mapFromResponse(response.data);
  }
  
  private applyFeatures(request: any): any {
    let enhancedRequest = { ...request };
    
    for (const [name, feature] of this.featureRegistry.features) {
      if (feature.isSupported(this.providerConfig.name)) {
        enhancedRequest = feature.applyToRequest(enhancedRequest, this.providerConfig);
      }
    }
    
    return enhancedRequest;
  }
}
```

#### 3.2 Gemini 客户端重构

```typescript
@injectable()
export class GeminiClient extends BaseLLMClient {
  constructor(
    @inject('HttpClient') httpClient: HttpClient,
    @inject('FeatureRegistry') featureRegistry: FeatureRegistry,
    @inject('ConfigManager') configManager: any
  ) {
    const providerConfig: ProviderConfig = {
      name: 'gemini',
      apiType: 'openai-compatible', // 改为 OpenAI 兼容
      endpointStrategy: new OpenAICompatibleEndpointStrategy(),
      parameterMapper: new GeminiParameterMapper(),
      featureSupport: new GeminiFeatureSupport(),
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
      apiKey: configManager.get('llm.gemini.apiKey')
    };
    
    super(httpClient, featureRegistry, providerConfig);
  }
}
```

#### 3.3 参数映射器实现

```typescript
// Gemini 参数映射器
class GeminiParameterMapper implements IParameterMapper {
  mapToProvider(request: LLMRequest, config: ProviderConfig): ProviderRequest {
    const providerRequest: ProviderRequest = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      stream: request.stream || false
    };
    
    // Gemini 特有参数
    if (request.reasoningEffort) {
      providerRequest.reasoning_effort = request.reasoningEffort;
    }
    
    return providerRequest;
  }
  
  mapFromResponse(response: any): LLMResponse {
    const choice = response.choices[0];
    const usage = response.usage;
    
    return LLMResponse.create(
      response.id,
      response.model,
      [{
        index: choice.index,
        message: choice.message,
        finish_reason: choice.finish_reason
      }],
      {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens
      },
      choice.finish_reason,
      0
    );
  }
  
  getSupportedParameters(): ParameterDefinition[] {
    return [
      { name: 'model', type: 'string', required: true },
      { name: 'messages', type: 'array', required: true },
      { name: 'temperature', type: 'number', required: false, defaultValue: 0.7 },
      { name: 'max_tokens', type: 'number', required: false, defaultValue: 2048 },
      { name: 'reasoning_effort', type: 'string', required: false },
      { name: 'stream', type: 'boolean', required: false, defaultValue: false }
    ];
  }
}
```

### 4. 配置系统设计

```typescript
// 供应商配置文件 (configs/llm/gemini.toml)
[provider]
name = "gemini"
api_type = "openai-compatible"
base_url = "https://generativelanguage.googleapis.com/v1beta/openai"

[features]
thinking_budget = true
multimodal = true
cached_content = true

[parameters]
temperature = { default = 0.7, min = 0.0, max = 2.0 }
max_tokens = { default = 2048, min = 1, max = 8192 }
reasoning_effort = { options = ["none", "low", "medium", "high"] }

[feature_config.thinking_budget]
low = "low"
medium = "medium" 
high = "high"
```

### 5. 多模态支持设计

```typescript
// 多模态内容处理器
interface IMultimodalHandler {
  processContent(content: any[]): any[];
  isSupported(provider: string): boolean;
}

class GeminiMultimodalHandler implements IMultimodalHandler {
  processContent(content: any[]): any[] {
    return content.map(item => {
      if (item.type === 'image_url') {
        return {
          type: 'image_url',
          image_url: {
            url: item.image_url.url
          }
        };
      }
      return item;
    });
  }
  
  isSupported(provider: string): boolean {
    return provider === 'gemini';
  }
}
```

## 实施计划

### 阶段 1：核心架构重构
1. 实现参数映射系统
2. 实现端点策略系统
3. 实现功能注册系统
4. 重构基础客户端

### 阶段 2：客户端迁移
1. 重构 Gemini 客户端
2. 重构 Anthropic 客户端
3. 重构 OpenAI 客户端
4. 添加单元测试

### 阶段 3：功能完善
1. 添加多模态支持
2. 完善流式响应
3. 添加高级参数支持
4. 性能优化

### 阶段 4：文档和测试
1. 更新 API 文档
2. 添加集成测试
3. 性能测试
4. 部署和监控

## 优势分析

### 1. 架构清晰性
- 分层明确，职责单一
- 组件可替换，易于测试
- 依赖注入，降低耦合

### 2. 可扩展性
- 新供应商只需实现接口
- 新功能可通过注册表添加
- 配置驱动，无需修改代码

### 3. 可维护性
- 统一的参数处理机制
- 集中的功能管理
- 清晰的错误处理

### 4. 向后兼容性
- 版本化配置
- 渐进式迁移
- 兼容性检查

## 总结

本重构方案通过引入参数映射、端点策略和功能注册等机制，解决了当前架构中的混乱问题，同时保持了良好的可扩展性。特别是对于 Gemini 的思考预算等特有功能，通过功能注册系统实现了优雅的处理，避免了架构混乱。该方案为未来的扩展和维护奠定了坚实的基础。