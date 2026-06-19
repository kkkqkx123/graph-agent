# MCP 服务架构文档

## 概述

`sdk/services/mcp` 提供 Model Context Protocol (MCP) 的完整实现，包括连接管理、工具执行、元数据管理和高级功能。

## 目录结构

```
sdk/services/mcp/
├── core/                                # 核心连接管理
│   ├── connection-manager.ts            # 连接生命周期管理
│   ├── mcp-client.ts                    # MCP 协议客户端
│   ├── connection-state.ts              # 连接状态管理工具函数
│   ├── server-registry.ts               # 单例注册表
│   └── index.ts                         # core 模块导出
│
├── features/                            # 高级功能模块
│   ├── metadata/                        # 元数据相关功能
│   │   ├── metadata-cache.ts            # 元数据缓存
│   │   ├── tool-metadata-exporter.ts    # 工具元数据导出
│   │   ├── dynamic-context-provider.ts  # 动态上下文提供（优化版）
│   │   └── index.ts                     # 元数据模块导出
│   │
│   ├── registration/                    # 工具注册相关功能
│   │   ├── dynamic-registrar.ts         # 动态工具注册
│   │   └── index.ts                     # 注册模块导出
│   │
│   ├── approval/                        # 审批和访问控制
│   │   ├── enhanced-approval.ts         # 增强型审批系统
│   │   └── index.ts                     # 审批模块导出
│   │
│   ├── analytics/                       # 使用分析
│   │   ├── usage-analytics.ts           # 使用统计和分析
│   │   └── index.ts                     # 分析模块导出
│   │
│   └── index.ts                         # features 聚合导出
│
├── transport/                           # 传输层（不变）
│   ├── index.ts
│   ├── stdio.ts
│   ├── sse.ts
│   ├── streamable-http.ts
│   └── __tests__/
│
├── config/                              # 配置管理（不变）
│   └── index.ts
│
├── types.ts                             # 类型重新导出
├── index.ts                             # 主导出，分层 API
└── __tests__/                           # 单元测试
```

## 核心概念

### 1. 连接生命周期（core/）

**职责：** 管理与 MCP 服务器的连接

**关键类：**
- `McpConnectionManager`: 管理连接生命周期，支持三种模式
  - `lazy`: 延迟连接，首次使用时连接
  - `eager`: 立即连接
  - `keep-alive`: 持续连接，定期健康检查
- `McpServerRegistry`: 单例注册表，全局访问连接管理器

**使用场景：**
```typescript
// 获取全局实例
const manager = await McpServerRegistry.getInstance();

// 连接服务器
await manager.connectServer('my-server', config);

// 调用工具
const result = await manager.callTool('my-server', 'tool-name', args);
```

### 2. 元数据管理（features/metadata/）

**职责：** 管理和导出工具元数据，用于动态上下文和工具发现

**关键类：**
- `McpToolMetadataCache`: 缓存工具元数据，避免重复调用
- `McpToolMetadataExporter`: 导出工具元数据和服务器信息
- `McpToolsDynamicContextProvider`: 为 LLM 生成动态上下文（已优化，减少噪声）

**设计特点：**
- **缓存策略**：TTL 机制，可配置过期时间
- **动态上下文**：精简内容，可配置详细程度，避免提示词污染
- **配置选项**：
  ```typescript
  // 精简模式（默认）
  const context = provider.generateContext({
    toolsPerServer: 5,           // 每个服务器显示 5 个工具
    hotToolsLimit: 0,            // 不显示热工具
    compactMode: true,           // 仅显示工具名
    includeUsageHint: true,       // 显示使用提示
  });
  
  // 详细模式
  const context = provider.generateContext({
    toolsPerServer: 0,           // 显示所有工具
    hotToolsLimit: 10,           // 显示 10 个热工具
    includeServerStatus: true,    // 显示服务器状态
    includeResourceCount: true,   // 显示资源数量
  });
  ```

### 3. 工具注册（features/registration/）

**职责：** 动态注册 MCP 工具为 SDK Tool

**关键类：**
- `McpToolsRegistrar`: 将 MCP 工具动态注册到 ToolRegistry

**使用场景：**
```typescript
const registrar = createMcpToolsRegistrar();
const toolIds = await registrar.registerMcpTools(
  toolRegistry,
  mcpManager,
  { onlyHotTools: true, maxTools: 20 }
);
```

**注意：** 这个模块特定于 MCP，不应该放在 `sdk/core/registry` 中，因为：
- `sdk/core/registry` 是通用的注册表框架（ToolRegistry, SkillRegistry 等）
- `McpToolsRegistrar` 是特定于 MCP 的功能，只在 MCP 服务中使用
- 分离的原因：MCP 是可选的服务，其注册逻辑应该与核心注册表分离

### 4. 审批系统（features/approval/）

**职责：** 提供细粒度的访问控制和速率限制

**关键类：**
- `EnhancedMcpApprovalSystem`: 参数验证、速率限制、访问控制

**使用场景：**
```typescript
const approval = new EnhancedMcpApprovalSystem();

// 添加规则
approval.addParameterRule('server/tool', {
  paramName: 'path',
  allowedValues: ['^/safe/.*'],
});

// 检查批准
const result = approval.checkToolCallApproval({
  serverName: 'server',
  toolName: 'tool',
  arguments: { path: '/safe/file' },
});
```

### 5. 分析系统（features/analytics/）

**职责：** 跟踪和分析工具使用情况

**关键类：**
- `McpToolsUsageAnalytics`: 收集使用统计、性能指标、错误率

## 依赖关系

