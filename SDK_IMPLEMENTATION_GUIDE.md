# SDK 改进实施指南
## 5 项优先特性的完整实现

---

## 优先级 1️⃣ : 认证头标准化（0.5 小时）

### 创建文件：`sdk/utils/auth-builder.ts`

```typescript
/**
 * LLM 提供商认证头构建工具
 * 统一管理各提供商的认证方式
 */

import type { LLMProvider } from '../types/llm';

/**
 * 为 LLM 提供商构建认证头
 */
export function buildAuthHeaders(
  provider: LLMProvider,
  apiKey: string
): Record<string, string> {
  switch (provider) {
    case 'OPENAI_CHAT':
    case 'OPENAI_RESPONSE':
      return { 'Authorization': `Bearer ${apiKey}` };

    case 'ANTHROPIC':
      return { 'x-api-key': apiKey };

    case 'GEMINI_NATIVE':
      return { 'x-goog-api-key': apiKey };

    case 'GEMINI_OPENAI':
      return { 'Authorization': `Bearer ${apiKey}` };

    case 'HUMAN_RELAY':
      return {};  // 人工中继不需要 API Key

    default:
      const exhaustive: never = provider;
      throw new Error(`Unknown provider: ${exhaustive}`);
  }
}

/**
 * 合并认证头和自定义头
 */
export function mergeAuthHeaders(
  authHeaders: Record<string, string>,
  customHeaders?: Record<string, string>
): Record<string, string> {
  return {
    ...authHeaders,
    ...customHeaders
  };
}
```

### 修改：各 LLM 客户端

```typescript
// sdk/core/llm/clients/openai-chat.ts - 简化版本

import { buildAuthHeaders, mergeAuthHeaders } from '../../../utils/auth-builder';

private buildHeaders(): Record<string, string> {
  const authHeaders = buildAuthHeaders(this.profile.provider, this.profile.apiKey);
  
  return mergeAuthHeaders(
    {
      'Content-Type': 'application/json',
      ...authHeaders
    },
    this.profile.headers
  );
}
```

**修改的文件列表**：
- `sdk/core/llm/clients/openai-chat.ts` (更新 `buildHeaders()` 方法)
- `sdk/core/llm/clients/openai-response.ts`
- `sdk/core/llm/clients/anthropic.ts`
- `sdk/core/llm/clients/gemini-openai.ts`
- `sdk/core/llm/clients/gemini-native.ts`

---

## 优先级 2️⃣ : 请求头合并工具（0.5 小时）

### 创建文件：`sdk/utils/header-builder.ts`

```typescript
/**
 * HTTP 请求头构建工具
 * 提供分层合并和显式删除支持
 */

/**
 * 合并多层请求头
 * 
 * 特点：
 * - 后面的头覆盖前面的同名头（大小写不敏感）
 * - 设置值为 undefined 来显式删除头
 * - 返回记录的低小写名称及是否被删除
 * 
 * @example
 * const headers = mergeHeaders(
 *   { 'Content-Type': 'application/json' },
 *   { 'Authorization': 'Bearer ...' },
 *   { 'X-Custom': 'value' }
 * );
 */
export function mergeHeaders(
  ...headersList: (Record<string, string | undefined> | undefined)[]
): Record<string, string> {
  const result: Record<string, string> = {};
  const seen = new Set<string>();

  for (const headers of headersList) {
    if (!headers) continue;

    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();

      // 第一次出现的头需要清除前面的
      if (!seen.has(lowerKey)) {
        // 删除任何大小写变体
        for (const existingKey of Object.keys(result)) {
          if (existingKey.toLowerCase() === lowerKey) {
            delete result[existingKey];
          }
        }
        seen.add(lowerKey);
      }

      if (value === undefined) {
        // 显式删除头
        for (const existingKey of Object.keys(result)) {
          if (existingKey.toLowerCase() === lowerKey) {
            delete result[existingKey];
          }
        }
      } else {
        // 添加或覆盖头
        result[key] = value;
      }
    }
  }

  return result;
}

/**
 * 判断头集合是否为空
 */
export function isEmptyHeaders(headers?: Record<string, string>): boolean {
  return !headers || Object.keys(headers).length === 0;
}
```

### 修改：`sdk/core/http/http-client.ts`

