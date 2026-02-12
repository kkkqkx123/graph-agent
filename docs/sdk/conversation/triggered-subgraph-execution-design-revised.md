# 触发器触发的孤立子工作流执行设计（修订版）

## 概述

本文档详细描述了触发器触发的孤立子工作流（Triggered Isolated Subgraph）的执行设计方案。该方案解决了上下文压缩等场景中需要在不中断主工作流的情况下执行独立子工作流的需求。

## 设计背景

### 问题分析

1. **当前限制**：触发器系统无法启动子工作流线程
2. **需求场景**：上下文压缩需要在Token超限时异步执行压缩逻辑
3. **架构约束**：
   - 需要保持主工作流的连续性
   - 需要保留压缩后的上下文状态
   - 需要正确维护执行历史记录
   - 需要支持图结构验证

### 核心需求

- **孤立执行**：子工作流可以完全独立于主工作流
- **状态保留**：压缩后的消息上下文需要保留在ConversationManager中
- **位置恢复**：执行完成后需要恢复到主工作流的正确位置
- **验证兼容**：图验证需要支持这种特殊模式
- **历史记录**：需要正确维护节点执行历史

## 架构设计

### 新增节点类型

#### START_FROM_TRIGGER 节点

专门用于标识由触发器启动的孤立子工作流的起始点。**无特殊配置**，与 START 节点类似。

```typescript
export enum NodeType {
  // ... 现有类型
  START_FROM_TRIGGER = 'START_FROM_TRIGGER'
}

// 与subgraph节点保持一致
export interface StartFromTriggerConfig {
  // 见sdk\types\node.ts的subgraph节点的配置
}
```

#### CONTINUE_FROM_TRIGGER 节点

用于在子工作流执行完成后将数据回调到主工作流。支持配置变量回调和对话历史回调。

```typescript
export interface ContinueFromTriggerConfig {
  /** 变量回调配置 */
  variableCallback?: {
    /** 要回传的变量名称列表 */
    includeVariables?: string[];
    /** 是否回传所有变量（默认false） */
    includeAll?: boolean;
  };
  /** 对话历史回调配置 */
  conversationHistoryCallback?: {
    /** 回传最后N条消息 */
    lastN?: number;
    /** 回传最后N条指定角色的消息 */
    lastNByRole?: {
      role: LLMMessageRole;
      count: number;
    };
    /** 回传指定角色的所有消息 */
    byRole?: LLMMessageRole;
    /** 回传指定范围的消息 */
    range?: {
      start: number;
      end: number;
    };
  };
}
```

### 节点类型职责分工

| 节点类型 | 职责 | 使用场景 |
|---------|------|----------|
| `START_FROM_TRIGGER` | 接收触发器传递的输入数据，初始化子工作流 | 子工作流定义的开始 |
| `CONTINUE_FROM_TRIGGER` | 将子工作流的数据回调到主工作流 | 子工作流定义的结束 |

**数据传递机制**：
- **输入数据**：通过触发器传递给 START_FROM_TRIGGER 节点
- **回调数据**：通过 CONTINUE_FROM_TRIGGER 节点配置的回调机制回传到主工作流
- **变量和对话历史**：由节点处理器负责传递和回调

## 图验证逻辑

### 验证规则

为了简化验证逻辑，采用以下规则：

1. **包含 `START_FROM_TRIGGER` 的工作流**：
   - 必须以 `START_FROM_TRIGGER` 节点开始
   - 必须以 `CONTINUE_FROM_TRIGGER` 节点结束
   - 不需要连接到主工作流（允许完全孤立）

2. **普通 SUBGRAPH 节点**：
   - 如果有出边，必须连接到主工作流可达节点
   - 如果没有出边，则对应的子工作流必须包含 `START_FROM_TRIGGER` 节点

### 验证实现

