# TypeScript SDK 1.27.0 功能分析

## 概述

这是 Model Context Protocol (MCP) 的官方 TypeScript SDK 实现，版本 1.27.0。MCP 是一个标准化协议，用于为 LLM 提供上下文信息，将上下文提供与 LLM 交互分离。该 SDK 完整实现了 MCP 规范，支持构建 MCP 服务器和客户端。

**项目信息：**
- 包名：`@modelcontextprotocol/sdk`
- 许可证：MIT
- 作者：Anthropic, PBC
- 最低 Node.js 版本：18+
- 必需依赖：Zod（用于 Schema 验证）

---

## 核心功能模块

### 1. MCP 服务器 (Server)

**位置：** `src/server/`

提供构建 MCP 服务器的高级 API，主要功能包括：

#### 1.1 服务器核心类
- **`Server`** - 基础服务器类（已废弃，推荐使用 `McpServer`）
- **`McpServer`** - 高级服务器 API（推荐使用）

#### 1.2 传输层支持
- **Streamable HTTP** (`streamableHttp.ts`) - 推荐的远程服务器传输方式
  - 支持请求/响应通过 HTTP POST
  - 支持通过 SSE 的服务器到客户端通知
  - 支持 JSON-only 响应模式
  - 支持会话管理和可恢复性
- **HTTP + SSE** (`sse.ts`) - 已废弃，仅用于向后兼容
- **Stdio** (`stdio.ts`) - 用于本地进程生成集成
- **WebSocket** - 支持 WebSocket 传输

#### 1.3 核心功能注册
- **Tools（工具）** - 允许 LLM 执行操作
  - 支持输入/输出 Schema 验证
  - 支持 `resource_link` 内容类型
  - 支持任务增强执行
- **Resources（资源）** - 暴露只读数据
  - 支持静态和动态资源
  - 支持资源模板和参数补全
  - 支持资源订阅通知
- **Prompts（提示词）** - 可重用的提示模板
  - 支持参数化提示
  - 支持参数补全
  - 支持显示名称元数据

#### 1.4 高级功能
- **DNS 重绑定保护** - 通过 `createMcpExpressApp()` 自动启用
- **CORS 支持** - 跨域请求处理
- **会话管理** - 支持有状态和无状态模式
- **日志记录** - 支持可配置日志级别
- **任务系统** - 实验性长运行操作支持

### 2. MCP 客户端 (Client)

**位置：** `src/client/`

提供连接 MCP 服务器的高级客户端 API：

#### 2.1 客户端核心类
- **`Client`** - 高级客户端类，支持所有 MCP 操作

#### 2.2 传输层支持
- **`StreamableHTTPClientTransport`** - 用于远程 HTTP 服务器
- **`SSEClientTransport`** - 用于传统 HTTP+SSE 服务器（已废弃）
- **`StdioClientTransport`** - 用于本地进程
- **`WebSocketClientTransport`** - 用于 WebSocket 连接

#### 2.3 核心操作方法
- `listTools()` / `callTool()` - 列出和调用工具
- `listResources()` / `readResource()` - 列出和读取资源
- `listPrompts()` / `getPrompt()` - 列出和获取提示
- `complete()` - 参数补全
- `subscribe()` / `unsubscribe()` - 资源订阅

#### 2.4 OAuth 认证支持
- **`ClientCredentialsProvider`** - 客户端凭证认证
- **`PrivateKeyJwtProvider`** - 私钥 JWT 认证
- **`StaticPrivateKeyJwtProvider`** - 静态私钥 JWT 认证
- 支持动态客户端注册
- 支持 Token 自动获取和刷新

### 3. 实验性功能 (Experimental)

**位置：** `src/experimental/`

#### 3.1 任务系统 (Tasks)
- **服务端 API** (`experimental/tasks/server.ts`)
  - `registerToolTask()` - 注册任务化工具
  - `TaskStore` - 任务存储接口
  - 支持内存存储实现