```typescript
import { mergeHeaders } from '../../utils/header-builder';

// 在 executeRequest 中替换
private async executeRequest<T = any>(
  options: HttpRequestOptions
): Promise<HttpResponse<T>> {
  const url = this.buildURL(options.url || '', options.query);
  const method = options.method || 'GET';
  const timeout = options.timeout || this.config.timeout;

  // 使用新的 mergeHeaders 工具
  const headers = mergeHeaders(
    this.config.defaultHeaders || {},
    options.headers || {}
  );

  // ... 后续逻辑保持不变
}
```

---

## 优先级 3️⃣ : HTTP 错误细化（1 小时）

### 修改：`sdk/types/errors.ts`

添加新的错误类型：

```typescript
/**
 * HTTP 400 - 请求格式错误
 */
export class BadRequestError extends SDKError {
  constructor(
    message: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(ErrorCode.VALIDATION_ERROR, message, context, cause);
    this.name = 'BadRequestError';
  }
}

/**
 * HTTP 401 - 认证失败
 */
export class UnauthorizedError extends SDKError {
  constructor(
    message: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(ErrorCode.VALIDATION_ERROR, message, context, cause);
    this.name = 'UnauthorizedError';
  }
}

/**
 * HTTP 403 - 权限不足
 */
export class ForbiddenError extends SDKError {
  constructor(
    message: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(ErrorCode.EXECUTION_ERROR, message, context, cause);
    this.name = 'ForbiddenError';
  }
}

/**
 * HTTP 404 - 资源不存在
 */
export class NotFoundHttpError extends SDKError {
  constructor(
    message: string,
    public readonly url: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(ErrorCode.NOT_FOUND_ERROR, message, { ...context, url }, cause);
    this.name = 'NotFoundHttpError';
  }
}

/**
 * HTTP 409 - 冲突
 */
export class ConflictError extends SDKError {
  constructor(
    message: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(ErrorCode.EXECUTION_ERROR, message, context, cause);
    this.name = 'ConflictError';
  }
}

/**
 * HTTP 422 - 无法处理的实体
 */
export class UnprocessableEntityError extends SDKError {
  constructor(
    message: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(ErrorCode.VALIDATION_ERROR, message, context, cause);
    this.name = 'UnprocessableEntityError';
  }
}

/**
 * HTTP 500 - 服务器错误
 */
export class InternalServerError extends SDKError {
  constructor(
    message: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(ErrorCode.EXECUTION_ERROR, message, context, cause);
    this.name = 'InternalServerError';
  }
}

/**
 * HTTP 503 - 服务不可用
 */
export class ServiceUnavailableError extends SDKError {
  constructor(
    message: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(ErrorCode.EXECUTION_ERROR, message, context, cause);
    this.name = 'ServiceUnavailableError';
  }
}
```

### 修改：`sdk/core/http/http-client.ts`

```typescript
private createHttpError(
  status: number,
  message: string,
  url?: string
): Error {
  const context = { url, status };

  switch (status) {
    case 400:
      return new BadRequestError(`Bad request: ${message}`, context);
    
    case 401:
      return new UnauthorizedError(`Unauthorized: ${message}`, context);
    
    case 403:
      return new ForbiddenError(`Forbidden: ${message}`, context);
    
    case 404:
      return new NotFoundHttpError(`Not found: ${message}`, url || '', context);
    
    case 409:
      return new ConflictError(`Conflict: ${message}`, context);
    
    case 422:
      return new UnprocessableEntityError(`Unprocessable entity: ${message}`, context);
    
    case 429:
      return new RateLimitError(
        `Rate limit exceeded: ${message}`,
        undefined,
        context
      );
    
    case 500:
      return new InternalServerError(`Internal server error: ${message}`, context);
    
    case 503:
      return new ServiceUnavailableError(`Service unavailable: ${message}`, context);
    
    default:
      return new HttpError(
        `HTTP ${status}: ${message}`,
        status,
        context
      );
  }
}
```

### 导出新错误类型

在 `sdk/types/index.ts` 中添加：

```typescript
export {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundHttpError,
  ConflictError,
  UnprocessableEntityError,
  InternalServerError,
  ServiceUnavailableError,
} from './errors';
```

---

## 优先级 4️⃣ : 简化平台信息头（0.5 小时，可选）

### 创建文件：`sdk/utils/platform-info.ts`

```typescript
/**
 * 获取平台诊断头（仅 Node.js）
 * 用于日志追踪和问题诊断
 */

export function getPlatformHeaders(): Record<string, string> {
  // 仅在 Node.js 环境添加诊断头
  if (typeof process === 'undefined' || !process.version) {
    return {};
  }

  return {
    'X-Runtime': 'node',
    'X-Runtime-Version': process.version,
    'X-Node-Arch': process.arch,
    'X-Node-Platform': process.platform,
  };
}
```

