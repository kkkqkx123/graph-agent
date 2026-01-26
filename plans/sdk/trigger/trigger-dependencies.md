# Trigger 模块依赖关系分析

## 概述

本文档详细说明 Trigger 模块与 SDK 现有模块之间的依赖关系，确保遵循 SDK 的依赖规则（Types ← Utils ← Core ← API）。当前版本仅支持事件触发器。

## 依赖规则回顾

### SDK 层次结构

```
Types Layer (类型定义)
    ↓
Utils Layer (工具函数)
    ↓
Core Layer (核心逻辑)
    ↓
API Layer (外部接口)
```

### 依赖约束

1. **Types 层**：不依赖任何其他层
2. **Utils 层**：只依赖 Types 层
3. **Core 层**：只依赖 Types 和 Utils 层
4. **API 层**：只依赖 Core 和 Types 层

## Trigger 模块依赖关系

### 1. Types 层依赖

#### 新增类型文件

**文件路径**：`sdk/types/trigger.ts`

**依赖关系**：
```typescript
// sdk/types/trigger.ts
import type { ID, Timestamp, Metadata } from './common';
import type { EventType, BaseEvent } from './events';
```

**说明**：
- 依赖 `common.ts` 中的基础类型（ID、Timestamp、Metadata）
- 依赖 `events.ts` 中的 EventType 枚举和 BaseEvent 接口
- 不依赖任何 Core、Utils、API 层

**依赖图**：
```
sdk/types/trigger.ts
    ↓
    ├─→ sdk/types/common.ts
    └─→ sdk/types/events.ts
```

### 2. Core 层依赖

#### 新增模块文件

**文件路径**：`sdk/core/trigger/`

**模块列表**：
1. `trigger-manager.ts` - 触发器管理器
2. `trigger-executor.ts` - 触发器执行器

#### 依赖关系详细分析

##### 2.1 TriggerManager 依赖

**文件路径**：`sdk/core/trigger/trigger-manager.ts`

**依赖关系**：
```typescript
// Types 层依赖
import type {
  Trigger,
  TriggerCondition,
  TriggerAction,
  TriggerStatus,
  TriggerExecutionResult
} from '../../types/trigger';
import type { BaseEvent } from '../../types/events';

// Core 层依赖
import { EventManager } from '../execution/event-manager';
import { TriggerExecutor } from './trigger-executor';
```

**依赖图**：
```
sdk/core/trigger/trigger-manager.ts
    ↓
    ├─→ sdk/types/trigger.ts (Types)
    ├─→ sdk/types/events.ts (Types)
    ├─→ sdk/core/execution/event-manager.ts (Core)
    └─→ sdk/core/trigger/trigger-executor.ts (Core)
```

**依赖说明**：
- 只依赖 Types 层和 Core 层
- 不依赖 Utils 层和 API 层
- 符合依赖规则

##### 2.2 TriggerExecutor 依赖

**文件路径**：`sdk/core/trigger/trigger-executor.ts`

**依赖关系**：
```typescript
// Types 层依赖
import type {
  TriggerAction,
  TriggerActionType,
  TriggerExecutionResult
} from '../../types/trigger';
import type { ID } from '../../types/common';
```

**依赖图**：
```
sdk/core/trigger/trigger-executor.ts
    ↓
    ├─→ sdk/types/trigger.ts (Types)
    └─→ sdk/types/common.ts (Types)
```

**依赖说明**：
- 只依赖 Types 层
- 不依赖 Core、Utils、API 层
- 符合依赖规则


## 与现有模块的集成点

### 1. EventManager 集成

**集成方式**：
- TriggerManager 向 EventManager 注册事件监听器
- EventManager 触发事件时，调用 TriggerManager 的回调

**依赖方向**：
```
TriggerManager ──依赖──▶ EventManager
```

**集成点**：
```typescript
// TriggerManager 中
this.eventManager.on(EventType.NODE_FAILED, this.handleEvent.bind(this));
```

**反向依赖**：
- EventManager 不依赖 TriggerManager
- 保持单向依赖


## 完整依赖关系图