```typescript
// GraphValidator.ts
function validateWorkflow(workflow: WorkflowDefinition): ValidationResult {
  const nodes = workflow.nodes;
  
  // 检查是否包含 START_FROM_TRIGGER 节点
  const hasStartFromTrigger = nodes.some(node => 
    node.type === NodeType.START_FROM_TRIGGER
  );
  
  if (hasStartFromTrigger) {
    return validateTriggeredSubgraph(workflow);
  }
  
  return validateNormalWorkflow(workflow);
}

function validateTriggeredSubgraph(workflow: WorkflowDefinition): ValidationResult {
  // 必须有且仅有一个 START_FROM_TRIGGER 节点
  const startFromTriggerNodes = workflow.nodes.filter(node => 
    node.type === NodeType.START_FROM_TRIGGER
  );
  
  if (startFromTriggerNodes.length !== 1) {
    return {
      valid: false,
      errors: ['Triggered subgraph must have exactly one START_FROM_TRIGGER node']
    };
  }
  
  // 必须有且仅有一个 CONTINUE_FROM_TRIGGER 节点
  const continueFromTriggerNodes = workflow.nodes.filter(node => 
    node.type === NodeType.CONTINUE_FROM_TRIGGER
  );
  
  if (continueFromTriggerNodes.length !== 1) {
    return {
      valid: false,
      errors: ['Triggered subgraph must have exactly one CONTINUE_FROM_TRIGGER node']
    };
  }
  
  // 验证图连通性（内部连通即可）
  return validateInternalConnectivity(workflow);
}
```

## 执行历史记录机制

### 历史记录隔离

为了正确维护执行历史，采用以下策略：

#### 主工作流历史记录
- 记录所有主工作流节点的执行
- 在触发器执行期间暂停记录
- 恢复执行后继续记录

#### 子工作流历史记录
- 独立记录子工作流节点的执行
- 与主工作流历史完全隔离
- 可选择性地合并到主历史中

### 实现方案

```typescript
// ThreadContext.ts
class ThreadContext {
  private mainExecutionHistory: NodeExecutionResult[] = [];
  private subgraphExecutionHistory: NodeExecutionResult[] = [];
  private isExecutingTriggeredSubgraph: boolean = false;
  
  addNodeResult(result: NodeExecutionResult): void {
    if (this.isExecutingTriggeredSubgraph) {
      this.subgraphExecutionHistory.push(result);
    } else {
      this.mainExecutionHistory.push(result);
    }
  }
  
  getExecutionHistory(): NodeExecutionResult[] {
    return this.mainExecutionHistory;
  }
  
  getSubgraphExecutionHistory(): NodeExecutionResult[] {
    return this.subgraphExecutionHistory;
  }
  
  startTriggeredSubgraphExecution(): void {
    this.isExecutingTriggeredSubgraph = true;
    this.subgraphExecutionHistory = [];
  }
  
  endTriggeredSubgraphExecution(): void {
    this.isExecutingTriggeredSubgraph = false;
  }
}
```

## 触发器系统扩展

### 新的触发器动作类型

```typescript
export enum TriggerActionType {
  // ... 现有类型
  EXECUTE_TRIGGERED_SUBGRAPH = 'execute_triggered_subgraph'
}

export interface ExecuteTriggeredSubgraphAction {
  type: TriggerActionType.EXECUTE_TRIGGERED_SUBGRAPH;
  parameters: {
    /** 子工作流ID */
    triggeredWorkflowId: string;
    /** 是否等待完成（默认true，同步执行） */
    waitForCompletion?: boolean;
  };
}
```

**注意**：数据传递配置（变量、对话历史）已从触发器动作配置中移除，现在由节点配置处理。

### 触发器执行上下文（内部维护）

```typescript
interface TriggerExecutionContext {
  /** 触发器ID */
  triggerId: string;
  /** 主工作流线程ID */
  mainThreadId: string;
  /** 触发时的当前节点ID */
  currentNodeId: string;
  /** 触发时的下一个节点ID */
  nextNodeId: string;
  /** 触发时间戳 */
  timestamp: number;
}

// 全局映射维护关联关系
const triggeredSubgraphContexts = new Map<string, TriggerExecutionContext>();
```

### 触发器处理器实现

```typescript
// execute-triggered-subgraph-handler.ts
export async function executeTriggeredSubgraphHandler(
  action: ExecuteTriggeredSubgraphAction,
  triggerId: string,
  executionContext?: ExecutionContext
): Promise<TriggerExecutionResult> {
  const { triggeredWorkflowId, waitForCompletion = true } = action.parameters;
  
  const mainThreadContext = executionContext?.threadContext;
  if (!mainThreadContext) {
    throw new Error('Main thread context required');
  }
  
  // 准备输入数据（仅包含触发事件相关的数据）
  // 数据传递（变量、对话历史）由节点处理器处理
  const input = {
    triggerId,
    output: mainThreadContext.getOutput(),
    input: mainThreadContext.getInput()
  };
  
  // 启动子工作流执行
  await executeTriggeredSubgraph({
    subgraphId: triggeredWorkflowId,
    input,
    triggerId,
    mainThreadContext,
    config: {
      waitForCompletion,
      timeout: 30000,
      recordHistory: true
    }
  });
  
  return createSuccessResult(triggerId, action, { executed: true }, Date.now());
}
```

