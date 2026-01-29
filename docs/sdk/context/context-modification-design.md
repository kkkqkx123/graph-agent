# 上下文修改方案

## 概述

本文档描述了 SDK 中上下文修改的设计方案，包括修改操作类型、批次管理、索引标记逻辑以及上下文处理节点的实现。

## 一、设计目标

### 1. 核心目标
- **临时消息管理**：支持添加和删除临时消息
- **批次循环**：支持批次循环（0-1-0）模式
- **回退支持**：完整的回退机制，不影响上下文恢复
- **索引一致性**：保证消息索引的一致性

### 2. 设计原则
- **简洁性**：简单的操作接口，易于使用
- **灵活性**：支持多种修改操作
- **可靠性**：保证数据一致性
- **可追溯性**：完整的修改历史记录

## 二、修改操作类型

### 1. 操作类型定义

```typescript
/**
 * 上下文修改操作类型
 */
export type ContextModificationOperation = 
  | 'insert'      // 插入消息
  | 'delete'      // 删除消息
  | 'replace'     // 替换消息
  | 'compress'    // 压缩消息
  | 'batch_start' // 开始新批次
  | 'batch_end';  // 结束批次
```

### 2. 操作配置

```typescript
/**
 * 上下文修改配置
 */
export interface ContextModificationConfig {
  /** 操作类型 */
  operation: ContextModificationOperation;
  /** 消息索引数组 */
  indices: number[];
  /** 操作数据（用于 insert 和 replace） */
  data?: LLMMessage | LLMMessage[];
  /** 批次号（用于 batch_start 和 batch_end） */
  batch?: number;
}
```

## 三、批次管理

### 1. 批次循环模式

批次循环模式（0-1-0）用于管理临时消息：

```
原始状态：batchBoundaries = [0], boundaryToBatch = [0], currentBatch = 0
添加临时消息：batchBoundaries = [0, 5], boundaryToBatch = [0, 1], currentBatch = 1
删除临时消息：batchBoundaries = [0], boundaryToBatch = [0], currentBatch = 0
```

### 2. 批次边界管理

#### 边界数组设计
- `batchBoundaries`：修改边界索引数组
- `boundaryToBatch`：边界对应批次数组
- 第0个索引必须作为第0个batch的边界

#### 边界一致性
- `batchBoundaries` 和 `boundaryToBatch` 必须长度一致
- 边界索引必须按升序排列
- 批次号可以重复使用

### 3. 回退机制

```typescript
// 回退到指定批次
function rollbackToBatch(markMap: MessageMarkMap, targetBatch: number): void {
  // 找到目标批次的边界索引
  const targetBoundaryIndex = markMap.boundaryToBatch.indexOf(targetBatch);
  
  // 移除目标批次之后的边界
  markMap.batchBoundaries = markMap.batchBoundaries.slice(0, targetBoundaryIndex + 1);
  markMap.boundaryToBatch = markMap.boundaryToBatch.slice(0, targetBoundaryIndex + 1);
  
  // 设置当前批次
  markMap.currentBatch = targetBatch;
}
```

## 四、上下文处理节点

### 1. ContextProcessorNodeHandler 类

```typescript
/**
 * 上下文处理节点执行器
 * 使用索引标记来操作消息，保证回退能力
 */
export class ContextProcessorNodeHandler {
  /**
   * 处理上下文操作
   * @param conversationManager 对话管理器
   * @param operation 操作类型
   * @param indices 消息索引数组
   * @param data 操作数据
   */
  async handleContextOperation(
    conversationManager: ConversationManager,
    operation: ContextModificationOperation,
    indices: number[],
    data?: any
  ): Promise<void> {
    const indexManager = conversationManager['indexManager'];
    
    switch (operation) {
      case 'insert':
        // 插入消息（尾插不需要特殊处理）
        if (data) {
          conversationManager.addMessage(data);
        }
        break;
        
      case 'delete':
        // 标记删除（不实际删除，只标记为压缩）
        indexManager.markCompressed(indices);
        break;
        
      case 'replace':
        // 替换消息（标记旧消息为压缩，插入新消息）
        indexManager.markCompressed(indices);
        if (data) {
          conversationManager.addMessage(data);
        }
        break;
        
      case 'compress':
        // 压缩消息
        indexManager.markCompressed(indices);
        break;
        
      case 'batch_start':
        // 开始新批次
        this.startNewBatch(conversationManager, indices[0]);
        break;
        
      case 'batch_end':
        // 结束批次
        this.endBatch(conversationManager, indices[0]);
        break;
    }
  }

  /**
   * 开始新批次
   * @param conversationManager 对话管理器
   * @param boundaryIndex 边界索引
   */
  private startNewBatch(
    conversationManager: ConversationManager,
    boundaryIndex: number
  ): void {
    const markMap = conversationManager['indexManager'].getMarkMap();
    
    // 添加新边界
    markMap.batchBoundaries.push(boundaryIndex);
    
    // 分配新批次号
    const newBatch = markMap.currentBatch + 1;
    markMap.boundaryToBatch.push(newBatch);
    markMap.currentBatch = newBatch;
  }

  /**
   * 结束批次
   * @param conversationManager 对话管理器
   * @param targetBatch 目标批次
   */
  private endBatch(
    conversationManager: ConversationManager,
    targetBatch: number
  ): void {
    conversationManager.rollbackToBatch(targetBatch);
  }

  /**
   * 回退上下文操作
   * @param conversationManager 对话管理器
   * @param batch 批次号
   */
  rollbackContextOperation(
    conversationManager: ConversationManager,
    batch: number
  ): void {
    conversationManager.rollbackToBatch(batch);
  }
}
```

