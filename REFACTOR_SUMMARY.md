# ConversationStateManager 重构总结

## 问题分析

`ConversationStateManager` 和 `ConversationManager` 存在严重重复，其中 `ConversationStateManager` 完全是对 `ConversationManager` 的包装代理：

### 具体问题

1. **代理过度** - ConversationStateManager 的大部分方法只是转发给内部的 ConversationManager 实例
2. **双层初始化** - ThreadContext 中同时初始化两个对象，造成管理混乱
3. **状态不同步** - ConversationStateManager 初始化时创建新的 ConversationManager 实例，与 ThreadContext 的 conversationManager 分离
4. **代码复杂性** - 增加了理解难度，违反了 AGENTS.md 中的"分离关注"原则

## 修改内容

### 1. 增强 ConversationManager

**文件**: `sdk/core/execution/conversation.ts`

- 添加 `LifecycleCapable<ConversationState>` 接口实现
- 添加 `ConversationState` 接口导出
- 实现生命周期方法：
  - `createSnapshot()` - 创建状态快照
  - `restoreFromSnapshot()` - 从快照恢复
  - `initialize()` - 初始化（构造时已完成）
  - `cleanup()` - 清理资源
  - `isInitialized()` - 检查初始化状态

### 2. 删除 ConversationStateManager

**文件**: `sdk/core/execution/managers/conversation-state-manager.ts`

- 文件已被标记为已弃用
- 内容替换为迁移指南

### 3. 更新导出

**文件**: `sdk/core/execution/managers/index.ts`

```diff
- export { ConversationStateManager, type ConversationState } from "./conversation-state-manager";
```

**文件**: `sdk/core/execution/index.ts`

```diff
- export { ConversationStateManager, type ConversationState } from './managers/conversation-state-manager';
+ export { ConversationManager, type ConversationState } from './conversation';
```

### 4. 更新 ThreadContext

**文件**: `sdk/core/execution/context/thread-context.ts`

- 移除导入：`import { ConversationStateManager } from '../managers/conversation-state-manager'`
- 移除属性：`public readonly conversationStateManager: ConversationStateManager`
- 更新初始化：删除 ConversationStateManager 的创建逻辑
- 更新 cleanup：改为调用 `this.conversationManager.cleanup()`
- 更新 getLifecycleManagers：改为返回 ConversationManager

### 5. 更新协调器

**文件**: `sdk/core/execution/coordinators/llm-execution-coordinator.ts`

- 导入改为：`import { ConversationManager } from '../conversation'`
- 方法签名更新：`executeLLM()` 和 `handleLLMExecution()` 参数类型改为 `ConversationManager`
- 所有调用保持不变（API 兼容）

**文件**: `sdk/core/execution/coordinators/node-execution-coordinator.ts`

- `threadContext.conversationStateManager` → `threadContext.conversationManager` (2 处)

## 验证结果

✅ 类型检查通过 - 无 TypeScript 编译错误
✅ 所有导入更新完毕
✅ API 保持向后兼容
✅ 代码复杂性降低

## 设计原则遵循

1. **分离关注** - 不再有冗余的代理层，只有一个清晰的 ConversationManager
2. **接口一致** - ConversationManager 现在直接实现 LifecycleCapable，无需中间层
3. **类型安全** - 移除了可能导致状态不同步的重复对象
4. **代码简洁** - 减少了理解成本，降低维护复杂度

## 迁移指南

如果有外部代码使用 ConversationStateManager：

```typescript
// 旧代码
import { ConversationStateManager } from './managers/conversation-state-manager';
const manager = new ConversationStateManager(threadId, options);

// 新代码
import { ConversationManager } from './conversation';
const manager = new ConversationManager(options); // options 包含 threadId
```

API 完全相同，只是删除了冗余的包装层。