**职责说明**：
- 触发器只负责触发子工作流
- 数据传递由节点处理器处理
- START_FROM_TRIGGER 节点接收输入数据
- CONTINUE_FROM_TRIGGER 节点回调数据到主线程

## 线程执行器扩展

### SUBGRAPH执行管理

```typescript
// ThreadExecutor.ts
class ThreadExecutor {
  private triggeredSubgraphQueue: TriggeredSubgraphTask[] = [];
  private isExecutingTriggeredSubgraph: boolean = false;
  
  public async executeTriggeredSubgraph(
    task: TriggeredSubgraphTask
  ): Promise<void> {
    this.triggeredSubgraphQueue.push(task);
  }
  
  private async processTriggeredSubgraphs(
    threadContext: ThreadContext
  ): Promise<boolean> {
    if (this.triggeredSubgraphQueue.length === 0) {
      return false;
    }
    
    const task = this.triggeredSubgraphQueue.shift()!;
    await this.executeSingleTriggeredSubgraph(threadContext, task);
    return true;
  }
  
  private async executeSingleTriggeredSubgraph(
    mainThreadContext: ThreadContext,
    task: TriggeredSubgraphTask
  ): Promise<void> {
    // 1. 保存主工作流状态
    const savedState = this.saveMainThreadState(mainThreadContext);
    
    // 2. 标记开始执行触发子工作流
    mainThreadContext.startTriggeredSubgraphExecution();
    
    try {
      // 3. 创建子工作流上下文
      const subgraphContext = this.createSubgraphContext(
        task,
        mainThreadContext
      );
      
      // 4. 执行子工作流
      await this.executeSubgraphWorkflow(subgraphContext);
      
      // 5. 处理CONTINUE_FROM_TRIGGER节点
      await this.handleContinueFromTrigger(
        mainThreadContext,
        subgraphContext,
        task
      );
    } finally {
      // 6. 恢复主工作流状态
      mainThreadContext.endTriggeredSubgraphExecution();
      this.restoreMainThreadState(mainThreadContext, savedState);
    }
  }
}
```

## 上下文压缩应用场景

### 工作流定义示例（修订后）

```typescript
const compressionWorkflow: WorkflowDefinition = {
  id: 'context-compression-workflow',
  name: '上下文压缩工作流',
  nodes: [
    {
      id: 'start-from-trigger',
      type: NodeType.START_FROM_TRIGGER,
      data: {} // 无特殊配置
    },
    {
      id: 'get-context',
      type: NodeType.VARIABLE,
      data: {
        variable: 'compressionContext',
        expression: 'input' // 从触发器传递的输入获取上下文
      }
    },
    {
      id: 'compress-messages',
      type: NodeType.LLM,
      data: {
        prompt: '请将以下对话历史压缩为简洁摘要...',
        profileId: 'compression-profile'
      }
    },
    {
      id: 'update-conversation',
      type: NodeType.CONTEXT_PROCESSOR,
      data: {
        operation: 'replace',
        target: 'all',
        replacement: '{{compress-messages.content}}'
      }
    },
    {
      id: 'continue-from-trigger',
      type: NodeType.CONTINUE_FROM_TRIGGER,
      data: {} // 无特殊配置，类似END节点
    }
  ],
  edges: [
    { from: 'start-from-trigger', to: 'get-context' },
    { from: 'get-context', to: 'compress-messages' },
    { from: 'compress-messages', to: 'update-conversation' },
    { from: 'update-conversation', to: 'continue-from-trigger' }
  ]
};
```

### 触发器配置示例（修订后）