- **客户端 API** (`experimental/tasks/client.ts`)
  - `callToolStream()` - 流式工具调用
  - `getTask()` / `getTaskResult()` - 获取任务状态和结果
  - `cancelTask()` - 取消任务

### 4. 共享功能 (Shared)

**位置：** `src/shared/`

#### 4.1 协议基础
- **`Protocol`** - 协议基类，处理请求/通知路由
- **`Transport`** - 传输层接口定义

#### 4.2 认证工具
- OAuth 相关工具函数
- PKCE 挑战生成
- JWT 处理

#### 4.3 URI 模板
- 资源模板解析和匹配
- 参数提取和补全

#### 4.4 工具名称验证
- 工具命名规则验证

### 5. 验证系统 (Validation)

**位置：** `src/validation/`

#### 5.1 JSON Schema 验证器
- **`AjvJsonSchemaValidator`** - 基于 AJV 的验证器（默认）
- **`CfWorkerJsonSchemaValidator`** - 基于 @cfworker/json-schema 的验证器

#### 5.2 验证功能
- 工具输出验证
- 参数验证
- Schema 兼容性检查

---

## 核心能力 (Capabilities)

### 1. 采样 (Sampling)
服务器可以请求客户端执行 LLM 补全：
- 支持基础消息创建
- 支持工具调用（并行工具调用）
- 支持消息历史管理

### 2. 信息收集 (Elicitation)

#### 2.1 表单信息收集 (Form Elicitation)
- 通过 Schema 驱动的表单收集非敏感信息
- 支持默认值应用
- 支持 Schema 验证

#### 2.2 URL 信息收集 (URL Elicitation)
- 用于敏感数据和安全 Web 流程
- 支持 API 密钥收集
- 支持第三方 OAuth 流程
- 需要用户明确同意

### 3. 任务 (Tasks) - 实验性
- "立即调用，稍后获取"模式
- 支持长运行操作
- 支持轮询和恢复
- 支持 TTL 配置

### 4. 日志记录 (Logging)
- 可配置日志级别
- 按会话隔离
- 支持通知

### 5. 列表变更通知
- 工具列表变更通知
- 资源列表变更通知
- 提示列表变更通知

---

## 类型系统

**位置：** `src/types.ts`

### 协议版本
- 最新版本：`2025-11-25`
- 支持版本：`2025-11-25`, `2025-06-18`, `2025-03-26`, `2024-11-05`, `2024-10-07`

### 核心类型
- **JSON-RPC 类型** - 基础协议层
- **请求/通知/结果类型** - MCP 操作类型
- **能力类型** - 服务器和客户端能力声明
- **工具/资源/提示类型** - 功能实体类型
- **传输类型** - 传输层接口

### Schema 系统
- 使用 Zod 进行 Schema 定义和验证
- 支持 Zod v3.25+ 和 v4
- 所有类型都有对应的 Zod Schema

---

## 示例代码

**位置：** `src/examples/`

### 服务器示例
| 场景 | 文件 |
|------|------|
| Streamable HTTP 服务器（有状态） | `simpleStreamableHttp.ts` |
| Streamable HTTP 服务器（无状态） | `simpleStatelessStreamableHttp.ts` |
| JSON 响应模式 | `jsonResponseStreamableHttp.ts` |
| 向后兼容服务器 | `sseAndStreamableHttpCompatibleServer.ts` |
| 表单信息收集 | `elicitationFormExample.ts` |
| URL 信息收集 | `elicitationUrlExample.ts` |
| 采样和任务 | `toolWithSampleServer.ts` |
| OAuth 演示 | `demoInMemoryOAuthProvider.ts` |

### 客户端示例
| 场景 | 文件 |
|------|------|
| 交互式 Streamable HTTP 客户端 | `simpleStreamableHttp.ts` |
| 向后兼容客户端 | `streamableHttpWithSseFallbackClient.ts` |
| SSE 轮询客户端 | `ssePollingClient.ts` |
| 并行工具调用 | `parallelToolCallsClient.ts` |
| 多客户端并行 | `multipleClientsParallel.ts` |
| OAuth 客户端 | `simpleOAuthClient.ts` 等 |

