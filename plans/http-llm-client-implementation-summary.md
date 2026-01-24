# HTTP Client和LLM Client改造实施总结

## 实施日期
2025-01-XX

## 实施内容

基于对Anthropic SDK v0.71.2设计模式的分析，我们实施了最高优先级的改进：**统一错误处理体系**。

## 1. 创建统一的错误类型体系

### 文件：`src/infrastructure/common/http/errors.ts`

参考Anthropic SDK的错误处理设计，创建了分层的错误类型体系：

#### 错误类型层次结构

```
HTTPError (基础错误类)
├── ClientError (4xx客户端错误)
│   ├── BadRequestError (400)
│   ├── AuthenticationError (401)
│   ├── PermissionError (403)
│   ├── NotFoundError (404)
│   ├── ConflictError (409)
│   ├── UnprocessableEntityError (422)
│   └── RateLimitError (429)
├── ServerError (5xx服务器错误)
│   ├── InternalServerError (500)
│   ├── BadGatewayError (502)
│   ├── ServiceUnavailableError (503)
│   └── GatewayTimeoutError (504)
├── ConnectionError (网络连接错误)
│   └── ConnectionTimeoutError (连接超时)
├── UserAbortError (用户中止)
├── CircuitBreakerOpenError (熔断器开启)
└── RateLimiterError (限流错误)
```

#### 核心特性

1. **类型安全**：每个错误类型都有明确的TypeScript类型定义
2. **错误详情**：提供`getDetails()`方法获取完整的错误信息
3. **请求追踪**：包含requestId用于追踪请求
4. **时间戳**：自动记录错误发生时间
5. **错误链**：支持cause属性保留原始错误

#### HTTPErrorFactory工具类

提供两个核心方法：

1. **`fromStatusCode()`**：根据HTTP状态码自动创建对应的错误实例
2. **`isRetryable()`**：判断错误是否应该重试

## 2. 更新HttpClient使用新的错误类型

### 文件：`src/infrastructure/common/http/http-client.ts`

#### 主要修改

1. **导入新的错误类型**
   ```typescript
   import {
     HTTPError,
     HTTPErrorFactory,
     ConnectionError,
     ConnectionTimeoutError,
     UserAbortError,
     CircuitBreakerOpenError,
     RateLimiterError,
   } from './errors';
   ```

2. **优化HTTP响应错误处理**
   - 自动解析JSON错误响应
   - 提取错误消息
   - 使用`HTTPErrorFactory.fromStatusCode()`创建对应的错误实例
   - 保留requestId用于追踪

3. **优化网络错误处理**
   - 区分用户中止错误（`UserAbortError`）
   - 区分连接超时错误（`ConnectionTimeoutError`）
   - 区分一般连接错误（`ConnectionError`）

4. **优化中间件错误处理**
   - 熔断器开启时抛出`CircuitBreakerOpenError`
   - 限流失败时抛出`RateLimiterError`

5. **移除统计信息聚合**
   - 移除`getStats()`方法
   - 移除`resetStats()`方法
   - 统计信息由各个中间件（RetryHandler、CircuitBreaker、RateLimiter）自己管理
   - 符合单一职责原则，HttpClient专注于HTTP请求处理

## 3. 改进效果

### 3.1 类型安全提升

**之前**：
```typescript
const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
(error as any).response = response;
(error as any).responseText = errorText;
```

**现在**：
```typescript
const httpError = HTTPErrorFactory.fromStatusCode(
  response.status,
  errorMessage,
  responseRequestId
);
```

### 3.2 错误处理更简洁

**之前**：
```typescript
// 转换错误类型
if (error instanceof HTTPError) {
  // 已经是HTTPError，直接抛出
  throw error;
}
```

**现在**：
```typescript
// 如果已经是HTTPError，直接抛出
if (error instanceof HTTPError) {
  throw error;
}
```

移除了多余的注释，代码更简洁清晰。

### 3.2 错误处理更清晰

**之前**：
- 所有错误都是通用的`Error`类型
- 需要手动解析错误信息
- 难以区分不同类型的错误

**现在**：
- 每种错误都有明确的类型
- 自动解析错误信息
- 可以使用类型守卫和instanceof判断错误类型

### 3.3 错误追踪更完善

**之前**：
```typescript
console.error(`HTTP Error: ${options.url}`, {
  duration: `${duration}ms`,
  error: error instanceof Error ? error.message : String(error),
  requestId,
});
```

**现在**：
```typescript
if (error instanceof HTTPError) {
  console.error(`HTTP Error: ${options.url}`, {
    duration: `${duration}ms`,
    error: error.getDetails(),
    requestId,
  });
}
```

### 3.4 重试逻辑更智能

**之前**：
- 需要手动判断哪些错误应该重试
- 逻辑分散在多个地方

**现在**：
```typescript
if (HTTPErrorFactory.isRetryable(error)) {
  // 重试逻辑
}
```

## 4. 使用示例

### 4.1 基本错误处理

