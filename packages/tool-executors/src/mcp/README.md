# MCP 工具执行器

MCP (Model Context Protocol) 工具执行器，支持通过 MCP 协议调用外部 MCP 服务器提供的工具。

## 功能特性

- ✅ 支持多种传输层：Stdio 和 StreamableHTTP
- ✅ 会话池管理
- ✅ 健康检查和自动重连
- ✅ 完整的 MCP 协议类型定义
- ✅ 工具、资源、提示操作
- ✅ 基于 HttpClient 和 SseTransport 的 HTTP 传输
- ✅ 复用现有的 logger 和 http 模块

## 架构

```
packages/tool-executors/src/mcp/
├── index.ts                          # 统一导出
├── types-protocol.ts                 # MCP 协议类型定义
├── types.ts                          # 执行器类型定义
│
├── client/
│   └── Client.ts                     # MCP 客户端实现
│
├── transport/
│   ├── types.ts                      # 传输层接口
│   ├── StdioTransport.ts             # Stdio 传输层
│   └── StreamableHttpTransport.ts    # StreamableHTTP 传输层
│
├── session/
│   └── SessionPool.ts                # 会话池管理
│
├── __tests__/
│   ├── types-protocol.test.ts        # 类型测试
│   └── Client.test.ts                # 客户端测试
│
└── McpExecutor.ts                    # MCP 工具执行器
```

## 使用方式

### 1. 使用 Stdio 传输

```typescript
import { McpExecutor } from '@modular-agent/tool-executors';

// 创建执行器
const executor = new McpExecutor({
  maxConnections: 10,
  minConnections: 1,
  connectionTimeout: 30000,
  idleTimeout: 300000,
  healthCheckInterval: 60000,
});

// 定义 MCP 工具
const tool = {
  id: 'mcp-filesystem',
  name: 'filesystem',
  type: 'MCP',
  config: {
    serverName: 'filesystem',
    transportType: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/files'],
  },
};

// 执行工具
const result = await executor.execute(tool, {
  path: '/path/to/file.txt',
  operation: 'read',
});
```

### 2. 使用 StreamableHTTP 传输

```typescript
import { McpExecutor } from '@modular-agent/tool-executors';

// 创建执行器
const executor = new McpExecutor();

// 定义 MCP 工具（HTTP 传输）
const tool = {
  id: 'mcp-http-server',
  name: 'http-server',
  type: 'MCP',
  config: {
    serverName: 'http-server',
    transportType: 'http',
    serverUrl: 'https://example.com/mcp',
    sessionId: 'optional-session-id',
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
    enableCircuitBreaker: true,
    enableRateLimiter: true,
  },
};

// 执行工具
const result = await executor.execute(tool, {
  param1: 'value1',
  param2: 'value2',
});
```

### 3. 直接使用 Client

```typescript
import { Client } from '@modular-agent/tool-executors';
import { StreamableHttpTransport } from '@modular-agent/tool-executors';

// 创建传输层
const transport = new StreamableHttpTransport({
  url: 'https://example.com/mcp',
  sessionId: 'optional-session-id',
  timeout: 30000,
  maxRetries: 3,
});

// 创建客户端
const client = new Client(transport, {
  clientInfo: {
    name: 'my-app',
    version: '1.0.0',
  },
});

// 连接到服务器
await client.connect();

// 列出可用工具
const tools = await client.listTools();
console.log('Available tools:', tools);

// 调用工具
const result = await client.callTool('tool-name', {
  param: 'value',
});

// 列出资源
const resources = await client.listResources();

// 读取资源
const resource = await client.readResource('resource-uri');

// 列出提示
const prompts = await client.listPrompts();

// 获取提示
const prompt = await client.getPrompt('prompt-name', {
  arg: 'value',
});

// 关闭连接
await client.close();
```

## 配置选项

### McpToolConfig

```typescript
interface McpToolConfig {
  /** 服务器名称 */
  serverName: string;

  /** 传输类型：stdio 或 http */
  transportType?: 'stdio' | 'http';

  /** 服务器URL（用于 http 传输） */
  serverUrl?: string;

  /** 命令（用于 stdio 传输） */
  command?: string;

  /** 命令参数（用于 stdio 传输） */
  args?: string[];

  /** 环境变量（用于 stdio 传输） */
  env?: Record<string, string>;

  /** 工作目录（用于 stdio 传输） */
  cwd?: string;

  /** 会话ID（用于 http 传输） */
  sessionId?: string;

  /** 超时时间（毫秒） */
  timeout?: number;

  /** 最大重试次数 */
  maxRetries?: number;

  /** 重试延迟（毫秒） */
  retryDelay?: number;

  /** 是否启用熔断器 */
  enableCircuitBreaker?: boolean;

  /** 是否启用限流器 */
  enableRateLimiter?: boolean;
}
```