---

## 架构设计

### 依赖关系
```
@modelcontextprotocol/sdk
├── 核心依赖
│   ├── zod (^3.25 || ^4.0) - Schema 验证（必需）
│   ├── express - HTTP 服务器
│   ├── hono - 轻量级 Web 框架
│   ├── jose - JWT 处理
│   ├── ajv - JSON Schema 验证
│   └── ...
├── 可选依赖
│   └── @cfworker/json-schema - 替代验证器
└── 开发依赖
    ├── typescript
    ├── vitest - 测试框架
    ├── eslint
    └── ...
```

### 模块导出
```typescript
// 主要入口
import { Client } from '@modelcontextprotocol/sdk/client';
import { Server, McpServer } from '@modelcontextprotocol/sdk/server';
import { types } from '@modelcontextprotocol/sdk';

// 实验性功能
import { tasks } from '@modelcontextprotocol/sdk/experimental/tasks';

// 验证
import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv';
```

---

## 部署模式

### 1. 无状态模式
- 无需会话跟踪
- 适合简单的 API 风格服务器
- 任何节点可处理任何请求

### 2. 持久化存储模式
- 共享数据库存储会话状态
- 支持可恢复性
- 适合多节点部署

### 3. 本地状态 + 消息路由
- 使用消息队列和发布/订阅
- 会话粘性路由
- 适合复杂分布式部署

---

## 安全特性

### 1. DNS 重绑定保护
- 自动主机头验证
- 支持自定义主机白名单
- 通过 `createMcpExpressApp()` 自动启用

### 2. OAuth 认证
- 支持客户端凭证流
- 支持私钥 JWT 认证
- 支持动态客户端注册

### 3. 输入验证
- 所有输入通过 Zod Schema 验证
- JSON Schema 验证器支持
- 错误链处理

### 4. 敏感信息保护
- 表单信息收集仅限非敏感数据
- 敏感数据必须使用 URL 信息收集
- 支持浏览器安全流程

---

## 向后兼容性

### 协议版本协商
- 自动协商最高支持版本
- 支持旧版本客户端/服务器

### 传输层兼容
- Streamable HTTP 优先
- SSE 回退支持
- 兼容服务器可同时支持两种传输

### API 兼容
- 能力声明可选
- 默认值处理
- 废弃 API 保留警告

---

## 开发工具

### 构建命令
```bash
npm run build          # 构建 ESM 和 CJS
npm run build:esm      # 仅构建 ESM
npm run build:cjs      # 仅构建 CJS
npm run typecheck      # 类型检查
npm run lint           # 代码检查
npm test               # 运行测试
```

### 示例运行
```bash
npm run server         # 运行服务器示例
npm run client         # 运行客户端示例
```

### 一致性测试
```bash
npm run test:conformance:server  # 服务器一致性测试
npm run test:conformance:client  # 客户端一致性测试
```

---

## 文档资源

### 本地文档
- `server.md` - 服务器构建指南
- `client.md` - 客户端使用指南
- `capabilities.md` - 核心能力详解
- `faq.md` - 常见问题解答

### 外部资源
- MCP 官方文档：https://modelcontextprotocol.io
- MCP 规范：https://spec.modelcontextprotocol.io
- 示例服务器：https://github.com/modelcontextprotocol/servers

---

## 总结

TypeScript SDK 1.27.0 是一个功能完整的 MCP 实现，主要特点：

1. **完整的协议支持** - 实现所有 MCP 核心功能
2. **灵活的传输层** - 支持 Streamable HTTP、SSE、Stdio、WebSocket
3. **高级 API** - 简化的服务器和客户端构建
4. **安全特性** - OAuth、DNS 保护、输入验证
5. **实验性功能** - 任务系统、高级信息收集
6. **向后兼容** - 多协议版本支持
7. **丰富的示例** - 覆盖所有主要场景
8. **完善的文档** - 详细的 API 和使用指南

该 SDK 适合需要构建标准化 LLM 上下文提供系统的项目，特别是需要与多个 LLM 客户端互操作的场景。
