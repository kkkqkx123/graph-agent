# 消息类型分离管理设计方案

## 一、问题分析

### 1.1 当前架构

**核心组件：**
- [`ConversationManager`](sdk/core/execution/managers/conversation-manager.ts:70): 使用单一 `messages: LLMMessage[]` 数组存储所有消息
- [`MessageIndexManager`](sdk/core/execution/managers/message-index-manager.ts:18): 维护 `originalIndices` 数组跟踪可见消息索引

**消息类型（4种）：**
```typescript
type LLMMessageRole = 'system' | 'user' | 'assistant' | 'tool';
```

### 1.2 存在的问题

#### 问题1：没有按类型分离存储
- 所有消息混在一个数组中，无法独立操作不同类型消息
- 例如：无法快速获取"最近3条用户消息"

#### 问题2：过滤操作效率低
```typescript
// 当前实现：需要遍历整个数组
filterMessagesByRole(role: string): LLMMessage[] {
  return this.messages.filter(msg => msg.role === role).map(msg => ({ ...msg }));
}
```

#### 问题3：上下文操作节点功能受限
[`context-processor-handler.ts`](sdk/core/execution/handlers/node-handlers/context-processor-handler.ts:248) 中的操作：
- `getRecentMessages(n)`: 无法按类型过滤
- `getMessagesByRange(start, end)`: 无法按类型过滤
- `filter` 操作：虽然支持 `roles` 过滤，但基于当前可见消息，不够灵活

#### 问题4：索引管理复杂
- `MessageIndexManager` 只维护一个 `originalIndices` 数组
- 无法区分不同类型消息的索引关系
- 批次压缩时难以保留特定类型消息

## 二、设计方案

### 2.1 核心思路

**为每种消息类型创建独立的索引数组，同时维护全局消息数组和类型索引映射。**

### 2.2 数据结构设计

#### 2.2.1 扩展 MessageMarkMap

```typescript
export interface MessageMarkMap {
  /** 消息原始索引列表（全局） */
  originalIndices: number[];
  
  /** 按类型分组的索引列表 */
  typeIndices: {
    system: number[];
    user: number[];
    assistant: number[];
    tool: number[];
  };
  
  /** 修改边界索引数组 */
  batchBoundaries: number[];
  
  /** 边界对应批次数组 */
  boundaryToBatch: number[];
  
  /** 当前批次 */
  currentBatch: number;
}
```

#### 2.2.2 新增类型索引管理器

创建 `TypeIndexManager` 类，专门管理按类型分组的索引：

```typescript
export class TypeIndexManager {
  /** 按类型分组的索引映射 */
  private typeIndices: Map<LLMMessageRole, number[]> = new Map();
  
  /** 全局消息总数 */
  private totalMessages: number = 0;
  
  /**
   * 添加消息索引
   * @param role 消息角色
   * @param index 消息索引
   */
  addIndex(role: LLMMessageRole, index: number): void {
    if (!this.typeIndices.has(role)) {
      this.typeIndices.set(role, []);
    }
    this.typeIndices.get(role)!.push(index);
    this.totalMessages++;
  }
  
  /**
   * 获取指定类型的索引列表
   * @param role 消息角色
   * @returns 索引数组
   */
  getIndicesByRole(role: LLMMessageRole): number[] {
    return [...(this.typeIndices.get(role) || [])];
  }
  
  /**
   * 获取指定类型的最近N条消息索引
   * @param role 消息角色
   * @param n 消息数量
   * @returns 索引数组
   */
  getRecentIndicesByRole(role: LLMMessageRole, n: number): number[] {
    const indices = this.typeIndices.get(role) || [];
    return indices.slice(-n);
  }
  
  /**
   * 获取指定类型的索引范围
   * @param role 消息角色
   * @param start 起始位置（在类型数组中的位置）
   * @param end 结束位置（在类型数组中的位置）
   * @returns 索引数组
   */
  getRangeIndicesByRole(role: LLMMessageRole, start: number, end: number): number[] {
    const indices = this.typeIndices.get(role) || [];
    return indices.slice(start, end);
  }
  
  /**
   * 获取所有类型索引
   * @returns 类型索引映射
   */
  getAllTypeIndices(): Map<LLMMessageRole, number[]> {
    const result = new Map<LLMMessageRole, number[]>();
    for (const [role, indices] of this.typeIndices) {
      result.set(role, [...indices]);
    }
    return result;
  }
  
  /**
   * 克隆类型索引管理器
   */
  clone(): TypeIndexManager {
    const cloned = new TypeIndexManager();
    cloned.typeIndices = this.getAllTypeIndices();
    cloned.totalMessages = this.totalMessages;
    return cloned;
  }
  
  /**
   * 重置
   */
  reset(): void {
    this.typeIndices.clear();
    this.totalMessages = 0;
  }
}
```

### 2.3 ConversationManager 扩展

