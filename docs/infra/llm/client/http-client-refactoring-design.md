# HTTP Client 重构设计方案

## 目标

将现有的基于 Axios 的 HTTP Client 改造为基于 APIPromise 和 fetch 的设计，借鉴 Anthropic SDK 的优秀设计模式。

## 背景

当前 HttpClient 使用 Axios 的范围有限，主要在以下场景：
- OpenAI Response Client 和 Gemini OpenAI Client（组合模式）
- REST 工具执行器
- 其他 LLM 客户端通过 BaseLLMClient 间接使用

Axios 的拦截器主要用于：
- 添加请求时间戳
- 记录请求/响应日志
- 计算请求持续时间

这些功能使用 fetch 也可以实现，且 fetch 是原生 API，更轻量。

## 设计原则

1. **完全替换 Axios**：使用原生 fetch API，移除 Axios 依赖
2. **保持向后兼容**：不破坏现有功能
3. **保留中间件系统**：继续使用 RetryHandler、CircuitBreaker、RateLimiter
4. **提升性能**：引入延迟解析和更智能的重试机制
5. **简化架构**：减少外部依赖，提高可维护性

## 方案选择

### 推荐方案：完全替换为 fetch + APIPromise

**理由**：
1. **Axios 使用范围有限**：仅在 OpenAI Response Client 和 Gemini OpenAI Client 的组合模式中使用
2. **拦截器功能简单**：主要用于添加时间戳和日志，用 fetch 也能实现
3. **减少外部依赖**：fetch 是原生 API，更轻量
4. **完全控制实现**：可以根据项目需求定制
5. **性能更好**：原生 API 无额外开销

### 备选方案（不推荐）

1. **保留 Axios，添加 APIPromise 包装**
   - 缺点：增加复杂度，仍然依赖外部库

2. **混合方案（部分用 fetch，部分用 Axios）**
   - 缺点：维护两套系统，增加维护成本

3. **完全替换为 fetch，不使用 APIPromise**
   - 缺点：失去延迟解析的优势

## 文件变更清单

### 新增文件

1. **src/infrastructure/common/http/api-promise.ts**
   - 创建 APIPromise 类，继承自 Promise
   - 支持延迟解析（lazy parsing）
   - 提供 asResponse() 方法获取原始 Response 对象
   - 提供 withResponse() 方法同时获取数据和响应
   - 支持链式转换 _thenUnwrap()

2. **src/infrastructure/common/http/http-client.ts**（完全重写）
   - 基于 fetch API 实现
   - 集成 RetryHandler、CircuitBreaker、RateLimiter
   - 实现智能重试机制（指数退避 + 抖动）
   - 支持幂等性（自动生成 Idempotency-Key）
   - 支持动态超时计算
   - 内置请求/响应日志记录（替代 Axios 拦截器）
   - 支持自定义 fetch 实现
   - 返回 APIPromise<T> 类型

3. **src/infrastructure/common/http/http-request-options.ts**
   - 定义 HTTP 请求选项接口
   - 包含 method、url、headers、body、timeout、signal 等配置
   - 支持重试配置覆盖
   - 支持幂等性配置

4. **src/infrastructure/common/http/http-response.ts**
   - 定义 HTTP 响应接口
   - 包含 status、headers、data、requestId、duration 等字段
   - 支持流式响应

5. **src/infrastructure/common/http/__tests__/api-promise.test.ts**
   - APIPromise 类的单元测试
   - 测试延迟解析功能
   - 测试响应访问方法

6. **src/infrastructure/common/http/__tests__/http-client.test.ts**
   - HttpClient 类的单元测试
   - 测试重试机制
   - 测试幂等性
   - 测试超时处理
   - 测试日志记录

### 修改文件

1. **src/infrastructure/llm/clients/base-llm-client.ts**
   - 适配新的 APIPromise 返回类型
   - 修改 generateResponse 方法以处理 APIPromise
   - 修改 generateResponseStream 方法以使用新的流式响应处理
   - 添加动态超时计算逻辑
   - 保持现有的公共 API 不变

