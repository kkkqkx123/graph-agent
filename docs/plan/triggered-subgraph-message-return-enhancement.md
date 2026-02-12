# Triggered子工作流消息回传参数增强方案

## 当前问题分析

当前triggered子工作流的回传参数中，`includeConversationHistory` 选项仅支持布尔值，表示是否回传完整的对话历史。这种设计存在以下限制：

1. **粒度太粗**：只能选择回传全部消息或不回传任何消息
2. **性能问题**：当对话历史很长时，回传所有消息会造成不必要的性能开销
3. **灵活性不足**：无法满足不同场景下的消息筛选需求

## 需求目标

将消息回传参数从简单的布尔值改为支持多种操作的灵活接口，具体包括：

- 支持回传最后N条消息
- 支持回传最后N条LLM消息（assistant角色）
- 支持回传指定角色的消息
- 支持回传指定范围的消息
- 保持向后兼容性

## 现有实现分析

### 当前接口结构

在 `packages/types/src/trigger.ts` 中定义的 `ExecuteTriggeredSubgraphActionConfig` 接口：

```typescript
export interface ExecuteTriggeredSubgraphActionConfig {
  triggeredWorkflowId: ID;
  waitForCompletion?: boolean;
  mergeOptions?: {
    includeVariables?: string[];
    includeConversationHistory?: boolean; // 当前仅支持布尔值
  };
}
```

### 消息获取实现

在 `sdk/core/execution/context/thread-context.ts` 中：

```typescript
getConversationHistory(): LLMMessage[] {
  return this.conversationManager.getMessages();
}
```

在 `sdk/core/execution/managers/conversation-manager.ts` 中已有的消息筛选方法：

- `getRecentMessages(n: number)` - 获取最近N条消息
- `getMessagesByRole(role: LLMMessageRole)` - 获取指定角色的所有消息  
- `getRecentMessagesByRole(role: LLMMessageRole, n: number)` - 获取指定角色的最近N条消息
- `getMessagesByRoleRange(role: LLMMessageRole, start: number, end: number)` - 获取指定角色的范围消息

## 新接口设计方案

### 方案一：扩展对象配置（推荐）

将 `includeConversationHistory` 从布尔值扩展为对象配置：

```typescript
export interface ExecuteTriggeredSubgraphActionConfig {
  triggeredWorkflowId: ID;
  waitForCompletion?: boolean;
  mergeOptions?: {
    includeVariables?: string[];
    includeConversationHistory?: boolean | ConversationHistoryOptions;
  };
}

export interface ConversationHistoryOptions {
  /** 回传最后N条消息 */
  lastN?: number;
  /** 回传最后N条指定角色的消息 */
  lastNByRole?: {
    role: LLMMessageRole;
    count: number;
  };
  /** 回传指定角色的所有消息 */
  byRole?: LLMMessageRole;
  /** 回传指定范围的消息（基于完整消息列表） */
  range?: {
    start: number;
    end: number;
  };
  /** 回传指定范围的指定角色消息 */
  rangeByRole?: {
    role: LLMMessageRole;
    start: number;
    end: number;
  };
}
```

### 方案二：独立配置属性

保持 `includeConversationHistory` 为布尔值，新增独立的 `conversationHistoryOptions` 属性：

```typescript
export interface ExecuteTriggeredSubgraphActionConfig {
  triggeredWorkflowId: ID;
  waitForCompletion?: boolean;
  mergeOptions?: {
    includeVariables?: string[];
    includeConversationHistory?: boolean;
    conversationHistoryOptions?: ConversationHistoryOptions;
  };
}
```

**推荐采用方案一**，因为：
1. 逻辑更清晰，配置集中
2. 向后兼容性更好（布尔值可作为简写形式）
3. 避免配置分散

## 具体修改文件清单

### 1. 类型定义文件
- **`packages/types/src/trigger.ts`** - 修改 `ExecuteTriggeredSubgraphActionConfig` 和新增 `ConversationHistoryOptions` 接口

### 2. 触发器处理文件  
- **`sdk/core/execution/handlers/trigger-handlers/execute-triggered-subgraph-handler.ts`** - 修改消息获取逻辑，根据新配置参数调用相应的消息筛选方法

