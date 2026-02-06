# Command/Query 分类分析

## 一、分类标准

### Command 模式适用场景
- **有副作用**：修改系统状态（创建、更新、删除）
- **可撤销**：操作可以反向执行（undo）
- **可重试**：失败后可以安全重试
- **需要验证**：参数验证逻辑复杂
- **需要中间件**：需要日志、缓存、指标等横切关注点

### Query 模式适用场景
- **无副作用**：只读取数据，不修改状态
- **纯查询**：简单的数据检索和过滤
- **不需要撤销**：查询操作无法撤销
- **验证简单**：通常只检查 ID 非空

### Subscription 模式适用场景
- **长期监听**：注册监听器，持续接收事件
- **返回取消函数**：需要返回取消订阅的方法
- **非一次性**：不是单次执行的操作

### Direct API 适用场景
- **简单操作**：不需要复杂验证或中间件
- **高频调用**：包装成 Command 会增加不必要的开销

---

## 二、34 个 Command 详细分类

### 1. 适合保留 Command 模式 (12个)

| # | Command | 目录 | 理由 |
|---|---------|------|------|
| 1 | [`ExecuteWorkflowCommand`](sdk/api/operations/core/execution/commands/execute-workflow-command.ts:27) | core/execution | 执行工作流，修改线程状态，可撤销（取消执行） |
| 2 | [`PauseThreadCommand`](sdk/api/operations/core/execution/commands/pause-thread-command.ts:12) | core/execution | 暂停线程，修改线程状态，可撤销（恢复） |
| 3 | [`ResumeThreadCommand`](sdk/api/operations/core/execution/commands/resume-thread-command.ts) | core/execution | 恢复线程，修改线程状态，可撤销（暂停） |
| 4 | [`CancelThreadCommand`](sdk/api/operations/core/execution/commands/cancel-thread-command.ts) | core/execution | 取消线程，修改线程状态，不可撤销但需要验证 |
| 5 | [`GenerateCommand`](sdk/api/operations/core/llm/commands/generate-command.ts:13) | core/llm | LLM生成，消耗资源，需要重试机制 |
| 6 | [`GenerateBatchCommand`](sdk/api/operations/core/llm/commands/generate-batch-command.ts) | core/llm | 批量LLM生成，需要重试和指标收集 |
| 7 | [`ExecuteScriptCommand`](sdk/api/operations/core/scripts/commands/execute-script-command.ts) | core/scripts | 执行脚本，有副作用，需要验证 |
| 8 | [`ExecuteToolCommand`](sdk/api/operations/core/tools/commands/execute-tool-command.ts:13) | core/tools | 执行工具，有副作用，需要验证和重试 |
| 9 | [`CreateCheckpointCommand`](sdk/api/operations/management/checkpoints/commands/create-checkpoint-command.ts:29) | management/checkpoints | 创建检查点，修改系统状态，可撤销（删除） |
| 10 | [`RestoreFromCheckpointCommand`](sdk/api/operations/management/checkpoints/commands/restore-from-checkpoint-command.ts) | management/checkpoints | 恢复检查点，修改线程状态，可撤销（再次恢复） |
| 11 | [`EnableTriggerCommand`](sdk/api/operations/management/triggers/commands/enable-trigger-command.ts:25) | management/triggers | 启用触发器，修改触发器状态，可撤销（禁用） |
| 12 | [`DisableTriggerCommand`](sdk/api/operations/management/triggers/commands/disable-trigger-command.ts) | management/triggers | 禁用触发器，修改触发器状态，可撤销（启用） |

### 2. 应转换为 Query 模式 (15个)

