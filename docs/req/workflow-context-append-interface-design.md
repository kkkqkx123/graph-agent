# 工作流上下文Append接口设计

## 1. 设计目标

### 1.1 核心目标
- 提供统一的append接口，让src/services/workflow目录的各个组件都能够更新状态上下文与提示词上下文
- 遵循不可变更新模式，每次append操作返回新的上下文实例
- 接口简洁明了，易于使用和理解
- 支持链式调用，提高代码可读性

### 1.2 设计原则
- **不可变性**: 所有append操作返回新实例，不修改原对象
- **原子性**: 每个append操作是原子的，要么全部成功，要么全部失败
- **类型安全**: 使用TypeScript强类型，编译时捕获错误
- **性能优化**: 使用结构共享，避免不必要的深拷贝

## 2. Append接口设计

### 2.1 WorkflowContext Append接口

#### 2.1.1 接口定义
```typescript
interface WorkflowContext {
  // 追加节点执行状态
  appendNodeExecution(state: NodeExecutionState): WorkflowContext;
  
  // 追加提示词历史记录
  appendPromptHistory(entry: Omit<PromptHistoryEntry, 'index'>): WorkflowContext;
  
  // 批量追加提示词历史记录
  appendPromptHistories(entries: Array<Omit<PromptHistoryEntry, 'index'>>): WorkflowContext;
  
  // 更新全局变量
  updateVariable(key: string, value: unknown): WorkflowContext;
  
  // 批量更新全局变量
  updateVariables(variables: Record<string, unknown>): WorkflowContext;
  
  // 更新元数据
  updateMetadata(updates: Record<string, unknown>): WorkflowContext;
  
  // 设置当前节点
  setCurrentNode(nodeId: string): WorkflowContext;
  
  // 完成工作流执行
  completeWorkflow(): WorkflowContext;
  
  // 标记工作流失败
  failWorkflow(error: string): WorkflowContext;
}
```

#### 2.1.2 使用示例
```typescript
// 示例1: 在节点执行器中追加节点状态
class NodeExecutor {
  async execute(node: Node, context: WorkflowContext): Promise<NodeExecutionResult> {
    // 追加节点开始执行状态
    let updatedContext = context.appendNodeExecution({
      nodeId: node.nodeId,
      status: 'running',
      startTime: new Date()
    });

    try {
      // 执行节点逻辑
      const result = await this.executeNode(node);
      
      // 追加节点完成状态
      updatedContext = updatedContext.appendNodeExecution({
        nodeId: node.nodeId,
        status: 'completed',
        endTime: new Date(),
        executionTime: result.duration,
        result: result.output
      });
      
      return { success: true, context: updatedContext };
    } catch (error) {
      // 追加节点失败状态
      updatedContext = updatedContext.appendNodeExecution({
        nodeId: node.nodeId,
        status: 'failed',
        endTime: new Date(),
        error: error.message
      });
      
      throw error;
    }
  }
}

// 示例2: 在LLM节点中追加提示词历史
class LLMNode {
  async execute(context: WorkflowContext): Promise<NodeExecutionResult> {
    // 追加用户输入到历史记录
    let updatedContext = context.appendPromptHistory({
      nodeId: this.nodeId,
      type: 'input',
      role: 'user',
      content: this.prompt,
      timestamp: new Date()
    });

    // 调用LLM
    const response = await this.callLLM(updatedContext);
    
    // 追加LLM输出到历史记录
    updatedContext = updatedContext.appendPromptHistory({
      nodeId: this.nodeId,
      type: 'output',
      role: 'assistant',
      content: response.content,
      timestamp: new Date(),
      metadata: {
        model: response.model,
        tokens: response.tokens
      }
    });

    return { success: true, output: response, context: updatedContext };
  }
}

// 示例3: 链式调用更新多个状态
class WorkflowExecutionEngine {
  async executeNode(node: Node, context: WorkflowContext): Promise<WorkflowContext> {
    return context
      .setCurrentNode(node.nodeId)
      .appendNodeExecution({
        nodeId: node.nodeId,
        status: 'running',
        startTime: new Date()
      })
      .updateVariable('currentNode', node.nodeId)
      .updateMetadata({ lastExecutedNode: node.nodeId });
  }
}
```

### 2.2 ExecutionState Append接口

