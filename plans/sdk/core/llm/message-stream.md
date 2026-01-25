# message-stream.ts - 消息流逻辑设计

## 需求分析

消息流需要提供以下核心能力：
1. 事件驱动的流式响应处理
2. 流拆分（tee 方法）
3. 便捷方法（finalMessage、finalText、done）
4. 与 LLM Client 的流式响应集成

参考 Anthropic SDK 的 MessageStream 设计，提供灵活的事件监听机制。

## 核心职责

1. 事件驱动架构
2. 流式响应处理
3. 流拆分
4. 便捷方法

## 主要属性

- messages: 消息数组，存储对话历史
- receivedMessages: 接收的消息数组
- currentMessageSnapshot: 当前消息快照
- controller: AbortController，用于中止流
- listeners: 事件监听器映射
- ended: 是否已结束
- errored: 是否出错
- aborted: 是否已中止
- response: 原始 Response 对象
- requestId: 请求 ID

## 事件类型

### 1. connect - 连接建立

当流式响应连接建立时触发。

### 2. streamEvent - 流事件

每次接收到流式事件时触发，包含事件和当前消息快照。

### 3. text - 文本增量

当接收到文本增量时触发，包含增量文本和当前文本快照。

### 4. toolCall - 工具调用

当接收到工具调用时触发，包含工具调用和当前消息快照。

### 5. message - 消息

当接收到完整消息时触发。

### 6. finalMessage - 最终消息

当流结束时触发，包含最终消息。

### 7. error - 错误

当发生错误时触发。

### 8. abort - 中止

当流被中止时触发。

### 9. end - 结束

当流结束时触发。

## 主要方法逻辑

### 1. on 方法 - 添加事件监听器

为指定事件添加监听器。

执行步骤：

步骤1：检查事件类型
- 验证事件类型是否有效
- 如果无效，抛出异常

步骤2：获取监听器数组
- 从 listeners 映射中获取指定事件的监听器数组
- 如果不存在，创建新数组

步骤3：添加监听器
- 将监听器添加到数组末尾
- 设置 once 标志为 false

步骤4：返回 this
- 支持链式调用

### 2. off 方法 - 移除事件监听器

从指定事件中移除监听器。

执行步骤：

步骤1：获取监听器数组
- 从 listeners 映射中获取指定事件的监听器数组
- 如果不存在，直接返回

步骤2：查找监听器
- 遍历监听器数组
- 查找与传入监听器相同的监听器

步骤3：移除监听器
- 如果找到，从数组中移除
- 如果未找到，不做任何操作

步骤4：返回 this
- 支持链式调用

### 3. once 方法 - 添加一次性事件监听器

为指定事件添加一次性监听器，触发后自动移除。

执行步骤：

步骤1：检查事件类型
- 验证事件类型是否有效
- 如果无效，抛出异常

步骤2：获取监听器数组
- 从 listeners 映射中获取指定事件的监听器数组
- 如果不存在，创建新数组

步骤3：添加监听器
- 将监听器添加到数组末尾
- 设置 once 标志为 true

步骤4：返回 this
- 支持链式调用

### 4. emitted 方法 - 等待事件触发

返回一个 Promise，当指定事件触发时解析。

执行步骤：

步骤1：创建 Promise
- 创建一个新的 Promise
- 设置 resolve 和 reject 回调

步骤2：添加错误监听器
- 如果事件不是 error，添加一次性 error 监听器
- 如果 error 触发，reject Promise

步骤3：添加事件监听器
- 添加一次性事件监听器
- 当事件触发时，resolve Promise

步骤4：返回 Promise
- 返回创建的 Promise

### 5. finalMessage 方法 - 获取最终消息

返回一个 Promise，当流结束时解析为最终消息。

执行步骤：

步骤1：等待流结束
- 调用 done() 方法等待流结束

步骤2：获取最终消息
- 从 receivedMessages 数组中获取最后一条消息
- 如果数组为空，抛出异常

步骤3：返回消息
- 返回最终消息

### 6. finalText 方法 - 获取最终文本

返回一个 Promise，当流结束时解析为最终文本。

执行步骤：

步骤1：等待流结束
- 调用 done() 方法等待流结束

步骤2：获取最终消息
- 从 receivedMessages 数组中获取最后一条消息
- 如果数组为空，抛出异常

步骤3：提取文本内容
- 如果消息 content 是字符串，直接返回
- 如果消息 content 是数组，提取所有 text 类型的内容并拼接

步骤4：返回文本
- 返回最终文本

### 7. done 方法 - 等待流结束

返回一个 Promise，当流结束时解析。

执行步骤：

步骤1：设置 catchingPromiseCreated 标志
- 标记已创建 catching Promise

