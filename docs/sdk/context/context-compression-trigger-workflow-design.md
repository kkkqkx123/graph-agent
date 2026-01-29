# 上下文压缩设计（基于触发器+子工作流）

## 概述

本文档描述了基于触发器+子工作流的上下文压缩设计方案。该方案利用现有的触发器系统和子工作流机制，实现灵活、可扩展的上下文压缩功能。

## 一、设计目标

### 1. 核心目标
- **事件驱动**：通过 `TOKEN_LIMIT_EXCEEDED` 事件触发压缩
- **工作流化**：使用子工作流实现压缩逻辑
- **灵活性**：支持自定义压缩策略
- **可扩展性**：易于添加新的压缩算法

### 2. 设计原则
- **职责分离**：ConversationManager 只管理状态，压缩逻辑由子工作流处理
- **事件驱动**：使用触发器监听事件，启动子工作流
- **数据传递**：通过输入输出传递压缩上下文
- **异步执行**：子工作流异步执行，不阻塞主流程

## 二、架构设计

### 1. 整体架构

```
ConversationManager (状态管理)
    ↓ 触发 TOKEN_LIMIT_EXCEEDED 事件
EventManager (事件分发)
    ↓ 事件监听
TriggerManager (触发器管理)
    ↓ 匹配触发器
StartWorkflowHandler (启动子工作流)
    ↓ 传递压缩上下文
CompressionWorkflow (压缩子工作流)
    ↓ 执行压缩逻辑
CompressionResult (压缩结果)
    ↓ 返回结果
ConversationManager (更新状态)
```

### 2. 核心组件

#### ConversationManager
- 管理消息历史和索引
- 触发 `TOKEN_LIMIT_EXCEEDED` 事件
- 接收压缩结果并更新状态

#### TriggerManager
- 监听 `TOKEN_LIMIT_EXCEEDED` 事件
- 匹配压缩触发器
- 启动压缩子工作流

#### CompressionWorkflow
- 接收压缩上下文（消息、索引、配置）
- 执行压缩逻辑
- 返回压缩结果

## 三、实现方案

### 1. 事件触发

#### TOKEN_LIMIT_EXCEEDED 事件
```typescript
export interface TokenLimitExceededEvent extends BaseEvent {
  type: EventType.TOKEN_LIMIT_EXCEEDED;
  /** 当前使用的 Token 数量 */
  tokensUsed: number;
  /** Token 限制阈值 */
  tokenLimit: number;
  /** 线程ID */
  threadId: string;
  /** 工作流ID */
  workflowId: string;
}
```

#### 触发器配置
```typescript
{
  id: 'compression-trigger',
  name: '上下文压缩触发器',
  type: TriggerType.EVENT,
  condition: {
    eventType: EventType.TOKEN_LIMIT_EXCEEDED
  },
  action: {
    type: TriggerActionType.START_WORKFLOW,
    parameters: {
      workflowId: 'compression-workflow',
      input: {
        source: 'event',
        fields: ['threadId', 'workflowId', 'tokensUsed', 'tokenLimit']
      }
    }
  }
}
```

### 2. 压缩上下文传递

#### 压缩上下文接口
```typescript
export interface CompressionContext {
  /** 线程ID */
  threadId: string;
  /** 工作流ID */
  workflowId: string;
  /** 消息数组 */
  messages: LLMMessage[];
  /** 消息索引映射 */
  markMap: MessageMarkMap;
  /** Token使用情况 */
  tokensUsed: number;
  /** Token限制 */
  tokenLimit: number;
  /** 压缩配置 */
  compressionConfig?: {
    strategy: string;
    parameters: Record<string, any>;
  };
}
```

#### 压缩结果接口
```typescript
export interface CompressionResult {
  /** 压缩后的消息数组 */
  messages: LLMMessage[];
  /** 更新后的索引映射 */
  markMap: MessageMarkMap;
  /** 压缩统计 */
  stats: {
    originalCount: number;
    compressedCount: number;
    tokensSaved: number;
  };
}
```

### 3. 子工作流设计

#### 压缩工作流结构
```
START
  ↓
获取压缩上下文 (Variable节点)
  ↓
选择压缩策略 (Route节点)
  ↓
执行压缩 (Code节点)
  ↓
返回压缩结果 (END节点)
```

#### 压缩策略节点
```typescript
// Code节点实现
export async function compressMessages(context: CompressionContext): Promise<CompressionResult> {
  const { messages, markMap, compressionConfig } = context;
  
  // 根据策略选择压缩算法
  switch (compressionConfig?.strategy) {
    case 'keep_recent':
      return keepRecentStrategy(messages, markMap, compressionConfig.parameters);
    case 'keep_system_recent':
      return keepSystemAndRecentStrategy(messages, markMap, compressionConfig.parameters);
    case 'sliding_window':
      return slidingWindowStrategy(messages, markMap, compressionConfig.parameters);
    default:
      return noOpStrategy(messages, markMap);
  }
}
```

### 4. 结果回传

