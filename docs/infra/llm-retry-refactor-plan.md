# LLM重试逻辑重构方案

## 文档信息

- **创建日期**: 2025-01-XX
- **基于文档**: `docs/infra/llm-retry-logic-design.md`
- **设计原则**: 简化架构，直接复用HTTP模块，避免不必要的抽象
- **核心策略**: 跳过适配器层，直接集成HTTP逻辑，通过配置覆盖实现定制
- **配置策略**: 保留LLM client级别的配置，支持独立控制每个provider的重试行为

---

## 1. 设计原则

### 1.1 核心原则

**直接复用，避免过度抽象**

- LLM请求本质上是HTTP请求，直接使用HTTP模块的重试功能
- 不创建额外的适配器层，避免不必要的抽象
- 通过配置覆盖实现LLM特定的重试行为
- 保持架构简单、清晰、易于维护

### 1.2 职责分离

**清晰的分层职责**

```
┌─────────────────────────────────────┐
│      LLM客户端层                     │
│  (OpenAIChatClient, etc.)           │
│  - 读取Provider配置                  │
│  - LLM特定错误判断                   │
│  - 简单的LLM层重试                   │
└──────────────┬──────────────────────┘
               │
               │ 直接使用
               │
┌──────────────▼──────────────────────┐
│   HTTP客户端层                       │
│   (HttpClient)                      │
│  - RetryHandler（可配置）            │
│  - CircuitBreaker                   │
│  - RateLimiter                      │
└──────────────┬──────────────────────┘
               │
               │ 配置层级
               │
┌──────────────▼──────────────────────┐
│   配置系统                           │
│  1. HTTP全局配置（默认值）           │
│  2. LLM全局配置（LLM默认值）         │
│  3. Provider配置（provider特定值）   │
│  4. Model配置（模型特定值，可选）    │
└─────────────────────────────────────┘
```

- **HTTP层**: 处理HTTP层面的临时性错误（网络错误、限流、服务器错误）
- **LLM层**: 处理LLM特定的临时性错误（模型不可用、Token限制）
- **业务层**: 处理模型选择、降级、成本控制等业务逻辑
- **配置层**: 支持多层级配置覆盖，实现灵活的重试策略

---

## 2. 当前问题分析

### 2.1 架构问题

1. **代码重复**: HTTP模块和LLM模块都实现了相似的重试逻辑
2. **过度设计**: LLM的`RetryConfig`类功能丰富但未被充分利用
3. **架构不一致**: HTTP模块有完整的执行器，LLM模块只有配置管理
4. **实际使用**: LLM客户端通过HTTP模块发送请求，但LLM的重试配置被忽略

### 2.2 具体问题

**LLM模块未使用的功能**:
- `RetryStrategy`枚举（4种策略，实际只用指数退避）
- `RetrySession`类（会话记录，从未使用）
- `RetryStats`类（统计信息，从未使用）
- `totalTimeout`和`perAttemptTimeout`（超时控制，从未使用）
- `providerConfig`（提供商特定配置，从未使用）

**配置不一致**:
- HTTP配置使用毫秒，LLM配置使用秒
- HTTP配置从全局配置读取，LLM配置从字典读取
- 两者配置项名称不一致

---

## 3. 重构方案

### 3.1 方案概述

**直接集成HTTP模块，通过配置覆盖实现定制**

1. **移除LLM模块中未使用的复杂重试配置**
2. **LLM客户端直接使用HttpClient**
3. **通过配置覆盖HTTP的重试参数**
4. **在LLM客户端中添加简单的LLM特定错误处理**

### 3.2 架构设计

