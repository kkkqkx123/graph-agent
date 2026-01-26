# Trigger 模块设计概览

## 背景

应用层定义了触发器（Trigger）值对象。SDK 层的 Trigger 模块专用于事件监听，通过监听 SDK 事件来触发相应的动作。

## 设计目标

1. **事件驱动**：Trigger 专用于监听 SDK 事件
2. **类型安全**：使用 TypeScript 严格类型检查
3. **可扩展性**：支持自定义触发动作
4. **架构一致性**：遵循 SDK 依赖规则（Types ← Utils ← Core ← API）

## 核心设计

### 触发器职责

SDK 层的 Trigger 模块专用于事件监听：

- **EVENT（事件触发器）**
  - 监听 SDK 现有事件（如 NODE_COMPLETED、THREAD_FAILED）
  - 事件触发时评估条件，满足则执行动作
  - 由 TriggerManager 监听 EventManager

**说明**：
- Trigger 专用于事件监听，不涉及时间触发和状态触发
- 时间触发功能由 Thread 模块实现
- 状态触发功能由 Thread 模块实现

### 架构层次

```
Types Layer (sdk/types/trigger.ts)
    ↓ 定义所有触发器相关类型

Core Layer (sdk/core/trigger/)
    ↓ 实现触发器核心逻辑
    ├─ trigger-manager.ts (触发器管理器)
    ├─ trigger-executor.ts (触发器执行器)
    ├─ trigger-condition-evaluator.ts (条件评估器)
    └─ time-trigger-scheduler.ts (时间调度器)
```

## 核心模块

### 1. TriggerManager（触发器管理器）

**职责**：
- 管理触发器的注册和注销
- 监听 SDK 事件，评估触发条件
- 协调触发器的执行
- 维护触发器状态

**核心逻辑**：
1. 注册触发器时，向 EventManager 注册事件监听器
2. 当事件触发时，评估所有相关触发器的条件
3. 条件满足时，调用 TriggerExecutor 执行动作
4. 更新触发器状态和触发次数

**依赖关系**：
- 依赖 Types 层：Trigger、TriggerCondition、TriggerAction、TriggerStatus
- 依赖 Core 层：EventManager、TriggerExecutor、TriggerConditionEvaluator、TimeTriggerScheduler

### 2. TriggerExecutor（触发器执行器）

**职责**：
- 执行触发器的动作
- 处理不同类型的动作
- 返回执行结果

**支持的动作类型**：
- START_WORKFLOW：启动工作流（空实现）
- STOP_WORKFLOW：停止工作流（空实现）
- PAUSE_THREAD：暂停线程（空实现）
- RESUME_THREAD：恢复线程（空实现）
- SKIP_NODE：跳过节点（空实现）
- SET_VARIABLE：设置变量（空实现）
- SEND_NOTIFICATION：发送通知（空实现）
- CUSTOM：自定义动作（空实现）

**说明**：
- 当前版本所有动作类型均为空实现
- 仅记录触发信息，返回执行结果
- 后续可根据需要实现具体动作

**依赖关系**：
- 依赖 Types 层：TriggerAction、TriggerActionType、TriggerExecutionResult
- 依赖 Core 层：ThreadCoordinator、VariableManager、Router

### 3. 触发条件评估

**职责**：
- 评估触发条件是否满足

**评估策略**：
- 检查事件类型是否匹配

**说明**：
- 触发条件评估逻辑集成在 TriggerManager 中
- 不需要单独的 TriggerConditionEvaluator 模块

## 依赖关系

### 依赖规则

Trigger 模块严格遵循 SDK 依赖规则：

```
Types Layer (sdk/types/trigger.ts)
    ↓ 只依赖 Types 层
Core Layer (sdk/core/trigger/)
    ↓ 只依赖 Types 和 Core 层
```

### 与现有模块的集成

**EventManager 集成**：
- TriggerManager 向 EventManager 注册事件监听器
- EventManager 触发事件时，调用 TriggerManager 的回调
- 单向依赖：TriggerManager → EventManager

**ThreadCoordinator 集成**：
- TriggerExecutor 调用 ThreadCoordinator 的方法控制线程
- 单向依赖：TriggerExecutor → ThreadCoordinator

**VariableManager 集成**：
- TriggerExecutor 调用 VariableManager 的方法设置变量
- 单向依赖：TriggerExecutor → VariableManager

