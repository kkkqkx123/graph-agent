# Core/State模块需求分析与设计

## 需求分析

### 核心需求
1. 管理Thread的执行状态
2. 提供工作流上下文管理
3. 支持变量操作和作用域管理
4. 支持状态序列化和恢复

### 功能需求
1. Thread状态管理：创建、更新、查询Thread状态
2. 变量管理：变量的创建、读取、更新、删除
3. 上下文管理：工作流执行上下文的维护
4. 历史记录：执行历史的记录和查询
5. 状态快照：支持状态快照的创建和恢复

### 非功能需求
1. 状态可序列化
2. 线程安全（支持多Thread并发）
3. 性能优化（快速状态查询）
4. 内存高效（避免不必要的状态复制）

## 设计说明

### 模块结构

```
state/
├── thread-state.ts      # Thread状态管理
├── workflow-context.ts  # 工作流上下文
├── variable-manager.ts  # 变量管理器
└── history-manager.ts   # 历史记录管理器
```

### 核心组件

#### ThreadStateManager
Thread状态管理器，负责Thread的完整生命周期状态管理。

**职责**：
- 创建Thread状态
- 更新Thread状态
- 查询Thread状态
- 序列化和反序列化Thread状态

**核心方法**：
- createThread(workflowId: string, options: ThreadOptions): Thread
- updateThreadStatus(threadId: string, status: ThreadStatus): void
- getCurrentNode(threadId: string): string | null
- setCurrentNode(threadId: string, nodeId: string): void
- getThread(threadId: string): Thread | null
- serializeThread(threadId: string): string
- deserializeThread(data: string): Thread

**设计说明**：
- ThreadStateManager是Thread状态的唯一管理入口
- 不负责Thread的持久化，只负责内存中的状态管理
- 支持多个Thread并发执行
- Thread状态更新时触发相应事件

#### WorkflowContext
工作流上下文，提供工作流执行时的共享上下文。

**职责**：
- 维护工作流定义的引用
- 提供节点和边的查询接口
- 管理工作流级别的配置

**核心属性**：
- workflow: WorkflowDefinition
- config: WorkflowConfig
- nodeMap: Map<string, Node>
- edgeMap: Map<string, Edge>

**核心方法**：
- getNode(nodeId: string): Node | undefined
- getEdge(edgeId: string): Edge | undefined
- getOutgoingEdges(nodeId: string): Edge[]
- getIncomingEdges(nodeId: string): Edge[]
- validate(): boolean

**设计说明**：
- WorkflowContext是只读的，执行过程中不修改
- 提供高效的节点和边查询
- 支持边排序和过滤

#### VariableManager
变量管理器，负责Thread变量的管理。

**职责**：
- 变量的创建、读取、更新、删除
- 变量作用域管理
- 变量类型验证
- 变量表达式求值

**核心方法**：
- setVariable(threadId: string, name: string, value: any, type: VariableType): void
- getVariable(threadId: string, name: string): any
- hasVariable(threadId: string, name: string): boolean
- deleteVariable(threadId: string, name: string): void
- evaluateExpression(threadId: string, expression: string): any
- getAllVariables(threadId: string): Record<string, any>

**设计说明**：
- 支持多种变量类型：number、string、boolean、array、object
- 支持变量作用域：local、global
- 支持变量表达式求值（用于VARIABLE节点）
- 变量更新时触发相应事件

#### HistoryManager
历史记录管理器，负责Thread执行历史的记录和查询。

**职责**：
- 记录节点执行历史
- 记录工具调用历史
- 记录错误历史
- 提供历史查询接口

**核心方法**：
- recordNodeExecution(threadId: string, nodeId: string, result: NodeExecutionResult): void
- recordToolCall(threadId: string, toolCall: ToolCall): void
- recordError(threadId: string, error: Error): void
- getExecutionHistory(threadId: string): ExecutionHistory[]
- getNodeHistory(threadId: string, nodeId: string): NodeExecutionResult[]
- getToolHistory(threadId: string): ToolCall[]
- getErrorHistory(threadId: string): Error[]

**设计说明**：
- 历史记录按时间顺序存储
- 支持按节点、工具、错误类型过滤
- 历史记录不可修改，只能追加
- 用于审计和调试

### 设计原则

1. **单一职责**：每个组件只负责一个明确的功能
2. **状态隔离**：每个Thread的状态完全隔离
3. **不可变性**：历史记录不可修改
4. **事件驱动**：状态变更触发事件
5. **性能优先**：使用Map等数据结构优化查询性能

### 与其他模块的集成

#### 与Execution模块的集成
- Execution模块通过ThreadStateManager获取和更新Thread状态
- Execution模块通过WorkflowContext查询节点和边
- Execution模块通过VariableManager操作变量
- Execution模块通过HistoryManager记录执行历史

#### 与Checkpoint模块的集成
- Checkpoint模块从ThreadStateManager获取Thread状态快照
- Checkpoint模块将状态快照传递给ThreadStateManager进行恢复

#### 与Events模块的集成
- ThreadStateManager状态变更时触发事件
- VariableManager变量更新时触发事件
- HistoryManager记录历史时触发事件

### 依赖关系

- 依赖types层的Thread、WorkflowDefinition、Node、Edge等类型
- 依赖types层的ThreadStatus、VariableType等枚举
- 依赖types层的NodeExecutionResult、ToolCall等类型
- 被core/execution模块引用
- 被core/checkpoint模块引用

### 不包含的功能

以下功能不在state模块中实现：
- ❌ Thread的持久化（由应用层负责）
- ❌ Thread的查询和搜索（由应用层负责）
- ❌ Thread的生命周期管理（由execution模块负责）
- ❌ 变量的持久化（由应用层负责）
- ❌ 历史记录的持久化（由应用层负责）

### 使用示例

```typescript
// 1. 创建Thread状态
const stateManager = new ThreadStateManager();
const thread = stateManager.createThread('workflow-1', {
  input: { data: 'test' },
  maxSteps: 100
});

// 2. 创建工作流上下文
const context = new WorkflowContext(workflowDefinition);

// 3. 操作变量
const variableManager = new VariableManager();
variableManager.setVariable(thread.id, 'count', 0, 'number');
variableManager.setVariable(thread.id, 'name', 'test', 'string');
const count = variableManager.getVariable(thread.id, 'count');

// 4. 记录历史
const historyManager = new HistoryManager();
historyManager.recordNodeExecution(thread.id, 'node-1', {
  nodeId: 'node-1',
  status: 'completed',
  output: { result: 'success' }
});

// 5. 更新Thread状态
stateManager.updateThreadStatus(thread.id, ThreadStatus.RUNNING);
stateManager.setCurrentNode(thread.id, 'node-2');
```

### 注意事项

1. **线程安全**：支持多Thread并发执行，确保状态隔离
2. **内存管理**：及时清理已完成Thread的状态
3. **性能优化**：使用Map等数据结构优化查询性能
4. **错误处理**：变量操作失败时抛出明确的错误
5. **事件触发**：状态变更时及时触发相应事件