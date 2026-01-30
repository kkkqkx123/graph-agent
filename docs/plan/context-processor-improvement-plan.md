# 上下文处理器节点改进方案

## 问题概述

当前 `sdk/core/execution/coordinators/node-execution-coordinator.ts` 中的上下文处理器节点实现存在以下问题：

1. **效率低下**：所有操作（截断、插入、替换、过滤、清空）都采用"清空并重新添加"的模式
2. **破坏索引管理**：完全忽略 `MessageIndexManager` 的存在，导致批次信息丢失
3. **无法回退**：由于重置了索引管理器，无法支持回退到之前的批次状态
4. **与架构不一致**：`ConversationManager` 已经集成了 `MessageIndexManager`，但上下文处理器节点没有利用这个机制

## 改进目标

1. **提高性能**：避免不必要的消息数组重建和复制
2. **保持索引一致性**：充分利用 `MessageIndexManager` 的索引映射和批次管理功能
3. **支持回退操作**：保留完整的批次历史，支持 `rollbackToBatch` 操作
4. **保持向后兼容**：不改变现有的 API 接口和配置格式

## 技术方案

### 核心思想

将"清空重置"模式改为"索引管理+尾插"模式：

- **保留原始消息**：所有原始消息都保留在 `ConversationManager.messages` 数组中
- **索引过滤**：通过 `MessageIndexManager` 维护可见消息的索引
- **批次管理**：每次操作创建新批次，支持回退
- **高效操作**：避免不必要的数组复制和重建

### 具体实现策略

#### 1. 截断操作 (truncate)

**当前实现问题**：
```typescript
// 获取所有消息
const allMessages = conversationManager.getAllMessages();
let filteredMessages: LLMMessage[] = [...allMessages];

// 各种截断逻辑...
filteredMessages = filteredMessages.slice(0, config.keepFirst);

// 清空并重新添加
conversationManager.clearMessages(false);
for (const msg of filteredMessages) {
  conversationManager.addMessage(msg);
}
```

**新实现方案**：
```typescript
// 获取当前可见消息的索引
const currentIndices = conversationManager.getMarkMap().originalIndices;
const allMessages = conversationManager.getAllMessages();

// 计算新的索引数组（基于当前可见消息）
let newIndices = [...currentIndices];

// 应用各种截断规则到索引上
if (config.keepFirst !== undefined) {
  newIndices = newIndices.slice(0, config.keepFirst);
}
if (config.keepLast !== undefined) {
  newIndices = newIndices.slice(-config.keepLast);
}
// ... 其他截断规则

// 更新索引管理器
const indexManager = conversationManager.getIndexManager(); // 需要添加此方法
indexManager.setOriginalIndices(newIndices);

// 开始新批次，记录压缩边界
const boundaryIndex = Math.min(...newIndices); // 或者使用其他逻辑确定边界
indexManager.startNewBatch(boundaryIndex);
```

#### 2. 插入操作 (insert)

**当前实现问题**：
```typescript
// 在指定位置插入需要重建整个数组
const newMessages = [...allMessages];
newMessages.splice(position, 0, ...config.messages);

// 清空并重新添加
conversationManager.clearMessages(false);
for (const msg of newMessages) {
  conversationManager.addMessage(msg);
}
```

**新实现方案**：
```typescript
const allMessages = conversationManager.getAllMessages();
const currentIndices = conversationManager.getMarkMap().originalIndices;

if (position === -1) {
  // 末尾插入：直接追加
  for (const msg of config.messages) {
    conversationManager.addMessage(msg);
  }
} else {
  // 指定位置插入：追加到末尾，然后更新索引映射
  const insertedIndices: number[] = [];
  for (const msg of config.messages) {
    const newIndex = conversationManager.addMessage(msg) - 1;
    insertedIndices.push(newIndex);
  }
  
  // 重新计算索引顺序
  const newIndices = [...currentIndices];
  // 在指定位置插入新消息的索引
  newIndices.splice(position, 0, ...insertedIndices);
  
  // 更新索引管理器
  conversationManager.getIndexManager().setOriginalIndices(newIndices);
}
```

#### 3. 替换操作 (replace)

**当前实现问题**：
```typescript
// 直接修改数组，然后清空重置
allMessages[config.index] = config.message;
conversationManager.clearMessages(false);
for (const msg of allMessages) {
  conversationManager.addMessage(msg);
}
```

