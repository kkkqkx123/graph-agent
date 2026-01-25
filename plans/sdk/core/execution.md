# Core/Execution模块需求分析与设计

## 需求分析

### 核心需求
1. 实现工作流执行引擎
2. 支持15种节点类型的执行
3. 支持条件路由和边选择
4. 支持Fork/Join操作
5. 支持错误处理和重试

### 功能需求
1. 工作流执行：从START节点到END节点的完整执行流程
2. 节点执行：每种节点类型的特定执行逻辑
3. 路由决策：根据条件选择下一个节点
4. 并行执行：支持Fork/Join的并行执行
5. 错误处理：节点执行失败时的错误处理策略
6. 超时控制：节点和工作流的超时控制
7. 重试机制：节点执行失败时的重试逻辑

### 非功能需求
1. 执行性能优化
2. 内存使用高效
3. 错误处理完善
4. 可观测性强（事件、日志）

## 设计说明

### 模块结构

```
execution/
├── workflow-executor.ts    # 工作流执行器
├── node-executor.ts        # 节点执行器基类
├── node-executors/         # 各类节点执行器
│   ├── start.ts
│   ├── end.ts
│   ├── variable.ts
│   ├── fork.ts
│   ├── join.ts
│   ├── subgraph.ts
│   ├── code.ts
│   ├── llm.ts
│   ├── tool.ts
│   ├── user-interaction.ts
│   ├── route.ts
│   ├── context-processor.ts
│   ├── loop-start.ts
│   └── loop-end.ts
├── router.ts               # 路由器
├── fork-join-manager.ts    # Fork/Join管理器
└── error-handler.ts        # 错误处理器
```

### 核心组件

#### WorkflowExecutor
工作流执行器，负责整个工作流的执行流程。

**职责**：
- 初始化工作流执行
- 协调节点执行顺序
- 管理执行生命周期
- 处理执行结果

**核心方法**：
- execute(workflow: WorkflowDefinition, options: ThreadOptions): Promise<ThreadResult>
- executeThread(thread: Thread): Promise<ThreadResult>
- pause(threadId: string): Promise<void>
- resume(threadId: string): Promise<ThreadResult>
- cancel(threadId: string): Promise<void>

**执行流程**：
1. 验证工作流定义
2. 创建Thread实例
3. 初始化执行上下文
4. 从START节点开始执行
5. 按照边路由执行节点
6. 到达END节点时完成
7. 返回执行结果

**设计说明**：
- WorkflowExecutor是执行引擎的入口
- 使用状态机模式管理执行状态
- 支持暂停、恢复、取消操作
- 执行过程中触发相应事件

#### NodeExecutor
节点执行器基类，定义节点执行的通用接口。

**职责**：
- 定义节点执行的标准接口
- 提供节点执行的通用逻辑
- 处理节点执行的前置和后置操作

**核心方法**：
- execute(context: ExecutionContext): Promise<NodeExecutionResult>
- validate(node: Node): boolean
- canExecute(node: Node, context: ExecutionContext): boolean

**设计说明**：
- 所有节点执行器继承自NodeExecutor
- 提供统一的执行接口
- 处理超时、重试等通用逻辑

#### 节点执行器实现

##### StartNodeExecutor
开始节点执行器。

**职责**：
- 标记工作流开始
- 初始化Thread状态
- 触发THREAD_STARTED事件

**执行逻辑**：
1. 验证START节点唯一性
2. 初始化Thread状态
3. 触发THREAD_STARTED事件
4. 返回成功结果

##### EndNodeExecutor
结束节点执行器。

**职责**：
- 标记工作流结束
- 收集执行结果
- 触发THREAD_COMPLETED事件

**执行逻辑**：
1. 验证END节点唯一性
2. 收集Thread的输出数据
3. 触发THREAD_COMPLETED事件
4. 返回最终结果

##### VariableNodeExecutor
变量操作节点执行器。

**职责**：
- 执行变量表达式
- 更新变量值
- 支持多种变量类型

**执行逻辑**：
1. 获取变量配置（variableName、variableType、expression）
2. 使用VariableManager求值表达式
3. 更新变量值
4. 返回执行结果

