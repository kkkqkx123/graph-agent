# SDK架构设计文档

## 核心设计理念

SDK采用 `core + types` 简化架构，专注于工作流执行核心功能。

## 目录结构

```
sdk/
├── types/              # 类型定义层
│   ├── workflow.ts     # 工作流类型
│   ├── node.ts         # 节点类型
│   ├── edge.ts         # 边类型
│   ├── thread.ts       # 线程类型（执行实例）
│   ├── tool.ts         # 工具类型
│   ├── llm.ts          # LLM类型
│   ├── execution.ts    # 执行类型
│   ├── events.ts       # 事件类型
│   ├── errors.ts       # 错误类型
│   ├── common.ts       # 通用类型
│   └── checkpoint.ts   # 检查点类型
├── core/               # 核心执行层
│   ├── execution/      # 执行引擎
│   ├── state/          # 状态管理
│   ├── llm/            # LLM集成
│   ├── tools/          # 工具执行
│   └── validation/     # 验证
├── api/                # 对外API
│   ├── sdk.ts          # SDK主类
│   ├── options.ts      # API选项
│   └── result.ts       # API结果
└── utils/              # 工具函数
    ├── id-generator.ts # ID生成
    └── error-handler.ts # 错误处理
```

## 核心概念

### 1. Workflow（工作流）
- 纯静态定义，包含nodes、edges等结构信息
- 不包含任何执行状态
- 可序列化和反序列化

### 2. Thread（线程）
- Workflow的执行实例
- 包含执行状态、变量、历史等动态信息
- 支持Fork/Join操作
- 可序列化，支持执行恢复

### 3. Node（节点）
- 15种节点类型
- 只存储edgeId，不持有Edge对象引用
- 支持动态属性和验证规则

### 4. Edge（边）
- 定义节点之间的连接关系
- 只存储nodeId，不持有Node对象引用
- 支持条件路由和优先级

### 5. LLM Profile
- LLM配置文件，支持独立配置和复用
- 包含provider、model、parameters、headers等
- LLM Node通过profileId引用

### 6. Tool
- 只提供工具引用，不包含实现细节
- 包含名称、描述、参数schema
- 用于LLM调用时提供工具定义

## 关键设计原则

### 1. 避免循环依赖
- Node和Edge只存储ID
- 通过Workflow对象进行关联查询
- 边数组支持排序和过滤

### 2. 职责分离
- Workflow：静态定义
- Thread：执行实例
- Checkpoint：状态快照
- 应用层：持久化、管理

### 3. 配置复用
- LLM使用Profile概念
- Tool只提供引用
- 避免重复配置

### 4. 不提供持久化接口
- SDK专注于执行
- 持久化由应用层负责
- Checkpoint只包含创建和恢复

### 5. 事件驱动
- 所有事件关联到threadId
- 支持Fork/Join事件
- 支持异步事件处理

## 执行流程

### 1. 创建阶段
- 用户传入Workflow定义
- SDK创建Thread实例（从Workflow转换而来）
- Thread包含workflowId、nodes、edges等静态信息
- 初始化执行状态、变量等动态信息

### 2. 执行阶段
- 使用ThreadOptions配置执行参数
- 执行过程中更新Thread状态
- 记录节点执行结果和执行历史
- 触发相应事件

### 3. 恢复阶段
- 通过threadId恢复Thread
- Thread包含完整的执行状态
- 继续执行

### 4. Fork/Join阶段
- Fork：创建子Thread，用于并行执行
- Join：等待子Thread完成，合并结果
- 支持多种Join策略

## 与应用层的边界

### SDK负责
- 工作流执行引擎
- 状态管理
- LLM集成
- 工具执行框架
- 核心类型定义
- 检查点创建和恢复

### 应用层负责
- 持久化（数据库、文件等）
- 配置管理
- 日志记录
- 会话管理
- 检查点查询、清理、分析
- 监控和维护
- 速率限制和重试

## 依赖关系

```
common (基础类型)
  ├── workflow
  ├── node
  ├── edge
  ├── thread
  ├── tool
  ├── llm
  ├── execution
  ├── events
  ├── errors
  └── checkpoint

core/
  ├── execution (依赖 types)
  ├── state (依赖 types)
  ├── llm (依赖 types)
  ├── tools (依赖 types)
  └── validation (依赖 types)

api/
  └── sdk (依赖 core 和 types)