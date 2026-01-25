# SDK 最终实施计划

## 概述

本文档整合了之前的设计方案和基于 Anthropic SDK 的改进分析，给出最终的实施方案。

**注意：** 所有新增模块目前仅提供设计方案，尚未实现和使用。

## 一、当前实现状态评估

### 1.1 已正确实现的部分

**HttpClient**
- ✅ 使用 Promise 返回 HttpResponse<T>
- ✅ 支持重试机制（RetryHandler）
- ✅ 支持熔断器（CircuitBreaker）
- ✅ 支持限流器（RateLimiter）
- ✅ 返回 requestId 用于调试
- ✅ 完整的错误处理

**LLM Client**
- ✅ BaseLLMClient 提供统一接口
- ✅ generate() 返回 Promise<LLMResult>
- ✅ generateStream() 返回 AsyncIterable<LLMResult>
- ✅ 支持重试机制（指数退避）
- ✅ 支持超时处理（AbortController）
- ✅ 完整的错误处理

**错误处理**
- ✅ 完整的错误层次结构
- ✅ 根据状态码自动生成错误类型
- ✅ 支持错误上下文信息
- ✅ 支持错误链

### 1.2 不需要改进的部分

- ❌ 响应处理 - HttpClient 的 Promise 实现已经正确
- ❌ 流式处理基础 - AsyncIterable 和 ReadableStream 实现已经正确
- ❌ 错误处理基础 - 错误层次结构和错误码映射已经完善

## 二、最终目录结构

```
sdk/core/
├── llm/
│   ├── wrapper.ts                    # LLM包装器（已存在）
│   ├── profile-manager.ts            # Profile管理器（已存在）
│   ├── client-factory.ts             # 客户端工厂（已存在）
│   ├── base-client.ts                # 客户端基类（已存在）
│   ├── clients/                      # 客户端实现（已存在）
│   │   ├── openai-chat.ts
│   │   ├── openai-response.ts
│   │   ├── anthropic.ts
│   │   ├── gemini-native.ts
│   │   ├── gemini-openai.ts
│   │   ├── mock.ts
│   │   └── human-relay.ts
│   ├── conversation.ts               # 对话管理器（新增）
│   ├── message-serializer.ts         # 消息序列化器（新增）
│   ├── token-calculator.ts           # Token计算器（新增）
│   ├── message-stream.ts             # 消息流（新增）
│   └── tool-runner.ts                # 工具运行器（新增）
├── validation/
│   ├── node-validator.ts             # 节点验证器（已存在）
│   └── message-validator.ts          # 消息验证器（新增）
├── execution/
│   ├── workflow-executor.ts          # 工作流执行器（已存在）
│   ├── node-executor.ts              # 节点执行器（已存在）
│   ├── router.ts                     # 路由器（已存在）
│   └── thread-coordinator.ts         # Thread协调器（新增）
├── state/
│   ├── thread-state.ts               # Thread状态管理（已存在）
│   ├── workflow-context.ts           # 工作流上下文（已存在）
│   ├── variable-manager.ts           # 变量管理器（已存在）
│   └── history-manager.ts            # 历史管理器（已存在）
└── tools/
    ├── tool-service.ts               # 工具服务（已存在）
    ├── tool-registry.ts              # 工具注册表（已存在）
    └── executor-base.ts              # 执行器基类（已存在）
```

## 三、新增文件详细设计

### 3.1 conversation.ts - 对话管理器（已设计）

**核心职责：**
- 管理对话消息历史
- 执行单次LLM调用
- 执行工具调用
- 提供消息管理接口
- Token统计
- 事件监听机制（新增）

**新增功能：**
- 事件监听：on()、off()、once()、emitted()
- 便捷方法：finalMessage()、finalText()、done()、abort()
- 与 MessageStream 集成

**事件类型：**
- messageStart - 消息开始
- messageDelta - 消息增量
- messageStop - 消息结束
- textDelta - 文本增量
- toolCallStart - 工具调用开始
- toolCallDelta - 工具调用增量
- toolCallStop - 工具调用结束
- error - 错误
- abort - 中止
- end - 结束