#### 2.2.1 接口定义
```typescript
interface ExecutionState {
  // 添加节点执行状态
  addNodeExecution(state: NodeExecutionState): ExecutionState;
  
  // 更新节点执行状态
  updateNodeExecution(nodeId: string, updates: Partial<NodeExecutionState>): ExecutionState;
  
  // 设置当前节点
  setCurrentNode(nodeId: string): ExecutionState;
  
  // 标记节点开始执行
  markNodeStarted(nodeId: string): ExecutionState;
  
  // 标记节点完成
  markNodeCompleted(nodeId: string, result?: unknown): ExecutionState;
  
  // 标记节点失败
  markNodeFailed(nodeId: string, error: string): ExecutionState;
  
  // 标记节点跳过
  markNodeSkipped(nodeId: string): ExecutionState;
  
  // 完成工作流执行
  complete(): ExecutionState;
  
  // 标记工作流失败
  fail(error: string): ExecutionState;
}
```

#### 2.2.2 使用示例
```typescript
// 示例1: 节点状态管理
class NodeExecutor {
  execute(node: Node, executionState: ExecutionState): ExecutionState {
    // 标记节点开始
    let updatedState = executionState.markNodeStarted(node.nodeId);
    
    try {
      // 执行节点逻辑
      const result = this.executeNode(node);
      
      // 标记节点完成
      updatedState = updatedState.markNodeCompleted(node.nodeId, result);
    } catch (error) {
      // 标记节点失败
      updatedState = executionState.markNodeFailed(node.nodeId, error.message);
    }
    
    return updatedState;
  }
}

// 示例2: 批量更新节点状态
class BatchProcessor {
  process(nodes: Node[], executionState: ExecutionState): ExecutionState {
    let updatedState = executionState;
    
    for (const node of nodes) {
      updatedState = updatedState.addNodeExecution({
        nodeId: node.nodeId,
        status: 'pending',
        metadata: { batch: true }
      });
    }
    
    return updatedState;
  }
}
```

### 2.3 PromptState Append接口

#### 2.3.1 接口定义
```typescript
interface PromptState {
  // 添加历史条目
  addEntry(entry: Omit<PromptHistoryEntry, 'index'>): PromptState;
  
  // 批量添加历史条目
  addEntries(entries: Array<Omit<PromptHistoryEntry, 'index'>>): PromptState;
  
  // 添加用户输入
  addUserInput(nodeId: string, content: string, metadata?: Record<string, unknown>): PromptState;
  
  // 添加助手输出
  addAssistantOutput(nodeId: string, content: string, metadata?: Record<string, unknown>): PromptState;
  
  // 添加系统消息
  addSystemMessage(nodeId: string, content: string, metadata?: Record<string, unknown>): PromptState;
  
  // 添加工具调用
  addToolCall(nodeId: string, content: string, metadata?: Record<string, unknown>): PromptState;
  
  // 添加工具结果
  addToolResult(nodeId: string, content: string, metadata?: Record<string, unknown>): PromptState;
  
  // 设置提示词模板
  setTemplate(template: string): PromptState;
  
  // 清空历史记录
  clearHistory(): PromptState;
}
```

#### 2.3.2 使用示例
```typescript
// 示例1: LLM对话历史管理
class ConversationManager {
  addUserMessage(promptState: PromptState, content: string): PromptState {
    return promptState.addUserInput('conversation-node', content);
  }
  
  addAIMessage(promptState: PromptState, content: string): PromptState {
    return promptState.addAssistantOutput('conversation-node', content);
  }
}

// 示例2: 工具调用链管理
class ToolChainProcessor {
  processToolCall(promptState: PromptState, toolName: string, args: any): PromptState {
    // 添加工具调用记录
    let updatedState = promptState.addToolCall('tool-node', JSON.stringify({
      tool: toolName,
      arguments: args
    }), {
      toolName,
      timestamp: Date.now()
    });
    
    // 执行工具
    const result = this.executeTool(toolName, args);
    
    // 添加工具结果记录
    updatedState = updatedState.addToolResult('tool-node', JSON.stringify(result), {
      toolName,
      success: result.success
    });
    
    return updatedState;
  }
}

// 示例3: 批量导入历史记录
class HistoryImporter {
  importHistory(promptState: PromptState, externalHistory: any[]): PromptState {
    const entries = externalHistory.map((item, index) => ({
      nodeId: `imported-${index}`,
      type: this.mapType(item.type),
      role: this.mapRole(item.role),
      content: item.content,
      timestamp: new Date(item.timestamp),
      metadata: item.metadata
    }));
    
    return promptState.addEntries(entries);
  }
}
```

## 3. 不可变更新模式实现

### 3.1 结构共享优化

