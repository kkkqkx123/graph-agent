# 配置系统架构设计

## 1. 设计原则

### 1.1 遵循现有模式

基于对现有配置模块（LLM、Prompt、Tool）的分析，采用**轻量级配置设计**：

- ✅ **不在Domain层创建配置值对象**
- ✅ **在Infrastructure层定义JSON Schema进行验证**
- ✅ **配置数据以`Record<string, any>`形式处理**
- ✅ **只在Application层提供配置服务接口**

### 1.2 与现有模块保持一致

**现有模块模式：**
```
LLM模块: LLMSchema (Infrastructure) + LLMLoader (Infrastructure)
Prompt模块: PromptSchema (Infrastructure) + PromptLoader (Infrastructure)
Tool模块: ToolSchema (Infrastructure) + ToolLoader (Infrastructure)
```

**节点模块模式：**
```
Node模块: NodeSchema (Infrastructure) + NodeLoader (Infrastructure) + NodeConfigService (Application)
```

## 2. 架构设计

### 2.1 分层架构

```
┌─────────────────────────────────────────┐
│         Interface Layer                 │
│  (HTTP API, gRPC, CLI)                  │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│       Application Layer                 │
│  NodeConfigService                      │
│  - getNodeConfig(id)                    │
│  - getAllNodeConfigs()                  │
│  - validateConfig(config)               │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      Infrastructure Layer               │
│  ┌──────────────────────────────────┐   │
│  │  Config Loading Module          │   │
│  │  - NodeLoader                   │   │
│  │  - NodeRule (Schema)            │   │
│  │  - NodeConfigRepository         │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │  Predefined Nodes               │   │
│  │  - PredefinedLLMNode            │   │
│  │  - NodeFactory                  │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│          Domain Layer                   │
│  - IConfigSource (已有)                 │
│  - IConfigProcessor (已有)              │
│  - IConfigValidator (已有)              │
│  - IConfigManager (已有)                │
│  - 不创建节点配置值对象                  │
└─────────────────────────────────────────┘
```
