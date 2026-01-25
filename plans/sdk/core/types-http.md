# HTTP类型定义设计

## 文件位置
`sdk/types/http.ts`

## 设计目标
定义HTTP客户端所需的所有类型和接口，提供类型安全保障。

## 核心类型

### HTTPMethod
定义支持的HTTP方法：GET、POST、PUT、PATCH、DELETE。

### HttpRequestOptions
HTTP请求选项接口，包含：
- method：请求方法，可选，默认GET
- headers：请求头对象，可选
- body：请求体，可选，支持任意类型
- timeout：超时时间（毫秒），可选
- stream：是否流式响应，可选
- query：查询参数对象，可选

### HttpResponse
HTTP响应接口，包含：
- data：响应数据，泛型类型
- status：HTTP状态码
- headers：响应头对象
- requestId：请求ID，可选

### HttpClientConfig
HTTP客户端配置接口，包含：
- baseURL：基础URL，可选
- defaultHeaders：默认请求头，可选
- timeout：默认超时时间，可选
- maxRetries：最大重试次数，可选
- retryDelay：重试延迟，可选
- enableCircuitBreaker：是否启用熔断器，可选
- enableRateLimiter：是否启用限流器，可选
- circuitBreakerFailureThreshold：熔断器失败阈值，可选
- rateLimiterCapacity：限流器容量，可选
- rateLimiterRefillRate：限流器填充速率，可选

## 错误类型

### HttpError
基础HTTP错误类，继承自Error，包含：
- message：错误消息
- status：HTTP状态码，可选
- requestId：请求ID，可选

### NetworkError
网络错误，继承自HttpError，用于网络连接失败。

### TimeoutError
超时错误，继承自HttpError，用于请求超时。

### RateLimitError
限流错误，继承自HttpError，状态码固定为429。

### CircuitBreakerOpenError
熔断器打开错误，继承自HttpError，用于熔断器处于打开状态。

## 设计要点
- 所有类型使用TypeScript接口或类定义
- 错误类型继承自HttpError，便于统一处理
- 配置项全部可选，提供合理的默认值
- 使用泛型支持灵活的响应数据类型