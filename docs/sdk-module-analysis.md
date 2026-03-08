# SDK 模块实现分析与改进建议

## 概述

本文档分析 Modular Agent Framework 的 SDK 模块实现，识别存在的问题并提出改进建议。

## 目录结构

```
sdk/
├── api/                    # API 层 - 对外接口
│   ├── builders/          # 构建器（WorkflowBuilder, NodeBuilder 等）
│   ├── common/            # 通用组件（CommandExecutor, EventBus）
│   ├── config/            # 配置解析（TOML/JSON）
│   ├── core/              # SDK 核心（SDK 类、APIFactory）
│   ├── operations/        # 操作命令（Command 模式）
│   ├── resources/         # 资源 API（WorkflowRegistryAPI 等）
│   ├── types/             # API 层类型定义
│   └── utils/             # 工具函数
├── core/                   # 核心层 - 业务逻辑
│   ├── di/                # 依赖注入容器
│   ├── entities/          # 实体（ThreadEntity, ExecutionState）
│   ├── execution/         # 执行引擎
│   ├── graph/             # 图处理
│   ├── llm/               # LLM 客户端和格式化器
│   ├── messages/          # 消息处理
│   ├── services/          # 服务（注册表、事件管理）
│   ├── utils/             # 核心工具函数
│   └── validation/        # 验证逻辑
├── utils/                  # 通用工具
└── index.ts               # 主入口
```

---

### 问题 6：Command 模式过度设计

**现象**：
- 每个操作都实现为 Command 类
- 大量样板代码（metadata, validate, execute）
- 实际上很少使用 undo 功能

**示例**：
```typescript
// sdk/api/operations/commands/execution/execute-thread-command.ts
export class ExecuteThreadCommand extends BaseCommand<ThreadResult> {
  constructor(private params: ExecuteThreadParams) {
    super();
  }

  getMetadata(): CommandMetadata {
    return {
      name: 'ExecuteThreadCommand',
      description: 'Execute a thread',
      category: 'execution',
      requiresAuth: false,
      version: '1.0.0'
    };
  }

  validate(): CommandValidationResult {
    // 验证逻辑
  }

  protected async executeInternal(): Promise<ThreadResult> {
    // 实际执行逻辑
  }
}
```

**影响**：
- 代码冗余
- 开发效率低
- 增加维护成本

**建议**：
1. 简化为函数式 API
2. 保留 Command 模式仅用于需要 undo 的场景
3. 使用高阶函数封装通用逻辑

```typescript
// 建议：函数式 API
export async function executeThread(params: ExecuteThreadParams): Promise<Result<ThreadResult>> {
  // 直接实现
}
```

### 问题 7：资源管理 API 设计不一致

**现象**：
- `GenericResourceAPI` 提供 CRUD 模板
- 但各资源 API 实现方式不一致
- 部分 API 返回 `ExecutionResult`，部分返回原始值

**示例**：
```typescript
// sdk/api/resources/generic-resource-api.ts
async get(id: ID): Promise<ExecutionResult<T | null>> {
  // 返回 Result 包装
}

// sdk/api/resources/workflows/workflow-registry-api.ts
// 可能直接返回原始值
```

**影响**：
- API 使用困难
- 类型不一致
- 学习成本高

**建议**：
1. 严格执行统一接口
2. 所有 API 返回 `ExecutionResult<T>`
3. 提供 unwrap 工具函数

### 问题 8：线程生命周期管理复杂

**现象**：
- 多个 Coordinator 管理线程（ThreadExecutionCoordinator, ThreadLifecycleCoordinator, ThreadLifecycleManager）
- 职责划分不清
- 状态转换分散在各处

**示例**：
```typescript
// ThreadExecutor - 执行线程
// ThreadExecutionCoordinator - 协调执行流程
// ThreadLifecycleCoordinator - 管理生命周期
// ThreadLifecycleManager - 管理状态转换
// 职责重叠，调用链过长
```

**影响**：
- 难以追踪状态变化
- 容易出现状态不一致
- 调试困难

**建议**：
1. 合并简化 Coordinator（保留一个 ExecutionCoordinator）
2. 使用状态机明确状态转换
3. 集中状态管理（参考 Redux/XState）

```typescript
// 建议：状态机
interface ThreadStateMachine {
  state: 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'ERROR';
  transitions: {
    [K in ThreadState]: {
      [action: string]: ThreadState;
    }
  }
}
```