2. **src/infrastructure/common/http/retry-handler.ts**
   - 增强重试逻辑，支持服务器返回的重试建议（retry-after header）
   - 添加更多可重试的错误码（408、409、429、5xx）
   - 改进指数退避算法，添加抖动

3. **src/infrastructure/common/http/circuit-breaker.ts**
   - 适配新的响应格式
   - 保持现有逻辑不变

4. **src/infrastructure/common/http/rate-limiter.ts**
   - 保持现有逻辑不变
   - 确保与新的 HTTP 客户端兼容

5. **package.json**
   - 移除 axios 依赖
   - 添加必要的类型定义（如果需要）

### 删除文件

无（完全重写 http-client.ts，不删除文件）

### 不需要修改的文件

1. **src/di/service-keys.ts** - 不需要添加新的键
2. **src/di/bindings/infrastructure-bindings.ts** - 不需要修改绑定配置
3. **src/infrastructure/llm/clients/openai-response-client.ts** - 通过 BaseLLMClient 间接使用，无需修改
4. **src/infrastructure/llm/clients/gemini-openai-client.ts** - 通过 BaseLLMClient 间接使用，无需修改
5. **src/services/tools/executors/rest-executor.ts** - 通过 HttpClient 接口使用，无需修改

## 实施步骤

### 第一阶段：创建基础设施（1-2周）

1. 创建 APIPromise 类
2. 创建 BaseHTTPClient 类
3. 创建相关的类型定义文件
4. 编写单元测试

### 第二阶段：集成中间件（1-2周）

1. 修改 HttpClient 以使用 BaseHTTPClient
2. 集成 RetryHandler、CircuitBreaker、RateLimiter
3. 确保向后兼容性
4. 编写集成测试

### 第三阶段：更新 LLM Client（1周）

1. 修改 BaseLLMClient 以使用新的 HTTP 客户端
2. 添加动态超时计算
3. 添加幂等性支持
4. 编写端到端测试

### 第四阶段：优化和测试（1周）

1. 性能测试和优化
2. 回归测试
3. 文档更新
4. 代码审查

## 关键设计决策

### 1. 为什么保留 Axios 作为可选依赖？

- 现有代码大量使用 Axios
- 渐进式迁移，降低风险
- 可以通过配置选择使用 fetch 或 Axios

### 2. 为什么不删除现有的中间件？

- CircuitBreaker 和 RateLimiter 是 Anthropic SDK 没有的重要功能
- 这些中间件已经过充分测试
- 符合项目的架构原则

### 3. APIPromise 如何与现有代码兼容？

- 作为可选功能，默认关闭
- 通过配置启用
- 保持现有的 Promise 返回类型

### 4. 如何处理流式响应？

- BaseHTTPClient 原生支持 fetch 的流式响应
- APIPromise 支持包装流式响应
- 保持现有的流式响应 API 不变

## 风险评估

| 风险 | 级别 | 缓解措施 |
|------|------|----------|
| 破坏现有功能 | 高 | 充分的单元测试和集成测试 |
| 性能下降 | 中 | 性能基准测试，优化关键路径 |
| 兼容性问题 | 中 | 保持向后兼容，渐进式迁移 |
| 学习成本 | 低 | 详细的文档和代码注释 |

## 预期收益

1. **性能提升**：延迟解析减少不必要的解析开销
2. **可靠性提升**：更智能的重试机制和幂等性支持
3. **可观测性提升**：更好的请求追踪和日志记录
4. **灵活性提升**：支持自定义 fetch 实现
5. **代码质量提升**：更清晰的架构和更好的类型安全

## 后续优化方向

1. 完全移除 Axios 依赖（在充分测试后）
2. 添加更多中间件（如请求缓存）
3. 支持更多 HTTP 特性（如 WebSocket）
4. 优化流式响应处理
5. 添加性能监控和告警

## 参考资料

- Anthropic SDK 源码：`ref/anthropic-sdk-v0.71.2/`
- 现有 HTTP Client：`src/infrastructure/common/http/http-client.ts`
- 现有 LLM Client：`src/infrastructure/llm/clients/base-llm-client.ts`