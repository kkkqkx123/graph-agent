# Handlers架构设计文档

## 概述

本文档说明handlers模块的架构设计原则和三种处理器（Node、Hook、Trigger）的设计差异。

## 三种处理器的本质差异

### 1. Node Handlers（节点处理器）

**特点**：
- 节点类型是**固定的**，由[`NodeType`](../../types/node.ts:12)枚举定义
- 处理器是**静态的**，每个节点类型对应一个固定的处理器
- **不需要运行时注册**，因为节点类型是编译时确定的

**设计决策**：
- ❌ 不需要注册机制
- ✅ 使用静态Map映射
- ✅ 在模块加载时完成映射
- ❌ 不支持运行时扩展新的节点类型

**实现**：
```typescript
export const nodeHandlers: Record<NodeType, NodeHandler> = {
  [NodeType.START]: startHandler,
  [NodeType.END]: endHandler,
  // ... 其他节点类型
} as Record<NodeType, NodeHandler>;
```

**原因**：
- 节点类型是SDK核心概念，不应该由用户扩展
- 添加新节点类型需要修改SDK代码，属于SDK升级
- 静态映射更简单、更高效、类型更安全

---

### 2. Hook Handlers（Hook处理器）

**特点**：
- Hook名称是**固定的**，由[`HookName`](../../types/node.ts)枚举定义
- 处理器是**静态的**，每个Hook名称对应一个固定的处理器
- **不需要运行时注册**，因为Hook名称是编译时确定的

**设计决策**：
- ❌ 不需要注册机制
- ✅ 使用静态Map映射
- ✅ 在模块加载时完成映射
- ❌ 不支持运行时扩展新的Hook类型

**实现**：
```typescript
export const hookHandlers: Record<HookName, HookHandler> = {
  [HookName.CUSTOM]: customHookHandler,
  [HookName.NOTIFICATION]: notificationHookHandler,
  [HookName.VALIDATION]: validationHookHandler
} as Record<HookName, HookHandler>;
```

**使用场景**：
```typescript
// 在节点配置中定义Hook
const node: Node = {
  id: 'node-1',
  type: NodeType.LLM,
  hooks: [
    {
      hookName: HookName.NOTIFICATION,  // 固定的Hook名称
      hookType: HookType.AFTER_EXECUTE,
      eventName: 'node.completed'
    }
  ]
};
```

**原因**：
- Hook类型是SDK核心概念，不应该由用户扩展
- 添加新Hook类型需要修改SDK代码，属于SDK升级
- 静态映射更简单、更高效、类型更安全

---

### 3. Trigger Handlers（触发器处理器）

**特点**：
- 动作类型是**可扩展的**，用户可以定义自定义触发动作
- 处理器是**可扩展的**，支持运行时注册新的触发器处理器
- **需要注册机制**，因为动作类型是用户定义的

**设计决策**：
- ✅ 需要注册机制
- ✅ 支持运行时扩展
- ✅ Trigger应该支持与workflow一起静态定义
- ✅ 提供静态检查支持

**实现**：
```typescript
export const triggerHandlers: Record<TriggerActionType, TriggerHandler> = {};

export function registerTriggerHandler(actionType: TriggerActionType, handler: TriggerHandler): void {
  triggerHandlers[actionType] = handler;
}

export function getTriggerHandler(actionType: TriggerActionType): TriggerHandler {
  return triggerHandlers[actionType];
}
```

**使用场景**：
```typescript
// 在workflow中定义Trigger（建议）
const workflow: WorkflowDefinition = {
  id: 'workflow-1',
  name: 'My Workflow',
  nodes: [...],
  edges: [...],
  triggers: [  // 建议添加到workflow定义中
    {
      id: 'trigger-1',
      name: 'Send Email',
      condition: {
        eventType: EventType.NODE_COMPLETED,
        nodeName: 'node-1'
      },
      action: {
        type: 'send_notification',  // 可扩展的动作类型
        parameters: { ... }
      }
    }
  ]
};
```

**原因**：
- Trigger是用户自定义的扩展点
- 需要支持用户定义自己的触发器处理器
- Trigger应该与workflow一起定义，以提供完整的静态检查

---

## 注册机制 vs 静态映射

### 注册机制（Hook、Trigger）

**适用场景**：
- 处理器类型是用户定义的
- 需要支持运行时扩展
- 处理器名称/类型是动态的

