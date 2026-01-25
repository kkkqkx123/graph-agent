# message-processor 重新设计分析

## 问题分析

### 1. 当前设计的问题

**message-processor.ts 包含的功能：**
1. 模板渲染（renderTemplate、renderMessage）
2. 变量替换（parseVariables、validateVariables）
3. 消息验证（validateMessage）

**问题所在：**
- 模板渲染不是 SDK Core 层的职责
- SDK Core 层专注于执行逻辑，模板渲染应该在应用层或节点配置层
- Conversation 和 LLM Client 直接接收已经构建好的消息
- 验证功能应该放在 validation 目录下

### 2. 验证职责分析

**验证应该在多个层面进行：**
- 序列化前验证（确保数据正确）
- 序列化时验证（确保可以序列化）
- 反序列化后验证（确保数据完整）

**SDK Core 层已经有 validation 目录：**
- `sdk/core/validation/node-validator.ts` 已存在
- 消息验证应该放在这里，作为通用的验证组件

## 调整方案

### 方案一：完全移除 message-processor

**理由：**
1. 模板渲染不是 SDK Core 层的职责
2. 验证功能应该放在 validation 目录下
3. 序列化时已经包含验证逻辑

**调整后的目录结构：**
```
sdk/core/
├── llm/
│   ├── conversation.ts
│   ├── message-serializer.ts
│   ├── token-calculator.ts
│   ├── message-stream.ts
│   └── tool-runner.ts
├── validation/
│   ├── node-validator.ts（已存在）
│   └── message-validator.ts（新增）
└── ...
```

**message-validator.ts 的职责：**
- 验证消息格式（role、content、toolCalls、toolCallId）
- 验证消息内容类型
- 验证工具调用格式
- 提供详细的错误信息

### 方案二：简化 message-processor

**保留的功能：**
- 仅保留消息验证功能
- 移除模板渲染和变量替换功能

**调整后的目录结构：**
```
sdk/core/
├── llm/
│   ├── conversation.ts
│   ├── message-validator.ts（从 message-processor 重命名）
│   ├── message-serializer.ts
│   ├── token-calculator.ts
│   ├── message-stream.ts
│   └── tool-runner.ts
└── ...
```

**message-validator.ts 的职责：**
- 验证消息格式
- 验证消息内容类型
- 验证工具调用格式
- 提供详细的错误信息

## 推荐方案

**推荐方案一：完全移除 message-processor**

**理由：**
1. 职责更清晰 - 验证功能放在 validation 目录下
2. 符合现有架构 - SDK Core 层已经有 validation 目录
3. 避免混淆 - 不会让人误以为 SDK Core 层负责模板渲染
4. 简化设计 - 减少不必要的模块

**实施步骤：**
1. 删除 `plans/sdk/core/llm/message-processor.md`
2. 创建 `plans/sdk/core/validation/message-validator.md`
3. 更新 `plans/sdk/core/directory-structure.md`
4. 更新 `plans/sdk/final-implementation-plan.md`

## message-validator.ts 设计

### 核心职责

1. 消息格式验证
2. 消息内容类型验证
3. 工具调用格式验证
4. 提供详细的错误信息

### 主要方法

1. **validateMessage** - 验证消息对象
   - 验证消息角色
   - 验证消息内容
   - 验证工具调用
   - 验证工具调用 ID

2. **validateRole** - 验证消息角色
   - 检查角色是否为有效值
   - 返回验证结果

3. **validateContent** - 验证消息内容
   - 检查内容类型
   - 检查内容格式
   - 返回验证结果

4. **validateToolCalls** - 验证工具调用
   - 检查工具调用格式
   - 检查工具调用参数
   - 返回验证结果

5. **validateToolCallId** - 验证工具调用 ID
   - 检查 ID 格式
   - 返回验证结果

### 使用场景

1. 在 MessageSerializer 中使用 - 序列化前验证
2. 在 Conversation 中使用 - 添加消息前验证
3. 在 LLM Client 中使用 - 发送请求前验证

## 总结

**当前设计的问题：**
- message-processor 包含了不属于 SDK Core 层的职责（模板渲染）
- 验证功能应该放在 validation 目录下

**推荐方案：**
- 完全移除 message-processor
- 在 validation 目录下创建 message-validator
- 保持职责清晰，符合现有架构

**优势：**
1. 职责更清晰
2. 符合现有架构
3. 避免混淆
4. 简化设计