### 修改：`sdk/core/http/http-client.ts`

```typescript
import { getPlatformHeaders } from '../../utils/platform-info';

private async executeRequest<T = any>(
  options: HttpRequestOptions
): Promise<HttpResponse<T>> {
  // ... 前面的代码

  const headers = mergeHeaders(
    this.config.defaultHeaders || {},
    getPlatformHeaders(),  // 新增：添加诊断头
    options.headers || {}
  );

  // ... 后续逻辑
}
```

---

## 优先级 5️⃣ : 日志钩子（1 小时，可选）

### 修改：`sdk/types/http.ts`

```typescript
/**
 * HTTP 日志接口
 */
export interface HttpLogger {
  debug?(msg: string, context?: any): void;
  info?(msg: string, context?: any): void;
  warn?(msg: string, context?: any): void;
  error?(msg: string, context?: any): void;
}

export interface HttpClientConfig {
  // ... 现有配置
  
  /** 可选的日志记录器 */
  logger?: HttpLogger;
}
```

### 修改：`sdk/core/http/http-client.ts`

```typescript
export class HttpClient {
  // ... 现有代码

  private log(level: keyof HttpLogger, msg: string, context?: any) {
    if (!this.config.logger?.[level]) return;
    this.config.logger[level]!(msg, context);
  }

  private async executeRequest<T = any>(
    options: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    const url = this.buildURL(options.url || '', options.query);
    const method = options.method || 'GET';
    const startTime = Date.now();

    this.log('info', `[HTTP] ${method} ${url} starting`);

    try {
      const response = await fetch(url, { /* ... */ });
      const duration = Date.now() - startTime;
      
      if (!response.ok) {
        this.log('warn', 
          `[HTTP] ${method} ${url} failed with ${response.status} in ${duration}ms`
        );
        // ... 错误处理
      }

      this.log('debug', 
        `[HTTP] ${method} ${url} succeeded in ${duration}ms`,
        { status: response.status }
      );

      // ... 后续逻辑
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log('error',
        `[HTTP] ${method} ${url} error after ${duration}ms`,
        { error: String(error) }
      );
      throw error;
    }
  }
}
```

---

## 验证清单

### 认证头标准化
- [ ] 创建 `auth-builder.ts`
- [ ] 修改 5 个 LLM 客户端
- [ ] 运行测试：`npm test sdk/utils/__tests__/auth-builder.test.ts`

### 请求头合并工具
- [ ] 创建 `header-builder.ts`
- [ ] 修改 `HttpClient`
- [ ] 运行测试：`npm test sdk/utils/__tests__/header-builder.test.ts`

### HTTP 错误细化
- [ ] 添加 8 个新错误类型
- [ ] 修改 `createHttpError()` 方法
- [ ] 更新错误导出
- [ ] 运行测试：`npm test sdk/core/http/__tests__/http-client.test.ts`

### 平台信息头
- [ ] 创建 `platform-info.ts`
- [ ] 修改 `HttpClient`
- [ ] 运行测试（可选）

### 日志钩子
- [ ] 更新 `HttpClientConfig` 类型
- [ ] 修改 `HttpClient`
- [ ] 添加日志调用
- [ ] 文档示例

---

## 预期收益

| 特性 | 代码减少 | 维护成本 | 用户体验 |
|------|---------|---------|---------|
| 认证头标准化 | 50+ 行 | ⬇️ 很多 | ✅ 一致 |
| 请求头合并 | 10+ 行 | ⬇️ 中等 | ✅ 灵活 |
| 错误细化 | 0 行 | → 相同 | ✅ 易于处理 |
| 平台信息 | 0 行 | ⬆️ 小 | ✅ 可诊断 |
| 日志钩子 | 0 行 | → 相同 | ✅ 可观测 |

**总工作量**：3-4 小时  
**代码改动**：150-200 行（新增 + 修改）  
**测试工作**：2-3 小时

---

## 不实施的改进

以下建议从设计中删除（过度复杂）：

- ❌ 完整的平台检测系统（Deno/Edge/浏览器）
- ❌ 动态 API Key 函数
- ❌ 响应解析器接口化
- ❌ SSE 事件处理器接口化
- ❌ HTTP 拦截器系统

**原因**：解决的问题不存在，成本 >> 收益
