# NodeExecutor 设计文档

## 需求分析

### 核心需求
执行单个节点的具体逻辑，提供统一的节点执行接口。

### 功能需求
1. 验证节点配置
2. 检查节点是否可以执行
3. 执行节点的具体逻辑
4. 返回标准化的执行结果
5. 处理执行错误

### 非功能需求
1. 可扩展性：支持多种节点类型
2. 可测试性：易于单元测试
3. 错误处理：清晰的错误信息

## 核心职责

1. 节点验证
2. 执行前置检查
3. 节点逻辑执行
4. 结果封装

## 主要属性

无公共属性，所有依赖通过方法参数传入。

## 核心方法

### execute 方法

接收 thread 和节点定义，返回节点执行结果。

执行步骤：

步骤 1：验证节点配置
- 调用 validate 方法
- 检查节点 ID、名称、类型是否有效 
- 如果验证失败，抛出 ValidationError

步骤 2：检查是否可以执行
- 调用 canExecute 方法
- 检查 thread 状态是否为 RUNNING
- 检查节点是否满足执行条件
- 如果不能执行，返回 SKIPPED 状态

步骤 3：记录开始时间
- 设置 startTime 为当前时间戳

步骤 4：执行节点逻辑
- 调用 doExecute 方法
- 传入 thread 和节点定义
- 等待执行完成

步骤 5：返回成功结果
- 创建 NodeExecutionResult
- 设置 nodeId、nodeType、status 为 COMPLETED
- 设置 output 为执行输出
- 设置 executionTime、startTime、endTime

步骤 6：处理执行错误
- 捕获执行过程中的错误
- 创建 NodeExecutionResult
- 设置 status 为 FAILED
- 设置 error 为错误信息
- 设置 executionTime、startTime、endTime

步骤 7：返回执行结果
- 返回 NodeExecutionResult

### validate 方法

验证节点配置的有效性。

执行步骤：

步骤 1：检查基本字段
- 检查 node.id 是否存在且非空
- 检查 node.name 是否存在且非空
- 检查 node.type 是否存在且非空
- 如果任何字段无效，返回 false

步骤 2：检查节点类型
- 验证 node.type 是否为有效的节点类型
- 如果类型无效，返回 false

步骤 3：检查节点配置
- 根据节点类型检查特定配置
- 如果配置无效，返回 false

步骤 4：返回验证结果
- 返回 true 表示验证通过

### canExecute 方法

检查节点是否可以执行。

执行步骤：

步骤 1：检查 thread 状态
- 检查 thread.status 是否为 RUNNING
- 如果不是 RUNNING，返回 false

步骤 2：检查节点条件
- 如果节点有执行条件，评估条件
- 如果条件不满足，返回 false

步骤 3：返回执行结果
- 返回 true 表示可以执行

### doExecute 方法（抽象方法）

执行节点的具体逻辑，由子类实现。

参数：
- thread: Thread 实例
- node: 节点定义

返回：
- 节点执行输出

说明：
- 这是一个抽象方法，必须由子类实现
- 子类根据节点类型实现具体的执行逻辑
- 可以抛出异常，由 execute 方法捕获

## 节点类型实现

### LLMNodeExecutor
执行 LLM 节点。

执行步骤：
1. 从节点配置获取 LLM 配置
2. 创建或获取 Conversation 实例
3. 调用 Conversation.sendMessage
4. 返回 LLM 响应

### ToolNodeExecutor
执行工具节点。

执行步骤：
1. 从节点配置获取工具名称和参数
2. 调用 ToolService.executeTool
3. 返回工具执行结果

### CodeNodeExecutor
执行代码节点。

执行步骤：
1. 从节点配置获取代码和语言
2. 在沙箱环境中执行代码
3. 返回执行结果

### ConditionNodeExecutor
执行条件节点。

执行步骤：
1. 从节点配置获取条件表达式
2. 评估条件表达式
3. 返回评估结果

### TransformNodeExecutor
执行转换节点。

执行步骤：
1. 从节点配置获取转换规则
2. 应用转换规则到输入数据
3. 返回转换后的数据

## 错误处理

### 验证失败
- 抛出 ValidationError
- 包含详细的验证错误信息

### 执行失败
- 捕获异常并返回 FAILED 状态
- 记录错误信息到执行结果
- 不抛出异常，由调用者处理

### 超时
- 检查执行时间是否超时
- 如果超时，返回 FAILED 状态
- 记录超时错误

## 注意事项

1. **不依赖 ExecutionContext**：只接收 thread 和 node 参数
2. **职责单一**：只负责节点执行，不负责路由和状态管理
3. **错误封装**：将错误封装到执行结果中，不抛出异常
4. **可扩展性**：通过继承支持新的节点类型
5. **类型安全**：充分利用 TypeScript 类型检查