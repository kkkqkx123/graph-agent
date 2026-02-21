# MCP SDK 迁移精简方案

## 概述

本文档分析如何从 `ref/typescript-sdk-1.27.0`（MCP TypeScript SDK）中迁移核心功能，并最大化复用项目现有的工具包。

**核心原则：**
- 复用 `packages/common-utils` 的 logger 和 http 模块
- 复用 `packages/types` 的错误类型
- 避免过度设计，只迁移必要的核心功能
- 不考虑 OAuth 等复杂认证功能

---

## 现有工具包能力分析

### 1. Logger 模块 (`packages/common-utils/src/logger`)

**已具备能力：**
- ✅ 完整的日志级别系统（debug, info, warn, error）
- ✅ Child logger 模式（类似 pino）
- ✅ 多种输出流（console, file, async, multistream）
- ✅ Transport 抽象层
- ✅ 上下文合并和时间戳支持

**复用方式：**
```typescript
import { createPackageLogger } from '@modular-agent/common-utils';

// 在 MCP 客户端中使用
const logger = createPackageLogger('mcp-client', { level: 'debug' });
const transportLogger = logger.child('transport');
```

**不需要迁移：**
- ❌ MCP SDK 中的日志系统（直接复用现有 logger）

---

### 2. HTTP 模块 (`packages/common-utils/src/http`)

**已具备能力：**
- ✅ **HttpClient** - 完整的 HTTP 客户端
  - 支持 GET/POST/PUT/DELETE
  - 自动重试（指数退避）
  - 熔断器（CircuitBreaker）
  - 限流器（RateLimiter）
  - 超时控制
  - 请求/响应拦截器

- ✅ **SseTransport** - SSE 传输实现
  - SSE 事件流解析
  - 流式响应处理
  - 自动重连

- ✅ **RetryHandler** - 重试处理器
  - 指数退避策略
  - 可重试错误判断
  - 非重试状态码黑名单

- ✅ **HTTP 错误类型**
  - BadRequestError, UnauthorizedError, ForbiddenError
  - NotFoundHttpError, ConflictError, UnprocessableEntityError
  - RateLimitError, InternalServerError, ServiceUnavailableError

**复用方式：**

#### StreamableHTTP 传输层实现
```typescript
import { HttpClient } from '@modular-agent/common-utils';
import { SseTransport } from '@modular-agent/common-utils';

// 基于 HttpClient 和 SseTransport 实现 StreamableHTTP
class StreamableHTTPClientTransport {
  private httpClient: HttpClient;
  private sseTransport: SseTransport;

  constructor(url: string, options?: TransportOptions) {
    this.httpClient = new HttpClient({
      baseURL: url,
      timeout: 30000,
      maxRetries: 3,
      logger: options?.logger
    });
    this.sseTransport = new SseTransport(url);
  }

  // 使用 HttpClient 发送 POST 请求
  async send(message: JSONRPCMessage): Promise<void> {
    await this.httpClient.post('', message);
  }

  // 使用 SseTransport 接收 SSE 消息
  async *receive(): AsyncIterable<JSONRPCMessage> {
    yield* this.sseTransport.executeStream('');
  }
}
```

**不需要迁移：**
- ❌ MCP SDK 中的 HTTP 请求逻辑（复用 HttpClient）
- ❌ MCP SDK 中的 SSE 解析逻辑（复用 SseTransport）
- ❌ MCP SDK 中的重试逻辑（复用 RetryHandler）

---

### 3. 错误类型 (`packages/types/src/errors`)

**已具备能力：**
- ✅ **基础错误类** - BaseError
- ✅ **网络错误** - NetworkError, TimeoutError
- ✅ **HTTP 错误** - HttpError（带状态码）
- ✅ **执行错误** - ExecutionError
- ✅ **验证错误** - ValidationError
- ✅ **资源错误** - ResourceError
- ✅ **中断错误** - InterruptionError

**复用方式：**
```typescript
import {
  NetworkError,
  TimeoutError,
  HttpError,
  ExecutionError
} from '@modular-agent/types';

// MCP 客户端错误处理
try {
  await client.callTool('tool-name', args);
} catch (error) {
  if (error instanceof NetworkError) {
    logger.error('Network error', { error });
  } else if (error instanceof TimeoutError) {
    logger.warn('Request timeout', { error });
  }
}
```

**不需要迁移：**
- ❌ MCP SDK 中的 McpError（使用现有的 HttpError 和 NetworkError）

---

## 需要迁移的核心功能

### 1. MCP 协议类型系统

**位置：** `ref/typescript-sdk-1.27.0/src/types.ts`

