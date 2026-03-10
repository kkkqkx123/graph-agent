# 执行实例重构方案（简化版）

## 一、背景与目标

### 1.1 背景

当前 SDK 中存在两个独立的执行实例实现：
- `sdk/agent/entities/agent-loop-entity.ts` - AgentLoopEntity
- `sdk/graph/entities/thread-entity.ts` - ThreadEntity

两者采用了相似的分层架构，但存在以下问题：
1. 缺少统一的类型定义
2. 中断控制方法命名不一致

### 1.2 目标

**最小化目标**：
1. 提供统一的类型定义作为参考
2. 统一中断控制方法命名
3. **保留各自的管理器实现**
4. **保留各自的检查点实现**
5. 避免过度抽象

---

## 二、执行实例对比分析

### 2.1 架构对比

| 维度 | AgentLoopEntity | ThreadEntity |
|------|-----------------|--------------|
| 核心职责 | 独立的 Agent 工具迭代循环 | 工作流图执行引擎 |
| 状态管理 | AgentLoopState（简单） | Thread + ExecutionState（复杂） |
| 消息管理 | MessageHistoryManager（简单） | MessageHistoryManager + ConversationManager（复杂） |
| 变量管理 | VariableStateManager（Map<string, any>） | VariableStateManager（四级作用域） |
| 检查点 | AgentLoopCheckpointCoordinator（简单快照） | CheckpointCoordinator（图结构、子Thread、FORK/JOIN） |
| 注册表 | AgentLoopRegistry（Map实现） | ThreadRegistry（Map实现） |
| 执行器 | AgentLoopExecutor | ThreadExecutor |
| 协调器 | AgentLoopCoordinator | ThreadExecutionCoordinator |
| 工厂 | AgentLoopFactory | ThreadBuilder |

### 2.2 关键差异分析

**变量管理差异**：
- Agent Loop：简单 Map，无作用域
- Graph：四级作用域（global/thread/local/loop），支持 Fork 场景复制

**消息管理差异**：
- Agent Loop：基础消息列表
- Graph：批次快照、版本控制、回退支持

**检查点差异**：
- Agent Loop：迭代历史、工具调用记录
- Graph：图结构、节点结果、Conversation 状态、子 Thread 关系

**结论**：两者需求差异巨大，强行统一会导致过度抽象。

---

## 三、简化方案

### 3.1 设计原则

**只共享类型，不共享接口**：
- 提供 `ExecutionStatus` 作为类型参考
- 提供 `ExecutionEventType` 作为类型参考
- **不强制实现统一接口**

**保留各自的管理器**：
- Agent Loop 使用简单的 `AgentLoopState`
- Graph 使用复杂的 `ThreadStateSnapshot`
- 各自的检查点 coordinator 保持独立

**最小化依赖**：
- 避免循环依赖
- 避免过度抽象
- 保持代码简单直接

### 3.2 核心类型定义（仅作为参考）

#### 3.2.1 执行状态枚举

```typescript
/**
 * 统一的执行状态枚举（仅作为类型参考）
 */
export enum ExecutionStatus {
  /** 待执行 */
  PENDING = 'PENDING',
  /** 执行中 */
  RUNNING = 'RUNNING',
  /** 已暂停 */
  PAUSED = 'PAUSED',
  /** 已完成 */
  COMPLETED = 'COMPLETED',
  /** 执行失败 */
  FAILED = 'FAILED',
  /** 已取消 */
  CANCELLED = 'CANCELLED'
}
```

**使用方式**：
```typescript
// AgentLoopEntity 可以参考此枚举定义状态
// 但继续使用 AgentLoopStatus
import { ExecutionStatus } from '@modular-agent/types';

// 映射关系（仅供参考）：
// AgentLoopStatus.CREATED    -> ExecutionStatus.PENDING
// AgentLoopStatus.RUNNING    -> ExecutionStatus.RUNNING
// AgentLoopStatus.PAUSED     -> ExecutionStatus.PAUSED
// AgentLoopStatus.COMPLETED  -> ExecutionStatus.COMPLETED
// AgentLoopStatus.FAILED     -> ExecutionStatus.FAILED
// AgentLoopStatus.CANCELLED  -> ExecutionStatus.CANCELLED
```

