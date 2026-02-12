# 工具模块 (Tools Module)

工具模块提供工具注册和管理功能。SDK只负责工具的注册和管理，具体的工具执行器实现请使用 [`@modular-agent/tool-executors`](../../../../packages/tool-executors) 包。

## 模块结构

```
tools/
├── tool-registry.ts      # 工具注册表
├── index.ts              # 模块导出
└── __tests__/            # 单元测试
    └── tool-registry.test.ts
```

## 核心组件

### ToolRegistry（工具注册表）

工具注册表负责工具定义的管理：

- 工具注册和验证
- 工具查询（按名称、类型、分类）
- 工具搜索

```typescript
import { ToolRegistry } from './tools/tool-registry';

const registry = new ToolRegistry();

// 注册工具
registry.register(toolDefinition);

// 查询工具
const tool = registry.get('tool-name');

// 按类型查询
const restTools = registry.listByType('REST');

// 搜索工具
const results = registry.search('calculator');
```

## 工具执行器

SDK不包含具体的工具执行器实现。请使用 [`@modular-agent/tool-executors`](../../../../packages/tool-executors) 包中的执行器：

### 可用的执行器

1. **StatelessExecutor** - 无状态工具执行器
2. **StatefulExecutor** - 有状态工具执行器
3. **RestExecutor** - REST API工具执行器
4. **McpExecutor** - MCP协议工具执行器

### 使用示例

```typescript
import { ToolRegistry } from '@modular-agent/sdk/core/tools';
import { StatelessExecutor, StatefulExecutor, RestExecutor, McpExecutor } from '@modular-agent/tool-executors';
import { Tool, ToolType } from '@modular-agent/types/tool';

// 创建工具注册表
const registry = new ToolRegistry();

// 注册无状态工具
const statelessTool: Tool = {
  id: 'my-stateless-tool',
  name: 'my-stateless-tool',
  type: ToolType.STATELESS,
  description: 'My stateless tool',
  parameters: {
    properties: {
      input: { type: 'string' }
    },
    required: ['input']
  },
  config: {
    execute: async (params) => {
      return { result: `processed: ${params.input}` };
    }
  }
};

registry.register(statelessTool);

// 使用执行器执行工具
const executor = new StatelessExecutor();
const result = await executor.execute(
  statelessTool,
  { input: 'test' },
  { timeout: 5000, retries: 2 }
);

console.log(result);
// {
//   success: true,
//   result: { result: 'processed: test' },
//   executionTime: 10,
//   retryCount: 0
// }
```

## 工具类型

### 1. STATELESS（无状态工具）

应用层提供的无状态函数工具：

```typescript
const tool: Tool = {
  id: 'my-tool',
  name: 'my-tool',
  type: ToolType.STATELESS,
  description: 'My custom tool',
  parameters: {
    properties: {
      input: { type: 'string' }
    },
    required: ['input']
  },
  config: {
    execute: async (params) => {
      return { result: `processed: ${params.input}` };
    }
  }
};
```

### 2. STATEFUL（有状态工具）

应用层提供的有状态工具，通过ThreadContext实现线程隔离：

```typescript
const tool: Tool = {
  id: 'my-stateful-tool',
  name: 'my-stateful-tool',
  type: ToolType.STATEFUL,
  description: 'My stateful tool',
  parameters: {
    properties: {
      action: { type: 'string' }
    },
    required: ['action']
  },
  config: {
    factory: {
      create: () => {
        return {
          execute: async (params) => {
            return { result: `action: ${params.action}` };
          }
        };
      }
    }
  }
};
```

### 3. REST（REST API工具）

通过HTTP调用REST API：

```typescript
const tool: Tool = {
  id: 'fetch-api',
  name: 'fetch-api',
  type: ToolType.REST,
  description: 'Fetch data from API',
  parameters: {
    properties: {
      url: { type: 'string', format: 'uri' },
      method: { type: 'string' }
    },
    required: ['url']
  },
  config: {
    baseUrl: 'https://api.example.com',
    headers: {
      'Authorization': 'Bearer token'
    }
  }
};
```

### 4. MCP（MCP协议工具）

通过MCP协议调用工具：

```typescript
const tool: Tool = {
  id: 'mcp-tool',
  name: 'mcp-tool',
  type: ToolType.MCP,
  description: 'MCP tool',
  parameters: {
    properties: {
      query: { type: 'string' }
    },
    required: ['query']
  },
  config: {
    serverName: 'my-mcp-server',
    serverUrl: 'npx -y @modelcontextprotocol/server-filesystem'
  }
};
```

## 执行选项

```typescript
interface ToolExecutionOptions {
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 最大重试次数 */
  retries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 是否启用指数退避 */
  exponentialBackoff?: boolean;
}
```

## 执行结果

```typescript
interface ToolExecutionResult {
  /** 是否成功 */
  success: boolean;
  /** 执行结果 */
  result?: any;
  /** 错误信息 */
  error?: string;
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 重试次数 */
  retryCount: number;
}
```

## 重试机制

工具执行器支持自动重试，以下错误会触发重试：

- 超时错误
- 网络错误（ECONNREFUSED、ETIMEDOUT、ENOTFOUND）
- HTTP 5xx错误
- 速率限制错误（429）

以下错误不会重试：

- 参数错误（400）
- 认证错误（401）
- 权限错误（403）
- 未找到错误（404）

## 参数验证

工具执行前会自动验证参数：

- 检查必需参数
- 验证参数类型
- 验证枚举值
- 验证格式约束（uri、email、uuid等）

## 错误处理

工具模块提供统一的错误类型：

- `ToolError`: 工具执行错误
- `ValidationError`: 参数验证错误
- `TimeoutError`: 超时错误
- `NetworkError`: 网络错误
- `RateLimitError`: 速率限制错误

## 测试

运行单元测试：

```bash
cd sdk
pnpm test core/tools/__tests__/tool-registry.test.ts
```

## 注意事项

1. **工具注册**: 工具必须先注册才能执行
2. **参数验证**: 严格验证参数，确保安全性
3. **超时控制**: 合理设置超时时间，避免长时间等待
4. **重试策略**: 合理设置重试次数和延迟，避免过度重试
5. **错误处理**: 妥善处理各种错误情况，提供清晰的错误信息
6. **工具安全**: 注意工具的安全性，避免执行危险操作
7. **执行器选择**: 根据工具类型选择合适的执行器

## 设计原则

1. **接口统一**: 所有工具类型使用相同的接口
2. **职责分离**: SDK只负责注册和管理，工具实现由tool-executors包负责
3. **参数验证**: 严格的参数验证确保工具调用的安全性
4. **错误友好**: 提供清晰的错误信息
5. **可扩展**: 易于添加新的工具类型

## 相关文档

- [`@modular-agent/tool-executors`](../../../../packages/tool-executors) - 工具执行器包
- [`@modular-agent/types/tool`](../../../../packages/types/src/tool.ts) - 工具类型定义