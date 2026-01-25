# Core/Tools模块需求分析与设计

## 需求分析

### 核心需求
1. 提供统一的工具执行接口
2. 支持多种工具类型（BUILTIN、NATIVE、REST、MCP）
3. 支持工具参数验证
4. 支持工具执行的超时和重试
5. 不关心工具的具体实现细节

### 功能需求
1. 工具执行：统一的工具执行接口
2. 工具注册：工具定义的注册和管理
3. 参数验证：根据schema验证工具参数
4. 执行器管理：根据工具类型选择对应的执行器
5. 错误处理：统一的错误处理和转换

### 非功能需求
1. 接口统一：所有工具类型使用相同的接口
2. 性能优化：支持并发工具调用
3. 错误友好：提供清晰的错误信息
4. 可扩展：易于添加新的工具类型

## 设计说明

### 模块结构

```
tools/
├── tool-service.ts       # 工具服务
├── executor-base.ts      # 执行器基类
├── tool-registry.ts      # 工具注册表
└── executors/            # 各类工具执行器
    ├── builtin.ts
    ├── native.ts
    ├── rest.ts
    └── mcp.ts
```

### 核心组件

#### ToolService
工具服务，提供统一的工具执行接口。

**职责**：
- 提供统一的工具执行接口
- 管理工具注册表
- 根据工具类型选择执行器
- 处理工具参数验证
- 处理超时和重试

**核心方法**：
- execute(toolName: string, parameters: Record<string, any>, options: ToolExecutionOptions): Promise<ToolExecutionResult>
- registerTool(tool: Tool): void
- unregisterTool(toolName: string): void
- getTool(toolName: string): Tool | undefined
- listTools(): Tool[]
- validateParameters(tool: Tool, parameters: Record<string, any>): ValidationResult

**设计说明**：
- ToolService是工具执行的统一入口
- 根据toolName获取工具定义
- 根据工具类型选择对应的执行器
- 执行前验证参数
- 处理超时和重试

#### BaseToolExecutor
工具执行器基类，定义执行器的通用接口和实现。

**职责**：
- 定义执行器的通用接口
- 提供通用的执行逻辑
- 处理超时和重试
- 处理错误转换

**核心方法**：
- execute(tool: Tool, parameters: Record<string, any>, options: ToolExecutionOptions): Promise<ToolExecutionResult>
- protected doExecute(tool: Tool, parameters: Record<string, any>): Promise<any>
- protected shouldRetry(error: any, retries: number): boolean
- protected getRetryDelay(retries: number): number
- protected validateParameters(tool: Tool, parameters: Record<string, any>): void

**设计说明**：
- 所有工具执行器继承自BaseToolExecutor
- 提供统一的接口和通用逻辑
- 子类只需要实现doExecute
- 处理重试、超时、错误转换等通用逻辑

#### ToolRegistry
工具注册表，负责工具定义的管理。

**职责**：
- 注册工具定义
- 查询工具定义
- 删除工具定义
- 验证工具定义

**核心方法**：
- register(tool: Tool): void
- get(toolName: string): Tool | undefined
- remove(toolName: string): void
- list(): Tool[]
- validate(tool: Tool): boolean

**设计说明**：
- 使用Map存储工具定义
- 支持工具的增删查
- 提供工具验证功能
- 确保toolName唯一

### 工具执行器实现

#### BuiltinToolExecutor
内置工具执行器。

**职责**：
- 执行内置工具
- 内置工具由SDK提供
- 常见内置工具：计算器、日期时间、字符串处理等

**核心方法**：
- protected doExecute(tool: Tool, parameters: Record<string, any>): Promise<any>

**设计说明**：
- 内置工具由SDK实现
- 不需要外部依赖
- 提供常用的工具函数

**内置工具示例**：
- calculator：数学计算
- datetime：日期时间处理
- string：字符串处理
- array：数组操作
- object：对象操作

#### NativeToolExecutor
本地工具执行器。

**职责**：
- 执行本地工具
- 本地工具由应用层提供
- 通过函数调用执行

**核心方法**：
- protected doExecute(tool: Tool, parameters: Record<string, any>): Promise<any>

**设计说明**：
- 本地工具由应用层注册
- 通过函数引用调用
- 支持同步和异步函数

**注册方式**：
```typescript
toolService.registerTool({
  id: 'my-native-tool',
  name: 'my-native-tool',
  type: ToolType.NATIVE,
  description: 'My native tool',
  parameters: {
    type: 'object',
    properties: {
      input: { type: 'string' }
    },
    required: ['input']
  },
  metadata: {
    executor: async (params) => {
      // 工具实现
      return { result: 'success' };
    }
  }
});
```

#### RestToolExecutor
REST API工具执行器。

**职责**：
- 执行REST API调用
- 支持GET、POST、PUT、DELETE等方法
- 处理请求和响应

**核心方法**：
- protected doExecute(tool: Tool, parameters: Record<string, any>): Promise<any>

**设计说明**：
- 通过HTTP客户端调用REST API
- 支持自定义headers和认证
- 处理HTTP错误