### 3.2 message-validator.ts - 消息验证器（新增）

**核心职责：**
- 消息格式验证（业务层面）
- 消息内容类型验证（业务层面）
- 工具调用格式验证（业务层面）
- 提供清晰的错误信息

**主要方法：**
- validateMessage() - 验证消息对象
- validateRole() - 验证消息角色
- validateContent() - 验证消息内容
- validateToolCalls() - 验证工具调用
- validateToolCallId() - 验证工具调用 ID

**使用场景：**
- 在 Conversation 中使用 - 添加消息前验证
- 在 MessageSerializer 中使用 - 序列化前验证
- 在 LLM Client 中使用 - 发送请求前验证

### 3.3 message-serializer.ts - 消息序列化器（需完善）

**核心职责：**
- 消息序列化（技术层面）
- 消息反序列化（技术层面）
- 特殊对象处理（技术层面）
- 循环引用处理（技术层面）

**需要完善的部分：**

**特殊对象处理：**
- Date 对象：转换为 ISO 8601 字符串
- Map 对象：转换为 `{ __type: 'Map', entries: [[key, value], ...] }`
- Set 对象：转换为 `{ __type: 'Set', values: [value1, value2, ...] }`
- RegExp 对象：转换为 `{ __type: 'RegExp', source: string, flags: string }`
- Error 对象：转换为 `{ __type: 'Error', name: string, message: string, stack: string }`
- BigInt 对象：转换为 `{ __type: 'BigInt', value: string }`
- ArrayBuffer/TypedArray：转换为 Base64 编码

**循环引用处理：**
- 使用 Set 检测循环引用
- 使用 Map 记录对象路径
- 使用占位符替换循环引用
- 支持循环引用的还原

### 3.4 token-calculator.ts - Token计算器（已设计）

**核心职责：**
- API响应Token解析
- 本地Token计算
- Token估算
- Token使用统计

**无需修改** - 设计已经完善。

### 3.5 message-stream.ts - 消息流（新增）

**核心职责：**
- 事件驱动的流式响应处理
- 流拆分（tee 方法）
- 便捷方法（finalMessage、finalText、done）

**事件类型：**
- connect - 连接建立
- streamEvent - 流事件
- text - 文本增量
- toolCall - 工具调用
- message - 消息
- finalMessage - 最终消息
- error - 错误
- abort - 中止
- end - 结束

**主要方法：**
- on() - 添加事件监听器
- off() - 移除事件监听器
- once() - 添加一次性事件监听器
- emitted() - 等待事件触发
- finalMessage() - 获取最终消息
- finalText() - 获取最终文本
- done() - 等待流结束
- abort() - 中止流
- tee() - 拆分流为两个独立流

### 3.6 tool-runner.ts - 工具运行器（新增）

**核心职责：**
- 自动处理工具调用循环
- 参数动态更新
- 工具响应缓存
- 最大迭代次数限制

**主要方法：**
- setParams() - 更新参数
- generateToolResponse() - 生成工具响应
- done() - 等待完成
- runUntilDone() - 运行直到完成
- pushMessages() - 添加消息

**工具调用循环：**
assistant response → tool execution → tool results → 重复

### 3.7 thread-coordinator.ts - Thread协调器（已设计）

**核心职责：**
- 创建子Thread
- 协调子Thread的执行（串行/并行）
- 等待子Thread完成
- 根据策略合并子Thread的结果
- 处理超时和错误

**无需修改** - 设计已经完善。

## 四、实施优先级

### 4.1 高优先级（立即实施，1-2 周）

**消息验证器**
- 创建 MessageValidator 类
- 实现消息格式验证
- 实现消息内容类型验证
- 实现工具调用格式验证
- 添加单元测试

**消息序列化改进**
- 完善 MessageSerializer 类
- 实现特殊对象处理（Date、Map、Set、RegExp、Error、BigInt、ArrayBuffer、TypedArray）
- 实现循环引用检测和替换
- 添加单元测试
- 集成到 Conversation

