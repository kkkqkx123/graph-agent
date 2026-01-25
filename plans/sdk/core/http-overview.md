# HTTP模块总览

## 模块结构
```
sdk/
├── types/
│   └── http.ts              # HTTP相关类型定义
└── core/
    └── http/
        ├── index.ts         # 模块导出
        ├── http-client.ts   # HTTP客户端核心
        ├── retry-handler.ts # 重试处理器
        ├── circuit-breaker.ts # 熔断器
        └── rate-limiter.ts  # 限流器
```

## 组件关系

### HttpClient（核心）
- 职责：统一HTTP请求接口，协调各中间件
- 依赖：RetryHandler、CircuitBreaker、RateLimiter
- 使用者：LLM客户端（OpenAIChatClient、AnthropicClient等）

### RetryHandler（重试处理器）
- 职责：指数退避重试策略
- 依赖：无
- 使用者：HttpClient

### CircuitBreaker（熔断器）
- 职责：防止级联故障
- 依赖：无
- 使用者：HttpClient（可选）

### RateLimiter（限流器）
- 职责：限制请求速率
- 依赖：无
- 使用者：HttpClient（可选）

## 请求流程

### 非流式请求流程
1. LLM客户端调用HttpClient的get/post/put/delete方法
2. HttpClient调用request方法
3. request方法检查RateLimiter（如果启用），等待令牌
4. request方法检查CircuitBreaker（如果启用），如果打开则拒绝
5. request方法通过RetryHandler执行executeRequest
6. RetryHandler循环执行executeRequest，失败时重试
7. executeRequest调用fetch API发送请求
8. executeRequest解析响应，返回HttpResponse
9. request方法记录CircuitBreaker成功或失败
10. HttpClient返回HttpResponse给LLM客户端

### 错误处理流程
1. executeRequest捕获异常
2. 根据异常类型创建对应的HttpError
3. RetryHandler判断是否可重试
4. 如果可重试且未达到最大重试次数，延迟后重试
5. 如果不可重试或达到最大重试次数，抛出错误
6. request方法记录CircuitBreaker失败
7. HttpClient抛出错误给LLM客户端

## 配置说明

### HttpClientConfig
- baseURL：基础URL，用于拼接相对URL
- defaultHeaders：默认请求头，所有请求都会携带
- timeout：默认超时时间，单个请求可覆盖
- maxRetries：最大重试次数
- retryDelay：重试基础延迟
- enableCircuitBreaker：是否启用熔断器
- enableRateLimiter：是否启用限流器
- circuitBreakerFailureThreshold：熔断器失败阈值
- rateLimiterCapacity：限流器容量
- rateLimiterRefillRate：限流器填充速率

## 使用示例

### 基本使用
```typescript
const httpClient = new HttpClient({
  baseURL: 'https://api.example.com',
  timeout: 30000,
  maxRetries: 3,
});

const response = await httpClient.post('/endpoint', { data: 'value' });
console.log(response.data);
```

### 启用熔断器和限流器
```typescript
const httpClient = new HttpClient({
  baseURL: 'https://api.example.com',
  enableCircuitBreaker: true,
  enableRateLimiter: true,
  circuitBreakerFailureThreshold: 5,
  rateLimiterCapacity: 60,
  rateLimiterRefillRate: 10,
});
```

### 在LLM客户端中使用
```typescript
export class OpenAIChatClient extends BaseLLMClient {
  private readonly httpClient: HttpClient;

  constructor(profile: LLMProfile) {
    super(profile);
    this.httpClient = new HttpClient({
      baseURL: profile.baseUrl || 'https://api.openai.com/v1',
      timeout: profile.timeout || 30000,
      maxRetries: profile.maxRetries || 3,
      enableCircuitBreaker: true,
      enableRateLimiter: true,
    });
  }

  protected async doGenerate(request: LLMRequest): Promise<LLMResult> {
    const response = await this.httpClient.post('/chat/completions', {
      model: this.profile.model,
      messages: request.messages,
    }, {
      headers: {
        'Authorization': `Bearer ${this.profile.apiKey}`,
      },
    });

    return this.parseResponse(response.data, request);
  }
}
```

## 设计原则

### 1. 轻量级
- 无外部依赖
- 只使用原生fetch API
- 代码简洁易懂

### 2. 可配置
- 所有功能可选
- 提供合理默认值
- 支持运行时配置

### 3. 可扩展
- 清晰的接口定义
- 易于添加新功能
- 支持自定义错误处理

### 4. 类型安全
- 完整的TypeScript类型定义
- 编译时类型检查
- 良好的IDE支持

### 5. 错误处理
- 统一的错误类型
- 详细的错误信息
- 便于调试和监控

## 性能考虑

### 1. 延迟解析
- 响应数据按需解析
- 避免不必要的JSON解析

### 2. 连接复用
- 使用浏览器/Node.js的连接池
- 自动复用HTTP连接

### 3. 内存管理
- 及时释放资源
- 避免内存泄漏

### 4. 并发控制
- 限流器控制并发数
- 熔断器防止雪崩

## 测试策略

### 1. 单元测试
- 每个组件独立测试
- Mock外部依赖
- 覆盖所有分支

### 2. 集成测试
- 测试组件间协作
- 测试完整请求流程
- 测试错误场景

### 3. 性能测试
- 测试并发性能
- 测试内存使用
- 测试响应时间

## 迁移指南

### 从现有实现迁移
1. 在LLM客户端构造函数中创建HttpClient实例
2. 将fetch调用替换为HttpClient方法调用
3. 移除重复的重试、超时逻辑
4. 使用HttpClient的错误处理

### 兼容性
- 保持现有API不变
- 内部实现替换为HttpClient
- 逐步迁移，不影响现有功能