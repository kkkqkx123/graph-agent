# Trigger 类型定义设计

## 概述

定义 SDK 层的触发器（Trigger）类型，用于实现基于事件的触发器机制。当前版本仅支持事件触发器类型。

## 设计原则

1. **事件驱动**：触发器通过监听 SDK 事件实现
2. **类型安全**：使用 TypeScript 严格类型检查
3. **可扩展性**：支持自定义触发动作
4. **依赖方向**：Types 层不依赖其他层，仅定义类型

## 核心类型

### 1. TriggerType（触发器类型）

```typescript
export enum TriggerType {
  /** 事件触发器 - 监听 SDK 现有事件 */
  EVENT = 'event'
}
```

**说明**：
- EVENT：监听 SDK 的现有事件（如 NODE_COMPLETED、THREAD_FAILED 等）

### 2. TriggerCondition（触发条件）

```typescript
export interface TriggerCondition {
  /** 事件类型 */
  eventType: EventType;
  /** 条件元数据 */
  metadata?: Metadata;
}
```

**说明**：
- `eventType`：监听的事件类型，引用 SDK 的 EventType 枚举
- TriggerCondition 只包含事件类型，不包含其他条件类型

### 3. TriggerAction（触发动作）

```typescript
export enum TriggerActionType {
  /** 启动工作流 */
  START_WORKFLOW = 'start_workflow',
  /** 停止工作流 */
  STOP_WORKFLOW = 'stop_workflow',
  /** 暂停线程 */
  PAUSE_THREAD = 'pause_thread',
  /** 恢复线程 */
  RESUME_THREAD = 'resume_thread',
  /** 跳过节点 */
  SKIP_NODE = 'skip_node',
  /** 设置变量 */
  SET_VARIABLE = 'set_variable',
  /** 发送通知 */
  SEND_NOTIFICATION = 'send_notification',
  /** 自定义动作 */
  CUSTOM = 'custom'
}

export interface TriggerAction {
  /** 动作类型 */
  type: TriggerActionType;
  /** 动作参数 */
  parameters: Record<string, any>;
  /** 动作元数据 */
  metadata?: Metadata;
}
```

**说明**：
- `type`：动作类型，定义要执行的操作
- `parameters`：动作参数，根据动作类型不同而不同
- 当前版本所有动作类型均为空实现，仅记录触发信息

### 4. TriggerStatus（触发器状态）

```typescript
export enum TriggerStatus {
  /** 已启用 */
  ENABLED = 'enabled',
  /** 已禁用 */
  DISABLED = 'disabled',
  /** 已触发 */
  TRIGGERED = 'triggered'
}
```

**说明**：
- ENABLED：触发器处于激活状态，可以响应事件
- DISABLED：触发器被禁用，不响应事件
- TRIGGERED：触发器已被触发，执行了动作

### 5. Trigger（触发器定义）

```typescript
export interface Trigger {
  /** 触发器唯一标识符 */
  id: ID;
  /** 触发器名称 */
  name: string;
  /** 触发器描述 */
  description?: string;
  /** 触发器类型 */
  type: TriggerType;
  /** 触发条件 */
  condition: TriggerCondition;
  /** 触发动作 */
  action: TriggerAction;
  /** 触发器状态 */
  status: TriggerStatus;
  /** 关联的工作流 ID（可选） */
  workflowId?: ID;
  /** 关联的线程 ID（可选） */
  threadId?: ID;
  /** 触发次数限制（0 表示无限制） */
  maxTriggers?: number;
  /** 已触发次数 */
  triggerCount: number;
  /** 创建时间 */
  createdAt: Timestamp;
  /** 更新时间 */
  updatedAt: Timestamp;
  /** 触发器元数据 */
  metadata?: Metadata;
}
```

**说明**：
- `id`：触发器的唯一标识符
- `name`：触发器的名称
- `type`：触发器类型（当前仅支持 EVENT）
- `condition`：触发条件，定义监听的事件类型
- `action`：触发动作，定义触发后执行什么
- `status`：触发器当前状态
- `workflowId`：可选，关联的工作流 ID
- `threadId`：可选，关联的线程 ID
- `maxTriggers`：触发次数限制，0 表示无限制
- `triggerCount`：已触发次数
- `createdAt` / `updatedAt`：时间戳

### 6. TriggerExecutionResult（触发器执行结果）

```typescript
export interface TriggerExecutionResult {
  /** 触发器 ID */
  triggerId: ID;
  /** 是否成功执行 */
  success: boolean;
  /** 执行的动作 */
  action: TriggerAction;
  /** 执行时间 */
  executionTime: Timestamp;
  /** 执行结果数据 */
  result?: any;
  /** 错误信息（如果失败） */
  error?: any;
  /** 执行元数据 */
  metadata?: Metadata;
}
```

**说明**：
- 记录触发器的执行结果
- 包含成功/失败状态、执行时间、结果或错误信息

## 依赖关系

### Types 层依赖

```typescript
import type { ID, Timestamp, Metadata } from './common';
import type { EventType } from './events';
```

**说明**：
- 依赖 `common.ts` 中的基础类型（ID、Timestamp、Metadata）
- 依赖 `events.ts` 中的 EventType 枚举
- 不依赖 Core、API、Utils 层

## 使用场景

### 场景 1：节点失败通知

```typescript
const eventTrigger: Trigger = {
  id: 'trigger-2',
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
```

## 设计要点

1. **专用于事件**：Trigger 专用于监听 SDK 事件，不涉及时间触发和状态触发
2. **类型安全**：使用枚举和接口确保类型安全
3. **可扩展性**：支持自定义触发动作
4. **元数据支持**：所有类型都支持 metadata 字段，用于存储扩展信息
5. **触发次数限制**：支持 maxTriggers 和 triggerCount 字段，控制触发次数
6. **关联关系**：支持关联 workflowId 和 threadId，实现精确的触发范围控制
7. **空实现**：当前版本所有动作类型均为空实现，仅记录触发信息