```typescript
try {
  const response = await httpClient.post('/api/endpoint', data);
} catch (error) {
  if (error instanceof AuthenticationError) {
    // 处理认证错误
    console.error('认证失败，请检查API密钥');
  } else if (error instanceof RateLimitError) {
    // 处理限流错误
    console.error('请求过于频繁，请稍后重试');
    console.log(`建议等待时间: ${error.retryAfter}秒`);
  } else if (error instanceof ConnectionError) {
    // 处理连接错误
    console.error('网络连接失败');
  } else if (error instanceof HTTPError) {
    // 处理其他HTTP错误
    console.error(`HTTP错误: ${error.statusCode}`, error.getDetails());
  } else {
    // 处理未知错误
    console.error('未知错误:', error);
  }
}
```

### 4.2 错误重试判断

```typescript
try {
  const response = await httpClient.post('/api/endpoint', data);
} catch (error) {
  if (error instanceof HTTPError && HTTPErrorFactory.isRetryable(error)) {
    // 可重试的错误
    console.log('错误可重试，准备重试...');
    // 重试逻辑
  } else {
    // 不可重试的错误
    console.error('错误不可重试，放弃请求');
  }
}
```

### 4.3 获取错误详情

```typescript
try {
  const response = await httpClient.post('/api/endpoint', data);
} catch (error) {
  if (error instanceof HTTPError) {
    const details = error.getDetails();
    console.log('错误详情:', details);
    // 输出:
    // {
    //   name: 'AuthenticationError',
    //   message: 'Authentication failed',
    //   statusCode: 401,
    //   requestId: 'req-1234567890-abc123',
    //   timestamp: '2025-01-XXT12:34:56.789Z'
    // }
  }
}
```

## 5. 向后兼容性

### 5.1 保持API兼容

- 所有公共方法签名保持不变
- 返回类型保持不变
- 现有代码无需修改即可使用

### 5.2 错误类型兼容

- 所有新错误类型都继承自`Error`
- 可以使用`instanceof Error`判断
- 保留了`message`和`stack`属性

### 5.3 统计信息访问变更

**移除的方法**：
- `getStats()` - 不再提供聚合的统计信息
- `resetStats()` - 不再提供重置统计信息的方法

**新的访问方式**：
```typescript
// 直接访问各个中间件的统计信息
const retryStats = httpClient['retryHandler'].getStats();
const circuitBreakerStats = httpClient['circuitBreaker'].getStats();
const rateLimiterStats = httpClient['rateLimiter'].getStats();

// 重置统计信息
httpClient['retryHandler'].resetStats();
httpClient['circuitBreaker'].reset();
httpClient['rateLimiter'].reset();
```

**设计理由**：
- 符合单一职责原则
- HttpClient专注于HTTP请求处理
- 统计信息由各个中间件自己管理
- 提供更细粒度的控制

## 6. 后续改进计划

### 6.1 短期计划（已完成）

- ✅ 创建统一的错误类型体系
- ✅ 更新HttpClient使用新的错误类型
- ✅ 优化错误处理逻辑

### 6.2 中期计划（待实施）

- ⏳ 为LLM Client创建特定的错误类型
- ⏳ 优化配置管理（借鉴ClientOptions模式）
- ⏳ 增强类型定义

### 6.3 长期计划（待评估）

- ⏳ 优化请求构建方式
- ⏳ 增强流式处理

## 7. 测试建议

### 7.1 单元测试

为新的错误类型创建单元测试：

```typescript
describe('HTTPErrorFactory', () => {
  it('should create correct error type for 401', () => {
    const error = HTTPErrorFactory.fromStatusCode(401, 'Auth failed', 'req-123');
    expect(error).toBeInstanceOf(AuthenticationError);
    expect(error.statusCode).toBe(401);
    expect(error.requestId).toBe('req-123');
  });

  it('should identify retryable errors', () => {
    const retryableError = HTTPErrorFactory.fromStatusCode(429, 'Rate limit');
    expect(HTTPErrorFactory.isRetryable(retryableError)).toBe(true);
  });
});
```

### 7.2 集成测试

测试HttpClient的错误处理：

```typescript
describe('HttpClient', () => {
  it('should throw AuthenticationError on 401', async () => {
    // Mock 401 response
    await expect(httpClient.get('/api/endpoint')).rejects.toThrow(AuthenticationError);
  });

  it('should throw ConnectionTimeoutError on timeout', async () => {
    // Mock timeout
    await expect(httpClient.get('/api/endpoint')).rejects.toThrow(ConnectionTimeoutError);
  });
});
```

## 8. 总结

通过实施统一的错误处理体系，我们实现了以下目标：

1. **类型安全**：完整的TypeScript类型定义，减少运行时错误
2. **错误分类**：清晰的错误类型层次结构，便于错误处理
3. **错误追踪**：包含requestId和时间戳，便于问题排查
4. **智能重试**：提供`isRetryable()`方法，简化重试逻辑
5. **向后兼容**：保持现有API不变，平滑升级

这些改进完全符合分析报告中的建议，专注于解决实际问题，避免了不必要的架构变更。