```
core/
  ├─→ connection-manager: 主要连接管理
  ├─→ mcp-client: MCP 协议通信
  ├─→ connection-state: 状态管理工具
  └─→ server-registry: 单例注册表

features/metadata/
  ├─→ metadata-cache: 性能优化
  ├─→ tool-metadata-exporter: 元数据导出
  └─→ core/connection-manager: 读取服务器状态

features/registration/
  ├─→ tool-metadata-exporter: 获取工具信息
  ├─→ core/connection-manager: 获取已连接服务器
  └─→ sdk/core/registry/tool-registry: 注册工具

features/approval/
  └─ 独立，无内部依赖

features/analytics/
  └─ 独立，无内部依赖
```

## API 分层

### Tier 1: 核心 API（@public 稳定）
```typescript
// 生产使用的主 API
export { McpConnectionManager }
export { McpServerRegistry, getMcpManager, releaseMcpManager }
export type { McpServerConfig, McpServerState, ... }
```

### Tier 2: 功能 API（@public 推荐）
```typescript
// 高级使用场景的功能 API
export { McpToolsDynamicContextProvider }
export { McpToolsRegistrar }
export { EnhancedMcpApprovalSystem }
export { McpToolsUsageAnalytics }
```

### Tier 3: 传输 API（@internal 避免直接使用）
```typescript
// 不应该直接使用，通过配置间接使用
export { StdioTransport, SseTransport, StreamableHttpTransport }
```

## Dynamic Context 优化

### 问题：原始设计
原始 `dynamic-context-provider` 生成过多的信息：
- 所有服务器和所有工具列表
- 重复的热工具部分
- 详细的使用指南
- 这导致提示词污染，特别是工具数量多时

### 解决方案：优化版本
新版本添加了精细控制选项：

**默认行为（精简）：**
- 每个服务器最多 5 个工具
- 不显示热工具（需显式启用）
- 显示工具名，省略描述可选
- 包含简洁的使用提示

**可配置选项：**
| 选项 | 默认值 | 说明 |
|------|------|------|
| `enabled` | true | 是否启用动态上下文 |
| `toolsPerServer` | 5 | 每个服务器显示的工具数（0 = 全部） |
| `hotToolsLimit` | 0 | 热工具数量（0 = 禁用） |
| `includeServerStatus` | false | 是否显示服务器状态 |
| `includeResourceCount` | false | 是否显示资源数量 |
| `includeToolDescriptions` | true | 是否显示工具描述 |
| `includeServerInstructions` | false | 是否显示服务器说明 |
| `includeUsageHint` | true | 是否显示使用提示 |
| `compactMode` | false | 紧凑模式（仅显示工具名） |

## 与其他模块的集成

### 与 tool registry 的关系
- `dynamic-registrar` 使用 `sdk/core/registry/tool-registry` 注册工具
- 这不会污染核心注册表框架
- MCP 工具可以与其他类型工具共存

### 与 workflow 的关系
- `McpToolsDynamicContextProvider` 可用于 workflow 的 `transformContext` 回调
- 使 LLM 能够感知可用的 MCP 工具

### 与 execution context 的关系
- `McpConnectionManager` 管理连接生命周期
- 可以在 execution context 中安全使用
- 支持并发调用和事务隔离

## 测试策略

```
__tests__/
├── core/
│   ├── connection-manager.test.ts
│   ├── server-registry.test.ts
│   └── ...
├── features/
│   ├── metadata/
│   │   ├── metadata-cache.test.ts
│   │   ├── tool-metadata-exporter.test.ts
│   │   └── dynamic-context-provider.test.ts
│   ├── registration/
│   │   └── dynamic-registrar.test.ts
│   ├── approval/
│   │   └── enhanced-approval.test.ts
│   └── analytics/
│       └── usage-analytics.test.ts
└── ...
```

## 常见集成模式

### 模式 1: 基本连接和工具调用
```typescript
const manager = await McpServerRegistry.getInstance();
await manager.connectServer('my-server', config);
const result = await manager.callTool('my-server', 'tool', args);
```

### 模式 2: 动态上下文注入
```typescript
const provider = createMcpToolsContextProvider(manager);
const transformFn = provider.createTransformContextFn({
  toolsPerServer: 5,
  hotToolsLimit: 0,
  compactMode: true,
});
// 在 workflow config 中使用
```

### 模式 3: 动态工具注册
```typescript
const registrar = createMcpToolsRegistrar();
await registrar.registerMcpTools(toolRegistry, manager, {
  onlyHotTools: true,
  maxTools: 20,
});
```

### 模式 4: 访问控制
```typescript
const approval = new EnhancedMcpApprovalSystem();
approval.addAccessControlRule({
  userId: 'user1',
  allowedServers: ['safe-server'],
  deniedTools: ['dangerous-tool'],
});
const result = approval.checkToolCallApproval(context);
```

## 迁移指南

从扁平结构迁移到新的分层结构：

### 导入更改

**旧方式（扁平）：**
```typescript
import { McpConnectionManager } from 'sdk/services/mcp';
import { McpToolsDynamicContextProvider } from 'sdk/services/mcp';
import { McpToolsRegistrar } from 'sdk/services/mcp';
```

**新方式（分层，向后兼容）：**
```typescript
// 仍然可以从根目录导入（推荐用于稳定 API）
import { McpConnectionManager } from 'sdk/services/mcp';

// 或者从特定功能模块导入（用于高级使用）
import { McpToolsDynamicContextProvider } from 'sdk/services/mcp/features/metadata';
import { McpToolsRegistrar } from 'sdk/services/mcp/features/registration';
```

**根导出（index.ts）已分组注释，清楚标识了什么是核心 API，什么是功能 API。**