### StreamableHttpTransport 配置

```typescript
interface StreamableHttpTransportConfig {
  /** 服务器 URL */
  url: string;

  /** 会话 ID（可选） */
  sessionId?: string;

  /** 自定义请求头 */
  headers?: Record<string, string>;

  /** 超时时间（毫秒） */
  timeout?: number;

  /** 最大重试次数 */
  maxRetries?: number;

  /** 重试延迟（毫秒） */
  retryDelay?: number;

  /** 是否启用熔断器 */
  enableCircuitBreaker?: boolean;

  /** 是否启用限流器 */
  enableRateLimiter?: boolean;
}
```

## 传输层对比

| 特性 | Stdio | StreamableHTTP |
|------|-------|----------------|
| 适用场景 | 本地进程 | 远程服务器 |
| 通信方式 | stdin/stdout | HTTP POST + SSE |
| 性能 | 高 | 中 |
| 部署复杂度 | 低 | 中 |
| 跨平台 | 是 | 是 |
| 会话管理 | 进程级 | 会话ID |

## 复用的现有模块

### Logger 模块

```typescript
import { createPackageLogger } from '@modular-agent/common-utils';

const logger = createPackageLogger('mcp-client', { level: 'debug' });
logger.info('Client started');
logger.error('Connection failed', { error });
```

### HTTP 模块

```typescript
import { HttpClient } from '@modular-agent/common-utils';
import { SseTransport } from '@modular-agent/common-utils';

// StreamableHttpTransport 内部使用 HttpClient 和 SseTransport
// 自动获得重试、熔断、限流等功能
```

### 错误类型

```typescript
import {
  NetworkError,
  TimeoutError,
  ConfigurationError,
  ToolError,
} from '@modular-agent/types';

// 统一的错误处理
```

## 测试

```bash
# 运行所有 MCP 测试
cd packages/tool-executors
pnpm test mcp

# 运行特定测试
pnpm test mcp/__tests__/types-protocol.test.ts
pnpm test mcp/__tests__/Client.test.ts
```

## 迁移说明

从旧版本迁移到新版本：

1. **更新配置**：添加 `transportType` 字段指定传输类型
2. **HTTP 传输**：使用 `serverUrl` 替代 `command` 和 `args`
3. **可选配置**：添加 `timeout`、`maxRetries` 等配置项

### 旧配置

```typescript
{
  serverName: 'filesystem',
  serverUrl: 'npx -y @modelcontextprotocol/server-filesystem /path',
}
```

### 新配置（Stdio）

```typescript
{
  serverName: 'filesystem',
  transportType: 'stdio',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-filesystem', '/path'],
}
```

### 新配置（HTTP）

```typescript
{
  serverName: 'http-server',
  transportType: 'http',
  serverUrl: 'https://example.com/mcp',
  timeout: 30000,
  maxRetries: 3,
}
```

## 最佳实践

1. **选择合适的传输层**
   - 本地工具：使用 Stdio
   - 远程服务：使用 StreamableHTTP

2. **配置合理的超时和重试**
   - 超时时间：根据工具执行时间设置
   - 重试次数：3-5 次为宜
   - 重试延迟：使用指数退避

3. **启用熔断器和限流器**
   - 保护系统免受级联故障
   - 防止过载

4. **使用会话池**
   - 复用连接，提高性能
   - 自动管理连接生命周期

5. **错误处理**
   - 捕获并处理网络错误
   - 记录错误日志
   - 提供友好的错误信息

## 故障排查

### 连接失败

1. 检查服务器 URL 或命令是否正确
2. 检查网络连接
3. 查看日志输出

### 工具调用失败

1. 检查工具名称和参数
2. 查看服务器返回的错误信息
3. 确认工具已正确注册

### 性能问题

1. 启用会话池
2. 调整超时和重试配置
3. 使用 HTTP 传输替代 Stdio（如果适用）

## 参考资料

- [MCP 规范](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [迁移分析文档](../../../../docs/mcp-migration-simplified.md)