### 4.2 中优先级（近期实施，1-2 个月）

**流式处理事件驱动**
- 创建 MessageStream 类
- 实现事件监听机制（on、off、once、emitted）
- 实现便捷方法（finalMessage、finalText、done）
- 实现 tee() 方法
- 添加单元测试
- 集成到 LLM Client

**Conversation 事件机制**
- 在 Conversation 中添加事件监听机制
- 实现便捷方法（finalMessage、finalText、done、abort）
- 与 MessageStream 集成
- 添加单元测试

### 4.3 低优先级（长期规划，3-6 个月）

**工具调用自动化**
- 创建 ToolRunner 类
- 实现工具调用循环逻辑
- 实现参数动态更新
- 实现工具响应缓存
- 添加单元测试
- 集成到 Conversation

## 五、实施步骤

### 5.1 第一阶段：消息验证和序列化（1-2 周）

1. 创建 MessageValidator 类
2. 实现消息格式验证
3. 实现消息内容类型验证
4. 实现工具调用格式验证
5. 完善 MessageSerializer 类
6. 实现特殊对象处理方法
7. 实现循环引用检测和替换
8. 添加单元测试
9. 集成到 Conversation

### 5.2 第二阶段：流式处理事件驱动（2-3 周）

1. 创建 MessageStream 类
2. 实现事件监听机制
3. 实现便捷方法
4. 实现 tee() 方法
5. 添加单元测试
6. 集成到 LLM Client

### 5.3 第三阶段：Conversation 事件机制（1-2 周）

1. 在 Conversation 中添加事件监听机制
2. 实现便捷方法
3. 与 MessageStream 集成
4. 添加单元测试

### 5.4 第四阶段：工具调用自动化（2-3 周）

1. 创建 ToolRunner 类
2. 实现工具调用循环逻辑
3. 实现参数动态更新
4. 实现工具响应缓存
5. 添加单元测试
6. 集成到 Conversation

## 六、设计原则

1. **保持现有优势** - HttpClient、LLM Client、错误处理已经完善，无需修改
2. **渐进式改进** - 逐步添加新功能，不影响现有实现
3. **事件驱动** - 引入事件机制，提供更灵活的流式处理
4. **自动化工具调用** - 简化工具调用流程，提高开发效率
5. **向后兼容** - 新功能不影响现有 API
6. **职责分离** - 验证和序列化职责清晰，易于维护

## 七、总结

### 7.1 当前实现的优势

1. HttpClient 已经完善 - Promise、重试、熔断、限流、错误处理
2. LLM Client 已经完善 - generate()、generateStream()、重试、超时
3. 错误处理已经完善 - 完整的错误层次结构和错误码映射

### 7.2 需要新增的功能

1. **消息验证器** - 业务层面的消息格式验证
2. **消息序列化** - 完善特殊对象处理和循环引用检测
3. **消息流** - 事件驱动的流式响应处理
4. **Conversation 事件机制** - 事件监听和便捷方法
5. **工具运行器** - 自动化的工具调用循环

### 7.3 不需要修改的部分

1. 响应处理 - HttpClient 的 Promise 实现已经正确
2. 流式处理基础 - AsyncIterable 和 ReadableStream 实现已经正确
3. 错误处理基础 - 错误层次结构和错误码映射已经完善

### 7.4 设计调整说明

**移除 message-processor 的原因：**
- 模板渲染不是 SDK Core 层的职责
- SDK Core 层专注于执行逻辑，模板渲染应该在应用层或节点配置层
- Conversation 和 LLM Client 直接接收已经构建好的消息

**新增 message-validator 的原因：**
- 验证功能应该放在 validation 目录下，符合现有架构
- 业务层面的验证（消息格式、内容类型、工具调用格式）与技术层面的序列化分离
- 提供清晰的错误信息，便于调试

通过实施这个最终方案，SDK 将在保持现有优势的基础上，获得更好的事件驱动能力、更完善的序列化处理、更便捷的对话管理和更自动化的工具调用。