# SDK Core层新功能目录结构设计

## 概述

基于Mini-Agent的设计理念，采用简化的架构设计，将消息管理和LLM调用紧密集成，避免过度抽象。

## 目录结构

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
│   ├── message-processor.ts          # 消息处理器（新增）
│   ├── message-serializer.ts         # 消息序列化器（新增）
│   └── token-calculator.ts           # Token计算器（新增）
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

## 新增文件说明

### 1. conversation.ts - 对话管理器

**需求分析：**
- 管理对话消息历史
- 执行单次LLM调用
- 执行工具调用
- 提供消息管理接口
- Token统计

**设计要点：**
- 直接管理消息数组，不使用复杂的历史管理器
- 集成Token统计功能
- 提供简单的LLM调用接口
- 支持工具调用和结果处理
- 不依赖Thread和Workflow，可独立使用
- 不负责压缩逻辑，只负责检测和触发事件

### 2. message-processor.ts - 消息处理器

**需求分析：**
- 处理消息模板渲染
- 支持变量替换
- 提供消息验证功能

**设计要点：**
- 轻量级的模板引擎
- 支持简单的变量占位符语法
- 提供消息格式验证
- 不涉及序列化和Token统计

### 3. message-serializer.ts - 消息序列化器

**需求分析：**
- 支持消息序列化
- 支持消息反序列化
- 处理特殊对象类型

**设计要点：**
- 处理Date、Map、Set等特殊对象
- 处理循环引用
- 提供格式验证

### 4. token-calculator.ts - Token计算器

**需求分析：**
- 从API响应解析Token统计
- 使用tiktoken库进行本地计算
- 提供估算方法作为回退方案

**设计要点：**
- 优先使用API响应中的Token统计
- 使用tiktoken库进行本地计算
- 使用字符数除以2.5作为估算方法
- 支持消息级别的Token计算

### 5. thread-coordinator.ts - Thread协调器

**需求分析：**
- 创建子Thread
- 协调子Thread的执行（串行/并行）
- 等待子Thread完成
- 根据策略合并子Thread的结果
- 处理超时和错误

**设计要点：**
- 依赖ThreadStateManager和WorkflowExecutor
- 支持串行和并行两种执行策略
- 支持多种Join策略
- 管理Fork/Join上下文
- 处理父子Thread关系

## 设计原则

1. **简化设计**：参考Mini-Agent，避免过度抽象
2. **紧密集成**：消息管理和LLM调用紧密集成
3. **职责清晰**：每个模块职责单一明确
4. **易于使用**：提供简洁的API接口
5. **可扩展性**：支持自定义扩展

## 与现有架构的关系

- **Conversation**：独立于Workflow和Thread，可作为独立模块使用
- **MessageProcessor**：工具类，被Conversation和LLMNode使用
- **MessageSerializer**：工具类，用于消息的序列化和反序列化
- **TokenCalculator**：工具类，用于Token统计
- **ThreadCoordinator**：集成到WorkflowExecutor中，作为执行引擎的一部分

## 命名说明

- **Conversation**：替代原来的AgentLoop，更准确地描述其功能（对话管理）
- **MessageProcessor**：专注于模板渲染和变量替换
- **MessageSerializer**：专注于消息序列化和反序列化
- **TokenCalculator**：专注于Token统计
- **ThreadCoordinator**：替代原来的ForkManager、JoinManager和ForkJoinCoordinator