| # | Command | 目录 | 转换理由 |
|---|---------|------|----------|
| 13 | [`GetCheckpointsCommand`](sdk/api/operations/management/checkpoints/commands/get-checkpoints-command.ts:25) | management/checkpoints | 纯查询，无副作用，验证简单 |
| 14 | [`DeleteCheckpointCommand`](sdk/api/operations/management/checkpoints/commands/delete-checkpoint-command.ts) | management/checkpoints | 删除操作，但验证简单，可转为简单函数 |
| 15 | [`GetTriggersCommand`](sdk/api/operations/management/triggers/commands/get-triggers-command.ts:27) | management/triggers | 纯查询，无副作用 |
| 16 | [`GetEventsCommand`](sdk/api/operations/monitoring/events/commands/get-events-command.ts) | monitoring/events | 纯查询，无副作用 |
| 17 | [`GetEventStatsCommand`](sdk/api/operations/monitoring/events/commands/get-event-stats-command.ts:39) | monitoring/events | 纯查询，统计计算，无副作用 |
| 18 | [`GetMessagesCommand`](sdk/api/operations/monitoring/messages/commands/get-messages-command.ts:30) | monitoring/messages | 纯查询，无副作用 |
| 19 | [`GetRecentMessagesCommand`](sdk/api/operations/monitoring/messages/commands/get-recent-messages-command.ts:26) | monitoring/messages | 纯查询，无副作用 |
| 20 | [`SearchMessagesCommand`](sdk/api/operations/monitoring/messages/commands/search-messages-command.ts:26) | monitoring/messages | 纯查询，无副作用 |
| 21 | [`GetMessageStatsCommand`](sdk/api/operations/monitoring/messages/commands/get-message-stats-command.ts) | monitoring/messages | 纯查询，统计计算，无副作用 |
| 22 | [`GetVariablesCommand`](sdk/api/operations/monitoring/state/commands/get-variables-command.ts:24) | monitoring/state | 纯查询，无副作用 |
| 23 | [`GetVariableCommand`](sdk/api/operations/monitoring/state/commands/get-variable-command.ts:26) | monitoring/state | 纯查询，无副作用 |
| 24 | [`HasVariableCommand`](sdk/api/operations/monitoring/state/commands/has-variable-command.ts:26) | monitoring/state | 纯查询，无副作用 |
| 25 | [`GetVariableDefinitionsCommand`](sdk/api/operations/monitoring/state/commands/get-variable-definitions-command.ts) | monitoring/state | 纯查询，无副作用 |
| 26 | [`ExecuteBatchCommand`](sdk/api/operations/core/scripts/commands/execute-batch-command.ts) | core/scripts | 批量执行，本质是循环调用 ExecuteScriptCommand |
| 27 | [`ExecuteBatchCommand`](sdk/api/operations/core/tools/commands/execute-batch-command.ts) | core/tools | 批量执行，本质是循环调用 ExecuteToolCommand |

### 3. 应转换为 Subscription/Direct API (4个)

| # | Command | 目录 | 转换理由 |
|---|---------|------|----------|
| 28 | [`OnEventCommand`](sdk/api/operations/monitoring/events/commands/on-event-command.ts:25) | monitoring/events | 订阅操作，返回取消函数，不适合 Command |
| 29 | [`OnceEventCommand`](sdk/api/operations/monitoring/events/commands/once-event-command.ts) | monitoring/events | 一次性订阅，返回取消函数，不适合 Command |
| 30 | [`OffEventCommand`](sdk/api/operations/monitoring/events/commands/off-event-command.ts) | monitoring/events | 取消订阅，简单操作，不需要 Command |
| 31 | [`WaitForEventCommand`](sdk/api/operations/monitoring/events/commands/wait-for-event-command.ts:25) | monitoring/events | 等待事件，本质是订阅+超时，不适合 Command |

### 4. 应转换为 Direct API (3个)

| # | Command | 目录 | 转换理由 |
|---|---------|------|----------|
| 32 | [`TestScriptCommand`](sdk/api/operations/core/scripts/commands/test-script-command.ts) | core/scripts | 测试操作，本质是 ExecuteScriptCommand 的变体 |
| 33 | [`TestToolCommand`](sdk/api/operations/core/tools/commands/test-tool-command.ts) | core/tools | 测试操作，本质是 ExecuteToolCommand 的变体 |
| 34 | [`ExportMessagesCommand`](sdk/api/operations/monitoring/messages/commands/export-messages-command.ts:26) | monitoring/messages | 导出操作，本质是 GetMessagesCommand + 格式转换 |

---

## 三、分类统计

```
总计: 34 个 Command

├── 保留 Command 模式: 12 个 (35%)
│   ├── core/execution: 4 个
│   ├── core/llm: 2 个
│   ├── core/scripts: 1 个
│   ├── core/tools: 1 个
│   ├── management/checkpoints: 2 个
│   └── management/triggers: 2 个
│
├── 转换为 Query 模式: 15 个 (44%)
│   ├── management/checkpoints: 2 个
│   ├── management/triggers: 1 个
│   ├── monitoring/events: 2 个
│   ├── monitoring/messages: 4 个
│   ├── monitoring/state: 4 个
│   └── core/scripts/tools: 2 个 (批量执行)
│
├── 转换为 Subscription API: 4 个 (12%)
│   └── monitoring/events: 4 个
│
└── 转换为 Direct API: 3 个 (9%)
    ├── core/scripts: 1 个
    ├── core/tools: 1 个
    └── monitoring/messages: 1 个
```