```
┌─────────────────────────────────────┐
│      LLM客户端层                     │
│  (OpenAIChatClient, etc.)           │
│                                     │
│  generateResponse() {               │
│    1. 创建HTTP请求配置               │
│    2. 覆盖HTTP重试参数（可选）       │
│    3. 调用HttpClient.post()         │
│    4. 处理LLM特定错误                │
│    5. 简单的LLM层重试（如需要）      │
│  }                                   │
└──────────────┬──────────────────────┘
               │
               │ 直接使用
               │
┌──────────────▼──────────────────────┐
│   HTTP客户端层                       │
│   (HttpClient)                      │
│                                     │
│  post(url, data, config) {          │
│    1. 检查限流                       │
│    2. 检查熔断器                     │
│    3. 使用RetryHandler重试           │
│    4. 返回响应                       │
│  }                                   │
└──────────────┬──────────────────────┘
               │
               │ 使用
               │
┌──────────────▼──────────────────────┐
│   RetryHandler                      │
│  - executeWithRetry()               │
│  - isRetryableError()               │
│  - calculateDelay()                 │
└─────────────────────────────────────┘
```

### 3.3 实现策略

#### 策略1: 配置覆盖（推荐）

**通过HTTP请求配置覆盖重试参数**

```typescript
// LLM客户端中
async generateResponse(request: LLMRequest): Promise<LLMResponse> {
  // 1. 获取LLM特定的重试配置
  const llmRetryConfig = this.getLLMRetryConfig();

  // 2. 创建HTTP请求配置，覆盖重试参数
  const httpConfig = {
    headers: this.buildHeaders(request),
    timeout: this.providerConfig.timeout,
    // 覆盖HTTP重试参数
    retry: {
      maxRetries: llmRetryConfig.maxRetries,
      baseDelay: llmRetryConfig.baseDelay * 1000, // 转换为毫秒
      maxDelay: llmRetryConfig.maxDelay * 1000,
      backoffMultiplier: llmRetryConfig.backoffMultiplier,
    },
  };

  // 3. 调用HttpClient，使用覆盖的配置
  const response = await this.httpClient.post(endpoint, providerRequest, httpConfig);

  // 4. 处理LLM特定错误
  return this.handleLLMResponse(response, request);
}
```

**优点**:
- 不需要修改HTTP模块
- 灵活性高，每个请求可以有不同的重试配置
- 实现简单

**缺点**:
- 需要HttpClient支持请求级别的重试配置覆盖

#### 策略2: 配置注入

**通过依赖注入提供LLM特定的RetryHandler**

```typescript
// 1. 创建LLM特定的RetryHandler实例
const llmRetryHandler = new RetryHandler();
llmRetryHandler.setMaxRetries(3);
llmRetryHandler.setBaseDelay(2000);
llmRetryHandler.setMaxDelay(60000);
llmRetryHandler.setBackoffMultiplier(2);

// 2. 创建使用LLM RetryHandler的HttpClient
const llmHttpClient = new HttpClient(
  llmRetryHandler,
  circuitBreaker,
  rateLimiter
);

// 3. LLM客户端使用llmHttpClient
export class OpenAIChatClient extends BaseLLMClient {
  constructor(
    @inject(TYPES.LLMHttpClient) httpClient: HttpClient,
    // ...
  ) {
    super(httpClient, rateLimiter, tokenCalculator, providerConfig);
  }
}
```

**优点**:
- 不需要修改HTTP模块
- 清晰的依赖注入
- 易于测试

**缺点**:
- 需要创建额外的HttpClient实例
- 增加了DI容器的复杂度

#### 策略3: 配置映射（最简单）

**将LLM重试配置映射到HTTP全局配置**

```typescript
// 在LLM客户端初始化时
export class OpenAIChatClient extends BaseLLMClient {
  constructor(
    @inject(TYPES.HttpClient) httpClient: HttpClient,
    @inject(TYPES.TokenBucketLimiter) rateLimiter: TokenBucketLimiter,
    @inject(TYPES.TokenCalculator) tokenCalculator: TokenCalculator
  ) {
    // 1. 获取LLM特定的重试配置
    const llmRetryConfig = getConfig().get('llm.retry');

    // 2. 临时覆盖HTTP全局配置
    const originalConfig = {
      maxRetries: getConfig().get('http.retry.max_retries'),
      baseDelay: getConfig().get('http.retry.base_delay'),
      maxDelay: getConfig().get('http.retry.max_delay'),
      backoffMultiplier: getConfig().get('http.retry.backoff_multiplier'),
    };

    // 3. 设置LLM特定的配置
    getConfig().set('http.retry.max_retries', llmRetryConfig.max_retries);
    getConfig().set('http.retry.base_delay', llmRetryConfig.base_delay * 1000);
    getConfig().set('http.retry.max_delay', llmRetryConfig.max_delay * 1000);
    getConfig().set('http.retry.backoff_multiplier', llmRetryConfig.backoff_multiplier);

    // 4. 创建HttpClient
    super(httpClient, rateLimiter, tokenCalculator, providerConfig);

    // 5. 恢复原始配置（如果需要）
    // 注意：这种方式有副作用，不推荐
  }
}
```