### 2. 操作类型详解

#### insert 操作
- **用途**：插入新消息
- **特点**：尾插操作，不影响现有索引
- **数据**：需要提供 `LLMMessage` 或 `LLMMessage[]`

#### delete 操作
- **用途**：删除消息
- **特点**：标记为压缩，不实际删除
- **索引**：需要提供要删除的消息索引

#### replace 操作
- **用途**：替换消息
- **特点**：标记旧消息为压缩，插入新消息
- **数据**：需要提供新消息

#### compress 操作
- **用途**：压缩消息
- **特点**：标记为压缩，减少 Token 使用
- **索引**：需要提供要压缩的消息索引

#### batch_start 操作
- **用途**：开始新批次
- **特点**：创建新的批次边界
- **索引**：需要提供边界索引

#### batch_end 操作
- **用途**：结束批次
- **特点**：回退到指定批次
- **批次**：需要提供目标批次号

## 五、使用场景

### 1. 临时消息管理

```typescript
// 场景：添加临时提示，完成任务后删除
const handler = new ContextProcessorNodeHandler();

// 开始新批次（添加临时提示）
await handler.handleContextOperation(
  conversationManager,
  'batch_start',
  [5]  // 从索引5开始新批次
);

// 添加临时提示
await handler.handleContextOperation(
  conversationManager,
  'insert',
  [],
  { role: 'system', content: '临时提示：请专注于当前任务' }
);

// 执行任务...

// 结束批次（删除临时提示）
await handler.handleContextOperation(
  conversationManager,
  'batch_end',
  [0]  // 回退到批次0
);
```

### 2. 消息替换

```typescript
// 场景：替换有问题的消息
await handler.handleContextOperation(
  conversationManager,
  'replace',
  [3],  // 替换索引3的消息
  { role: 'user', content: '修正后的消息' }
);
```

### 3. 批量压缩

```typescript
// 场景：压缩旧消息
await handler.handleContextOperation(
  conversationManager,
  'compress',
  [0, 1, 2, 3]  // 压缩索引0-3的消息
);
```

## 六、实现细节

### 1. 索引标记机制

#### 标记压缩
```typescript
function markCompressed(indices: number[]): void {
  // 找到当前批次对应的边界
  const currentBoundaryIndex = this.markMap.boundaryToBatch.indexOf(this.markMap.currentBatch);
  const boundary = this.markMap.batchBoundaries[currentBoundaryIndex];
  
  // 标记索引小于边界的消息为已修改
  for (const index of indices) {
    if (index < boundary) {
      // 标记为已修改
      this.markModified(index);
    }
  }
}
```

#### 判断修改状态
```typescript
function isModified(originalIndex: number): boolean {
  const currentBoundaryIndex = this.markMap.boundaryToBatch.indexOf(this.markMap.currentBatch);
  const boundary = this.markMap.batchBoundaries[currentBoundaryIndex];
  return originalIndex < boundary;
}
```

### 2. 消息访问控制

#### 获取未压缩消息
```typescript
function getUncompressedMessages(): LLMMessage[] {
  const currentBoundaryIndex = this.markMap.boundaryToBatch.indexOf(this.markMap.currentBatch);
  const boundary = this.markMap.batchBoundaries[currentBoundaryIndex];
  
  return this.markMap.originalIndices
    .filter(index => index >= boundary)
    .map(index => this.messages[index]);
}
```

#### 获取所有消息
```typescript
function getAllMessages(): LLMMessage[] {
  return [...this.messages];
}
```

### 3. 批次管理

#### 开始新批次
```typescript
function startNewBatch(boundaryIndex: number): void {
  // 验证边界索引
  if (boundaryIndex < 0 || boundaryIndex >= this.messages.length) {
    throw new Error('Invalid boundary index');
  }
  
  // 添加新边界
  this.markMap.batchBoundaries.push(boundaryIndex);
  
  // 分配新批次号
  const newBatch = this.markMap.currentBatch + 1;
  this.markMap.boundaryToBatch.push(newBatch);
  this.markMap.currentBatch = newBatch;
}
```

#### 结束批次
```typescript
function endBatch(targetBatch: number): void {
  // 验证目标批次
  if (!this.markMap.boundaryToBatch.includes(targetBatch)) {
    throw new Error('Target batch not found');
  }
  
  // 回退到目标批次
  this.rollbackToBatch(targetBatch);
}
```

## 七、错误处理

### 1. 操作验证