---

## 四、重构后的目录结构建议

```
sdk/api/operations/
├── commands/                          # Command 模式（有副作用操作）
│   ├── execution/
│   │   ├── execute-workflow-command.ts
│   │   ├── pause-thread-command.ts
│   │   ├── resume-thread-command.ts
│   │   └── cancel-thread-command.ts
│   ├── llm/
│   │   ├── generate-command.ts
│   │   └── generate-batch-command.ts
│   ├── scripts/
│   │   └── execute-script-command.ts
│   ├── tools/
│   │   └── execute-tool-command.ts
│   ├── checkpoints/
│   │   ├── create-checkpoint-command.ts
│   │   └── restore-checkpoint-command.ts
│   └── triggers/
│       ├── enable-trigger-command.ts
│       └── disable-trigger-command.ts
│
├── queries/                           # Query 模式（纯查询操作）
│   ├── checkpoints/
│   │   ├── get-checkpoints-query.ts
│   │   └── delete-checkpoint-query.ts
│   ├── triggers/
│   │   └── get-triggers-query.ts
│   ├── events/
│   │   ├── get-events-query.ts
│   │   └── get-event-stats-query.ts
│   ├── messages/
│   │   ├── get-messages-query.ts
│   │   ├── get-recent-messages-query.ts
│   │   ├── search-messages-query.ts
│   │   └── get-message-stats-query.ts
│   ├── state/
│   │   ├── get-variables-query.ts
│   │   ├── get-variable-query.ts
│   │   ├── has-variable-query.ts
│   │   └── get-variable-definitions-query.ts
│   └── batch/
│       ├── execute-script-batch-query.ts
│       └── execute-tool-batch-query.ts
│
└── subscriptions/                     # Subscription 模式（事件订阅）
    └── events/
        ├── on-event-subscription.ts
        ├── once-event-subscription.ts
        ├── off-event-subscription.ts
        └── wait-for-event-subscription.ts
```

---

## 五、Query 模式设计

### Query 接口定义

```typescript
/**
 * Query 接口 - 纯查询操作
 */
export interface Query<T> {
  /**
   * 执行查询
   * @returns 查询结果
   */
  execute(): Promise<QueryResult<T>>;
  
  /**
   * 获取查询元数据
   */
  getMetadata(): QueryMetadata;
}

/**
 * Query 元数据
 */
export interface QueryMetadata {
  /** 查询名称 */
  name: string;
  /** 查询描述 */
  description: string;
  /** 查询分类 */
  category: 'checkpoints' | 'triggers' | 'events' | 'messages' | 'state';
  /** 是否需要认证 */
  requiresAuth: boolean;
  /** 查询版本 */
  version: string;
}

/**
 * Query 结果
 */
export type QueryResult<T> = 
  | { success: true; data: T; executionTime: number }
  | { success: false; error: string; executionTime: number };

/**
 * 抽象 Query 基类
 */
export abstract class BaseQuery<T> implements Query<T> {
  protected readonly startTime: number = Date.now();
  
  abstract execute(): Promise<QueryResult<T>>;
  abstract getMetadata(): QueryMetadata;
  
  protected getExecutionTime(): number {
    return Date.now() - this.startTime;
  }
}
```

### Query 示例

```typescript
/**
 * GetMessagesQuery - 获取消息列表
 */
export class GetMessagesQuery extends BaseQuery<LLMMessage[]> {
  constructor(
    private readonly params: GetMessagesParams,
    private readonly threadRegistry: ThreadRegistry = threadRegistry
  ) {
    super();
  }
  
  async execute(): Promise<QueryResult<LLMMessage[]>> {
    try {
      const threadContext = this.threadRegistry.get(this.params.threadId);
      if (!threadContext) {
        return {
          success: false,
          error: `Thread not found: ${this.params.threadId}`,
          executionTime: this.getExecutionTime()
        };
      }
      
      const messages = threadContext.conversationManager.getMessages();
      
      // 应用排序和分页
      let result = [...messages];
      if (this.params.orderBy === 'desc') {
        result.reverse();
      }
      if (this.params.offset !== undefined || this.params.limit !== undefined) {
        const start = this.params.offset || 0;
        const end = this.params.limit !== undefined ? start + this.params.limit : undefined;
        result = result.slice(start, end);
      }
      
      return {
        success: true,
        data: result,
        executionTime: this.getExecutionTime()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: this.getExecutionTime()
      };
    }
  }
  
  getMetadata(): QueryMetadata {
    return {
      name: 'GetMessages',
      description: '获取线程的消息列表',
      category: 'messages',
      requiresAuth: false,
      version: '1.0.0'
    };
  }
}
```