**优点**:
- 实现最简单
- 不需要修改HTTP模块

**缺点**:
- 有副作用，影响全局配置
- 不推荐使用

---

## 4. 推荐实现方案

### 4.1 方案选择

**推荐策略1: 配置覆盖**

**理由**:
1. **无副作用**: 不影响全局配置
2. **灵活性高**: 每个请求可以有不同的重试配置
3. **实现简单**: 只需修改HttpClient支持请求级别的配置
4. **易于测试**: 可以轻松模拟不同的重试配置

### 4.2 实现步骤

#### 步骤1: 修改HttpClient支持请求级别的重试配置

**文件**: `src/infrastructure/common/http/http-client.ts`

```typescript
export class HttpClient {
  private axiosInstance: AxiosInstance;
  private retryHandler: RetryHandler;
  private circuitBreaker: CircuitBreaker;
  private rateLimiter: RateLimiter;

  constructor(
    @inject(TYPES.RetryHandler) retryHandler: RetryHandler,
    @inject(TYPES.CircuitBreaker) circuitBreaker: CircuitBreaker,
    @inject(TYPES.RateLimiter) rateLimiter: RateLimiter
  ) {
    this.retryHandler = retryHandler;
    this.circuitBreaker = circuitBreaker;
    this.rateLimiter = rateLimiter;
    this.axiosInstance = axios.create(this.getDefaultConfig());
    this.setupInterceptors();
  }

  async request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    // 检查限流
    await this.rateLimiter.checkLimit();

    // 检查熔断器
    if (this.circuitBreaker.isOpen()) {
      throw new Error('Circuit breaker is open. Request blocked.');
    }

    try {
      // 获取请求级别的重试配置
      const retryConfig = (config as any).retry;

      // 如果有请求级别的重试配置，创建临时的RetryHandler
      const retryHandler = retryConfig
        ? this.createRetryHandler(retryConfig)
        : this.retryHandler;

      // 执行请求与重试
      const response = await retryHandler.executeWithRetry(async () => {
        const startTime = Date.now();
        const result = await this.axiosInstance.request<T>(config);
        const duration = Date.now() - startTime;
        (result as any).duration = duration;
        return result;
      });

      // 记录成功
      this.circuitBreaker.recordSuccess();
      return response;
    } catch (error) {
      // 记录失败
      this.circuitBreaker.recordFailure();
      throw error;
    }
  }

  /**
   * 创建临时的RetryHandler实例
   */
  private createRetryHandler(config: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
  }): RetryHandler {
    const handler = new RetryHandler();
    handler.setMaxRetries(config.maxRetries);
    handler.setBaseDelay(config.baseDelay);
    handler.setMaxDelay(config.maxDelay);
    handler.setBackoffMultiplier(config.backoffMultiplier);
    return handler;
  }
}
```

#### 步骤2: 简化LLM重试配置

**文件**: `src/infrastructure/llm/retry/llm-retry-config.ts`（新建）