#### 3.2.2 执行事件类型（仅作为参考）

```typescript
/**
 * 执行事件类型枚举（仅作为类型参考）
 */
export enum ExecutionEventType {
  // 实例生命周期事件
  INSTANCE_CREATED = 'INSTANCE_CREATED',
  INSTANCE_STARTED = 'INSTANCE_STARTED',
  INSTANCE_PAUSED = 'INSTANCE_PAUSED',
  INSTANCE_RESUMED = 'INSTANCE_RESUMED',
  INSTANCE_COMPLETED = 'INSTANCE_COMPLETED',
  INSTANCE_FAILED = 'INSTANCE_FAILED',
  INSTANCE_CANCELLED = 'INSTANCE_CANCELLED',
  // ... 其他事件类型
}
```

**使用方式**：
```typescript
// Graph 已有 EventManager，无需额外实现
// Agent Loop 不需要独立的事件系统
// 此枚举仅作为事件命名的参考
```

### 3.3 统一中断控制方法

**建议的方法签名**：

```typescript
// AgentLoopEntity 和 ThreadEntity 都应实现以下方法：

/**
 * 暂停执行
 */
pause(): void;

/**
 * 恢复执行
 */
resume(): void;

/**
 * 停止执行
 */
stop(): void;

/**
 * 中止执行
 * @param reason 中止原因（可选）
 */
abort(reason?: string): void;
```

**实现方式**：
- Agent Loop：继续使用 `AgentLoopState` 的方法
- Graph：继续使用 `ThreadLifecycleManager` 的方法
- **只需确保方法签名一致，无需统一接口**

### 3.4 不推荐的做法

**❌ 不要创建**：
- `IExecutionInstance` 接口（过度抽象）
- `EventBus` 类（Graph 已有 EventManager）
- `ICheckpointManager` 接口（检查点需求差异巨大）
- `IInstanceRegistry` 接口（简单的 Map 已满足需求）
- `ExecutionSnapshot` 接口（快照内容差异巨大）
- 检查点适配器（无意义，只是包装）

**原因**：
1. Agent Loop 和 Graph 的需求差异显著
2. 强行统一会导致类型信息丢失
3. 增加适配器层反而增加复杂度
4. 违反 YAGNI 原则

---

## 四、实现建议

### 4.1 Agent Loop 模块

**保持现状**：
- 继续使用 `AgentLoopStatus` 枚举
- 继续使用 `AgentLoopState` 管理状态
- 继续使用 `AgentLoopCheckpointCoordinator` 管理检查点
- 继续使用 `AgentLoopRegistry` 管理实例

**可选优化**：
- 确保 `pause()`, `resume()`, `stop()`, `abort()` 方法签名一致
- 参考 `ExecutionStatus` 枚举进行类型注释（可选）

### 4.2 Graph 模块

**保持现状**：
- 继续使用 `ThreadStatus` 枚举
- 继续使用 `ThreadLifecycleManager` 管理状态
- 继续使用 `CheckpointCoordinator` 管理检查点
- 继续使用 `ThreadRegistry` 管理实例
- 继续使用 `EventManager` 管理事件

**可选优化**：
- 确保 `pause()`, `resume()`, `stop()`, `abort()` 方法签名一致
- 处理 `ThreadStatus.TIMEOUT` 映射到 `ExecutionStatus.FAILED`（如需统一）

### 4.3 类型定义导出

**在 `packages/types` 中添加**：

```typescript
// packages/types/src/execution.ts

/**
 * 统一的执行状态枚举（仅作为类型参考）
 */
export enum ExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

/**
 * 统一的执行事件类型（仅作为类型参考）
 */
export enum ExecutionEventType {
  INSTANCE_CREATED = 'INSTANCE_CREATED',
  INSTANCE_STARTED = 'INSTANCE_STARTED',
  INSTANCE_PAUSED = 'INSTANCE_PAUSED',
  INSTANCE_RESUMED = 'INSTANCE_RESUMED',
  INSTANCE_COMPLETED = 'INSTANCE_COMPLETED',
  INSTANCE_FAILED = 'INSTANCE_FAILED',
  INSTANCE_CANCELLED = 'INSTANCE_CANCELLED',
  // ... 其他事件类型
}
```

---

## 五、与原方案对比