#### 2.3.1 添加 TypeIndexManager 实例

```typescript
export class ConversationManager implements LifecycleCapable<ConversationState> {
  private messages: LLMMessage[] = [];
  private tokenUsageTracker: TokenUsageTracker;
  private indexManager: MessageIndexManager;
  private typeIndexManager: TypeIndexManager; // 新增
  // ... 其他属性
}
```

#### 2.3.2 修改 addMessage 方法

```typescript
addMessage(message: LLMMessage): number {
  // 验证消息格式
  if (!message.role || !message.content) {
    throw new ValidationError('Invalid message format: role and content are required', 'message');
  }

  // 将消息追加到数组末尾
  this.messages.push({ ...message });
  const newIndex = this.messages.length - 1;

  // 同步更新索引
  this.indexManager.addIndex(newIndex);
  
  // 同步更新类型索引
  this.typeIndexManager.addIndex(message.role, newIndex);

  return this.messages.length;
}
```

#### 2.3.3 新增按类型查询方法

```typescript
/**
 * 获取指定类型的所有消息
 * @param role 消息角色
 * @returns 消息数组
 */
getMessagesByRole(role: LLMMessageRole): LLMMessage[] {
  const indices = this.typeIndexManager.getIndicesByRole(role);
  return indices.map(index => ({ ...this.messages[index] }));
}

/**
 * 获取指定类型的最近N条消息
 * @param role 消息角色
 * @param n 消息数量
 * @returns 消息数组
 */
getRecentMessagesByRole(role: LLMMessageRole, n: number): LLMMessage[] {
  const indices = this.typeIndexManager.getRecentIndicesByRole(role, n);
  return indices.map(index => ({ ...this.messages[index] }));
}

/**
 * 获取指定类型的索引范围消息
 * @param role 消息角色
 * @param start 起始位置（在类型数组中的位置）
 * @param end 结束位置（在类型数组中的位置）
 * @returns 消息数组
 */
getMessagesByRoleRange(role: LLMMessageRole, start: number, end: number): LLMMessage[] {
  const indices = this.typeIndexManager.getRangeIndicesByRole(role, start, end);
  return indices.map(index => ({ ...this.messages[index] }));
}

/**
 * 获取指定类型的消息数量
 * @param role 消息角色
 * @returns 消息数量
 */
getMessageCountByRole(role: LLMMessageRole): number {
  return this.typeIndexManager.getIndicesByRole(role).length;
}
```

### 2.4 上下文操作节点扩展

#### 2.4.1 扩展 ContextProcessorNodeConfig

```typescript
export interface ContextProcessorNodeConfig {
  /** 操作类型 */
  operation: 'truncate' | 'insert' | 'replace' | 'clear' | 'filter';
  
  /** 截断操作配置 */
  truncate?: {
    keepFirst?: number;
    keepLast?: number;
    removeFirst?: number;
    removeLast?: number;
    range?: { start: number; end: number };
    // 新增：按类型过滤
    role?: LLMMessageRole;
  };
  
  /** 插入操作配置 */
  insert?: {
    position: number;
    messages: LLMMessage[];
  };
  
  /** 替换操作配置 */
  replace?: {
    index: number;
    message: LLMMessage;
  };
  
  /** 过滤操作配置 */
  filter?: {
    roles?: ('system' | 'user' | 'assistant' | 'tool')[];
    contentContains?: string[];
    contentExcludes?: string[];
  };
  
  /** 清空操作配置 */
  clear?: {
    keepSystemMessage?: boolean;
  };
}
```

#### 2.4.2 扩展截断操作支持类型过滤

```typescript
function handleTruncateOperation(
  conversationManager: any,
  config: any
): void {
  if (!config) {
    throw new ValidationError('Truncate configuration is required', 'config');
  }

  // 如果指定了角色，使用类型索引
  if (config.role) {
    const typeIndices = conversationManager.getTypeIndexManager().getIndicesByRole(config.role);
    
    // 基于类型索引进行截断操作
    let filteredIndices = [...typeIndices];
    
    if (config.keepFirst !== undefined) {
      filteredIndices = filteredIndices.slice(0, config.keepFirst);
    }
    
    if (config.keepLast !== undefined) {
      filteredIndices = filteredIndices.slice(-config.keepLast);
    }
    
    if (config.removeFirst !== undefined) {
      filteredIndices = filteredIndices.slice(config.removeFirst);
    }
    
    if (config.removeLast !== undefined) {
      filteredIndices = filteredIndices.slice(0, -config.removeLast || undefined);
    }
    
    if (config.range) {
      filteredIndices = filteredIndices.slice(config.range.start, config.range.end);
    }
    
    // 更新索引管理器（只保留指定类型的消息）
    conversationManager.setOriginalIndices(filteredIndices);
    
    // 开始新批次
    if (filteredIndices.length > 0) {
      const boundaryIndex = Math.min(...filteredIndices);
      conversationManager.getIndexManager().startNewBatch(boundaryIndex);
    } else {
      conversationManager.getIndexManager().reset();
    }
  } else {
    // 原有逻辑：基于当前可见消息
    const currentIndices = conversationManager.getMarkMap().originalIndices;
    let newIndices = [...currentIndices];
    
    // ... 原有截断逻辑
  }
}
```