**示例**：
```
variableName: "a"
variableType: "number"
expression: "a + 1"
```

##### ForkNodeExecutor
分叉节点执行器。

**职责**：
- 创建子Thread
- 支持串行和并行分叉策略
- 触发THREAD_FORKED事件

**执行逻辑**：
1. 获取分叉配置（forkId、forkStrategy）
2. 根据策略创建子Thread
3. 串行：依次执行子Thread
4. 并行：同时执行子Thread
5. 触发THREAD_FORKED事件
6. 返回分叉结果

##### JoinNodeExecutor
连接节点执行器。

**职责**：
- 等待子Thread完成
- 根据策略合并结果
- 触发THREAD_JOINED事件

**执行逻辑**：
1. 获取连接配置（joinId、joinStrategy、threshold、timeout）
2. 等待子Thread完成
3. 根据策略判断是否继续：
   - ALL_COMPLETED：所有子Thread完成
   - ANY_COMPLETED：任意子Thread完成
   - SUCCESS_COUNT_THRESHOLD：达到成功数量阈值
4. 合并子Thread结果
5. 触发THREAD_JOINED事件
6. 返回合并结果

##### CodeNodeExecutor
代码节点执行器。

**职责**：
- 执行脚本代码
- 支持多种脚本语言
- 处理超时和重试

**执行逻辑**：
1. 获取脚本配置（scriptName、scriptType、risk、timeout、retries）
2. 根据risk等级选择执行策略
3. 执行脚本代码
4. 处理超时和重试
5. 返回执行结果

**脚本类型**：shell、cmd、powershell、python、javascript

**风险等级**：none、low、medium、high

##### LLMNodeExecutor
LLM节点执行器。

**职责**：
- 调用LLM API
- 处理LLM响应
- 支持流式和非流式调用

**执行逻辑**：
1. 获取LLM配置（profileId、prompt、parameters）
2. 从LLMProfile获取LLM配置
3. 解析prompt中的变量引用
4. 调用LLMClient
5. 处理LLM响应
6. 返回执行结果

##### ToolNodeExecutor
工具节点执行器。

**职责**：
- 执行工具调用
- 处理工具响应
- 支持超时和重试

**执行逻辑**：
1. 获取工具配置（toolName、parameters、timeout、retries）
2. 调用ToolService执行工具
3. 处理工具响应
4. 返回执行结果

##### UserInteractionNodeExecutor
用户交互节点执行器。

**职责**：
- 触发用户交互
- 等待用户输入
- 返回用户响应

**执行逻辑**：
1. 获取交互配置（userInteractionType、showMessage）
2. 触发用户交互事件
3. 等待用户输入
4. 返回用户响应

**交互类型**：ask_for_approval、ask_for_input、ask_for_selection、show_message

##### RouteNodeExecutor
路由节点执行器。

**职责**：
- 评估条件表达式
- 选择下一个节点
- 支持多条件路由

**执行逻辑**：
1. 获取路由配置（conditions、nextNodes）
2. 依次评估每个条件
3. 选择第一个满足条件的节点
4. 返回路由结果

**注意**：只能路由到邻接节点

##### ContextProcessorNodeExecutor
上下文处理器节点执行器。

**职责**：
- 处理消息上下文
- 支持多种处理策略

**执行逻辑**：
1. 获取处理器配置（contextProcessorType、contextProcessorConfig）
2. 根据类型处理上下文：
   - PASS_THROUGH：直接传递
   - FILTER_IN：过滤保留
   - FILTER_OUT：过滤排除
   - TRANSFORM：转换
   - ISOLATE：隔离
   - MERGE：合并
3. 返回处理后的上下文

##### LoopStartNodeExecutor
循环开始节点执行器。

**职责**：
- 初始化循环变量
- 设置循环条件
- 控制循环流程

**执行逻辑**：
1. 获取循环配置（loopId、iterable、maxIterations）
2. 初始化循环变量
3. 检查循环条件
4. 返回循环控制结果

##### LoopEndNodeExecutor
循环结束节点执行器。

**职责**：
- 更新循环变量
- 检查中断条件
- 控制循环跳转