---

## 六、Subscription 模式设计

### Subscription 接口定义

```typescript
/**
 * Subscription 接口 - 事件订阅
 */
export interface Subscription<T> {
  /**
   * 订阅事件
   * @returns 取消订阅函数
   */
  subscribe(): () => void;
  
  /**
   * 获取订阅元数据
   */
  getMetadata(): SubscriptionMetadata;
}

/**
 * Subscription 元数据
 */
export interface SubscriptionMetadata {
  /** 订阅名称 */
  name: string;
  /** 订阅描述 */
  description: string;
  /** 事件类型 */
  eventType: EventType;
  /** 是否需要认证 */
  requiresAuth: boolean;
  /** 版本 */
  version: string;
}
```

### Subscription 示例

```typescript
/**
 * OnEventSubscription - 注册事件监听器
 */
export class OnEventSubscription implements Subscription<BaseEvent> {
  constructor(
    private readonly eventType: EventType,
    private readonly listener: EventListener<BaseEvent>,
    private readonly eventManager: EventManager = eventManager
  ) {}
  
  subscribe(): () => void {
    return this.eventManager.on(this.eventType, this.listener);
  }
  
  getMetadata(): SubscriptionMetadata {
    return {
      name: 'OnEvent',
      description: '注册事件监听器',
      eventType: this.eventType,
      requiresAuth: false,
      version: '1.0.0'
    };
  }
}
```

---

## 七、Direct API 设计

对于简单的操作，直接提供 API 方法，不需要包装成 Command 或 Query。

```typescript
/**
 * MessageAPI - 消息直接 API
 */
export class MessageAPI {
  constructor(
    private readonly threadRegistry: ThreadRegistry = threadRegistry
  ) {}
  
  /**
   * 导出消息
   */
  async exportMessages(
    threadId: string,
    format: 'json' | 'csv'
  ): Promise<string> {
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`Thread not found: ${threadId}`, 'thread', threadId);
    }
    
    const messages = threadContext.conversationManager.getMessages();
    
    if (format === 'json') {
      return JSON.stringify(messages, null, 2);
    } else {
      const headers = 'role,content\n';
      const rows = messages.map(message => {
        const content = typeof message.content === 'string'
          ? message.content
          : JSON.stringify(message.content);
        const escapedContent = content.replace(/"/g, '""');
        return `${message.role},"${escapedContent}"`;
      }).join('\n');
      return headers + rows;
    }
  }
}
```

---

## 八、重构优先级

### 高优先级（立即执行）
1. **事件订阅操作**（4个）- 语义不匹配，应立即改为 Subscription API
2. **纯查询操作**（15个）- 过度设计，应改为 Query 模式

### 中优先级（逐步执行）
3. **批量执行操作**（2个）- 简化为循环调用
4. **测试操作**（2个）- 简化为 Execute 的变体

### 低优先级（可选）
5. **导出操作**（1个）- 简化为 Get + 格式转换
6. **删除操作**（1个）- 验证简单，可改为 Direct API

---

## 九、总结

| 模式 | 数量 | 占比 | 说明 |
|------|------|------|------|
| Command | 12 | 35% | 有副作用、可撤销、需要验证的操作 |
| Query | 15 | 44% | 纯查询、无副作用、验证简单的操作 |
| Subscription | 4 | 12% | 事件订阅、返回取消函数的操作 |
| Direct API | 3 | 9% | 简单操作、高频调用的操作 |

通过 CQRS 思想分离 Command 和 Query，可以：
- **减少样板代码**：Query 不需要 validate、undo 等方法
- **提高性能**：Query 可以缓存，不需要中间件链
- **语义清晰**：Command 表示修改，Query 表示查询
- **易于维护**：职责单一，代码更简洁