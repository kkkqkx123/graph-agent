# Stratum 集成实现方案（精简版）

> **项目**: wf-agent + stratum  
> **日期**: 2026-06-17  
> **状态**: Phase 1 完成，Phase 2-4 进行中

---

## 核心理念

三个不同的抽象层级：

| 层级 | 代表 | 特点 | 生命周期 |
|-----|------|------|---------|
| **基础设施** | CLI执行器、远程服务执行器 | 管理进程/连接 | 本地spawn / 持久连接 |
| **传输层** | HttpClient、GrpcClient | 协议实现 | connect/disconnect/call |
| **业务编排** | 工具执行器（RestExecutor等） | LLM工具调度 | 编排基础设施 |

**关键认知**：
- CLI执行器与远程服务执行器是**同一层级的基础设施**，但运行方式完全相反
- 传输层（transport/）独立于执行器，可被任何消费者复用
- 工具执行器是**更高层级**，应该与基础设施分开

---

## services 目录结构（最终）

```
sdk/services/
├── executors/
│   ├── cli/                      # CLI执行器（本地进程）
│   │   ├── BaseCliExecutor.ts
│   │   ├── types.ts
│   │   └── implementations/ripgrep/
│   └── remote/                   # 远程服务执行器（网络服务）
│       ├── BaseRemoteExecutor.ts
│       ├── types.ts
│       └── implementations/stratum/
│
├── transport/                    # 传输层（协议实现）
│   ├── http/                     # HTTP传输（迁移自services/http/）
│   └── grpc/                     # gRPC传输（新增）
│
├── tools/                        # 工具执行器（从executors/移出）
│   ├── core/
│   ├── rest/
│   ├── stateful/
│   └── builtin/
│
└── ...其他模块不变
```

---

## Phase 1：传输层 + 远程执行器（已完成）

### 创建文件

**transport/grpc/**
- `GrpcClient.ts` — 通用gRPC客户端（动态proto加载）
- `GrpcClientManager.ts` — 连接池+生命周期管理
- `GrpcHealthCheck.ts` — 健康检查
- `types.ts` — 类型定义

**executors/remote/**
- `BaseRemoteExecutor.ts` — 远程执行器基类（纯接口，无模板方法）
- `types.ts` — 远程执行器类型
- `implementations/stratum/StratumExecutor.ts` — Stratum gRPC实现
- `implementations/stratum/stratum-process.ts` — 子进程管理
- `implementations/stratum/types.ts` — Stratum请求/响应类型

### 关键设计

**BaseRemoteExecutor** — 只定义公共接口，子类直接实现，不使用模板方法：

```typescript
export abstract class BaseRemoteExecutor {
  abstract connect(config: RemoteConnectionConfig): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract call<TReq, TResp>(method: string, request: TReq): Promise<TResp>;
  abstract isConnected(): boolean;
  abstract getStatus(): RemoteExecutorStatus;
}
```

**StratumExecutor** — 双部署模式支持：

```typescript
export interface StratumExecutorConfig {
  deployMode: "embedded" | "remote";
  address?: string;           // remote模式
  binaryPath?: string;        // embedded模式
  dbPath?: string;            // embedded模式
  protoPath?: string;
}
```

---

## Phase 2：工具执行器提升为一级目录（进行中）

### 操作

1. 创建 `services/tools/` 目录
2. 从 `executors/tools/` 复制内容
3. 更新import路径
4. `executors/tools/index.ts` 重新导出别名（兼容旧路径）
5. 更新 `services/index.ts` 导出

### 为什么提升？

工具执行器是**业务编排层**（调度工具、管理参数、处理重试），不是**基础设施**。放在executors下混淆了分层关系。

---

## Phase 3：CLI执行器重构

### 操作

1. `executors/BaseExecutor.ts` → `executors/cli/BaseCliExecutor.ts`
2. `executors/types.ts` → `executors/cli/types.ts`
3. `executors/implementations/` → `executors/cli/implementations/`
4. 旧路径保留别名维护向后兼容

---

## Phase 4：HTTP迁移到传输层

### 操作

1. `services/http/` → `services/transport/http/`
2. 旧 `services/http/` 改为re-export

### RestExecutor改进（可选）

当前RestExecutor直接实例化HttpClient，重构后应改为：

```typescript
// 工具执行器改为注入传输客户端，而非直接实例化
// 这样可以支持多种传输协议
```

---

## 兼容性策略

所有旧导入路径保持可用，通过re-export别名：

```typescript
// services/executors/BaseExecutor.ts
export { BaseCliExecutor as BaseExecutor } from "./cli/BaseCliExecutor.js";

// services/executors/tools/index.ts
export * from "../../tools/index.js";

// services/http/index.ts
export * from "../transport/http/index.js";
```

---

## 时间估计

- Phase 1：✅ 已完成
- Phase 2：1-2天
- Phase 3：1天
- Phase 4：1天

---

## 关键技术决策

| 决策 | 方案 | 理由 |
|-----|------|------|
| CLI vs 远程执行器 | 独立基类，不强行统一接口 | 生命周期和错误模型完全不同 |
| BaseRemoteExecutor设计 | 纯接口定义，无模板方法 | 子类直接实现，避免模板方法的抽象泄漏 |
| gRPC客户端 | 动态加载proto | 运行时灵活，无需预编译 |
| Stratum部署 | 双模式（embedded/remote） | 开发便捷性 + 生产稳定性 |
| 传输层独立 | 不与执行器耦合 | 支持任何消费者（工具执行器、MCP等）复用 |
