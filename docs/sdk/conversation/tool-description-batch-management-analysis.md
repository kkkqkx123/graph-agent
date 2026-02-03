# 工具描述提示词基于Batch的管理方案分析

## 问题背景

当前 `sdk/core/execution/managers/conversation-manager.ts` 模块中的工具描述提示词初始化存在设计问题。工具描述在模块初始化时完成初始化，但由于消息更新是基于索引的，当上下文处理节点清空提示词消息并创建新的batch时，会导致工具描述提示词无法重新获取。

## 问题分析

### 当前设计流程

1. **ThreadBuilder.build()** → 创建 `ConversationManager` 实例
2. **ConversationManager.constructor()** → 调用 `initializeToolDescriptions()`
3. **initializeToolDescriptions()** → 添加工具描述消息到 `messages` 数组
4. **上下文处理节点操作** → 调用 `handleClearOperation()` 
5. **handleClearOperation()** → 调用 `conversationManager.setOriginalIndices([0])` 和 `startNewBatch(0)`
6. **问题出现**：工具描述消息被过滤掉且无法重新生成

### 根本原因

- **时机错误**：工具描述在初始化时添加，但后续的batch操作会改变消息可见性
- **状态耦合**：工具描述与具体的消息索引绑定，而不是与工作流配置绑定  
- **缺乏重新生成机制**：一旦工具描述消息丢失，没有途径重新生成

### 工具类型区分

根据需求澄清，工具分为两种类型：

- **initial 工具**：工作流预定义的工具，需要在每个 batch 中都保证可用
- **dynamicTools**：执行过程中动态注入的工具，与其他消息同等处理，不需要特殊保证

## 解决方案设计

### 核心原则

1. **只保证 initial 工具的描述在每个 batch 中可用**
2. **dynamicTools 按照普通消息处理，不特殊处理**  
3. **工具描述消息应该能够被正确地重新生成和注入**

### 具体实现方案

#### 1. ConversationManager 修改

**移除构造函数中的初始化调用**
```typescript
// 移除这行代码
// this.initializeToolDescriptions();
```

**添加工具描述存在性检查方法**
```typescript
/**
 * 检查是否已经存在工具描述消息
 * @returns 是否存在工具描述消息
 */
private hasToolDescriptionMessage(): boolean {
  const allMessages = this.getAllMessages();
  return allMessages.some(msg => 
    msg.role === 'system' && 
    typeof msg.content === 'string' && 
    msg.content.startsWith('可用工具:')
  );
}
```

**添加初始工具描述生成方法**
```typescript
/**
 * 获取初始可用工具的描述消息（不包含 dynamicTools）
 * @returns 工具描述消息，如果没有初始工具则返回 null
 */
getInitialToolDescriptionMessage(): LLMMessage | null {
  if (!this.availableTools || !this.toolService) {
    return null;
  }
  
  // 只使用 initial 工具集合
  const initialToolIds = Array.from(this.availableTools.initial);
  if (initialToolIds.length === 0) {
    return null;
  }

  // 构建工具描述
  const toolDescriptions = initialToolIds
    .map(id => {
      const tool = this.toolService.getTool(id);
      if (!tool) return null;
      return `- ${tool.name}: ${tool.description}`;
    })
    .filter(Boolean)
    .join('\n');

  if (toolDescriptions.length > 0) {
    return {
      role: 'system' as const,
      content: `可用工具:\n${toolDescriptions}`
    };
  }
  
  return null;
}
```

**实现批量开始时的工具描述注入机制**
```typescript
/**
 * 在新批次开始时添加初始工具描述（如果不存在）
 * @param boundaryIndex 批次边界索引
 */
startNewBatchWithInitialTools(boundaryIndex: number): void {
  // 开始新批次
  this.indexManager.startNewBatch(boundaryIndex);
  
  // 检查是否已存在工具描述消息
  if (!this.hasToolDescriptionMessage()) {
    // 添加初始工具描述消息
    const toolDescMessage = this.getInitialToolDescriptionMessage();
    if (toolDescMessage) {
      this.addMessage(toolDescMessage);
    }
  }
}
```