**新实现方案**：
```typescript
// 直接修改消息内容，保持索引不变
const allMessages = conversationManager.getAllMessages();
const currentIndices = conversationManager.getMarkMap().originalIndices;

// 验证索引有效性
if (config.index >= currentIndices.length) {
  throw new Error(`Index ${config.index} is out of bounds`);
}

// 获取实际的消息索引
const actualMessageIndex = currentIndices[config.index];
allMessages[actualMessageIndex] = config.message;

// 索引映射不需要改变，因为消息数量没变
```

#### 4. 过滤操作 (filter)

**当前实现问题**：
```typescript
// 重新创建过滤后的消息数组
let filteredMessages = [...allMessages];
filteredMessages = filteredMessages.filter(msg => /* 过滤条件 */);

// 清空并重新添加
conversationManager.clearMessages(false);
for (const msg of filteredMessages) {
  conversationManager.addMessage(msg);
}
```

**新实现方案**：
```typescript
const allMessages = conversationManager.getAllMessages();
const currentIndices = conversationManager.getMarkMap().originalIndices;

// 基于当前可见消息进行过滤
const filteredIndices = currentIndices.filter(originalIndex => {
  const msg = allMessages[originalIndex];
  // 应用过滤条件...
  return shouldKeepMessage(msg, config);
});

// 更新索引管理器
conversationManager.getIndexManager().setOriginalIndices(filteredIndices);

// 开始新批次
const boundaryIndex = Math.min(...filteredIndices);
conversationManager.getIndexManager().startNewBatch(boundaryIndex);
```

#### 5. 清空操作 (clear)

**当前实现问题**：
```typescript
// 直接清空消息数组
conversationManager.clearMessages(keepSystemMessage);
```

**新实现方案**：
```typescript
if (keepSystemMessage) {
  const allMessages = conversationManager.getAllMessages();
  if (allMessages.length > 0 && allMessages[0].role === 'system') {
    // 只保留系统消息
    conversationManager.getIndexManager().setOriginalIndices([0]);
    conversationManager.getIndexManager().startNewBatch(0);
  } else {
    // 清空所有消息
    conversationManager.getIndexManager().reset();
  }
} else {
  // 清空所有消息
  conversationManager.getIndexManager().reset();
}
```

### ConversationManager 扩展

为了支持上述实现，需要在 `ConversationManager` 中添加以下方法：

```typescript
/**
 * 获取索引管理器实例（用于内部操作）
 * @returns MessageIndexManager 实例
 */
getIndexManager(): MessageIndexManager {
  return this.indexManager;
}

/**
 * 设置原始索引数组
 * @param indices 索引数组
 */
setOriginalIndices(indices: number[]): void {
  this.indexManager.markMap.originalIndices = [...indices];
}
```

### 验证和转换逻辑

现有的验证和转换逻辑 (`validateContextProcessorNodeConfig`, `transformContextProcessorNodeConfig`) 不需要修改，因为配置格式保持不变。

### 测试策略

需要编写以下测试用例：

1. **截断操作测试**：验证各种截断规则的正确性
2. **插入操作测试**：验证位置插入和末尾插入
3. **替换操作测试**：验证消息替换的正确性
4. **过滤操作测试**：验证各种过滤条件
5. **清空操作测试**：验证系统消息保留逻辑
6. **批次回退测试**：验证 `rollbackToBatch` 功能
7. **性能测试**：对比新旧实现的性能差异

## 实施步骤

1. 在 `ConversationManager` 中添加必要的辅助方法
2. 重构 `handleTruncateOperation` 方法
3. 重构 `handleInsertOperation` 方法  
4. 重构 `handleReplaceOperation` 方法
5. 重构 `handleFilterOperation` 方法
6. 重构 `handleClearOperation` 方法
7. 编写完整的测试用例
8. 更新相关文档

## 风险评估

1. **兼容性风险**：确保新实现在所有场景下都能正常工作
2. **性能风险**：虽然理论上性能更好，但需要实际测试验证
3. **复杂性风险**：索引管理增加了代码复杂度，需要充分测试

## 预期收益

1. **性能提升**：减少不必要的数组复制和重建操作
2. **功能增强**：支持完整的批次管理和回退功能
3. **架构一致性**：与现有的 `MessageIndexManager` 机制保持一致
4. **可维护性**：代码逻辑更加清晰，符合整体架构设计