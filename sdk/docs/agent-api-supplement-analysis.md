# Agent API 补充分析报告

## 一、分析背景

本文档对照 `sdk/agent` 目录的功能模块，分析 `sdk/api/agent` 目录需要补充的API，参考 `sdk/api/graph` 目录的设计模式。

## 二、当前状态

### 2.1 `sdk/agent` 模块功能

Agent 模块包含以下核心功能：

| 层级 | 模块 | 功能说明 |
|------|------|----------|
| 实体层 | `entities/` | `AgentLoopEntity`, `AgentLoopState` - 封装执行状态 |
| 管理器层 | `execution/managers/` | `MessageHistoryManager`, `VariableStateManager` - 管理消息历史和变量状态 |
| 执行层 | `execution/` | `AgentLoopFactory`, `AgentLoopCoordinator`, `AgentLoopExecutor` - 执行逻辑 |
| 检查点层 | `checkpoint/` | `AgentLoopCheckpointCoordinator`, `AgentLoopDiffCalculator`, `AgentLoopDeltaRestorer` - 检查点管理 |
| 服务层 | `services/` | `AgentLoopRegistry` - Agent Loop 注册表 |

### 2.2 `sdk/api/agent` 已有API

**Operations（命令操作）**：
- `RunAgentLoopCommand` - 运行Agent循环（非流式）
- `RunAgentLoopStreamCommand` - 运行Agent循环（流式）

## 三、参考 `sdk/api/graph` 的API结构

### 3.1 Operations（命令操作）

| 类别 | 命令 | 说明 |
|------|------|------|
| 执行控制 | `execute-thread-command` | 执行线程 |
| 执行控制 | `cancel-thread-command` | 取消线程 |
| 执行控制 | `pause-thread-command` | 暂停线程 |
| 执行控制 | `resume-thread-command` | 恢复线程 |
| 检查点 | `restore-from-checkpoint-command` | 从检查点恢复 |
| 触发器 | `enable-trigger-command` | 启用触发器 |
| 触发器 | `disable-trigger-command` | 禁用触发器 |

### 3.2 Resources（资源API）

| API | 说明 |
|-----|------|
| `thread-registry-api` | 线程注册表管理 |
| `checkpoint-resource-api` | 检查点资源管理 |
| `event-resource-api` | 事件资源管理 |
| `message-resource-api` | 消息资源管理 |
| `variable-resource-api` | 变量资源管理 |
| `workflow-registry-api` | 工作流注册表管理 |
| `trigger-resource-api` | 触发器资源管理 |
| `human-relay-resource-api` | 人工中继资源 |
| `user-interaction-resource-api` | 用户交互资源 |

### 3.3 Subscriptions（订阅操作）

| 订阅 | 说明 |
|------|------|
| `on-event-subscription` | 订阅事件 |
| `once-event-subscription` | 订阅事件（一次性） |
| `off-event-subscription` | 取消订阅事件 |

## 四、需要补充的API

### 4.1 Resources（资源API）- 优先级：高

| API名称 | 对应模块 | 功能说明 |
|---------|----------|----------|
| `agent-loop-registry-api.ts` | `AgentLoopRegistry` | Agent Loop注册表管理API，提供实例的查询、统计等功能 |
| `checkpoint-resource-api.ts` | `AgentLoopCheckpointCoordinator` | Agent检查点资源管理API，提供创建、恢复、查询检查点等功能 |
| `message-resource-api.ts` | `MessageHistoryManager` | Agent消息资源管理API，管理消息历史 |
| `variable-resource-api.ts` | `VariableStateManager` | Agent变量资源管理API，管理变量状态 |

### 4.2 Operations（命令操作）- 优先级：高

| 命令名称 | 功能说明 |
|----------|----------|
| `cancel-agent-loop-command.ts` | 取消Agent循环执行 |
| `pause-agent-loop-command.ts` | 暂停Agent循环执行 |
| `resume-agent-loop-command.ts` | 恢复Agent循环执行 |
| `create-checkpoint-command.ts` | 创建Agent检查点 |
| `restore-checkpoint-command.ts` | 从检查点恢复Agent循环 |

### 4.3 Subscriptions（订阅操作）- 优先级：中

| 订阅名称 | 功能说明 |
|----------|----------|
| `on-agent-event-subscription.ts` | 订阅Agent事件 |
| `once-agent-event-subscription.ts` | 订阅Agent事件（一次性） |
| `off-agent-event-subscription.ts` | 取消订阅Agent事件 |

## 五、建议的目录结构

```
sdk/api/agent/
├── index.ts
├── operations/
│   ├── run-agent-loop-command.ts          # 已有
│   ├── run-agent-loop-stream-command.ts   # 已有
│   ├── cancel-agent-loop-command.ts       # 新增
│   ├── pause-agent-loop-command.ts        # 新增
│   ├── resume-agent-loop-command.ts       # 新增
│   └── checkpoints/
│       ├── create-checkpoint-command.ts   # 新增
│       └── restore-checkpoint-command.ts  # 新增
├── resources/
│   ├── agent-loop-registry-api.ts         # 新增
│   ├── checkpoint-resource-api.ts         # 新增
│   ├── message-resource-api.ts            # 新增
│   └── variable-resource-api.ts           # 新增
└── subscriptions/
    ├── on-agent-event-subscription.ts     # 新增
    ├── once-agent-event-subscription.ts   # 新增
    └── off-agent-event-subscription.ts    # 新增
```

## 六、核心功能对照表

| Agent模块功能 | Graph API对应 | Agent API现状 | 需要补充 |
|---------------|---------------|---------------|----------|
| AgentLoopRegistry | ThreadRegistryAPI | 无 | agent-loop-registry-api |
| CheckpointCoordinator | CheckpointResourceAPI | 无 | checkpoint-resource-api |
| MessageHistoryManager | MessageResourceAPI | 无 | message-resource-api |
| VariableStateManager | VariableResourceAPI | 无 | variable-resource-api |
| 执行控制 | execute/cancel/pause/resume | 仅run | cancel/pause/resume |
| 检查点操作 | restore-from-checkpoint | 无 | create/restore |
| 事件订阅 | on/once/off-event | 无 | 订阅API |

## 七、实现优先级

### 第一阶段（核心功能）
1. `agent-loop-registry-api.ts` - 实例管理
2. `checkpoint-resource-api.ts` - 检查点管理
3. `cancel-agent-loop-command.ts` - 取消执行
4. `pause-agent-loop-command.ts` - 暂停执行
5. `resume-agent-loop-command.ts` - 恢复执行

### 第二阶段（资源管理）
1. `message-resource-api.ts` - 消息管理
2. `variable-resource-api.ts` - 变量管理
3. `create-checkpoint-command.ts` - 创建检查点
4. `restore-checkpoint-command.ts` - 恢复检查点

### 第三阶段（事件订阅）
1. `on-agent-event-subscription.ts`
2. `once-agent-event-subscription.ts`
3. `off-agent-event-subscription.ts`

## 八、设计原则

1. **一致性**：参考 `sdk/api/graph` 的设计模式，保持API风格一致
2. **继承性**：资源API继承 `GenericResourceAPI`，命令继承 `BaseCommand`
3. **依赖注入**：通过 `APIDependencyManager` 管理依赖
4. **类型安全**：使用 TypeScript 类型定义，确保类型安全