```typescript
/**
 * LLM重试配置
 *
 * 简化的LLM重试配置，只包含必要的配置项
 */
export interface LLMRetryConfig {
  /** 最大重试次数 */
  maxRetries: number;
  /** 基础延迟（秒） */
  baseDelay: number;
  /** 最大延迟（秒） */
  maxDelay: number;
  /** 退避乘数 */
  backoffMultiplier: number;
  /** 是否启用LLM层重试 */
  enableLLMRetry: boolean;
  /** LLM层重试延迟（秒） */
  llmRetryDelay: number;
}

/**
 * 默认LLM重试配置
 */
export const DEFAULT_LLM_RETRY_CONFIG: LLMRetryConfig = {
  maxRetries: 3,
  baseDelay: 2,
  maxDelay: 60,
  backoffMultiplier: 2,
  enableLLMRetry: true,
  llmRetryDelay: 10,
};

/**
 * 从配置创建LLM重试配置
 */
export function createLLMRetryConfig(config?: Partial<LLMRetryConfig>): LLMRetryConfig {
  return {
    ...DEFAULT_LLM_RETRY_CONFIG,
    ...config,
  };
}

/**
 * 加载LLM客户端的重试配置
 * 配置优先级: Model > Provider > LLM全局 > HTTP全局
 */
export function loadLLMRetryConfig(
  provider: string,
  model?: string
): LLMRetryConfig {
  // 1. 获取HTTP全局配置（默认值）
  const httpConfig = getConfig().get('http.retry');
  
  // 2. 获取LLM全局配置
  const llmGlobalConfig = getConfig().get('llms.retry.retry_config');
  
  // 3. 获取Provider配置
  const providerConfig = getConfig().get(`llms.provider.${provider}.http_client`);
  
  // 4. 获取Model配置（可选）
  const modelConfig = model
    ? getConfig().get(`llms.provider.${provider}.${model}.http_client`)
    : undefined;

  // 5. 合并配置（优先级从低到高）
  const mergedConfig = {
    maxRetries: modelConfig?.max_retries
      ?? providerConfig?.max_retries
      ?? llmGlobalConfig?.max_retries
      ?? httpConfig.max_retries,
    baseDelay: (modelConfig?.retry_delay
      ?? providerConfig?.retry_delay
      ?? llmGlobalConfig?.base_delay
      ?? httpConfig.base_delay / 1000), // 转换为秒
    maxDelay: (modelConfig?.max_retry_backoff
      ?? providerConfig?.max_retry_backoff
      ?? llmGlobalConfig?.max_delay
      ?? httpConfig.max_delay / 1000), // 转换为秒
    backoffMultiplier: modelConfig?.backoff_factor
      ?? providerConfig?.backoff_factor
      ?? llmGlobalConfig?.backoff_multiplier
      ?? httpConfig.backoff_multiplier,
    enableLLMRetry: llmGlobalConfig?.enable_llm_retry ?? true,
    llmRetryDelay: llmGlobalConfig?.llm_retry_delay ?? 10,
  };

  return createLLMRetryConfig(mergedConfig);
}
```

#### 步骤3: 更新LLM客户端

**文件**: `src/infrastructure/llm/clients/openai-chat-client.ts`

