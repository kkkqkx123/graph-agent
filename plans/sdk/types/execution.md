# Execution类型需求分析与设计

## 需求分析

### 核心需求
1. 定义工作流执行的选项和结果
2. 定义节点执行的选项和结果
3. 支持执行过程中的状态跟踪
4. 支持执行事件和回调

### 功能需求
1. 执行选项支持输入、超时、回调等配置
2. 执行结果包含输出、错误、执行时间等
3. 节点执行结果包含节点级别的详细信息
4. 支持执行过程中的事件监听

### 非功能需求
1. 执行状态可序列化
2. 支持执行恢复
3. 执行结果可追踪

## 设计说明

### 核心类型

#### ExecutionOptions
工作流执行选项类型。

**属性**：
- input: 输入数据对象
- maxSteps: 最大执行步数
- timeout: 超时时间（毫秒）
- enableCheckpoints: 是否启用检查点
- onNodeExecuted: 节点执行完成回调
- onToolCalled: 工具调用回调
- onError: 错误回调

**设计说明**：
- 执行选项，不包含thread或workflow的引用
- 用于配置执行行为
- 回调函数用于事件监听

#### ExecutionResult
工作流执行结果类型。

**属性**：
- threadId: 线程ID
- success: 是否成功
- output: 输出数据
- error: 错误信息（如果有）
- executionTime: 执行时间（毫秒）
- nodeResults: 节点执行结果数组
- metadata: 执行元数据

**设计说明**：
- 执行结果，通过threadId关联到Thread
- 包含完整的执行信息
- 可序列化

#### NodeExecutionResult
节点执行结果类型。

**属性**：
- nodeId: 节点ID
- success: 是否成功
- output: 输出数据
- error: 错误信息（如果有）
- executionTime: 执行时间（毫秒）
- toolCalls: 工具调用数组
- metadata: 节点执行元数据

**设计说明**：
- 节点级别的执行结果
- 包含工具调用信息
- 用于记录节点执行历史

### 不包含的类型

以下类型已合并到Thread，不在Execution层定义：
- ❌ Execution实例类型（使用Thread）
- ❌ ExecutionStatus（使用ThreadStatus）
- ❌ ExecutionVariable（使用ThreadVariable）
- ❌ ExecutionMetadata（使用ThreadMetadata）
- ❌ ExecutionContext（使用Thread内部管理）

### 设计原则

1. **职责分离**：Execution层只负责选项和结果，不包含执行实例
2. **类型安全**：严格的类型定义
3. **事件驱动**：通过回调支持事件监听
4. **可序列化**：结果可序列化和反序列化

### 与Thread的集成

#### 使用方式
1. **创建Thread时**：使用ExecutionOptions配置执行参数
2. **执行完成后**：返回ExecutionResult
3. **节点执行时**：记录NodeExecutionResult到Thread的nodeResults

#### 职责划分
- **Thread**: 执行实例，包含所有执行状态
- **ExecutionOptions**: 执行配置，不包含实例引用
- **ExecutionResult**: 执行结果，通过threadId关联到Thread
- **NodeExecutionResult**: 节点结果，记录在Thread中

### 依赖关系

- 依赖common类型定义基础类型
- 依赖node类型（NodeExecutionResult中的nodeId）
- 依赖tool类型（NodeExecutionResult中的toolCalls）
- 依赖thread类型（ExecutionResult中的threadId）
- 不依赖workflow类型（避免循环依赖）
- 被core/execution模块引用
- 被api层引用