```typescript
function validateOperation(
  operation: ContextModificationOperation,
  indices: number[],
  data?: any
): void {
  // 验证操作类型
  if (!['insert', 'delete', 'replace', 'compress', 'batch_start', 'batch_end'].includes(operation)) {
    throw new Error(`Invalid operation: ${operation}`);
  }
  
  // 验证索引
  if (indices.some(index => index < 0 || index >= this.messages.length)) {
    throw new Error('Invalid indices');
  }
  
  // 验证数据
  if (['insert', 'replace'].includes(operation) && !data) {
    throw new Error('Data required for insert and replace operations');
  }
  
  // 验证批次
  if (['batch_start', 'batch_end'].includes(operation) && indices.length !== 1) {
    throw new Error('Single index required for batch operations');
  }
}
```

### 2. 状态一致性检查

```typescript
function checkConsistency(): boolean {
  // 检查边界数组长度
  if (this.markMap.batchBoundaries.length !== this.markMap.boundaryToBatch.length) {
    return false;
  }
  
  // 检查边界索引顺序
  for (let i = 1; i < this.markMap.batchBoundaries.length; i++) {
    if (this.markMap.batchBoundaries[i] <= this.markMap.batchBoundaries[i - 1]) {
      return false;
    }
  }
  
  // 检查当前批次
  if (!this.markMap.boundaryToBatch.includes(this.markMap.currentBatch)) {
    return false;
  }
  
  return true;
}
```

## 八、性能优化

### 1. 批量操作

```typescript
// 批量处理多个操作
async handleBatchOperations(
  conversationManager: ConversationManager,
  operations: ContextModificationConfig[]
): Promise<void> {
  for (const operation of operations) {
    await this.handleContextOperation(
      conversationManager,
      operation.operation,
      operation.indices,
      operation.data
    );
  }
}
```

### 2. 索引优化

```typescript
// 使用二分查找优化边界查找
function findBoundaryIndex(batch: number): number {
  return this.markMap.boundaryToBatch.findIndex(b => b === batch);
}
```

### 3. 内存管理

```typescript
// 定期清理压缩的消息
function cleanupCompressedMessages(): void {
  const currentBoundaryIndex = this.markMap.boundaryToBatch.indexOf(this.markMap.currentBatch);
  const boundary = this.markMap.batchBoundaries[currentBoundaryIndex];
  
  // 移除边界之前的消息
  this.messages = this.messages.slice(boundary);
  
  // 更新索引
  this.markMap.originalIndices = this.markMap.originalIndices
    .map(index => index - boundary)
    .filter(index => index >= 0);
  
  // 更新边界
  this.markMap.batchBoundaries = this.markMap.batchBoundaries
    .map(b => b - boundary)
    .filter(b => b >= 0);
}
```

## 九、使用示例

### 1. 完整工作流

```typescript
// 创建上下文处理节点
const handler = new ContextProcessorNodeHandler();

// 初始状态
const conversationManager = new ConversationManager({
  tokenLimit: 8000,
  compressionConfig: {
    enabled: true,
    threshold: 6000,
    targetTokens: 4000
  }
});

// 添加初始消息
conversationManager.addMessage({ role: 'user', content: 'Hello' });
conversationManager.addMessage({ role: 'assistant', content: 'Hi there!' });

// 开始新批次（添加临时提示）
await handler.handleContextOperation(
  conversationManager,
  'batch_start',
  [2]  // 从索引2开始新批次
);

// 添加临时提示
await handler.handleContextOperation(
  conversationManager,
  'insert',
  [],
  { role: 'system', content: '请专注于当前任务' }
);

// 执行任务...

// 结束批次（删除临时提示）
await handler.handleContextOperation(
  conversationManager,
  'batch_end',
  [0]  // 回退到批次0
);

// 压缩旧消息
await handler.handleContextOperation(
  conversationManager,
  'compress',
  [0, 1]  // 压缩索引0-1的消息
);

// 回退操作
handler.rollbackContextOperation(conversationManager, 0);
```

### 2. 批量操作

```typescript
// 批量处理多个操作
const operations: ContextModificationConfig[] = [
  {
    operation: 'batch_start',
    indices: [5]
  },
  {
    operation: 'insert',
    indices: [],
    data: { role: 'system', content: '临时提示' }
  },
  {
    operation: 'compress',
    indices: [0, 1, 2]
  },
  {
    operation: 'batch_end',
    indices: [0]
  }
];

await handler.handleBatchOperations(conversationManager, operations);
```

## 十、总结

本设计方案提供了一个完整的上下文修改框架，具有以下特点：

1. **灵活的修改操作**：支持插入、删除、替换、压缩等多种操作
2. **批次循环支持**：支持批次循环（0-1-0）模式，管理临时消息
3. **完整的回退机制**：支持回退到任意批次，保证数据一致性
4. **索引一致性**：通过边界和批次管理，保证消息索引的一致性
5. **性能优化**：批量操作、索引优化、内存管理等性能优化措施

通过这个设计，SDK 可以有效地管理对话上下文，支持复杂的修改操作，同时保证数据的完整性和一致性。