```typescript
export class OpenAIChatClient extends BaseLLMClient {
  private llmRetryConfig: LLMRetryConfig;
  private providerName: string = 'openai';

  constructor(
    @inject(TYPES.HttpClient) httpClient: HttpClient,
    @inject(TYPES.TokenBucketLimiter) rateLimiter: TokenBucketLimiter,
    @inject(TYPES.TokenCalculator) tokenCalculator: TokenCalculator
  ) {
    // 创建功能支持
    const featureSupport = new BaseFeatureSupport();
    // ... (省略其他代码)

    // 获取LLM重试配置（支持多层级配置）
    this.llmRetryConfig = loadLLMRetryConfig(this.providerName);

    // 创建供应商配置
    const providerConfig = new ProviderConfigBuilder()
      .name('OpenAI')
      .apiType(ApiType.OPENAI_COMPATIBLE)
      .baseURL('https://api.openai.com/v1')
      .apiKey(apiKey)
      // ... (省略其他代码)
      .build();

    super(httpClient, rateLimiter, tokenCalculator, providerConfig);
  }

  /**
   * 获取当前使用的模型
   */
  private getCurrentModel(): string {
    return this.providerConfig.defaultModel || 'gpt-4o';
  }

  /**
   * 重新加载重试配置（支持动态切换模型）
   */
  private reloadRetryConfig(): void {
    const currentModel = this.getCurrentModel();
    this.llmRetryConfig = loadLLMRetryConfig(this.providerName, currentModel);
  }

  protected override async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    await this.rateLimiter.checkLimit();

    try {
      // 1. 参数映射
      const providerRequest = this.providerConfig.parameterMapper.mapToProvider(
        request,
        this.providerConfig
      );

      // 2. 构建端点和头部
      const endpoint = this.providerConfig.endpointStrategy.buildEndpoint(
        this.providerConfig,
        providerRequest
      );
      const headers = this.providerConfig.endpointStrategy.buildHeaders(
        this.providerConfig,
        request
      );

      // 3. 创建HTTP请求配置，覆盖重试参数
      const httpConfig = {
        headers,
        timeout: this.providerConfig.timeout,
        // 覆盖HTTP重试参数
        retry: {
          maxRetries: this.llmRetryConfig.maxRetries,
          baseDelay: this.llmRetryConfig.baseDelay * 1000, // 转换为毫秒
          maxDelay: this.llmRetryConfig.maxDelay * 1000,
          backoffMultiplier: this.llmRetryConfig.backoffMultiplier,
        },
      };

      // 4. 发送请求（HTTP层会自动重试）
      const response = await this.httpClient.post(endpoint, providerRequest, httpConfig);

      // 5. 转换响应
      return this.providerConfig.parameterMapper.mapFromResponse(response.data, request);
    } catch (error) {
      // 6. 处理LLM特定错误
      return this.handleLLMError(error, request);
    }
  }

  /**
   * 处理LLM特定错误
   */
  private async handleLLMError(error: any, request: LLMRequest): Promise<LLMResponse> {
    // 判断是否是LLM特定的可重试错误
    if (this.isLLMRetryableError(error) && this.llmRetryConfig.enableLLMRetry) {
      // 简单的LLM层重试
      return this.retryWithLLMLogic(error, request);
    }

    // 不可重试的错误，直接抛出
    throw error;
  }

  /**
   * 判断是否是LLM特定的可重试错误
   */
  private isLLMRetryableError(error: any): boolean {
    const errorMessage = error.message?.toLowerCase() || '';

    // 模型临时不可用
    if (errorMessage.includes('model is not available') ||
        errorMessage.includes('model is overloaded') ||
        errorMessage.includes('model is temporarily unavailable')) {
      return true;
    }

    // Token限制（可调整）
    if (errorMessage.includes('maximum context length') ||
        errorMessage.includes('token limit')) {
      return true;
    }

    return false;
  }

  /**
   * 使用LLM逻辑重试
   */
  private async retryWithLLMLogic(error: any, request: LLMRequest): Promise<LLMResponse> {
    // 等待指定时间
    await this.delay(this.llmRetryConfig.llmRetryDelay * 1000);

    // 尝试调整请求参数（如截断文本）
    const adjustedRequest = this.adjustRequestForRetry(error, request);

    // 重新发送请求
    return this.generateResponse(adjustedRequest);
  }

  /**
   * 根据错误调整请求参数
   */
  private adjustRequestForRetry(error: any, request: LLMRequest): LLMRequest {
    const errorMessage = error.message?.toLowerCase() || '';

    // 如果是Token限制，尝试截断消息
    if (errorMessage.includes('maximum context length') ||
        errorMessage.includes('token limit')) {
      return this.truncateMessages(request);
    }

    return request;
  }

  /**
   * 截断消息以减少Token数
   */
  private truncateMessages(request: LLMRequest): LLMRequest {
    // 简单实现：移除最早的消息
    if (request.messages.length > 1) {
      const truncatedMessages = request.messages.slice(1);
      return LLMRequest.create({
        ...request,
        messages: truncatedMessages,
      });
    }
    return request;
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

#### 步骤4: 更新配置文件

**文件**: `configs/global.toml`

```toml
[http.retry]
# HTTP默认重试配置（所有HTTP请求的默认值）
max_retries = 3
base_delay = 1000  # 毫秒
max_delay = 30000  # 毫秒
backoff_multiplier = 2.0
```

**文件**: `configs/llms/retry.toml`

```toml
# LLM全局重试配置（所有LLM请求的默认值）
[retry_config]
max_retries = 3
base_delay = 2.0  # 秒
max_delay = 60.0  # 秒
backoff_multiplier = 2.0
jitter = true

