# 上下文压缩设计

## 概述

本文档描述了 SDK 中上下文压缩的完整设计方案，包括压缩策略、事件触发机制、消息索引管理以及实现细节。

## 一、设计目标

### 1. 核心目标
- **Token 管理**：有效管理对话上下文中的 Token 使用
- **压缩触发**：在 Token 超过限制时自动触发压缩
- **回退支持**：支持回退到任意批次，不影响上下文恢复
- **性能优化**：高效的压缩算法和索引管理

### 2. 设计原则
- **简洁性**：消息类型保持简洁，压缩信息独立管理
- **灵活性**：支持多种压缩策略，易于扩展
- **可靠性**：完整的回退支持，保证数据一致性
- **可维护性**：清晰的架构，易于理解和维护

## 二、架构设计

### 1. 整体架构

```
LLMMessage (消息)
    ↓
MessageMarkMap (标记映射)
    ↓
CompressionStrategy (压缩策略)
    ↓
ContextCompressionConfig (压缩配置)
    ↓
EventManager (事件管理器)
```

### 2. 核心组件

#### MessageMarkMap
- 管理消息索引和批次信息
- 支持多次压缩和回退
- 维护边界和批次映射

#### CompressionStrategy
- 定义压缩算法接口
- 支持多种压缩策略
- 可扩展的压缩实现

#### ConversationManager
- 集成压缩功能
- 管理消息历史和索引
- 触发压缩事件

## 三、压缩策略

### 1. 压缩策略接口

```typescript
export interface CompressionStrategy {
  compress(
    messages: LLMMessage[],
    markMap: MessageMarkMap,
    config: ContextCompressionConfig
  ): Promise<{
    messages: LLMMessage[];
    markMap: MessageMarkMap;
  }>;
}
```

### 2. 空实现策略（后续再实现）

```typescript
export class NoOpCompressionStrategy implements CompressionStrategy {
  async compress(
    messages: LLMMessage[],
    markMap: MessageMarkMap,
    config: ContextCompressionConfig
  ): Promise<{
    messages: LLMMessage[];
    markMap: MessageMarkMap;
  }> {
    // 空实现，不进行任何压缩
    return { messages, markMap };
  }
}
```

### 3. 后续扩展策略

#### KeepRecentStrategy
- 保留最近 N 条消息
- 简单高效，适用于大多数场景

#### KeepSystemAndRecentStrategy
- 保留系统消息 + 最近 N 条
- 确保系统提示不被压缩

#### SmartSummaryStrategy
- 智能摘要压缩
- 使用 LLM 生成消息摘要
- 保留重要信息

#### SlidingWindowStrategy
- 滑动窗口压缩
- 保留中间 N 条消息
- 适用于长对话

## 四、事件触发机制

### 1. TOKEN_LIMIT_EXCEEDED 事件

```typescript
export interface TokenLimitExceededEvent extends BaseEvent {
  type: EventType.TOKEN_LIMIT_EXCEEDED;
  /** 当前使用的 Token 数量 */
  tokensUsed: number;
  /** Token 限制阈值 */
  tokenLimit: number;
}
```

### 2. 触发流程

```typescript
// 1. LLM 调用前检查
await conversationManager.checkTokenUsage();

// 2. Token 检测
const tokensUsed = this.tokenUsageTracker.getTokenUsage(this.messages);
if (this.tokenUsageTracker.isTokenLimitExceeded(this.messages)) {
  // 3. 触发事件
  await this.triggerTokenLimitEvent(tokensUsed);
}

// 4. 压缩执行
await conversationManager.checkAndCompress();
```

### 3. 事件监听

```typescript
// 监听压缩事件
sdk.events.on(EventType.TOKEN_LIMIT_EXCEEDED, async (event) => {
  console.log(`Token limit exceeded: ${event.tokensUsed}/${event.tokenLimit}`);
  // 可以在这里执行自定义压缩逻辑
});
```

## 五、消息索引管理

### 1. MessageMarkMap 结构

```typescript
export interface MessageMarkMap {
  /** 消息原始索引列表 */
  originalIndices: number[];
  /** 修改边界索引数组 */
  batchBoundaries: number[];
  /** 边界对应批次数组 */
  boundaryToBatch: number[];
  /** 当前批次 */
  currentBatch: number;
}
```