#### 回调机制
```typescript
// 在压缩工作流的END节点中
export function returnCompressionResult(result: CompressionResult) {
  // 通过事件管理器发送压缩完成事件
  const event: CompressionCompletedEvent = {
    type: EventType.COMPRESSION_COMPLETED,
    threadId: result.threadId,
    workflowId: result.workflowId,
    result: result
  };
  
  eventManager.emit(event);
}
```

#### 更新ConversationManager
```typescript
// 监听压缩完成事件
eventManager.on(EventType.COMPRESSION_COMPLETED, async (event) => {
  const { threadId, result } = event;
  
  // 获取ConversationManager
  const conversationManager = getConversationManager(threadId);
  
  // 更新消息和索引
  conversationManager.updateMessages(result.messages);
  conversationManager.updateMarkMap(result.markMap);
});
```

## 四、实现步骤

### 第一阶段：类型定义
1. 定义 `CompressionContext` 接口
2. 定义 `CompressionResult` 接口
3. 添加 `COMPRESSION_COMPLETED` 事件类型

### 第二阶段：触发器扩展
1. 添加 `START_WORKFLOW` 触发器动作类型
2. 实现 `StartWorkflowHandler`
3. 支持从事件中提取数据作为工作流输入

### 第三阶段：压缩工作流
1. 创建压缩工作流定义
2. 实现各种压缩策略
3. 实现结果回传逻辑

### 第四阶段：集成测试
1. 测试事件触发
2. 测试子工作流启动
3. 测试结果回传
4. 测试状态更新

## 五、使用示例

### 1. 注册压缩触发器
```typescript
const trigger: Trigger = {
  id: 'compression-trigger',
  name: '上下文压缩触发器',
  type: TriggerType.EVENT,
  condition: {
    eventType: EventType.TOKEN_LIMIT_EXCEEDED
  },
  action: {
    type: TriggerActionType.START_WORKFLOW,
    parameters: {
      workflowId: 'compression-workflow',
      input: {
        source: 'event',
        fields: ['threadId', 'workflowId', 'tokensUsed', 'tokenLimit']
      }
    }
  },
  status: TriggerStatus.ENABLED
};

triggerManager.register(trigger);
```

### 2. 创建压缩工作流
```typescript
const compressionWorkflow: WorkflowDefinition = {
  id: 'compression-workflow',
  name: '上下文压缩工作流',
  nodes: [
    {
      id: 'start',
      type: NodeType.START,
      data: {}
    },
    {
      id: 'get-context',
      type: NodeType.VARIABLE,
      data: {
        variable: 'compressionContext',
        expression: 'input'
      }
    },
    {
      id: 'compress',
      type: NodeType.CODE,
      data: {
        code: `
          const { messages, markMap, compressionConfig } = compressionContext;
          // 执行压缩逻辑
          return compressMessages(messages, markMap, compressionConfig);
        `
      }
    },
    {
      id: 'end',
      type: NodeType.END,
      data: {
        output: 'result'
      }
    }
  ],
  edges: [
    { from: 'start', to: 'get-context' },
    { from: 'get-context', to: 'compress' },
    { from: 'compress', to: 'end' }
  ]
};
```

### 3. 监听压缩完成事件
```typescript
eventManager.on(EventType.COMPRESSION_COMPLETED, async (event) => {
  const { threadId, result } = event;
  const conversationManager = getConversationManager(threadId);
  
  conversationManager.updateMessages(result.messages);
  conversationManager.updateMarkMap(result.markMap);
  
  console.log(`压缩完成: ${result.stats.originalCount} -> ${result.stats.compressedCount}`);
});
```

## 六、优势分析

### 1. 职责分离
- ConversationManager 只管理状态
- 压缩逻辑由子工作流处理
- 触发器负责事件监听和流程启动

### 2. 灵活性
- 可以通过修改工作流定义来改变压缩策略
- 支持多种压缩算法
- 易于扩展新的压缩策略

### 3. 可测试性
- 压缩逻辑独立，易于单元测试
- 可以模拟事件触发
- 可以独立测试压缩工作流

### 4. 可维护性
- 清晰的架构层次
- 每个组件职责明确
- 易于理解和维护

## 七、注意事项

### 1. 性能考虑
- 子工作流异步执行，不阻塞主流程
- 避免频繁触发压缩
- 考虑压缩结果的缓存

### 2. 错误处理
- 压缩失败时的回退机制
- 事件处理异常捕获
- 状态一致性保证

### 3. 并发控制
- 避免同时执行多个压缩任务
- 使用锁机制保护共享状态
- 考虑压缩任务的队列管理

## 八、总结

本设计方案通过触发器+子工作流的方式，实现了灵活、可扩展的上下文压缩功能。该方案具有以下特点：

1. **职责分离**：各组件职责明确，易于维护
2. **事件驱动**：基于事件的异步处理，不阻塞主流程
3. **工作流化**：压缩逻辑由子工作流实现，易于扩展
4. **灵活性**：支持多种压缩策略，易于自定义

通过这个设计，SDK 可以有效地管理对话上下文，在 Token 限制下保持对话的连贯性和完整性，同时保持代码的简洁性和可维护性。