```
┌─────────────────────────────────────────────────────────────┐
│                        Types Layer                           │
│                                                              │
│  ┌──────────────────┐         ┌──────────────────────────┐ │
│  │   trigger.ts     │         │     events.ts            │ │
│  │  (新增)          │────────▶│     (现有)               │ │
│  └──────────────────┘         └──────────────────────────┘ │
│           ↓                                                      │
│  ┌──────────────────┐         ┌──────────────────────────┐ │
│  │   common.ts      │         │     node.ts              │ │
│  │   (现有)         │         │     (现有)               │ │
│  └──────────────────┘         └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                        Core Layer                           │
│                                                              │
│  ┌──────────────────┐         ┌──────────────────────────┐ │
│  │ TriggerManager   │────────▶│ EventManager             │ │
│  │ (新增)           │         │ (现有)                   │ │
│  └──────────────────┘         └──────────────────────────┘ │
│           ↓                                                      │
│  ┌──────────────────┐                                        │
│  │ TriggerExecutor  │                                        │
│  │ (新增)           │                                        │
│  └──────────────────┘                                        │
└──────────────────────────────────────────────────────────────┘
```

## 避免循环依赖的策略

### 1. 使用依赖注入

**策略**：
- TriggerManager 通过构造函数接收 EventManager 实例
- TriggerExecutor 通过构造函数接收依赖（当前版本无依赖）

**示例**：
```typescript
class TriggerManager {
  constructor(
    private eventManager: EventManager,
    private triggerExecutor: TriggerExecutor
  ) {}
}
```

### 2. 使用事件驱动

**策略**：
- TriggerManager 通过 EventManager 监听事件
- 不直接调用其他模块的方法
- 保持松耦合

**示例**：
```typescript
// TriggerManager 注册监听器
this.eventManager.on(EventType.NODE_FAILED, this.handleEvent.bind(this));

// EventManager 触发事件
await this.eventManager.emit(event);
```

### 3. 使用接口抽象

**策略**：
- 定义接口，不依赖具体实现
- 便于测试和替换

**示例**：
```typescript
interface ITriggerExecutor {
  execute(action: TriggerAction, context: ExecutionContext): Promise<TriggerExecutionResult>;
}

class TriggerManager {
  constructor(private triggerExecutor: ITriggerExecutor) {}
}
```

### 4. 单向依赖原则

**策略**：
- Trigger 模块只依赖现有模块
- 现有模块不依赖 Trigger 模块
- 保持依赖方向的一致性

**验证**：
- 检查所有现有模块的导入语句
- 确保没有导入 Trigger 模块的代码

## 依赖关系总结

### 依赖方向

```
Trigger 模块 ──依赖──▶ EventManager
```

### 依赖层次

```
Types Layer
    ↓
Core Layer (Trigger 模块)
    ↓
Core Layer (EventManager)
```

### 依赖规则验证

| 模块 | 依赖 Types | 依赖 Utils | 依赖 Core | 依赖 API | 符合规则 |
|------|-----------|-----------|-----------|---------|---------|
| trigger.ts | ✓ | ✗ | ✗ | ✗ | ✓ |
| trigger-manager.ts | ✓ | ✗ | ✓ | ✗ | ✓ |
| trigger-executor.ts | ✓ | ✗ | ✗ | ✗ | ✓ |

### 关键要点

1. **单向依赖**：Trigger 模块只依赖 EventManager，不反向依赖
2. **层次清晰**：遵循 Types ← Core 的依赖层次
3. **事件驱动**：通过 EventManager 实现松耦合
4. **依赖注入**：使用构造函数注入，便于测试
5. **空实现**：当前版本 TriggerExecutor 不依赖其他 Core 模块

## 集成检查清单

- [x] Trigger 模块不依赖 API 层
- [x] Trigger 模块不依赖 Utils 层
- [x] 现有模块不依赖 Trigger 模块
- [x] 所有依赖都是单向的
- [x] 使用依赖注入模式
- [x] 使用事件驱动模式
- [x] 定义清晰的接口
- [x] 避免循环依赖
- [x] 遵循 SDK 依赖规则
- [x] 保持架构一致性