**Router 集成**：
- TriggerExecutor 调用 Router 的方法跳过节点
- 单向依赖：TriggerExecutor → Router

### 避免循环依赖

1. **依赖注入**：通过构造函数接收依赖实例
2. **事件驱动**：通过 EventManager 实现松耦合
3. **接口抽象**：定义接口，不依赖具体实现
4. **单向依赖**：Trigger 模块只依赖现有模块，不反向依赖

## 执行流程

### 事件触发器执行流程

1. 应用层注册触发器到 TriggerManager
2. TriggerManager 向 EventManager 注册事件监听器
3. SDK 执行过程中触发事件（如 NODE_FAILED）
4. EventManager 分发事件到 TriggerManager
5. TriggerManager 调用 TriggerConditionEvaluator 评估条件
6. 条件满足时，调用 TriggerExecutor 执行动作
7. TriggerExecutor 调用相应模块执行动作（如 ThreadCoordinator）
8. TriggerManager 更新触发器状态和触发次数

## 使用示例

### 注册事件触发器

```typescript
const triggerManager = new TriggerManager(eventManager, triggerExecutor);

const trigger: Trigger = {
  id: 'trigger-1',
  name: '节点失败通知',
  type: TriggerType.EVENT,
  condition: {
    type: 'event',
    eventType: EventType.NODE_FAILED
  },
  action: {
    type: TriggerActionType.SEND_NOTIFICATION,
    parameters: {
      message: '节点执行失败',
      recipients: ['admin@example.com']
    }
  },
  status: TriggerStatus.ENABLED,
  triggerCount: 0,
  createdAt: Date.now(),
  updatedAt: Date.now()
};

triggerManager.register(trigger);
```

### 注册时间触发器

```typescript
const timeTrigger: Trigger = {
  id: 'trigger-2',
  name: '每日报告触发器',
  type: TriggerType.TIME,
  condition: {
    type: 'time',
    timeExpression: '0 9 * * *' // 每天 9 点
  },
  action: {
    type: TriggerActionType.START_WORKFLOW,
    parameters: {
      workflowId: 'workflow-daily-report',
      input: { date: '2024-01-01' }
    }
  },
  status: TriggerStatus.ENABLED,
  triggerCount: 0,
  createdAt: Date.now(),
  updatedAt: Date.now()
};

triggerManager.register(timeTrigger);
```

## 设计要点

1. **专用于事件**：Trigger 专用于监听 SDK 事件，不涉及时间触发和状态触发
2. **类型安全**：使用枚举和接口确保类型安全
3. **可扩展性**：支持自定义触发动作
4. **元数据支持**：所有类型都支持 metadata 字段，用于存储扩展信息
5. **触发次数限制**：支持 maxTriggers 和 triggerCount 字段，控制触发次数
6. **关联关系**：支持关联 workflowId 和 threadId，实现精确的触发范围控制
7. **错误处理**：所有异步操作都有错误处理，不影响其他触发器
8. **性能考虑**：条件评估和动作执行都是异步的，不阻塞主流程
9. **空实现**：当前版本所有动作类型均为空实现，仅记录触发信息

## 文档清单

1. **trigger-types-design.md**：详细的类型定义设计
2. **trigger-core-design.md**：详细的 Core 模块设计
3. **trigger-dependencies.md**：详细的依赖关系分析
4. **trigger-overview.md**：本文档，总体设计概览

## 职责范围

### Trigger 模块职责

- 监听 SDK 事件
- 评估触发条件
- 执行触发动作

### 不在 Trigger 模块范围内的功能

- **时间触发**：由 Thread 模块实现
- **状态触发**：由 Thread 模块实现
- **定时任务**：由 Thread 模块实现

## 实施建议

1. **优先级**：先实现 Types 层，再实现 Core 层
2. **测试**：每个模块都有对应的单元测试
3. **文档**：代码注释使用中文，LLM 相关配置使用英文
4. **集成**：确保与现有模块的集成点正确实现
5. **验证**：使用 TypeScript 类型检查确保类型安全

## 总结

Trigger 模块专用于事件监听，通过监听 SDK 事件来触发相应的动作。设计遵循 SDK 依赖规则，与现有模块保持松耦合，具有良好的可扩展性和可维护性。Trigger 不涉及时间触发和状态触发，这些功能由其他模块实现。