**迁移理由：**
- MCP 协议的完整类型定义
- 确保与 MCP 规范兼容
- 提供类型安全保障

**迁移内容：**
```typescript
// 核心协议类型
- LATEST_PROTOCOL_VERSION
- SUPPORTED_PROTOCOL_VERSIONS
- JSONRPC_VERSION

// JSON-RPC 基础
- JSONRPCMessage
- JSONRPCRequest
- JSONRPCResponse
- JSONRPCNotification

// 能力类型
- ClientCapabilities
- ServerCapabilities

// 工具/资源/提示类型
- Tool
- Resource
- Prompt
- ToolDefinition
- ResourceDefinition
- PromptDefinition

// 请求/响应类型
- CallToolRequest
- CallToolResult
- ListToolsRequest
- ListToolsResult
- ReadResourceRequest
- ReadResourceResult
// ... 等等
```

**迁移方式：**
```typescript
// packages/tool-executors/src/mcp/types-protocol.ts
// 直接从 SDK 复制类型定义，调整命名空间

export type {
  // 协议版本
  LATEST_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,

  // JSON-RPC
  JSONRPCMessage,
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCNotification,

  // 能力
  ClientCapabilities,
  ServerCapabilities,

  // 工具
  Tool,
  ToolDefinition,
  CallToolRequest,
  CallToolResult,

  // 资源
  Resource,
  ResourceDefinition,
  ReadResourceRequest,
  ReadResourceResult,

  // 提示
  Prompt,
  PromptDefinition,
  GetPromptRequest,
  GetPromptResult,
} from './mcp-protocol-types.js';
```

---

### 2. StreamableHTTP 传输层（精简版）

**位置：** `ref/typescript-sdk-1.27.0/src/client/streamableHttp.ts`

**迁移理由：**
- MCP 推荐的远程服务器传输方式
- 支持更多 MCP 服务器类型

**精简策略：**
- ✅ 保留核心的 HTTP POST + SSE 逻辑
- ✅ 保留会话管理（sessionId）
- ✅ 保留协议版本协商
- ❌ 移除 OAuth 认证（过度复杂）
- ❌ 移除复杂的重连逻辑（使用 HttpClient 的重试）
- ❌ 移除 upscoping（过度设计）

**实现方式：**
```typescript
// packages/tool-executors/src/mcp/transport/StreamableHttpTransport.ts
import { HttpClient } from '@modular-agent/common-utils';
import { SseTransport } from '@modular-agent/common-utils';
import { createPackageLogger } from '@modular-agent/common-utils';
import type { Transport } from './types.js';
import type { JSONRPCMessage } from '../types-protocol.js';

const logger = createPackageLogger('mcp-transport');

export class StreamableHttpTransport implements Transport {
  private httpClient: HttpClient;
  private sseTransport: SseTransport;
  private sessionId?: string;
  private protocolVersion?: string;

  constructor(
    private url: string,
    options?: { sessionId?: string }
  ) {
    this.sessionId = options?.sessionId;

    // 复用 HttpClient
    this.httpClient = new HttpClient({
      baseURL: url,
      timeout: 30000,
      maxRetries: 3,
      defaultHeaders: {
        'Content-Type': 'application/json',
      },
      logger: {
        info: (msg, ctx) => logger.info(msg, ctx),
        warn: (msg, ctx) => logger.warn(msg, ctx),
        error: (msg, ctx) => logger.error(msg, ctx),
        debug: (msg, ctx) => logger.debug(msg, ctx),
      }
    });

    // 复用 SseTransport
    this.sseTransport = new SseTransport(url);
  }

  async start(): Promise<void> {
    logger.info('Starting StreamableHTTP transport', { url: this.url });
    // 初始化逻辑
  }

  async send(message: JSONRPCMessage): Promise<void> {
    // 使用 HttpClient 发送 POST 请求
    await this.httpClient.post('', message, {
      headers: {
        'mcp-session-id': this.sessionId || '',
      }
    });
  }

  async *receive(): AsyncIterable<JSONRPCMessage> {
    // 使用 SseTransport 接收 SSE 消息
    yield* this.sseTransport.executeStream('');
  }

  async close(): Promise<void> {
    logger.info('Closing StreamableHTTP transport');
    // 清理逻辑
  }

  setProtocolVersion(version: string): void {
    this.protocolVersion = version;
  }
}
```

---

### 3. Client 核心类（精简版）

**位置：** `ref/typescript-sdk-1.27.0/src/client/index.ts`

**迁移理由：**
- 提供高级 MCP 客户端 API
- 封装初始化流程和协议细节
- 提供统一的工具/资源/提示操作接口