# LLM层重试配置
enable_llm_retry = true
llm_retry_delay = 10  # 秒
```

**文件**: `configs/llms/provider/openai/common.toml`

```toml
# OpenAI Provider配置
[http_client]
timeout = 30
max_retries = 5  # 覆盖LLM全局配置
retry_delay = 2.0  # 秒
backoff_factor = 2.0
pool_connections = 10

[error_handling]
retry_on_rate_limit = true
retry_on_server_error = true
max_retry_backoff = 60.0
```

**文件**: `configs/llms/provider/gemini/common.toml`

```toml
# Gemini Provider配置
[http_client]
timeout = 30
max_retries = 3  # 使用LLM全局配置
retry_delay = 1.5  # 秒
backoff_factor = 2.0

[error_handling]
retry_on_rate_limit = true
retry_on_server_error = true
max_retry_backoff = 45.0
```

**文件**: `configs/llms/provider/human-relay/common.toml`

```toml
# Human Relay Provider配置
[http_client]
timeout = 300  # 5分钟
max_retries = 0  # 不重试
retry_delay = 0
backoff_factor = 1.0

[error_handling]
retry_on_rate_limit = false
retry_on_server_error = false
max_retry_backoff = 0
```

**文件**: `configs/llms/provider/openai/gpt-4o.toml`（可选）

```toml
# GPT-4o特定配置（可选）
[http_client]
max_retries = 7  # 某些模型可能需要更多重试
retry_delay = 3.0
```

#### 步骤5: 更新配置Schema

**文件**: `src/infrastructure/config/loading/schemas/global-schema.ts`

```typescript
export const GlobalSchema = z.object({
  // ... 其他配置

  http: z.object({
    retry: z.object({
      max_retries: z.number().default(3),
      base_delay: z.number().default(1000),
      max_delay: z.number().default(30000),
      backoff_multiplier: z.number().default(2.0),
    }),
    // ... 其他HTTP配置
  }),

  llms: z.object({
    retry: z.object({
      retry_config: z.object({
        max_retries: z.number().default(3),
        base_delay: z.number().default(2.0),
        max_delay: z.number().default(60.0),
        backoff_multiplier: z.number().default(2.0),
        jitter: z.boolean().default(true),
      }),
      enable_llm_retry: z.boolean().default(true),
      llm_retry_delay: z.number().default(10),
    }),
    // ... 其他LLM配置
  }),
});
```

#### 步骤6: 清理未使用的代码

**删除或标记为废弃**:
- `src/infrastructure/llm/retry/retry-config.ts`（保留必要的部分，移除未使用的部分）
- `src/infrastructure/llm/retry/index.ts`（更新导出）

**保留**:
- `RetryStrategy`枚举（如果未来需要）
- `RetryConfig`类的简化版本

**移除**:
- `RetrySession`类（未使用）
- `RetryStats`类（未使用）
- `totalTimeout`和`perAttemptTimeout`（未使用）
- `providerConfig`（未使用）

---

## 5. 实施计划

### 5.1 阶段划分

**阶段一：准备工作（1天）**
1. 分析现有LLM客户端的重试使用情况
2. 确定需要保留的LLM特定功能
3. 设计简化的LLM重试配置接口

**阶段二：修改HttpClient（1天）**
1. 修改HttpClient支持请求级别的重试配置
2. 添加单元测试
3. 验证现有功能不受影响

**阶段三：简化LLM重试配置（1天）**
1. 创建简化的LLM重试配置接口
2. 更新配置Schema
3. 更新配置文件

**阶段四：更新LLM客户端（2-3天）**
1. 更新`OpenAIChatClient`
2. 更新其他LLM客户端（Gemini、Anthropic等）
3. 添加LLM特定错误处理
4. 添加单元测试

**阶段五：清理代码（1天）**
1. 移除未使用的LLM重试代码
2. 更新文档
3. 代码审查

**阶段六：测试和优化（2天）**
1. 集成测试
2. 性能测试
3. 优化和调整

**总计**: 8-9天

### 5.2 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 破坏现有功能 | 高 | 低 | 充分的测试，渐进式迁移 |
| 配置不兼容 | 中 | 低 | 提供配置迁移指南 |
| 性能下降 | 低 | 低 | 性能测试，优化 |
| 维护成本增加 | 中 | 低 | 清晰的架构，充分的文档 |

---

## 6. 测试策略

### 6.1 单元测试

**HttpClient测试**:
```typescript
describe('HttpClient', () => {
  it('should use request-level retry config', async () => {
    // 测试请求级别的重试配置
  });

  it('should fallback to default retry config', async () => {
    // 测试默认重试配置
  });
});
```

**LLM客户端测试**:
```typescript
describe('OpenAIChatClient', () => {
  it('should retry on HTTP errors', async () => {
    // 测试HTTP错误重试
  });

  it('should retry on LLM specific errors', async () => {
    // 测试LLM特定错误重试
  });

  it('should truncate messages on token limit', async () => {
    // 测试Token限制时的消息截断
  });
});
```

### 6.2 集成测试

```typescript
describe('LLM Retry Integration', () => {
  it('should handle network errors correctly', async () => {
    // 测试网络错误场景
  });

  it('should handle rate limit errors correctly', async () => {
    // 测试限流场景
  });

  it('should handle model unavailable errors correctly', async () => {
    // 测试模型不可用场景
  });
});
```

### 6.3 性能测试

```typescript
describe('Retry Performance', () => {
  it('should not degrade performance on success', async () => {
    // 测试成功场景性能
  });

  it('should handle retries efficiently', async () => {
    // 测试重试场景性能
  });
});
```

---

## 7. 配置层级和优先级

### 7.1 配置层级

**支持多层级配置覆盖**:

```
HTTP全局配置 (configs/global.toml)
    ↓