### 3. 验证文件
- **`sdk/core/validation/trigger-validator.ts`** - 更新验证逻辑，支持新的配置结构
- **`sdk/core/validation/__tests__/trigger-validator.test.ts`** - 添加新的测试用例

### 4. 测试文件
- **`sdk/core/execution/handlers/trigger-handlers/__tests__/execute-triggered-subgraph-handler.test.ts`** - 更新和添加测试用例

## 实现细节

### 消息获取逻辑

在 `execute-triggered-subgraph-handler.ts` 中，需要根据配置参数调用不同的消息获取方法：

```typescript
// 根据mergeOptions配置选择性传递对话历史
if (parameters.mergeOptions?.includeConversationHistory) {
  let conversationHistory: LLMMessage[] = [];
  
  if (typeof parameters.mergeOptions.includeConversationHistory === 'boolean') {
    // 向后兼容：布尔值表示获取所有消息
    conversationHistory = mainThreadContext.getConversationHistory();
  } else {
    // 新的配置对象
    const options = parameters.mergeOptions.includeConversationHistory;
    
    if (options.lastN !== undefined) {
      conversationHistory = mainThreadContext.getRecentMessages(options.lastN);
    } else if (options.lastNByRole) {
      conversationHistory = mainThreadContext.getRecentMessagesByRole(
        options.lastNByRole.role, 
        options.lastNByRole.count
      );
    } else if (options.byRole) {
      conversationHistory = mainThreadContext.getMessagesByRole(options.byRole);
    } else if (options.range) {
      conversationHistory = mainThreadContext.getMessagesByRange(
        options.range.start, 
        options.range.end
      );
    } else if (options.rangeByRole) {
      conversationHistory = mainThreadContext.getMessagesByRoleRange(
        options.rangeByRole.role,
        options.rangeByRole.start,
        options.rangeByRole.end
      );
    }
  }
  
  input['conversationHistory'] = conversationHistory;
}
```

### ThreadContext 方法扩展

需要在 `ThreadContext` 类中添加缺失的方法：

- `getRecentMessages(n: number)`
- `getMessagesByRange(start: number, end: number)`
- `getRecentMessagesByRole(role: LLMMessageRole, n: number)`
- `getMessagesByRoleRange(role: LLMMessageRole, start: number, end: number)`

这些方法将委托给 `conversationManager` 的对应方法。

## 向后兼容性保证

1. **布尔值支持**：当 `includeConversationHistory` 为 `true` 时，行为与当前版本完全一致（回传所有消息）
2. **默认行为**：当未设置该参数时，保持当前的默认行为（不回传消息）
3. **渐进式迁移**：现有代码无需修改即可继续工作

## 使用示例

### 1. 回传最后5条消息
```typescript
{
  triggeredWorkflowId: 'sub-workflow-id',
  mergeOptions: {
    includeConversationHistory: {
      lastN: 5
    }
  }
}
```

### 2. 回传最后3条assistant消息
```typescript
{
  triggeredWorkflowId: 'sub-workflow-id',
  mergeOptions: {
    includeConversationHistory: {
      lastNByRole: {
        role: 'assistant',
        count: 3
      }
    }
  }
}
```

### 3. 回传所有user消息
```typescript
{
  triggeredWorkflowId: 'sub-workflow-id',
  mergeOptions: {
    includeConversationHistory: {
      byRole: 'user'
    }
  }
}
```

### 4. 保持现有行为（回传所有消息）
```typescript
{
  triggeredWorkflowId: 'sub-workflow-id',
  mergeOptions: {
    includeConversationHistory: true
  }
}
```

## 验证规则

新的验证规则需要确保：

1. 当使用对象配置时，至少指定一个有效的选项
2. 数值参数必须为正整数
3. 角色参数必须是有效的 `LLMMessageRole` 值
4. 范围参数的 `start` 必须小于 `end`
5. 保持对布尔值配置的兼容性

## 测试覆盖

需要覆盖以下测试场景：

1. 布尔值配置的向后兼容性
2. 各种对象配置选项的正确性
3. 边界情况处理（如请求的消息数量超过实际消息数量）
4. 错误配置的验证（无效的角色、负数等）
5. 默认行为的正确性