**执行逻辑**：
1. 获取循环配置（loopId、iterable、breakCondition）
2. 更新循环变量
3. 检查中断条件
4. 决定是否继续循环
5. 返回循环控制结果

#### Router
路由器，负责条件路由和边选择。

**职责**：
- 评估边条件
- 选择下一个节点
- 支持边排序和过滤

**核心方法**：
- selectNextNode(nodeId: string, context: ExecutionContext): string | null
- evaluateEdgeCondition(edge: Edge, context: ExecutionContext): boolean
- sortEdges(edges: Edge[]): Edge[]
- filterEdges(edges: Edge[], context: ExecutionContext): Edge[]

**路由策略**：
1. 获取当前节点的所有出边
2. 过滤满足条件的边
3. 按优先级和权重排序
4. 选择第一个边
5. 返回目标节点ID

#### ForkJoinManager
Fork/Join管理器，负责线程的分叉和合并。

**职责**：
- 管理子Thread的创建
- 协调子Thread的执行
- 合并子Thread的结果

**核心方法**：
- fork(parentThread: Thread, config: ForkNodeConfig): Thread[]
- join(parentThread: Thread, childThreads: Thread[], config: JoinNodeConfig): Promise<JoinResult>
- waitForCompletion(threads: Thread[], strategy: JoinStrategy, timeout: number): Promise<Thread[]>

**设计说明**：
- 支持串行和并行分叉
- 支持多种合并策略
- 处理超时和错误

#### ErrorHandler
错误处理器，负责执行过程中的错误处理。

**职责**：
- 捕获执行错误
- 根据策略处理错误
- 触发错误事件

**核心方法**：
- handleError(error: Error, context: ExecutionContext): Promise<ErrorHandlingResult>
- shouldRetry(error: Error, retries: number): boolean
- getRetryDelay(retries: number): number

**错误处理策略**：
1. 记录错误到历史
2. 触发ERROR事件
3. 根据配置决定是否重试
4. 决定是否继续执行

### 设计原则

1. **单一职责**：每个执行器只负责一种节点类型的执行
2. **策略模式**：使用策略模式处理不同的执行策略
3. **事件驱动**：执行过程中触发相应事件
4. **错误隔离**：节点执行错误不影响其他节点
5. **可扩展性**：易于添加新的节点类型

### 与其他模块的集成

#### 与State模块的集成
- 通过ThreadStateManager获取和更新Thread状态
- 通过WorkflowContext查询节点和边
- 通过VariableManager操作变量
- 通过HistoryManager记录执行历史

#### 与LLM模块的集成
- LLMNodeExecutor调用LLMWrapper执行LLM调用

#### 与Tools模块的集成
- ToolNodeExecutor调用ToolService执行工具调用

#### 与Validation模块的集成
- 执行前验证工作流定义
- 执行前验证节点配置

#### 与Events模块的集成
- 执行过程中触发各种事件
- 事件包含执行上下文信息

### 依赖关系

- 依赖types层的所有类型定义
- 依赖core/state模块
- 依赖core/llm模块
- 依赖core/tools模块
- 依赖core/validation模块
- 被api/sdk模块引用

### 不包含的功能

以下功能不在execution模块中实现：
- ❌ 工作流的持久化（由应用层负责）
- ❌ Thread的持久化（由应用层负责）
- ❌ 执行结果的持久化（由应用层负责）
- ❌ 执行监控和告警（由应用层负责）

### 使用示例

```typescript
// 1. 创建工作流执行器
const executor = new WorkflowExecutor();

// 2. 执行工作流
const result = await executor.execute(workflowDefinition, {
  input: { data: 'test' },
  maxSteps: 100,
  timeout: 60000
});

// 3. 暂停执行
await executor.pause(threadId);

// 4. 恢复执行
const result = await executor.resume(threadId);

// 5. 取消执行
await executor.cancel(threadId);
```

### 注意事项

1. **执行顺序**：严格按照边的顺序执行节点
2. **错误处理**：节点执行错误不影响其他节点
3. **超时控制**：节点和工作流都支持超时控制
4. **重试机制**：节点执行失败时支持重试
5. **事件触发**：执行过程中及时触发相应事件
6. **状态一致性**：确保Thread状态的一致性