LLM全局配置 (configs/llms/retry.toml)
    ↓
Provider配置 (configs/llms/provider/{provider}/common.toml)
    ↓
Model配置 (configs/llms/provider/{provider}/{model}.toml) [可选]
```

**配置优先级**: Model > Provider > LLM全局 > HTTP全局

### 7.2 配置优先级示例

**场景1: 使用OpenAI的GPT-4o模型**

```
HTTP全局: max_retries = 3
LLM全局: max_retries = 3
OpenAI Provider: max_retries = 5
GPT-4o Model: max_retries = 7

最终配置: max_retries = 7 (使用Model配置)
```

**场景2: 使用OpenAI的GPT-4o-mini模型（无Model配置）**

```
HTTP全局: max_retries = 3
LLM全局: max_retries = 3
OpenAI Provider: max_retries = 5
GPT-4o-mini Model: 无配置

最终配置: max_retries = 5 (使用Provider配置)
```

**场景3: 使用Gemini模型（无Model配置）**

```
HTTP全局: max_retries = 3
LLM全局: max_retries = 3
Gemini Provider: max_retries = 3 (使用LLM全局配置)
Gemini Model: 无配置

最终配置: max_retries = 3 (使用LLM全局配置)
```

**场景4: 使用Human Relay**

```
HTTP全局: max_retries = 3
LLM全局: max_retries = 3
Human Relay Provider: max_retries = 0