### 5.1 原方案的问题

| 原方案组件 | 问题 |
|-----------|------|
| `IExecutionInstance` 接口 | 过度抽象，强制统一不相关的功能 |
| `ExecutionSnapshot` 接口 | 类型信息丢失，无法表达模块特定的快照内容 |
| `EventBus` 类 | 重复造轮子，Graph 已有 EventManager |
| `ICheckpointManager` 接口 | 检查点需求差异巨大，无法真正统一 |
| `Checkpoint` 适配器 | 无意义包装，增加类型转换复杂度 |
| `IInstanceRegistry` 接口 | 简单 Map 已满足需求，增加不必要的约束 |
| `InstanceRegistry` 类 | 过度设计，实际使用很少 |

### 5.2 简化方案的优势

| 优势 | 说明 |
|------|------|
| **保持简单** | 不引入不必要的抽象层 |
| **类型安全** | 各模块保留自己的类型定义 |
| **灵活扩展** | 各模块可以根据需求选择简单或复杂的实现 |
| **减少依赖** | 避免循环依赖和复杂的导入关系 |
| **易于理解** | 代码逻辑清晰，不需要学习新的抽象概念 |

---

## 六、预期收益

### 6.1 代码质量
- 保持代码简单直接
- 类型信息完整，无损失
- 避免过度设计

### 6.2 维护成本
- 各模块独立维护
- 减少抽象层的维护负担
- 降低学习成本

### 6.3 扩展性
- 各模块可以根据需求自由扩展
- 不受统一接口的限制
- 更符合实际使用场景

---

## 七、总结

**简化方案的核心思想**：
1. **只共享类型，不共享接口**
2. **保留各自的管理器实现**
3. **最小化依赖，避免过度抽象**

**关键决策**：
- ❌ 不创建 `IExecutionInstance` 接口
- ❌ 不创建 `EventBus` 类
- ❌ 不创建 `ICheckpointManager` 接口
- ❌ 不创建 `IInstanceRegistry` 接口
- ❌ 不创建 `ExecutionSnapshot` 接口
- ✅ 只提供 `ExecutionStatus` 和 `ExecutionEventType` 作为类型参考
- ✅ 确保中断控制方法签名一致

**核心收益**：
- 保持代码简单
- 避免过度抽象
- 符合 YAGNI 原则
- 降低维护成本

**实施建议**：
- 在 `packages/types` 中添加 `ExecutionStatus` 和 `ExecutionEventType` 枚举
- 确保各模块的 `pause()`, `resume()`, `stop()`, `abort()` 方法签名一致
- 保持各模块的现有实现不变

---

## 八、附录：为什么原方案不可取

### 8.1 EventBus 完全多余

- Graph 已有 `EventManager`，功能完善
- Agent Loop 不需要独立的事件系统
- 创建新的 EventBus 只是重复造轮子

### 8.2 ICheckpointManager 过度抽象

**Agent Loop 检查点需求**：
- 迭代历史
- 工具调用记录
- 简单的变量状态

**Graph 检查点需求**：
- 图结构
- 节点结果
- Conversation 状态
- 子 Thread 关系
- FORK/JOIN 上下文
- 触发器状态

强行统一会导致：
- Graph 检查点无法表达复杂结构
- Agent Loop 检查点背负不需要的功能
- 适配器层增加类型转换复杂度

### 8.3 IInstanceRegistry 过度设计

- 简单的 Map 实现已满足需求
- `getByStatus()` 等方法在实际中使用很少
- 强制实现接口增加了代码量
- 增加了不必要的约束

### 8.4 ExecutionSnapshot 类型信息丢失

**Agent Loop 快照应该包含**：
```typescript
interface AgentLoopSnapshot {
  iterationHistory: IterationRecord[];
  toolCallCount: number;
  currentIteration: number;
  // ... Agent Loop 特定字段
}
```

**Graph 快照应该包含**：
```typescript
interface ThreadSnapshot {
  threadState: ThreadStateSnapshot;
  nodeResults: Record<string, NodeResult>;
  conversationState: ConversationState;
  forkJoinContext: ForkJoinContext;
  // ... Graph 特定字段
}
```

统一的 `ExecutionSnapshot` 接口无法表达这些差异，强制统一会导致类型信息丢失。