```typescript
const compressionTrigger: Trigger = {
  id: 'compression-trigger',
  name: '上下文压缩触发器',
  type: TriggerType.EVENT,
  condition: {
    eventType: EventType.TOKEN_LIMIT_EXCEEDED
  },
  action: {
    type: TriggerActionType.EXECUTE_TRIGGERED_SUBGRAPH,
    parameters: {
      triggeredWorkflowId: 'context-compression-workflow',
      waitForCompletion: true
    }
  },
  status: TriggerStatus.ENABLED
};
```

### CONTINUE_FROM_TRIGGER 节点配置示例

```typescript
{
  id: 'continue-from-trigger',
  type: NodeType.CONTINUE_FROM_TRIGGER,
  config: {
    variableCallback: {
      includeVariables: ['compressedSummary', 'compressionStats']
    },
    conversationHistoryCallback: {
      lastN: 10
    }
  }
}
```

## 执行流程

### 完整执行序列

1. **主工作流执行**：正常执行主工作流节点
2. **事件触发**：ConversationManager触发 `TOKEN_LIMIT_EXCEEDED` 事件
3. **触发器匹配**：TriggerManager匹配到压缩触发器
4. **SUBGRAPH启动**：启动孤立的压缩子工作流
5. **上下文传递**：将当前对话上下文传递给子工作流
6. **压缩执行**：
   - VARIABLE节点获取输入上下文
   - LLM节点执行压缩
   - CONTEXT_PROCESSOR节点更新ConversationManager
   - 标记新的消息批次
7. **位置恢复**：CONTINUE_FROM_TRIGGER节点恢复主工作流执行位置
8. **继续执行**：主工作流从原始位置继续，使用压缩后的上下文

### 状态管理

- **ConversationManager**：保留压缩后的消息和新的批次标记
- **执行历史**：主工作流历史保持连续，子工作流历史可选记录
- **变量状态**：主工作流变量状态保持不变
- **线程状态**：线程状态无缝恢复

## 优势分析

### 架构优势

1. **职责分离**：每个组件职责明确，易于维护
2. **验证简化**：通过专用节点类型避免复杂的分支逻辑
3. **历史隔离**：执行历史正确维护，避免混淆
4. **状态安全**：主工作流状态得到完整保护
5. **扩展性好**：支持多种触发场景，不仅限于上下文压缩

### 设计简化

1. **职责分离**：触发器只负责触发，节点负责数据处理
2. **配置清晰**：数据传递配置在节点配置中，易于理解和维护
3. **一致性**：与现有节点处理器设计模式保持一致
4. **类型安全**：编译时可以检查配置的正确性

### 性能优势

1. **异步执行**：不阻塞主工作流执行
2. **内存效率**：状态隔离避免不必要的复制
3. **验证高效**：专用节点类型简化验证逻辑

### 使用优势

1. **开箱即用**：提供完整的工厂函数和示例
2. **灵活配置**：支持多种配置选项
3. **向后兼容**：不影响现有功能
4. **易于测试**：每个组件可独立测试

## 实现路线图

### 第一阶段：核心组件
1. 实现 `START_FROM_TRIGGER` 和 `CONTINUE_FROM_TRIGGER` 节点类型
2. 实现 `EXECUTE_TRIGGERED_SUBGRAPH` 触发器处理器
3. 修改图验证逻辑

### 第二阶段：执行引擎
1. 扩展线程执行器支持触发子工作流
2. 实现执行历史记录隔离机制
3. 实现上下文状态管理

### 第三阶段：集成测试
1. 上下文压缩场景端到端测试
2. 多种触发场景测试
3. 性能和稳定性测试

### 第四阶段：文档和示例
1. 完整的API文档
2. 使用示例和最佳实践
3. 迁移指南

## 总结

本设计方案通过引入专用的节点类型 (`START_FROM_TRIGGER`, `CONTINUE_FROM_TRIGGER`) 和触发器动作类型 (`EXECUTE_TRIGGERED_SUBGRAPH`)，为触发器触发的孤立子工作流提供了完整的解决方案。该方案具有清晰的架构、简化的验证逻辑、正确的状态管理和良好的扩展性，能够有效支持上下文压缩等高级应用场景。

**关键改进**：
- 职责分离：触发器只负责触发，节点负责数据处理
- 数据传递配置在节点配置中，提供灵活的回调机制
- 支持变量和对话历史的精细控制
- 与现有节点处理器设计模式保持一致
- 提供完整的类型安全和编译时检查