#### 3.1.1 实现原理
```typescript
class WorkflowContext extends ValueObject<WorkflowContextProps> {
  appendNodeExecution(state: NodeExecutionState): WorkflowContext {
    // 创建新的nodeExecutions Map，复用其他字段
    const newNodeExecutions = new Map(this.props.executionState.nodeExecutions);
    newNodeExecutions.set(state.nodeId, state);
    
    // 创建新的ExecutionState，复用未修改的部分
    const newExecutionState = new ExecutionState({
      ...this.props.executionState,
      nodeExecutions: newNodeExecutions
    });
    
    // 创建新的WorkflowContext，复用未修改的部分
    return new WorkflowContext({
      ...this.props,
      executionState: newExecutionState,
      updatedAt: new Date()
    });
  }
}
```

#### 3.1.2 性能优势
- **内存效率**: 只复制修改的部分，未修改的部分共享引用
- **时间效率**: 避免深拷贝，更新操作时间复杂度为O(1)或O(n)
- **GC友好**: 减少内存分配，降低垃圾回收压力

### 3.2 链式调用支持

#### 3.2.1 实现方式
```typescript
class WorkflowContext extends ValueObject<WorkflowContextProps> {
  // 所有append方法返回this类型，支持链式调用
  appendNodeExecution(state: NodeExecutionState): this {
    // ... 实现
    return new WorkflowContext(newProps) as this;
  }
  
  appendPromptHistory(entry: Omit<PromptHistoryEntry, 'index'>): this {
    // ... 实现
    return new WorkflowContext(newProps) as this;
  }
  
  updateVariable(key: string, value: unknown): this {
    // ... 实现
    return new WorkflowContext(newProps) as this;
  }
}

// 使用链式调用
const newContext = context
  .appendNodeExecution({ nodeId: 'node-1', status: 'running' })
  .appendPromptHistory({ nodeId: 'node-1', type: 'input', role: 'user', content: 'test' })
  .updateVariable('currentNode', 'node-1')
  .updateMetadata({ step: 1 });
```

#### 3.2.2 最佳实践
```typescript
// 推荐：使用链式调用，代码简洁
const context = WorkflowContext.create('workflow-1', 'exec-1')
  .appendNodeExecution({ nodeId: 'start', status: 'completed' })
  .appendPromptHistory({ nodeId: 'start', type: 'output', role: 'assistant', content: 'Started' })
  .setCurrentNode('process-1');

// 避免：多次赋值，代码冗余
let context = WorkflowContext.create('workflow-1', 'exec-1');
context = context.appendNodeExecution({ nodeId: 'start', status: 'completed' });
context = context.appendPromptHistory({ nodeId: 'start', type: 'output', role: 'assistant', content: 'Started' });
context = context.setCurrentNode('process-1');
```

## 4. 错误处理

### 4.1 验证机制

#### 4.1.1 输入验证
```typescript
class WorkflowContext extends ValueObject<WorkflowContextProps> {
  appendNodeExecution(state: NodeExecutionState): WorkflowContext {
    // 验证节点ID
    if (!state.nodeId || typeof state.nodeId !== 'string') {
      throw new Error('Invalid nodeId: must be a non-empty string');
    }
    
    // 验证状态值
    if (!isValidNodeStatus(state.status)) {
      throw new Error(`Invalid status: ${state.status}`);
    }
    
    // 验证时间戳
    if (state.startTime && !(state.startTime instanceof Date)) {
      throw new Error('Invalid startTime: must be a Date object');
    }
    
    // ... 执行append操作
  }
}
```

#### 4.1.2 状态一致性检查
```typescript
class ExecutionState extends ValueObject<ExecutionStateProps> {
  addNodeExecution(state: NodeExecutionState): ExecutionState {
    // 检查节点是否已存在
    if (this.props.nodeExecutions.has(state.nodeId)) {
      throw new Error(`Node ${state.nodeId} already exists`);
    }
    
    // 检查状态转换是否合法
    const currentState = this.props.nodeExecutions.get(state.nodeId);
    if (currentState && !isValidStateTransition(currentState.status, state.status)) {
      throw new Error(`Invalid state transition from ${currentState.status} to ${state.status}`);
    }
    
    // ... 执行add操作
  }
}
```

### 4.2 错误恢复