**工具配置**：
```typescript
{
  id: 'rest-api',
  name: 'rest-api',
  type: ToolType.REST,
  description: 'REST API tool',
  parameters: {
    type: 'object',
    properties: {
      url: { type: 'string' },
      method: { type: 'string' },
      body: { type: 'object' }
    },
    required: ['url', 'method']
  },
  metadata: {
    baseUrl: 'https://api.example.com',
    headers: {
      'Authorization': 'Bearer token'
    }
  }
}
```

#### MCPToolExecutor
MCP协议工具执行器。

**职责**：
- 执行MCP协议工具
- 通过MCP客户端调用
- 处理MCP协议的请求和响应

**核心方法**：
- protected doExecute(tool: Tool, parameters: Record<string, any>): Promise<any>

**设计说明**：
- 通过MCP客户端调用工具
- 支持MCP协议的所有特性
- 处理MCP错误

**工具配置**：
```typescript
{
  id: 'mcp-tool',
  name: 'mcp-tool',
  type: ToolType.MCP,
  description: 'MCP tool',
  parameters: {
    type: 'object',
    properties: {
      param1: { type: 'string' }
    },
    required: ['param1']
  },
  metadata: {
    serverName: 'mcp-server',
    toolName: 'tool-name'
  }
}
```

### 参数验证

#### 验证流程
1. 获取工具的parameters schema
2. 验证parameters是否为object类型
3. 验证required参数是否提供
4. 验证每个参数的类型和格式
5. 验证参数的约束（enum、format等）

#### 验证错误
- 参数缺失：ValidationError
- 参数类型错误：ValidationError
- 参数格式错误：ValidationError
- 参数约束错误：ValidationError

### 执行流程

#### 工具执行流程
1. 用户调用ToolService.execute(toolName, parameters, options)
2. ToolService根据toolName获取工具定义
3. ToolService验证参数
4. ToolService根据工具类型选择执行器
5. 执行器执行工具
6. 执行器处理重试和超时
7. 返回执行结果

#### 重试机制
- 最大重试次数：由options.retries配置
- 重试延迟：由options.retryDelay配置
- 指数退避：支持指数退避策略

#### 可重试的错误
- 网络错误
- 超时错误
- 速率限制错误（429）
- 服务器错误（5xx）

#### 不可重试的错误
- 参数错误（400）
- 认证错误（401）
- 权限错误（403）
- 未找到错误（404）

### 错误处理

#### 错误类型
- 网络错误：NetworkError
- 超时错误：TimeoutError
- 参数错误：ValidationError
- 认证错误：AuthenticationError
- 速率限制错误：RateLimitError
- 服务器错误：ServerError
- 工具执行错误：ToolExecutionError

#### 错误转换
- 将工具特定的错误转换为SDK统一的错误类型
- 保留原始错误信息
- 提供清晰的错误消息

### 设计原则

1. **接口统一**：所有工具类型使用相同的接口
2. **职责分离**：SDK只负责执行框架，工具实现由应用层负责
3. **参数验证**：严格的参数验证确保工具调用的安全性
4. **错误友好**：提供清晰的错误信息
5. **可扩展**：易于添加新的工具类型

### 与其他模块的集成

#### 与Execution模块的集成
- ToolNodeExecutor调用ToolService执行工具
- ToolService返回ToolExecutionResult给ToolNodeExecutor

#### 与State模块的集成
- ToolService通过VariableManager解析参数中的变量引用
- ToolService通过HistoryManager记录工具调用历史

#### WithEvents模块的集成
- 工具调用开始时触发事件
- 工具调用完成时触发事件
- 工具调用失败时触发事件

### 依赖关系

- 依赖types层的Tool相关类型
- 被core/execution模块引用
- 被api/sdk模块引用

### 不包含的功能

以下功能不在tools模块中实现：
- ❌ 工具定义的持久化（由应用层负责）
- ❌ 工具执行的监控和统计（由应用层负责）
- ❌ 工具执行的缓存（由应用层负责）
- ❌ 工具执行的限流（由应用层负责）
- ❌ 工具的具体实现（由应用层负责，除了内置工具）

### 使用示例

```typescript
// 1. 创建工具服务
const toolService = new ToolService();

// 2. 注册内置工具（SDK自动注册）
// calculator, datetime, string, array, object等

// 3. 注册本地工具
toolService.registerTool({
  id: 'my-tool',
  name: 'my-tool',
  type: ToolType.NATIVE,
  description: 'My custom tool',
  parameters: {
    type: 'object',
    properties: {
      input: { type: 'string' }
    },
    required: ['input']
  },
  metadata: {
    executor: async (params) => {
      return { result: `processed: ${params.input}` };
    }
  }
});

// 4. 执行工具
const result = await toolService.execute('my-tool', {
  input: 'test'
}, {
  timeout: 5000,
  retries: 3,
  retryDelay: 1000
});

console.log(result);
```

### 注意事项

1. **工具注册**：工具必须先注册才能执行
2. **参数验证**：严格验证参数，确保安全性
3. **超时控制**：合理设置超时时间，避免长时间等待
4. **重试策略**：合理设置重试次数和延迟，避免过度重试
5. **错误处理**：妥善处理各种错误情况，提供清晰的错误信息
6. **工具实现**：本地工具的实现由应用层负责，SDK只提供执行框架
7. **工具安全**：注意工具的安全性，避免执行危险操作