步骤2：返回 endPromise
- 返回内部存储的 endPromise

### 8. abort 方法 - 中止流

中止当前流。

执行步骤：

步骤1：调用 controller.abort()
- 中止流式响应

### 9. tee 方法 - 拆分流

将流拆分为两个独立的流，可以独立读取。

执行步骤：

步骤1：创建队列
- 创建两个队列数组（left 和 right）
- 用于存储流式事件

步骤2：获取迭代器
- 调用 iterator() 方法获取迭代器

步骤3：创建 tee 迭代器
- 创建一个函数，接收队列参数
- 返回一个 AsyncIterator 对象

步骤4：实现 next 方法
- 如果队列为空，调用原始迭代器的 next()
- 将结果添加到两个队列
- 从指定队列中取出并返回结果

步骤5：创建两个流
- 使用 tee 迭代器创建两个新的 MessageStream
- 共享同一个 controller 和 client

步骤6：返回两个流
- 返回流数组 [leftStream, rightStream]

### 10. emit 方法 - 发射事件

发射指定事件，调用所有监听器。

执行步骤：

步骤1：检查是否已结束
- 如果已结束，直接返回

步骤2：处理 end 事件
- 如果是 end 事件，设置 ended 标志
- 解析 endPromise

步骤3：获取监听器数组
- 从 listeners 映射中获取指定事件的监听器数组
- 如果不存在，直接返回

步骤4：过滤一次性监听器
- 遍历监听器数组
- 移除 once 标志为 true 的监听器
- 保留其他监听器

步骤5：调用监听器
- 遍历所有监听器
- 调用每个监听器，传入事件参数

步骤6：处理 abort 事件
- 如果是 abort 事件：
  - 如果没有 catchingPromiseCreated 且没有监听器，触发未处理的 Promise 错误
  - reject connectedPromise
  - reject endPromise
  - 发射 end 事件
  - 返回

步骤7：处理 error 事件
- 如果是 error 事件：
  - 如果没有 catchingPromiseCreated 且没有监听器，触发未处理的 Promise 错误
  - reject connectedPromise
  - reject endPromise
  - 发射 end 事件

### 11. accumulateMessage 方法 - 累积消息

根据流式事件累积消息内容。

执行步骤：

步骤1：处理 message_start 事件
- 如果已有快照，抛出异常
- 创建新的消息快照

步骤2：处理 message_delta 事件
- 更新消息快照的 stop_reason
- 更新消息快照的 stop_sequence
- 更新消息快照的 usage

步骤3：处理 content_block_start 事件
- 将新的内容块添加到消息快照的 content 数组

步骤4：处理 content_block_delta 事件
- 根据增量类型更新内容块
- text_delta：更新文本内容
- input_json_delta：更新工具调用参数
- 其他类型：相应处理

步骤5：处理 content_block_stop 事件
- 不做任何操作

步骤6：处理 message_stop 事件
- 返回消息快照

步骤7：返回消息快照
- 返回累积后的消息快照

### 12. AsyncIterable 接口

实现 AsyncIterable 接口，支持 for await...of 语法。

执行步骤：

步骤1：创建队列
- 创建 pushQueue 用于存储事件
- 创建 readQueue 用于存储等待的读取器

步骤2：添加事件监听器
- 监听 streamEvent 事件
- 监听 end 事件
- 监听 abort 事件
- 监听 error 事件

步骤3：实现 next 方法
- 如果 pushQueue 不为空，从队列中取出并返回
- 如果 pushQueue 为空且未结束，创建新的 Promise 并添加到 readQueue
- 如果已结束，返回 { value: undefined, done: true }

步骤4：实现 return 方法
- 调用 abort() 方法
- 返回 { value: undefined, done: true }

## 错误处理

1. 流式响应失败：触发 error 事件，reject Promise
2. 流被中止：触发 abort 事件，reject Promise
3. 流结束：触发 end 事件，resolve Promise
4. 事件监听器抛出异常：捕获异常，继续执行其他监听器

## 性能考虑

1. 事件监听器使用数组存储，查找和移除效率为 O(n)
2. 流拆分使用队列，避免重复读取
3. 消息累积使用增量更新，避免重复计算

## 扩展点

1. 自定义事件类型
2. 自定义事件监听器
3. 自定义流拆分逻辑

## 使用场景

1. 在 LLM Client 中使用：包装流式响应
2. 在 Conversation 中使用：提供事件驱动的对话管理
3. 在应用层中使用：自定义流式处理逻辑

## 注意事项

1. 流只能消费一次，使用 tee() 方法拆分流
2. 事件监听器抛出异常不会影响其他监听器
3. abort() 方法会中止流式响应
4. finalMessage() 和 finalText() 会等待流结束
5. 事件监听器可以链式调用