**精简策略：**
- ✅ 保留核心的 Client API
- ✅ 保留工具/资源/提示操作
- ✅ 保留能力协商
- ❌ 移除 OAuth 认证
- ❌ 移除复杂的中间件系统
- ❌ 移除实验性任务系统

**实现方式：**
```typescript
// packages/tool-executors/src/mcp/client/Client.ts
import { createPackageLogger } from '@modular-agent/common-utils';
import type { Transport } from '../transport/types.js';
import type {
  ClientCapabilities,
  ServerCapabilities,
  Tool,
  Resource,
  Prompt,
  CallToolRequest,
  CallToolResult,
  ListToolsResult,
  ReadResourceResult,
  GetPromptResult,
} from '../types-protocol.js';

const logger = createPackageLogger('mcp-client');

export class Client {
  private transport: Transport;
  private capabilities?: ServerCapabilities;
  private initialized = false;

  constructor(transport: Transport) {
    this.transport = transport;
  }

  async connect(): Promise<void> {
    logger.info('Connecting to MCP server');

    // 初始化握手
    await this.transport.start();

    // 发送 initialize 请求
    const initResult = await this.request({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: this.getClientCapabilities(),
        clientInfo: {
          name: 'modular-agent',
          version: '1.0.0',
        },
      },
    });

    this.capabilities = initResult.result.capabilities;
    this.initialized = true;

    logger.info('MCP client initialized', { capabilities: this.capabilities });
  }

  async listTools(): Promise<Tool[]> {
    this.ensureInitialized();

    const result = await this.request<ListToolsResult>({
      jsonrpc: '2.0',
      id: this.generateId(),
      method: 'tools/list',
    });

    return result.result.tools;
  }

  async callTool(name: string, args: any): Promise<CallToolResult> {
    this.ensureInitialized();

    logger.debug('Calling tool', { name, args });

    const result = await this.request<CallToolResult>({
      jsonrpc: '2.0',
      id: this.generateId(),
      method: 'tools/call',
      params: {
        name,
        arguments: args,
      },
    });

    return result.result;
  }

  async listResources(): Promise<Resource[]> {
    this.ensureInitialized();

    const result = await this.request({
      jsonrpc: '2.0',
      id: this.generateId(),
      method: 'resources/list',
    });

    return result.result.resources;
  }

  async readResource(uri: string): Promise<ReadResourceResult> {
    this.ensureInitialized();

    const result = await this.request<ReadResourceResult>({
      jsonrpc: '2.0',
      id: this.generateId(),
      method: 'resources/read',
      params: { uri },
    });

    return result.result;
  }

  async listPrompts(): Promise<Prompt[]> {
    this.ensureInitialized();

    const result = await this.request({
      jsonrpc: '2.0',
      id: this.generateId(),
      method: 'prompts/list',
    });

    return result.result.prompts;
  }

  async getPrompt(name: string, args?: any): Promise<GetPromptResult> {
    this.ensureInitialized();

    const result = await this.request<GetPromptResult>({
      jsonrpc: '2.0',
      id: this.generateId(),
      method: 'prompts/get',
      params: { name, arguments: args },
    });

    return result.result;
  }

  private async request<T>(request: any): Promise<{ result: T }> {
    // 使用 transport 发送请求
    await this.transport.send(request);

    // 等待响应（简化版，实际需要实现请求-响应匹配）
    // ...

    return {} as any;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Client not initialized. Call connect() first.');
    }
  }

  private getClientCapabilities(): ClientCapabilities {
    return {
      tools: {},
      resources: {},
      prompts: {},
    };
  }

  private generateId(): number {
    return Date.now();
  }
}
```

---

## 不需要迁移的功能

### ❌ 过度设计的功能

1. **OAuth 认证系统**
   - 位置：`src/client/auth.ts`, `src/client/auth-extensions.ts`
   - 理由：过于复杂，当前项目不需要
   - 替代方案：使用 HttpClient 的拦截器添加简单的认证头

2. **中间件系统**
   - 位置：`src/client/middleware.ts`
   - 理由：HttpClient 已有拦截器功能
   - 替代方案：使用 HttpClient 的拦截器

3. **复杂的重连逻辑**
   - 位置：`src/client/streamableHttp.ts` 中的 reconnectionOptions
   - 理由：HttpClient 已有重试机制
   - 替代方案：使用 HttpClient 的重试配置

4. **实验性任务系统**
   - 位置：`src/experimental/tasks/`
   - 理由：实验性功能，API 可能变化
   - 替代方案：暂不实现

