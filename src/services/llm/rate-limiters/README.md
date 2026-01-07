[`SlidingWindowLimiter`](src/infrastructure/external/llm/rate-limiters/sliding-window-limiter.ts:8) 实现了基于滑动窗口算法的速率限制器，其主要作用是控制在指定时间窗口内允许的最大请求数量。该实现通过维护一个请求记录数组 [`requests`](src/infrastructure/external/llm/rate-limiters/sliding-window-limiter.ts:10)，每个记录包含请求的时间戳。当检查限流时，首先调用 [`cleanupOldRequests()`](src/infrastructure/external/llm/rate-limiters/sliding-window-limiter.ts:61) 清理过期的请求（超过窗口大小的请求），然后比较当前请求数量与最大允许请求数 [`maxRequests`](src/infrastructure/external/llm/rate-limiters/sliding-window-limiter.ts:11)。如果超出限制，则计算需要等待的时间并抛出错误；否则将当前请求添加到记录中。

配置参数从配置管理器注入，包括：
- `llm.rateLimit.maxRequests`：最大请求数，默认60
- `llm.rateLimit.windowSizeMs`：时间窗口大小，默认60000ms（1分钟）

该实现还提供了 [`waitForToken()`](src/infrastructure/external/llm/rate-limiters/sliding-window-limiter.ts:35) 方法，用于在达到限流时自动等待适当时间后重试，以及 [`getAvailableTokens()`](src/infrastructure/external/llm/rate-limiters/sliding-window-limiter.ts:52) 方法返回当前可用的请求数量。

[`TokenBucketLimiter`](src/infrastructure/external/llm/rate-limiters/token-bucket-limiter.ts:5) 实现了令牌桶算法的速率限制器，其核心思想是系统以恒定速率向桶中添加令牌，请求需要消耗令牌才能执行。该实现维护了当前令牌数量 [`tokens`](src/infrastructure/external/llm/rate-limiters/token-bucket-limiter.ts:6)、上次填充时间 [`lastRefill`](src/infrastructure/external/llm/rate-limiters/token-bucket-limiter.ts:7)、桶容量 [`capacity`](src/infrastructure/external/llm/rate-limiters/token-bucket-limiter.ts:8) 和填充速率 [`refillRate`](src/infrastructure/external/llm/rate-limiters/token-bucket-limiter.ts:9)。

当检查限流时，首先调用 [`refill()`](src/infrastructure/external/llm/rate-limiters/token-bucket-limiter.ts:58) 方法根据时间差计算应添加的令牌数量并更新当前令牌数，然后检查是否有足够令牌（至少1个）。如果没有足够令牌，则计算需要等待的时间并抛出错误；否则消耗一个令牌。与滑动窗口类似，它也提供了 [`waitForToken()`](src/infrastructure/external/llm/rate-limiters/token-bucket-limiter.ts:31) 用于自动重试和 [`getAvailableTokens()`](src/infrastructure/external/llm/rate-limiters/token-bucket-limiter.ts:48) 返回可用令牌数。

两种限流算法的主要差异体现在：

**滑动窗口算法**：
- 基于固定时间窗口内的请求数量进行限制
- 更适合需要严格控制单位时间内请求数的场景
- 实现相对简单，但可能在窗口边界处出现"突发流量"问题
- 适用于对请求频率有明确上限要求的LLM API调用

**令牌桶算法**：
- 基于令牌的生成和消耗机制
- 允许一定程度的突发流量（只要桶中有足够令牌）
- 提供更平滑的请求处理体验
- 更适合需要平衡请求速率和突发处理能力的场景
- 能更好地模拟实际资源消耗情况

在本项目中，这两种实现都遵循了领域驱动设计原则，实现了 [`RateLimiter`](src/domain/llm/interfaces/rate-limiter.interface) 接口，并通过依赖注入获取配置，体现了基础设施层对域层的依赖关系。它们都被导出在 [`index.ts`](src/infrastructure/external/llm/rate-limiters/index.ts) 文件中，便于在应用其他部分统一导入使用。