### 2. 索引计算方法

```typescript
// 获取当前批次的消息索引
function getCurrentBatchIndices(markMap: MessageMarkMap): number[] {
  const currentBoundaryIndex = markMap.boundaryToBatch.indexOf(markMap.currentBatch);
  const boundary = markMap.batchBoundaries[currentBoundaryIndex];
  
  return markMap.originalIndices.filter(index => index >= boundary);
}

// 判断消息是否被修改
function isModified(originalIndex: number, markMap: MessageMarkMap): boolean {
  const currentBoundaryIndex = markMap.boundaryToBatch.indexOf(markMap.currentBatch);
  const boundary = markMap.batchBoundaries[currentBoundaryIndex];
  return originalIndex < boundary;
}

// 获取消息在当前批次中的索引
function getBatchIndex(originalIndex: number, markMap: MessageMarkMap): number {
  const currentBoundaryIndex = markMap.boundaryToBatch.indexOf(markMap.currentBatch);
  const boundary = markMap.batchBoundaries[currentBoundaryIndex];
  return originalIndex - boundary;
}
```

### 3. 批次管理

#### 批次循环示例
```typescript
// 初始状态
markMap = {
  originalIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  batchBoundaries: [0],
  boundaryToBatch: [0],
  currentBatch: 0
};

// 添加临时消息（批次1）
markMap.batchBoundaries.push(5);
markMap.boundaryToBatch.push(1);
markMap.currentBatch = 1;

// 删除临时消息（回到批次0）
markMap.batchBoundaries = [0];
markMap.boundaryToBatch = [0];
markMap.currentBatch = 0;
```

## 六、ConversationManager 集成

### 1. 配置选项

```typescript
export interface ConversationManagerOptions {
  /** Token限制阈值 */
  tokenLimit?: number;
  /** 事件回调 */
  eventCallbacks?: ConversationManagerEventCallbacks;
  /** 事件管理器 */
  eventManager?: EventManager;
  /** 压缩配置 */
  compressionConfig?: ContextCompressionConfig;
  /** 压缩策略 */
  compressionStrategy?: CompressionStrategy;
  /** 工作流ID（用于事件） */
  workflowId?: string;
  /** 线程ID（用于事件） */
  threadId?: string;
}
```

### 2. 核心方法

#### 添加消息
```typescript
addMessage(message: LLMMessage): number {
  // 验证消息格式
  if (!message.role || !message.content) {
    throw new Error('Invalid message format: role and content are required');
  }

  // 添加消息到数组
  this.messages.push({ ...message });
  
  // 添加索引
  this.indexManager.addIndex(this.messages.length - 1);
  
  return this.messages.length;
}
```

#### 获取消息
```typescript
getMessages(): LLMMessage[] {
  const uncompressedIndices = this.indexManager.getUncompressedIndices();
  return this.indexManager.filterMessages(this.messages, uncompressedIndices);
}

getAllMessages(): LLMMessage[] {
  return [...this.messages];
}

getMessagesByRange(start: number, end: number): LLMMessage[] {
  const uncompressedIndices = this.indexManager.getUncompressedIndices();
  const filteredIndices = uncompressedIndices.filter(idx => idx >= start && idx < end);
  return this.indexManager.filterMessages(this.messages, filteredIndices);
}
```

#### 压缩检查
```typescript
async checkAndCompress(): Promise<void> {
  if (!this.compressionConfig?.enabled) {
    return;
  }

  const tokensUsed = this.tokenUsageTracker.getTokenUsage(this.messages);
  
  // 检查是否超过阈值
  if (tokensUsed > this.compressionConfig.threshold) {
    await this.compressContext();
  }
}
```

