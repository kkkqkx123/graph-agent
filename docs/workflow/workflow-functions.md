# 工作流函数系统文档

## 概述

工作流函数系统是图工作流引擎的核心组件，提供了一系列内置函数来控制工作流的执行流程。主要包括三种类型的函数：

1. **条件函数 (Conditions)** - 用于评估布尔表达式，返回true或false
2. **路由函数 (Routing)** - 用于决定工作流的执行路径
3. **触发器函数 (Triggers)** - 用于确定何时触发特定的工作流动作

本文档重点介绍条件函数和路由函数。

## 条件函数 (Conditions)

### 作用

条件函数用于评估工作流中的条件表达式，返回布尔值(true/false)，主要用于：

- 工作流中的分支决策
- 条件判断和路由选择
- 控制工作流执行流程

### 基类

所有条件函数继承自 `BaseConditionFunction` 基类，该基类提供了：

- 统一的接口和行为
- 配置加载支持
- 参数验证
- 执行上下文管理

### 内置条件函数

#### 1. HasErrorsConditionFunction
- **ID**: `condition:has_errors`
- **功能**: 检查工作流状态中是否有错误
- **用途**: 在错误处理流程中判断是否发生了错误
- **配置要求**: 无特殊配置要求，使用上下文中的 `tool_results` 和 `messages` 变量

#### 2. HasToolCallsConditionFunction
- **ID**: `condition:has_tool_calls`
- **功能**: 检查是否有工具调用
- **用途**: 判断是否需要处理工具调用结果
- **配置要求**: 无特殊配置要求，使用上下文中的 `tool_calls` 变量

#### 3. HasToolResultsConditionFunction
- **ID**: `condition:has_tool_results`
- **功能**: 检查是否有工具结果
- **用途**: 判断是否已有工具执行结果
- **配置要求**: 无特殊配置要求，使用上下文中的 `tool_results` 变量

#### 4. NoToolCallsConditionFunction
- **ID**: `condition:no_tool_calls`
- **功能**: 检查是否没有工具调用
- **用途**: 判断是否没有待处理的工具调用
- **配置要求**: 无特殊配置要求，使用上下文中的 `tool_calls` 变量

#### 5. MaxIterationsReachedConditionFunction
- **ID**: `condition:max_iterations_reached`
- **功能**: 检查是否达到最大迭代次数
- **用途**: 控制循环或重复执行的终止条件
- **配置要求**: 需要提供 `maxIterations` 配置项和当前迭代次数

### 使用场景

条件函数在以下组件中被使用：

- `ThreadConditionalRouter` - 用于评估边的条件表达式
- `ConditionNode` - 用于条件判断和路由决策
- `WaitNode` - 用于等待条件满足
- `ForkNode` - 用于并行分支的条件评估

## 路由函数 (Routing)

### 作用

路由函数用于决定工作流的执行路径，主要有两种类型：

1. **条件路由函数** - 返回布尔值，用于条件判断
2. **目标路由函数** - 返回目标节点ID，用于路径选择

### 基类

路由函数有两种基类：

- `BaseConditionRoutingFunction` - 用于条件判断型路由函数，返回boolean
- `BaseTargetRoutingFunction` - 用于目标选择型路由函数，返回目标节点ID

### 内置路由函数

#### 1. ConditionalRoutingFunction
- **ID**: `route:conditional`
- **功能**: 基于配置的条件数组进行路由决策
- **特性**:
  - 支持复杂的条件组合和表达式评估
  - 支持多种匹配模式(first, all, any)
  - 支持默认节点配置

#### 2. NodeSuccessRoutingFunction
- **ID**: `route:node_success`
- **功能**: 检查节点是否执行成功
- **用途**: 根据节点执行结果决定后续路径
- **配置要求**: 需要提供 `edge.fromNodeId` 和 `nodeStates`

#### 3. NodeFailedRoutingFunction
- **ID**: `route:node_failed`
- **功能**: 检查节点是否执行失败
- **用途**: 错误处理路径的选择
- **配置要求**: 需要提供 `edge.fromNodeId` 和 `nodeStates`

#### 4. VariableExistsRoutingFunction
- **ID**: `route:variable_exists`
- **功能**: 检查变量是否存在
- **用途**: 根据变量存在性决定执行路径
- **配置要求**: 需要提供 `edge.properties.variableName` 和 `variables`

#### 5. VariableEqualsRoutingFunction
- **ID**: `route:variable_equals`
- **功能**: 检查变量值是否等于指定值
- **用途**: 根据变量值决定执行路径
- **配置要求**: 需要提供 `edge.properties.variableName`、`expectedValue` 和 `variables`

#### 6. RetryCountRoutingFunction
- **ID**: `route:retry_count`
- **功能**: 检查重试次数是否达到指定值
- **用途**: 控制重试逻辑的执行路径
- **配置要求**: 需要提供 `edge.properties.maxRetries` 和 `currentNodeState`

#### 7. ExecutionTimeoutRoutingFunction
- **ID**: `route:execution_timeout`
- **功能**: 检查执行时长是否超过指定时间
- **用途**: 超时处理路径的选择
- **配置要求**: 需要提供 `edge.properties.timeoutMs` 和 `currentNodeState`

#### 8. ProgressReachedRoutingFunction
- **ID**: `route:progress_reached`
- **功能**: 检查工作流进度是否达到指定值
- **用途**: 基于进度的路由决策
- **配置要求**: 需要提供 `edge.properties.targetProgress` 和 `executionState`

#### 9. AllNodesCompletedRoutingFunction
- **ID**: `route:all_nodes_completed`
- **功能**: 检查所有节点是否已完成
- **用途**: 工作流结束条件的判断
- **配置要求**: 需要提供 `executionState` 包含总节点数和已完成节点数

### 使用场景

路由函数在以下组件中被使用：

- `EdgeExecutor` - 用于执行边的路由逻辑
- `ThreadConditionalRouter` - 用于工作流的路径选择
- 工作流引擎中的各种决策点

## 函数注册与管理

### FunctionRegistry

所有函数都通过 `FunctionRegistry` 进行注册和管理，提供：

- 类型安全的函数访问
- 单例模式和工厂模式支持
- 配置加载支持
- 函数生命周期管理

### 注册模式

1. **单例模式** - 适用于逻辑固定的函数
2. **工厂模式** - 适用于需要动态配置的函数

## 执行流程

1. 函数通过 `FunctionRegistry` 获取
2. 构建 `WorkflowExecutionContext` 执行上下文
3. 调用函数的 `execute` 方法
4. 返回执行结果

## 扩展开发

要开发自定义函数，可以：

1. 继承相应的基类 (`BaseConditionFunction`, `BaseConditionRoutingFunction`, `BaseTargetRoutingFunction`)
2. 实现 `execute` 方法
3. 注册到 `FunctionRegistry`

## 总结

条件函数和路由函数是工作流引擎的重要组成部分，它们提供了灵活的控制机制，使工作流能够根据不同的条件和状态做出相应的决策，从而实现复杂的工作流逻辑。