# tool-runner.ts - 工具运行器逻辑设计

## 需求分析

工具运行器需要提供以下核心能力：
1. 自动处理工具调用循环
2. 参数动态更新
3. 工具响应缓存
4. 最大迭代次数限制

参考 Anthropic SDK 的 ToolRunner 设计，简化工具调用流程。

## 核心职责

1. 工具调用循环管理
2. 参数动态更新
3. 工具响应缓存
4. 迭代控制

## 主要属性

- consumed: 是否已消费
- mutated: 参数是否已修改
- state: 当前状态，包含参数
- message: 最后的消息 Promise
- toolResponse: 缓存的工具响应 Promise
- completion: 完成 Promise
- iterationCount: 迭代次数

## 工具调用循环

```
assistant response → tool execution → tool results → 重复
```

循环终止条件：
1. 没有工具调用且参数未修改
2. 达到最大迭代次数
3. 发生错误

## 主要方法逻辑

### 1. setParams 方法 - 更新参数

更新工具运行器的参数，支持直接传入参数对象或使用更新函数。

执行步骤：

步骤1：检查参数类型
- 如果是函数，调用函数更新参数
- 如果是对象，直接替换参数

步骤2：更新状态
- 更新 state.params
- 设置 mutated 标志为 true

步骤3：清除缓存
- 清除 toolResponse 缓存

### 2. generateToolResponse 方法 - 生成工具响应

生成工具响应，避免重复执行工具。

执行步骤：

步骤1：获取最后一条消息
- 从 message Promise 获取最后一条消息
- 如果 message 为空，从 params.messages 获取最后一条消息
- 如果都没有，返回 null

步骤2：检查缓存
- 如果 toolResponse 已存在，直接返回
- 如果不存在，调用内部生成方法

步骤3：返回工具响应
- 返回生成的工具响应

### 3. 内部生成工具响应方法

内部方法，实际生成工具响应。

执行步骤：

步骤1：检查缓存
- 如果 toolResponse 已存在，直接返回

步骤2：检查是否有工具调用
- 检查最后一条消息是否有 toolCalls
- 如果没有或为空，设置 toolResponse 为 null 并返回

步骤3：执行工具调用
- 遍历所有工具调用
- 对每个工具调用：
  - 触发 onToolCall 回调（如果存在）
  - 调用 conversation.executeToolCall 执行工具
  - 捕获执行异常
  - 将结果或错误转换为工具结果格式

步骤4：构建工具消息
- 创建工具消息对象
- role 设置为 'tool'
- content 设置为工具结果数组
- toolCallId 设置为第一个工具调用的 ID

步骤5：触发回调
- 触发 onToolResult 回调（如果存在）

步骤6：缓存结果
- 设置 toolResponse 为工具消息 Promise

步骤7：返回工具消息
- 返回工具消息

### 4. done 方法 - 等待完成

返回一个 Promise，当工具运行器完成时解析。

执行步骤：

步骤1：返回 completion.promise
- 返回内部存储的 completion Promise

### 5. runUntilDone 方法 - 运行直到完成

运行工具运行器直到完成，返回最终消息。

执行步骤：

步骤1：检查是否已消费
- 如果未消费，开始消费迭代器
- 遍历迭代器，自然填充 message

步骤2：等待完成
- 调用 done() 方法等待完成

步骤3：返回最终消息
- 返回最终消息

### 6. get params 方法 - 获取当前参数

获取当前参数的只读视图。

执行步骤：

步骤1：返回 state.params
- 返回 state.params 的只读版本

### 7. pushMessages 方法 - 添加消息

向消息数组中添加消息。

执行步骤：

步骤1：使用 setParams 更新参数
- 调用 setParams 方法
- 传入更新函数
- 在函数中将新消息添加到 messages 数组

### 8. AsyncIterable 接口

实现 AsyncIterable 接口，支持 for await...of 语法。

执行步骤：

步骤1：检查是否已消费
- 如果已消费，抛出异常

步骤2：设置标志
- 设置 consumed 为 true
- 设置 mutated 为 true
- 清除 toolResponse 缓存

步骤3：开始循环
- 使用 while (true) 循环

步骤4：检查最大迭代次数
- 如果设置了 maxIterations 且达到最大次数，跳出循环

步骤5：重置状态
- 设置 mutated 为 false
- 清除 message
- 清除 toolResponse
- 增加迭代次数

步骤6：执行 LLM 调用
- 调用 conversation.executeLLMCallStream
- 传入当前消息和工具
- 获取流式响应

步骤7：获取最终消息
- 调用 stream.finalMessage() 获取最终消息
- 设置 message 为最终消息 Promise
- 捕获异常，避免提前抛出

步骤8：触发迭代回调
- 如果设置了 onIteration 回调，触发回调
- 传入迭代次数和消息

步骤9：添加消息到历史
- 如果参数未修改，将消息添加到 messages 数组

步骤10：生成工具响应
- 调用 generateToolResponse 生成工具响应
- 如果有工具响应，添加到 messages 数组

步骤11：检查终止条件
- 如果没有工具响应且参数未修改，跳出循环

步骤12：yield 消息
- yield 消息

步骤13：处理异常
- 如果发生异常：
  - 重置 consumed 标志
  - 清除 completion Promise 的错误处理
  - 创建新的 completion Promise
  - reject 新的 completion Promise
  - 抛出异常

步骤14：完成循环
- 如果循环正常结束：
  - 检查 message 是否存在
  - 如果不存在，抛出异常
  - resolve completion Promise

### 9. then 方法 - Thenable 接口

实现 Thenable 接口，支持 await 语法。

执行步骤：

步骤1：调用 runUntilDone
- 调用 runUntilDone() 方法

步骤2：返回 Promise
- 返回 runUntilDone() 的 Promise
- 支持 then 和 catch 方法

## 错误处理

1. 工具执行失败：将错误信息作为工具结果返回
2. LLM 调用失败：抛出异常，重置状态
3. 达到最大迭代次数：正常结束循环
4. 参数更新失败：记录错误，继续执行

## 性能考虑

1. 工具响应缓存避免重复执行
2. 参数更新使用标志位，避免不必要的操作
3. 工具调用可以并行执行（如果工具之间无依赖）

## 扩展点

1. 自定义迭代回调
2. 自定义工具调用回调
3. 自定义工具结果回调
4. 自定义最大迭代次数

## 使用场景

1. 在 Conversation 中使用：自动化工具调用流程
2. 在 LLM 节点中使用：简化工具调用逻辑
3. 在应用层中使用：自定义工具调用流程

## 注意事项

1. 工具运行器只能消费一次
2. 参数更新会清除工具响应缓存
3. 工具执行失败不会中断循环
4. 达到最大迭代次数会正常结束
5. 工具运行器不负责终止逻辑，由主执行引擎控制

## 与 Conversation 的关系

- ToolRunner 依赖 Conversation 执行 LLM 调用和工具调用
- ToolRunner 管理工具调用循环，Conversation 管理消息历史
- ToolRunner 可以独立使用，也可以集成到 Conversation 中
- ToolRunner 不负责终止逻辑，由主执行引擎控制