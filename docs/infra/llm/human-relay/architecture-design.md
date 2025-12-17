# HumanRelay LLM Provider 新架构设计方案

## 概述

本文档描述了HumanRelay LLM Provider在新TypeScript架构中的设计方案。HumanRelay是一个特殊的LLM客户端，通过前端界面与用户交互，让用户手动将提示词输入到Web端的LLM中，然后将回复粘贴回系统。

## 旧架构问题分析

### 核心功能
- 人工中转机制：通过前端界面与用户交互
- 双模式支持：单轮模式(human-relay-s)和多轮模式(human-relay-m)
- 前端交互：支持TUI和Web API两种方式
- 配置驱动：通过YAML配置灵活调整行为
- 历史管理：多轮模式自动维护对话历史

### 主要问题
1. **前端与后端耦合**：前端交互逻辑与LLM客户端逻辑混合
2. **架构复杂性**：旧Python架构使用5层架构，存在过度抽象
3. **缺乏清晰的职责分离**：违反了单一职责原则

## 新架构设计原则

### 分层架构
严格遵循新架构的Domain + Application + Infrastructure分层：
- **Domain层**：包含纯业务逻辑和域实体
- **Application层**：提供应用服务和业务流程编排
- **Infrastructure层**：提供技术实现的具体细节

### 职责分离
- **前端交互抽象**：通过接口抽象前端交互，与LLM客户端完全分离
- **配置驱动**：所有行为通过配置文件控制
- **可扩展性**：支持多种前端类型，易于添加新的交互方式

## 域模型设计

### 核心域实体

#### HumanRelaySession (人工中转会话)
- 管理会话状态和对话历史
- 支持单轮和多轮两种模式
- 提供会话生命周期管理

#### HumanRelayPrompt (人工中转提示)
- 封装提示词内容和模板
- 支持变量替换和渲染
- 跟踪提示状态

#### HumanRelayResponse (人工中转响应)
- 封装用户响应内容
- 记录响应时间和元数据
- 支持超时和错误状态

### 值对象

#### HumanRelayMode
- SINGLE：单轮对话模式
- MULTI：多轮对话模式

#### HumanRelaySessionStatus
- ACTIVE：活跃状态
- WAITING_FOR_USER：等待用户输入
- PROCESSING：处理中
- COMPLETED：已完成
- TIMEOUT：超时
- CANCELLED：已取消

#### PromptTemplate
- 支持变量替换的提示词模板
- 提供模板验证和渲染功能

### 域服务

#### HumanRelayDomainService
- 创建和管理人工中转会话
- 构建和处理提示词
- 处理用户响应

## 基础设施层设计

### HumanRelay客户端

#### 核心功能
- 实现ILLMClient接口，无缝集成到现有LLM系统
- 支持单轮和多轮两种模式
- 管理会话生命周期和对话历史
- 处理超时和错误情况

#### 关键方法
- `generateResponse()`: 生成响应的核心方法
- `generateResponseStream()`: 流式响应（HumanRelay不支持真正的流式）
- `healthCheck()`: 健康检查
- `getModelConfig()`: 获取模型配置

### 前端交互抽象

#### 接口设计
通过`IHumanRelayInteractionService`接口抽象前端交互：
- `sendPromptAndWaitForResponse()`: 发送提示并等待响应
- `isUserAvailable()`: 检查用户可用性
- `getInteractionStatus()`: 获取交互状态
- `cancelCurrentInteraction()`: 取消当前交互

#### 前端类型支持
- **TUI**: 命令行界面交互
- **Web**: Web界面交互（WebSocket）
- **API**: REST API交互

#### 前端交互管理器
- 协调不同前端服务
- 支持自动检测和回退机制
- 管理并发交互和超时处理

### 配置系统

#### 配置结构
- **通用配置**: 所有HumanRelay实例共享的基础配置
- **模式特定配置**: 单轮和多轮模式的特定配置
- **高级配置**: 包含会话持久化、历史导出等高级功能

#### 配置内容
- 基础参数：模式、超时时间、历史长度
- 前端配置：类型选择、TUI/Web/API特定设置
- 提示词模板：单轮和多轮模式的模板
- 功能开关：各种可选功能的启用/禁用

## 应用层设计

### 工作流集成

#### HumanRelay节点
- 作为标准工作流节点，支持拖拽式配置
- 封装HumanRelay特定的配置选项
- 提供节点验证和执行逻辑

#### 节点执行器
- 处理HumanRelay节点的执行逻辑
- 管理与LLM包装器的交互
- 处理执行结果和错误情况

#### 工作流服务
- 提供HumanRelay工作流的创建和执行服务
- 管理会话状态和执行历史
- 支持工作流监控和调试

## 实现计划

### 第一阶段：核心域模型和基础设施
1. 创建HumanRelay域实体和值对象
2. 实现HumanRelay客户端基础框架
3. 创建配置系统
4. 实现基础TUI前端交互

### 第二阶段：前端交互扩展
1. 实现Web前端交互服务
2. 实现API前端交互服务
3. 创建前端交互管理器
4. 添加前端自动检测和回退机制

### 第三阶段：工作流集成
1. 创建HumanRelay工作流节点
2. 实现节点执行器
3. 集成到工作流引擎
4. 创建工作流服务

### 第四阶段：高级功能和优化
1. 实现会话持久化
2. 添加历史导出功能
3. 实现自定义模板系统
4. 性能优化和错误处理

## 文件结构

```
src/
├── domain/
│   └── llm/
│       ├── entities/
│       │   ├── human-relay-session.ts
│       │   ├── human-relay-prompt.ts
│       │   └── human-relay-response.ts
│       ├── value-objects/
│       │   ├── human-relay-mode.ts
│       │   ├── human-relay-session-status.ts
│       │   └── human-relay-config.ts
│       ├── interfaces/
│       │   └── human-relay-interaction.interface.ts
│       └── services/
│           └── human-relay-domain-service.ts
├── infrastructure/
│   ├── external/llm/
│   │   └── clients/
│   │       └── human-relay-client.ts
│   └── llm/human-relay/
│       ├── config/
│       ├── services/
│       └── interfaces/
├── application/
│   └── workflow/
│       └── services/
│           └── human-relay-workflow-service.ts
└── configs/
    └── llms/provider/human_relay/
        ├── common.toml
        ├── human-relay-s.toml
        └── human-relay-m.toml
```

## 测试策略

### 测试层次
- **单元测试**: 域模型、服务、客户端的核心功能
- **集成测试**: 前端交互、工作流集成、依赖注入
- **端到端测试**: 完整工作流、多轮对话、错误恢复

### 关键测试用例
- 会话创建和管理
- 单轮和多轮模式切换
- 前端交互流程
- 工作流节点执行
- 配置加载和验证
- 错误处理和恢复

## 前端设计概要

### TUI前端
- 基于命令行的交互界面
- 显示提示词和收集用户输入
- 支持超时和取消操作
- 提供历史记录显示（多轮模式）

### Web前端
- 基于WebSocket的实时通信
- 提供更友好的Web界面
- 支持富文本编辑和格式化
- 提供会话管理和历史查看

### API前端
- 基于REST API的交互方式
- 支持第三方系统集成
- 提供标准化的接口规范
- 支持认证和权限控制

## 总结

新架构的HumanRelay设计解决了旧架构中前端与后端耦合的问题，采用了清晰的分层架构，确保了系统的可维护性和可扩展性。通过接口抽象和配置驱动的设计，HumanRelay可以无缝集成到现有的LLM系统和工作流中，为需要人工介入的场景提供了灵活的解决方案。