#### 2.4.3 新增获取最近N条消息的方法

```typescript
/**
 * 获取最近N条消息（支持按类型过滤）
 * @param conversationManager 会话管理器
 * @param n 消息数量
 * @param role 可选的消息角色
 * @returns 消息数组
 */
function getRecentMessages(
  conversationManager: any,
  n: number,
  role?: LLMMessageRole
): LLMMessage[] {
  if (role) {
    return conversationManager.getRecentMessagesByRole(role, n);
  } else {
    return conversationManager.getRecentMessages(n);
  }
}
```

## 三、优势分析

### 3.1 性能提升
- **O(1) 查询**：按类型查询消息无需遍历整个数组
- **高效过滤**：`getRecentMessagesByRole('user', 3)` 直接从类型索引获取，时间复杂度 O(1)

### 3.2 功能增强
- **独立操作**：可以独立操作不同类型消息
- **灵活过滤**：支持"最近3条用户消息"、"前5条助手消息"等场景
- **批次压缩优化**：压缩时可以保留特定类型消息（如保留所有系统消息）

### 3.3 代码清晰
- **职责分离**：`TypeIndexManager` 专门管理类型索引
- **易于维护**：类型索引逻辑集中管理
- **向后兼容**：保留原有方法，新增方法不影响现有代码

## 四、实施步骤

### 步骤1：创建 TypeIndexManager
- 文件：`sdk/core/execution/managers/type-index-manager.ts`
- 实现类型索引管理逻辑

### 步骤2：扩展 MessageMarkMap
- 文件：`packages/types/src/llm.ts`
- 添加 `typeIndices` 字段

### 步骤3：修改 ConversationManager
- 文件：`sdk/core/execution/managers/conversation-manager.ts`
- 集成 `TypeIndexManager`
- 修改 `addMessage` 方法
- 新增按类型查询方法

### 步骤4：扩展上下文操作节点
- 文件：`sdk/core/execution/handlers/node-handlers/context-processor-handler.ts`
- 扩展 `truncate` 操作支持类型过滤
- 新增 `getRecentMessages` 支持类型参数

### 步骤5：更新测试
- 文件：`sdk/core/execution/managers/__tests__/conversation-manager.test.ts`
- 文件：`sdk/core/execution/managers/__tests__/type-index-manager.test.ts`（新建）
- 添加类型索引相关测试用例

### 步骤6：更新文档
- 更新 API 文档
- 添加使用示例

## 五、使用示例

### 示例1：获取最近3条用户消息

```typescript
// 之前：需要遍历所有消息
const allMessages = conversationManager.getMessages();
const recentUserMessages = allMessages
  .filter(msg => msg.role === 'user')
  .slice(-3);

// 现在：直接获取
const recentUserMessages = conversationManager.getRecentMessagesByRole('user', 3);
```

### 示例2：上下文操作节点 - 保留最近5条用户消息

```typescript
// 配置
{
  "operation": "truncate",
  "truncate": {
    "role": "user",
    "keepLast": 5
  }
}
```

### 示例3：获取所有系统消息

```typescript
const systemMessages = conversationManager.getMessagesByRole('system');
```

### 示例4：获取第2-5条助手消息

```typescript
const assistantMessages = conversationManager.getMessagesByRoleRange('assistant', 1, 5);
```

## 六、注意事项

### 6.1 索引一致性
- 添加消息时同步更新 `MessageIndexManager` 和 `TypeIndexManager`
- 删除/压缩消息时需要同时更新两个索引管理器

### 6.2 批次压缩
- 压缩操作需要考虑类型索引的更新
- 建议在 `TypeIndexManager` 中添加 `removeIndices` 方法

### 6.3 性能考虑
- 类型索引数组会占用额外内存
- 对于消息量很大的场景，需要评估内存开销

### 6.4 向后兼容
- 保留原有的 `filterMessagesByRole` 方法
- 新增方法不影响现有功能

## 七、后续优化方向

### 7.1 支持复合类型过滤
```typescript
// 获取最近3条用户或助手消息
getRecentMessagesByRoles(['user', 'assistant'], 3);
```

### 7.2 支持时间范围过滤
```typescript
// 获取最近1小时内的用户消息
getMessagesByRoleAndTimeRange('user', startTime, endTime);
```

### 7.3 支持消息标记
```typescript
// 标记重要消息
markMessage(index, 'important');

// 获取所有标记为重要的用户消息
getMarkedMessagesByRole('user', 'important');