最终配置: max_retries = 0 (不重试)
```

### 7.3 配置设计原则

1. **默认值合理**: HTTP全局配置提供合理的默认值
2. **Provider独立**: 每个Provider可以有自己的重试策略
3. **Model可选**: Model级别的配置是可选的，只在需要时使用
4. **配置清晰**: 配置项名称统一，易于理解
5. **向后兼容**: 新增配置项提供默认值，不影响现有配置

### 7.4 配置建议

**OpenAI**:
- `max_retries = 5`: OpenAI限流较严格，需要更多重试
- `retry_delay = 2.0`: 基础延迟2秒
- `max_retry_backoff = 60.0`: 最大延迟60秒

**Gemini**:
- `max_retries = 3`: Gemini限流相对宽松
- `retry_delay = 1.5`: 基础延迟1.5秒
- `max_retry_backoff = 45.0`: 最大延迟45秒

**Anthropic**:
- `max_retries = 4`: Anthropic限流适中
- `retry_delay = 2.0`: 基础延迟2秒
- `max_retry_backoff = 60.0`: 最大延迟60秒

**Human Relay**:
- `max_retries = 0`: 不需要重试
- `timeout = 300`: 超时时间设置为5分钟

**Mock**:
- `max_retries = 0`: Mock不需要重试
- `timeout = 1000`: 快速响应

---

## 8. 监控和日志

### 8.1 监控指标

- HTTP重试次数
- HTTP重试成功率
- LLM重试次数
- LLM重试成功率
- 平均重试延迟
- 重试原因分布

### 8.2 日志记录

```typescript
// HTTP重试日志
console.warn(`HTTP retry attempt ${attempt + 1}/${maxRetries + 1} after ${delay}ms`, {
  error: error.message,
  status: error.response?.status,
});

// LLM重试日志
console.warn(`LLM retry attempt ${attempt + 1}/${maxRetries + 1} after ${delay}ms`, {
  error: error.message,
  errorType: error.constructor.name,
});
```

---

## 9. 总结

### 9.1 核心要点

1. **直接复用HTTP模块**: 不创建额外的适配器层
2. **配置覆盖实现定制**: 通过请求级别的配置覆盖实现LLM特定的重试行为
3. **简化LLM重试配置**: 只保留必要的配置项，移除未使用的复杂功能
4. **清晰的职责分离**: HTTP层处理HTTP错误，LLM层处理LLM特定错误

### 9.2 预期收益

1. **减少代码重复**: 减少约40%的重试相关代码
2. **统一错误处理**: 统一的重试行为，避免配置不一致
3. **降低维护成本**: 只需维护一个核心重试实现
4. **提高可测试性**: 清晰的架构，易于测试
5. **增强灵活性**: 通过配置覆盖实现定制，无需修改代码

### 9.3 后续工作

1. 实施本方案
2. 更新相关文档
3. 添加充分的测试
4. 监控和优化性能
5. 收集反馈，持续改进

---

## 附录

### A. 相关文件清单

**需要修改的文件**:
- `src/infrastructure/common/http/http-client.ts`
- `src/infrastructure/llm/clients/openai-chat-client.ts`
- `src/infrastructure/llm/clients/gemini-client.ts`
- `src/infrastructure/llm/clients/anthropic-client.ts`
- `src/infrastructure/llm/clients/mock-client.ts`
- `src/infrastructure/llm/clients/human-relay-client.ts`
- `src/infrastructure/config/loading/schemas/global-schema.ts`
- `configs/global.toml`

**需要新建的文件**:
- `src/infrastructure/llm/retry/llm-retry-config.ts`

**需要更新或新建的配置文件**:
- `configs/llms/retry.toml` - LLM全局重试配置
- `configs/llms/provider/openai/common.toml` - OpenAI Provider配置
- `configs/llms/provider/gemini/common.toml` - Gemini Provider配置
- `configs/llms/provider/anthropic/common.toml` - Anthropic Provider配置
- `configs/llms/provider/human-relay/common.toml` - Human Relay Provider配置
- `configs/llms/provider/mock/common.toml` - Mock Provider配置
- `configs/llms/provider/{provider}/{model}.toml` - Model特定配置（可选）

**需要删除或简化的文件**:
- `src/infrastructure/llm/retry/retry-config.ts`（简化）

### B. 变更历史

| 日期 | 版本 | 变更说明 | 作者 |
|------|------|----------|------|
| 2025-01-XX | 1.0 | 初始版本 | - |