**优点**：
- ✅ 支持用户扩展
- ✅ 灵活性高
- ✅ 可以在运行时动态添加

**缺点**：
- ❌ 类型安全性稍弱
- ❌ 需要运行时查找
- ❌ 可能出现未注册的错误

### 静态映射（Node）

**适用场景**：
- 处理器类型是SDK定义的
- 不需要运行时扩展
- 处理器类型是编译时确定的

**优点**：
- ✅ 类型安全性高
- ✅ 编译时检查
- ✅ 性能更好
- ✅ 代码更简单

**缺点**：
- ❌ 不支持用户扩展
- ❌ 添加新类型需要修改SDK

---

## 接口定义差异

### NodeHandler（无注册）

```typescript
export type NodeHandler = (thread: Thread, node: Node) => Promise<any>;

// 使用静态映射
export const nodeHandlers: Record<NodeType, NodeHandler> = {
  [NodeType.START]: startHandler,
  [NodeType.END]: endHandler,
  // ... 其他节点类型
};
```

### HookHandler（无注册）

```typescript
export type HookHandler = (
  context: HookExecutionContext,
  hook: NodeHook,
  emitEvent: (event: NodeCustomEvent) => Promise<void>
) => Promise<void>;

// 使用静态映射
export const hookHandlers: Record<HookName, HookHandler> = {
  [HookName.CUSTOM]: customHookHandler,
  [HookName.NOTIFICATION]: notificationHookHandler,
  [HookName.VALIDATION]: validationHookHandler
};
```

### TriggerHandlerRegistry（有注册）

```typescript
export type TriggerHandler = (
  action: TriggerAction,
  triggerId: string
) => Promise<TriggerExecutionResult>;

export interface TriggerHandlerRegistry {
  register(actionType: string, handler: TriggerHandler): void;
  get(actionType: string): TriggerHandler;
  has(actionType: string): boolean;
  getAll(): Record<string, TriggerHandler>;
}

// 使用注册器实现
export const triggerHandlerRegistry: TriggerHandlerRegistry = new TriggerHandlerRegistryImpl();
```

---

## 与Workflow的集成

### Hook（已集成）

Hook已经与节点一起定义在workflow中：

```typescript
interface Node {
  id: ID;
  type: NodeType;
  hooks?: NodeHook[];  // Hook定义在节点中
}
```

### Trigger（建议集成）

建议将Trigger集成到workflow定义中：

```typescript
interface WorkflowDefinition {
  id: ID;
  name: string;
  nodes: Node[];
  edges: Edge[];
  triggers?: Trigger[];  // 建议添加Trigger定义
}
```

**好处**：
- ✅ 提供完整的静态检查
- ✅ Trigger与workflow一起版本管理
- ✅ 更好的类型安全性
- ✅ 更清晰的依赖关系

### Node（已集成）

Node已经与workflow紧密集成：

```typescript
interface WorkflowDefinition {
  nodes: Node[];  // 节点定义在workflow中
}
```

---

## 总结

| 特性 | Node Handlers | Hook Handlers | Trigger Handlers |
|------|--------------|---------------|------------------|
| 类型定义 | SDK固定（NodeType枚举） | SDK固定（HookName枚举） | 用户可扩展 |
| 注册机制 | ❌ 不需要 | ❌ 不需要 | ✅ 需要 |
| 运行时扩展 | ❌ 不支持 | ❌ 不支持 | ✅ 支持 |
| 与Workflow集成 | ✅ 已集成 | ✅ 已集成 | ⚠️ 建议集成 |
| 静态检查 | ✅ 完整 | ✅ 完整 | ⚠️ 需要改进 |
| 接口类型 | NodeHandler | HookHandler | TriggerHandlerRegistry |

**设计原则**：
1. **固定类型使用静态映射**：如Node类型、Hook类型
2. **可扩展类型使用注册机制**：如Trigger
3. **与workflow紧密集成的组件应该在workflow中定义**：如Node、Hook、Trigger
4. **提供完整的静态检查**：确保类型安全和可维护性

**重要变更**：
- Hook Handlers 从"可扩展"改为"固定"，使用静态映射而非注册机制
- Hook名称由SDK定义，用户不能扩展新的Hook类型
- 只有Trigger Handlers支持运行时扩展和注册机制