#### 4.2.1 Try-Catch模式
```typescript
class SafeContextUpdater {
  safeAppendNodeExecution(
    context: WorkflowContext,
    state: NodeExecutionState
  ): { context: WorkflowContext; error: Error | null } {
    try {
      const newContext = context.appendNodeExecution(state);
      return { context: newContext, error: null };
    } catch (error) {
      // 返回原始上下文和错误信息
      return { context, error: error as Error };
    }
  }
}
```

## 5. 性能优化

### 5.1 批量操作

#### 5.1.1 批量追加接口
```typescript
interface PromptState {
  // 批量添加历史条目，性能优于多次单个添加
  addEntries(entries: Array<Omit<PromptHistoryEntry, 'index'>>): PromptState;
}

// 性能对比
// 方式1: 多次单个添加（不推荐）
let state = promptState;
for (const entry of entries) {
  state = state.addEntry(entry); // 每次创建新实例，性能差
}

// 方式2: 批量添加（推荐）
const newState = promptState.addEntries(entries); // 一次操作，性能好
```

#### 5.1.2 批量更新实现
```typescript
class PromptState extends ValueObject<PromptStateProps> {
  addEntries(entries: Array<Omit<PromptHistoryEntry, 'index'>>): PromptState {
    // 一次性创建新数组，避免多次复制
    const newHistory = [...this.props.history];
    let nextIndex = this.props.nextIndex;
    
    for (const entry of entries) {
      newHistory.push({
        ...entry,
        index: nextIndex++
      });
    }
    
    return new PromptState({
      ...this.props,
      history: newHistory,
      nextIndex
    });
  }
}
```

### 5.2 延迟计算

#### 5.2.1 统计信息延迟计算
```typescript
class ExecutionState extends ValueObject<ExecutionStateProps> {
  // 不缓存统计结果，每次重新计算
  // 避免每次更新时重新计算，提高更新性能
  getStatistics() {
    const nodeExecutions = Array.from(this.props.nodeExecutions.values());
    
    return {
      totalNodes: nodeExecutions.length,
      completedNodes: nodeExecutions.filter(n => n.status === 'completed').length,
      failedNodes: nodeExecutions.filter(n => n.status === 'failed').length,
      skippedNodes: nodeExecutions.filter(n => n.status === 'skipped').length
    };
  }
}
```

## 6. 使用规范

### 6.1 命名规范

#### 6.1.1 上下文变量命名
```typescript
// 推荐：使用描述性的变量名
const workflowContext = WorkflowContext.create('workflow-1', 'exec-1');
const updatedContext = workflowContext.appendNodeExecution(state);

// 避免：使用过于简短的变量名
const ctx = WorkflowContext.create('workflow-1', 'exec-1');
const newCtx = ctx.appendNodeExecution(state);
```

#### 6.1.2 更新操作命名
```typescript
// 使用append前缀表示追加操作
appendNodeExecution()
appendPromptHistory()
appendPromptHistories()

// 使用update前缀表示更新操作
updateNodeExecution()
updateVariable()
updateVariables()
updateMetadata()

// 使用set前缀表示设置操作
setCurrentNode()
setTemplate()
```

### 6.2 代码组织

#### 6.2.1 上下文更新集中管理
```typescript
// 推荐：在服务对象中集中管理上下文更新
class NodeExecutionService {
  private updateContextForNodeStart(
    context: WorkflowContext,
    node: Node
  ): WorkflowContext {
    return context
      .setCurrentNode(node.nodeId)
      .appendNodeExecution({
        nodeId: node.nodeId,
        status: 'running',
        startTime: new Date()
      })
      .updateMetadata({ lastNodeStart: Date.now() });
  }
  
  private updateContextForNodeComplete(
    context: WorkflowContext,
    node: Node,
    result: NodeExecutionResult
  ): WorkflowContext {
    return context.appendNodeExecution({
      nodeId: node.nodeId,
      status: 'completed',
      endTime: new Date(),
      executionTime: result.duration,
      result: result.output
    });
  }
}
```

#### 6.2.2 避免上下文分散更新
```typescript
// 避免：在多个地方更新同一个上下文
class BadExample {
  async execute(node: Node, context: WorkflowContext) {
    // 在方法开始更新
    let ctx = context.setCurrentNode(node.nodeId);
    
    // 在中间某个地方更新
    ctx = ctx.appendNodeExecution({ nodeId: node.nodeId, status: 'running' });
    
    // 在另一个方法中更新
    await this.someOtherMethod(node, ctx); // 内部可能再次更新上下文
    
    // 在方法结束更新
    ctx = ctx.appendNodeExecution({ nodeId: node.nodeId, status: 'completed' });
    
    return ctx;
  }
}
```