#### 2. 上下文处理器操作修改

**更新 handleClearOperation 方法**
```typescript
export function handleClearOperation(
  conversationManager: any,
  config: ContextProcessorExecutionData['clear']
): void {
  const keepSystemMessage = config?.keepSystemMessage ?? true;
  const allMessages = conversationManager.getAllMessages();

  if (keepSystemMessage) {
    // 找到所有的系统消息（包括工具描述）
    const systemMessageIndices = allMessages
      .map((msg: any, index: number) => msg.role === 'system' ? index : -1)
      .filter(index => index !== -1);
    
    if (systemMessageIndices.length > 0) {
      // 保留所有系统消息
      conversationManager.setOriginalIndices(systemMessageIndices);
      // 开始新批次（工具描述如果存在就保留，不存在就添加）
      conversationManager.startNewBatchWithInitialTools(Math.min(...systemMessageIndices));
    } else {
      // 清空所有消息，重新添加初始工具描述
      conversationManager.getIndexManager().reset();
      conversationManager.startNewBatchWithInitialTools(0);
    }
  } else {
    // 清空所有消息，重新添加初始工具描述
    conversationManager.getIndexManager().reset();
    conversationManager.startNewBatchWithInitialTools(0);
  }
}
```

#### 3. ThreadBuilder 修改

**更新 buildFromProcessedDefinition 方法**
```typescript
// 在创建 ThreadContext 后显式初始化工具描述
const threadContext = new ThreadContext(/* ... */);

// 初始化变量
threadContext.initializeVariables();

// 注册工作流触发器
this.registerWorkflowTriggers(threadContext, processedWorkflow);

// 初始化初始工具描述（如果需要）
conversationManager.startNewBatchWithInitialTools(0);

return threadContext;
```

## 边界情况处理

### 1. 工具描述消息重复问题
- 通过 `hasToolDescriptionMessage()` 方法检测是否已存在
- 只在不存在时才添加，避免重复

### 2. 系统消息混合问题  
- 支持多种系统消息共存
- 工具描述消息有特定标识（"可用工具:"前缀）

### 3. 无初始工具的工作流
- 当 `availableTools.initial` 为空时，不添加工具描述消息
- 完全兼容现有无工具的工作流

## 测试场景

1. **正常工作流启动**：正确添加初始工具描述
2. **清空操作保留系统消息**：保留现有工具描述或重新添加  
3. **清空操作不保留系统消息**：重新添加工具描述
4. **多次批量操作**：不会重复添加工具描述
5. **无初始工具的工作流**：不添加工具描述消息
6. **动态工具添加**：不影响初始工具描述管理

## 向后兼容性

- **现有 dynamicTools 功能不受影响**：dynamicTools 仍按普通消息处理
- **API 接口保持不变**：只修改内部实现，不改变外部接口
- **现有工作流无需修改**：自动适配新机制

## 性能影响

- **轻微性能开销**：动态生成工具描述会有轻微开销
- **可接受范围**：考虑到工具数量通常不多，这是可以接受的
- **缓存优化**：可以在后续版本中添加缓存机制进一步优化

## 实施步骤

1. 修改 `ConversationManager` 构造函数，移除初始化时的工具描述添加
2. 添加动态初始工具描述生成方法 `getInitialToolDescriptionMessage()`
3. 实现工具描述存在性检查方法 `hasToolDescriptionMessage()`
4. 实现批量开始时的初始工具描述注入机制 `startNewBatchWithInitialTools()`
5. 更新上下文处理器操作以支持新的初始工具描述管理
6. 更新 `ThreadBuilder` 以正确初始化初始工具描述
7. 编写测试用例验证新方案的正确性
8. 更新相关文档和注释

## 预期效果

- **解决原始问题**：工具描述提示词在batch操作后能够正确重新获取
- **保持功能完整性**：initial 工具描述在每个batch中都可用
- **简化维护**：工具描述管理逻辑更加清晰和可靠
- **提高稳定性**：避免因消息索引变化导致的工具描述丢失问题