5. **Upscoping 机制**
   - 位置：`src/client/streamableHttp.ts`
   - 理由：过度设计，当前项目不需要
   - 替代方案：不实现

### ❌ 服务端功能

所有 `src/server/` 目录下的功能都不需要迁移，因为当前项目实现的是 MCP 客户端。

---

## 迁移后的目录结构

```
packages/tool-executors/src/mcp/
├── index.ts                          # 统一导出
├── types-protocol.ts                 # MCP 协议类型（从 SDK 迁移）
│
├── client/
│   ├── Client.ts                     # Client 类（精简版）
│   └── types.ts                      # 客户端类型
│
├── transport/
│   ├── types.ts                      # 传输接口
│   ├── StdioTransport.ts             # 已有
│   └── StreamableHttpTransport.ts    # 新增（基于 HttpClient + SseTransport）
│
├── session/
│   └── SessionPool.ts                # 已有
│
└── McpExecutor.ts                    # 已有（需要更新以使用新的 Client）
```

---

## 代码量对比

### 原始迁移方案（过度设计）
| 模块 | 文件数 | 代码行数 |
|------|--------|----------|
| 类型系统 | 1 | ~2600 行 |
| Client 核心 | 1 | ~900 行 |
| StreamableHttp 传输 | 1 | ~600 行 |
| SSE 传输 | 1 | ~400 行 |
| 协议基础 | 1 | ~500 行 |
| OAuth 认证 | 2-3 | ~800 行 |
| 验证系统 | 2 | ~300 行 |
| **总计** | **8-10** | **~6100 行** |

### 精简迁移方案（复用现有工具）
| 模块 | 文件数 | 代码行数 | 说明 |
|------|--------|----------|------|
| 类型系统 | 1 | ~2600 行 | 直接复制 |
| Client 核心 | 1 | ~300 行 | 精简版，移除认证和中间件 |
| StreamableHttp 传输 | 1 | ~200 行 | 基于 HttpClient + SseTransport |
| **总计** | **3** | **~3100 行** | 减少 50% 代码量 |

---

## 依赖分析

### 需要添加的依赖

```json
{
  "dependencies": {
    "eventsource-parser": "^3.0.0"  // SSE 解析（SseTransport 已使用）
  }
}
```

### 已有依赖（无需添加）

- ✅ `@modular-agent/common-utils` - logger, http 模块
- ✅ `@modular-agent/types` - 错误类型
- ✅ `cross-spawn` - stdio 传输已使用

---

## 迁移步骤

### 第一步：迁移类型系统
```bash
# 从 SDK 复制类型定义
cp ref/typescript-sdk-1.27.0/src/types.ts \
   packages/tool-executors/src/mcp/types-protocol.ts

# 调整命名空间和导出
```

### 第二步：实现 StreamableHttpTransport
```typescript
// 基于 HttpClient 和 SseTransport 实现
// 复用现有的重试、熔断、限流功能
```

### 第三步：实现精简版 Client
```typescript
// 实现核心的 Client API
// 移除 OAuth 和中间件
// 复用现有的 logger 和错误类型
```

### 第四步：更新 McpExecutor
```typescript
// 集成新的 Client 类
// 支持多种传输层选择
```

### 第五步：添加测试
```typescript
// 单元测试
// 集成测试
```

---

## 总结

### 核心优势

1. **代码量减少 50%** - 从 ~6100 行减少到 ~3100 行
2. **复用现有基础设施** - logger, http, errors
3. **避免过度设计** - 移除 OAuth、中间件、复杂重连
4. **保持核心功能** - 完整的 MCP 客户端能力
5. **易于维护** - 依赖项目已有的稳定模块

### 迁移清单

- [x] 分析现有工具包能力
- [x] 确定需要迁移的核心功能
- [x] 设计精简的实现方案
- [ ] 迁移类型系统
- [ ] 实现 StreamableHttpTransport
- [ ] 实现精简版 Client
- [ ] 更新 McpExecutor
- [ ] 添加测试
- [ ] 更新文档

### 风险评估

| 风险 | 级别 | 缓解措施 |
|------|------|----------|
| 类型系统迁移 | 低 | 直接复制，调整命名空间 |
| StreamableHTTP 实现 | 中 | 基于成熟的 HttpClient 和 SseTransport |
| Client 精简 | 低 | 移除复杂功能，保留核心 API |
| 与现有系统集成 | 低 | 使用统一的 logger 和错误类型 |

---

## 下一步行动

1. **创建迁移任务清单**
2. **开始迁移类型系统**
3. **实现 StreamableHttpTransport**
4. **实现精简版 Client**
5. **更新 McpExecutor**
6. **编写测试**
7. **更新文档**