#### 事件触发
```typescript
private async triggerTokenLimitEvent(tokensUsed: number): Promise<void> {
  // 1. 通过 EventManager 发送事件
  if (this.eventManager && this.workflowId && this.threadId) {
    const event: TokenLimitExceededEvent = {
      type: EventType.TOKEN_LIMIT_EXCEEDED,
      timestamp: Date.now(),
      workflowId: this.workflowId,
      threadId: this.threadId,
      tokensUsed,
      tokenLimit: this.tokenUsageTracker['tokenLimit']
    };
    await this.eventManager.emit(event);
  }

  // 2. 兼容旧的回调机制
  if (this.eventCallbacks?.onTokenLimitExceeded) {
    try {
      await this.eventCallbacks.onTokenLimitExceeded(tokensUsed, this.tokenUsageTracker['tokenLimit']);
    } catch (error) {
      console.error('Error in onTokenLimitExceeded callback:', error);
    }
  } else {
    console.warn(`Token limit exceeded: ${tokensUsed} > ${this.tokenUsageTracker['tokenLimit']}`);
  }
}
```

## 七、使用示例

### 1. 创建对话管理器

```typescript
const conversationManager = new ConversationManager({
  tokenLimit: 8000,
  compressionConfig: {
    enabled: true,
    threshold: 6000,
    targetTokens: 4000
  },
  compressionStrategy: new NoOpCompressionStrategy(), // 空实现
  eventManager: eventManager,
  workflowId: 'workflow-1',
  threadId: 'thread-1'
});
```

### 2. 添加和获取消息

```typescript
// 添加消息
conversationManager.addMessage({ role: 'user', content: 'Hello' });

// 获取未压缩的消息
const messages = conversationManager.getMessages();

// 获取所有消息（包括压缩的）
const allMessages = conversationManager.getAllMessages();

// 根据索引范围获取消息
const rangeMessages = conversationManager.getMessagesByRange(0, 10);
```

### 3. 执行压缩

```typescript
// 检查并执行压缩
await conversationManager.checkAndCompress();

// 检查 Token 使用情况
await conversationManager.checkTokenUsage();
```

### 4. 回退操作

```typescript
// 回退到指定批次
conversationManager.rollbackToBatch(0);
```

## 八、实施步骤

### 第一阶段：类型定义
1. 在 `sdk/types/llm.ts` 中添加压缩相关类型
2. 在 `sdk/types/events.ts` 中确认 `TokenLimitExceededEvent` 定义

### 第二阶段：索引管理器
1. 创建 `sdk/core/execution/message-index-manager.ts`
2. 实现 `MessageIndexManager` 类
3. 编写单元测试

### 第三阶段：ConversationManager 改进
1. 修改 `ConversationManager` 添加索引管理器支持
2. 添加压缩相关方法
3. 修改事件触发逻辑
4. 编写单元测试

### 第四阶段：事件触发
1. 修改 `thread-builder.ts` 传入 `eventManager`
2. 修改 `llm-coordinator.ts` 传入 `eventManager`
3. 编写集成测试

### 第五阶段：配置和测试
1. 在 `ThreadOptions` 中添加压缩配置
2. 编写端到端测试
3. 编写使用文档

## 九、性能优化

### 1. 压缩算法优化
- **增量压缩**：只压缩新增的消息
- **异步压缩**：在后台执行压缩
- **缓存优化**：缓存压缩结果

### 2. 索引管理优化
- **批量操作**：支持批量压缩和回退
- **内存管理**：定期清理压缩的消息
- **持久化**：实现消息持久化

### 3. 事件处理优化
- **事件去重**：避免重复触发压缩事件
- **异步处理**：异步执行压缩操作
- **错误处理**：完善的错误处理机制

## 十、错误处理

### 1. 压缩失败
- 记录压缩失败日志
- 回退到压缩前状态
- 提供错误恢复机制

### 2. 索引不一致
- 验证索引一致性
- 自动修复索引错误
- 提供索引重建功能

### 3. 事件处理错误
- 捕获事件处理异常
- 提供错误回调
- 记录错误日志

## 十一、总结

本设计方案提供了一个完整的上下文压缩框架，具有以下特点：

1. **简洁性**：消息类型保持简洁，压缩信息独立管理
2. **灵活性**：支持多种压缩策略，易于扩展
3. **可靠性**：完整的回退支持，不影响上下文恢复
4. **可维护性**：清晰的架构，易于理解和维护
5. **可扩展性**：预留扩展点，支持后续功能增强

通过这个设计，SDK 可以有效地管理对话上下文，在 Token 限制下保持对话的连贯性和完整性。