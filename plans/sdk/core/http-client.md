# HTTP客户端设计

## 文件位置
`sdk/core/http/http-client.ts`

## 设计目标
提供统一的HTTP请求接口，集成重试、熔断、限流等特性，简化HTTP请求处理。

## 核心职责
- 发送HTTP请求（GET、POST、PUT、DELETE）
- 集成重试、熔断、限流中间件
- 统一错误处理
- 请求和响应日志记录

## 构造函数
接收HttpClientConfig配置对象，初始化：
- 配置对象（设置默认值）
- RetryHandler实例
- CircuitBreaker实例（可选）
- RateLimiter实例（可选）

## 公开方法

### get方法
发送GET请求。
接收URL和请求选项，调用request方法，method设置为GET。

### post方法
发送POST请求。
接收URL、请求体和请求选项，调用request方法，method设置为POST，body设置为请求体。

### put方法
发送PUT请求。
接收URL、请求体和请求选项，调用request方法，method设置为PUT，body设置为请求体。

### delete方法
发送DELETE请求。
接收URL和请求选项，调用request方法，method设置为DELETE。

## 私有方法

### request方法
通用请求处理逻辑。
执行步骤：
1. 检查限流器（如果启用），调用waitForToken等待令牌
2. 检查熔断器（如果启用），如果打开则抛出CircuitBreakerOpenError
3. 通过RetryHandler执行请求，调用executeRequest方法
4. 如果成功，记录熔断器成功状态
5. 如果失败，记录熔断器失败状态
6. 返回响应或抛出错误

### executeRequest方法
执行实际的HTTP请求。
执行步骤：
1. 构建完整URL（合并baseURL和相对URL，添加查询参数）
2. 合并默认请求头和自定义请求头
3. 序列化请求体（如果不是字符串则JSON序列化）
4. 创建AbortController用于超时控制
5. 调用fetch API发送请求
6. 清除超时定时器
7. 检查响应状态，如果不是2xx则创建并抛出HttpError
8. 根据Content-Type解析响应体（JSON或文本）
9. 构建HttpResponse对象返回
10. 捕获异常，转换为对应的错误类型抛出

### buildURL方法
构建完整URL。
执行步骤：
1. 如果URL不是完整URL（不以http开头），拼接baseURL
2. 如果有查询参数，构建查询字符串并追加到URL
3. 返回完整URL

### createHttpError方法
根据状态码创建对应的错误对象。
执行步骤：
1. 如果状态码是429，返回RateLimitError
2. 否则返回HttpError

### headersToObject方法
将Headers对象转换为普通对象。
执行步骤：
1. 遍历Headers对象
2. 将每个键值对添加到普通对象
3. 返回普通对象

## 设计要点
- 所有公开方法最终调用request方法
- request方法负责中间件协调（限流、熔断、重试）
- executeRequest方法负责实际的HTTP请求
- 使用AbortController实现超时控制
- 错误统一转换为SDK错误类型
- 支持JSON和文本两种响应格式