# 工具模块 (Tools Module)

工具模块提供了统一的工具执行框架，支持多种工具类型（BUILTIN、NATIVE、REST、MCP）。

## 模块结构

```
tools/
├── tool-service.ts       # 工具服务（统一入口）
├── tool-registry.ts      # 工具注册表
├── executor-base.ts      # 执行器基类
├── index.ts              # 模块导出
├── executors/            # 各类工具执行器
│   ├── builtin.ts        # 内置工具执行器
│   ├── native.ts         # 本地工具执行器
│   ├── rest.ts           # REST API工具执行器
│   └── mcp.ts            # MCP协议工具执行器
└── __tests__/            # 单元测试
    ├── tool-registry.test.ts
    ├── tool-service.test.ts
    └── builtin-executor.test.ts
```

## 核心组件

### 1. ToolService（工具服务）

工具服务是工具执行的统一入口，提供以下功能：

- 工具注册和注销
- 工具查询和搜索
- 工具执行（支持重试、超时）
- 批量执行

```typescript
import { ToolService } from './tools';

const toolService = new ToolService();

// 注册工具
toolService.registerTool(toolDefinition);

// 执行工具
const result = await toolService.execute('tool-name', parameters, {
  timeout: 5000,
  retries: 3,
  retryDelay: 1000
});
```

### 2. ToolRegistry（工具注册表）

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
const builtinTools = registry.listByType('BUILTIN');

// 搜索工具
const results = registry.search('calculator');
```

### 3. BaseToolExecutor（执行器基类）

执行器基类定义了工具执行的通用接口：

- 参数验证
- 超时控制
- 重试机制（支持指数退避）
- 错误处理

```typescript
import { BaseToolExecutor } from './tools/executor-base';

class MyExecutor extends BaseToolExecutor {
  protected async doExecute(tool: Tool, parameters: Record<string, any>): Promise<any> {
    // 实现具体的执行逻辑
    return result;
  }
}
```

## 工具类型

### 1. BUILTIN（内置工具）

SDK提供的内置工具，无需额外配置：

- **calculator**: 数学计算
- **datetime**: 日期时间操作
- **string**: 字符串处理
- **array**: 数组操作
- **object**: 对象操作
- **hash_convert**: 哈希转换（base64、md5等）
- **time_tool**: 时间工具

```typescript
// 使用计算器工具
const result = await toolService.execute('calculator', {
  expression: '2 + 3 * 4',
  precision: 2
});
// 返回: { expression: '2 + 3 * 4', result: 14, precision: 2 }
```

### 2. NATIVE（本地工具）

应用层提供的本地工具，通过函数引用执行：

```typescript
// 注册本地工具
toolService.registerTool({
  id: 'my-tool',
  name: 'my-tool',
  type: ToolType.NATIVE,
  description: 'My custom tool',
  parameters: {
    properties: {
      input: { type: 'string' }
    },
    required: ['input']
  },
  metadata: {
    customFields: {
      executor: async (params) => {
        // 工具实现
        return { result: `processed: ${params.input}` };
      }
    }
  }
});

// 执行工具
const result = await toolService.execute('my-tool', { input: 'test' });
```

### 3. REST（REST API工具）

通过HTTP调用REST API：

```typescript
// 注册REST工具
toolService.registerTool({
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
  metadata: {
    customFields: {
      baseUrl: 'https://api.example.com',
      headers: {
        'Authorization': 'Bearer token'
      }
    }
  }
});

// 执行工具
const result = await toolService.execute('fetch-api', {
  url: '/users',
  method: 'GET'
});
```

### 4. MCP（MCP协议工具）

通过MCP协议调用工具：

```typescript
// 注册MCP工具
toolService.registerTool({
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
  metadata: {
    customFields: {
      serverName: 'my-mcp-server',
      toolName: 'query-tool',
      serverUrl: 'http://localhost:8080/mcp'
    }
  }
});

// 执行工具
const result = await toolService.execute('mcp-tool', { query: 'SELECT * FROM users' });
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

## 使用示例

### 完整示例

```typescript
import { ToolService } from './tools';
import { Tool, ToolType } from './types/tool';

// 创建工具服务
const toolService = new ToolService();

// 注册内置工具（自动注册）
// calculator, datetime, string, array, object, hash_convert, time_tool

// 注册自定义工具
const customTool: Tool = {
  id: 'my-custom-tool',
  name: 'my-custom-tool',
  type: ToolType.NATIVE,
  description: 'My custom tool',
  parameters: {
    properties: {
      input: { type: 'string', description: 'Input text' }
    },
    required: ['input']
  },
  metadata: {
    category: 'custom',
    tags: ['demo'],
    customFields: {
      executor: async (params) => {
        return {
          original: params.input,
          processed: params.input.toUpperCase()
        };
      }
    }
  }
};

toolService.registerTool(customTool);

// 执行工具
const result = await toolService.execute('my-custom-tool', {
  input: 'hello world'
}, {
  timeout: 5000,
  retries: 2,
  retryDelay: 1000
});

if (result.success) {
  console.log('Result:', result.result);
} else {
  console.error('Error:', result.error);
}

// 批量执行
const batchResults = await toolService.executeBatch([
  { toolName: 'calculator', parameters: { expression: '2 + 3' } },
  { toolName: 'my-custom-tool', parameters: { input: 'test' } }
]);

console.log('Batch results:', batchResults);
```

## 测试

运行单元测试：

```bash
cd sdk
npm test core/tools/__tests__/tool-registry.test.ts
npm test core/tools/__tests__/tool-service.test.ts
npm test core/tools/__tests__/builtin-executor.test.ts
```

## 注意事项

1. **工具注册**: 工具必须先注册才能执行
2. **参数验证**: 严格验证参数，确保安全性
3. **超时控制**: 合理设置超时时间，避免长时间等待
4. **重试策略**: 合理设置重试次数和延迟，避免过度重试
5. **错误处理**: 妥善处理各种错误情况，提供清晰的错误信息
6. **工具安全**: 注意工具的安全性，避免执行危险操作
7. **本地工具**: 本地工具的实现由应用层负责，SDK只提供执行框架

## 设计原则

1. **接口统一**: 所有工具类型使用相同的接口
2. **职责分离**: SDK只负责执行框架，工具实现由应用层负责
3. **参数验证**: 严格的参数验证确保工具调用的安全性
4. **错误友好**: 提供清晰的错误信息
5. **可扩展**: 易于添加新的工具类型