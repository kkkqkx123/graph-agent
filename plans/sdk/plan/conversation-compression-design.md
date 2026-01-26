# 对话历史压缩方案设计

## 设计目标
- 解决Conversation消息数组过长导致的token超限问题
- 压缩后提供新的上下文，同时保留旧上下文用于追溯
- 避免压缩操作需要重新创建对象的开销
- 支持在压缩点前后灵活访问不同范围的消息

## 核心设计

### 1. 压缩标记机制

在Conversation中维护压缩标记，记录压缩点的索引位置：

```typescript
interface Conversation {
  messages: Message[]           // 完整的消息数组
  compressionMarker?: number    // 压缩标记，指向压缩开始位置的索引
  compressedContext?: string    // 压缩后的上下文摘要
}
```

### 2. 压缩操作流程

**压缩触发条件：**
- token使用量达到预设阈值（如80%）
- 手动调用压缩接口
- 定期压缩（如每10轮对话）

**压缩执行步骤：**
1. 分析消息数组，确定可压缩范围（通常是最早的历史消息）
2. 调用LLM对压缩范围内的消息生成摘要
3. 记录compressionMarker到当前索引位置
4. 存储compressedContext摘要内容
5. 保留原始消息数组不变

### 3. 消息访问策略

**压缩点之前访问（历史追溯）：**
- 访问索引小于compressionMarker的消息
- 过滤掉已压缩的内容，只显示compressedContext
- 用于调试和审计场景

**压缩点之后访问（LLM交互）：**
- 访问索引大于等于compressionMarker的消息
- 过滤掉compressionMarker之前的内容
- 提供给LLM的是压缩后的上下文+近期完整消息

**示例：**
```
消息数组：[M0, M1, M2, M3, M4, M5, M6, M7, M8, M9]
压缩标记：compressionMarker = 6
压缩摘要：compressedContext = "M0-M5的摘要"

访问压缩点前（索引<6）：返回compressedContext
访问压缩点后（索引>=6）：返回[M6, M7, M8, M9]
```

### 4. 压缩策略

**基于token使用量的压缩：**
- 监控token使用量，达到阈值触发压缩
- 压缩最早50%的消息
- 保留最近50%的完整消息

**基于消息数量的压缩：**
- 每N条消息触发一次压缩
- 压缩前N-M条消息
- 保留最近M条完整消息

**基于时间的压缩：**
- 压缩超过一定时间的历史消息
- 保留近期消息的完整性

### 5. 与ThreadExecutor协作

ThreadExecutor负责：
- 监控Conversation的token使用量
- 在适当时候触发压缩操作
- 处理压缩过程中的错误和异常
- 记录压缩事件到执行历史

Conversation提供：
- compress()方法执行压缩
- getMessagesForLLM()方法获取LLM交互用的消息（自动过滤压缩点之前内容）
- getFullHistory()方法获取完整历史（用于调试）
- getCompressedContext()方法获取压缩摘要

### 6. 压缩事件记录

触发COMPRESSION_PERFORMED事件：
```typescript
{
  type: 'COMPRESSION_PERFORMED',
  threadId: string,
  conversationId: string,
  compressionMarker: number,
  originalMessageCount: number,
  compressedMessageCount: number,
  tokenSaved: number,
  timestamp: number
}
```

### 7. 异常处理

- 压缩失败时不影响正常对话流程
- 记录压缩错误日志
- 提供降级策略（如删除最早消息）
- 监控压缩成功率和效果

## 优势

1. **避免对象重建**：保留原始消息数组，通过标记控制访问范围
2. **灵活访问**：支持追溯历史和LLM交互两种场景
3. **性能优化**：减少LLM调用的token消耗
4. **可追溯性**：保留完整历史用于调试和审计
5. **平滑升级**：对现有代码改动小，易于集成