# 执行引擎架构概览

## 核心问题

当前设计存在以下问题：
1. WorkflowExecutor 直接执行 workflow，但实际应该执行 thread
2. 缺少 workflow 到 thread 的转换层
3. ExecutionContext 包含了 workflow 和 thread，职责不清晰
4. NodeExecutor 和 Router 直接依赖 ExecutionContext，耦合度过高

## 设计原则

1. **Thread 中心**：所有执行操作基于 thread，不直接操作 workflow
2. **职责分离**：每个模块职责单一，边界清晰
3. **依赖倒置**：高层模块不依赖低层模块，都依赖抽象
4. **最小依赖**：模块间依赖关系尽可能简单

## 核心模块

### 1. ThreadExecutor
**职责**：
- 从 workflow 创建 thread 实例
- 执行单个 thread
- 管理 thread 的执行生命周期
- 协调节点执行
- 处理暂停、恢复、取消
- 触发执行相关事件

**关键特性**：
- 支持两种调用方式：execute(workflow, options) 和 execute(thread, options)
- 统一的执行入口点
- 简化的架构

### 2. NodeExecutor
**职责**：
- 执行单个节点的具体逻辑
- 返回节点执行结果
- 不依赖 ExecutionContext，只依赖必要参数

**关键特性**：
- 抽象基类，支持多种节点类型
- 统一的执行接口
- 错误封装到执行结果中

### 3. Router
**职责**：
- 评估边的条件
- 选择下一个节点
- 不依赖 ExecutionContext，只依赖必要参数

**关键特性**：
- 支持多种条件类型
- 支持自定义表达式
- 按权重排序

### 4. EventManager
**职责**：
- 事件监听器注册
- 事件分发
- 事件过滤

**关键特性**：
- 支持异步事件处理
- 支持一次性监听器
- 错误隔离

### 5. ThreadCoordinator
**职责**：
- 创建子 thread
- 协调子 thread 执行
- 合并子 thread 结果

**关键特性**：
- 支持串行和并行执行
- 多种合并策略
- 超时控制

## 模块关系

```
ThreadExecutor
    ↓ 创建
Thread 实例
    ↓ 执行
NodeExecutor
    ↓ 路由
Router
    ↓ Fork/Join
ThreadCoordinator
    ↓ 事件
EventManager
```

## 执行流程

1. ThreadExecutor 接收 workflow 或 thread
2. 如果是 workflow，创建 thread 实例
3. ThreadExecutor 执行 thread
4. ThreadExecutor 调用 NodeExecutor 执行节点
5. NodeExecutor 返回结果后，ThreadExecutor 调用 Router 选择下一个节点
6. 如果遇到 Fork 节点，ThreadExecutor 调用 ThreadCoordinator 创建子 thread
7. 如果遇到 Join 节点，ThreadExecutor 调用 ThreadCoordinator 等待子 thread 完成
8. 所有操作都通过 EventManager 触发事件

## 关键设计决策

1. **删除 WorkflowExecutor**：不再需要 workflow 级别的执行器
2. **删除 WorkflowToThreadConverter**：逻辑合并到 ThreadExecutor 中
3. **简化 ExecutionContext**：只包含 thread 相关信息，不包含 workflow
4. **NodeExecutor 独立**：不依赖 ExecutionContext，只接收必要参数
5. **Router 独立**：不依赖 ExecutionContext，只接收必要参数
6. **Thread 中心**：所有执行操作都基于 thread
7. **统一入口**：ThreadExecutor 提供统一的执行入口

## 文件结构

```
sdk/core/execution/
├── thread-executor.ts      # Thread 执行器（包含 workflow 到 thread 的转换）
├── node-executor.ts        # 节点执行器（重构）
├── router.ts               # 路由器（重构）
├── thread-coordinator.ts   # Thread 协调器
└── event-manager.ts        # 事件管理器
```

## 依赖关系

```
ThreadExecutor
    ├── StateManager
    ├── WorkflowValidator
    ├── WorkflowContext
    ├── NodeExecutor
    ├── Router
    ├── ThreadCoordinator
    ├── EventManager
    └── HistoryManager

NodeExecutor
    └── (无外部依赖)

Router
    └── (无外部依赖)

ThreadCoordinator
    ├── StateManager
    ├── ThreadExecutor
    └── WorkflowContext

EventManager
    └── (无外部依赖)
```

## 数据流

### 输入数据流
```
Workflow/Thread → ThreadExecutor → NodeExecutor → Thread.output
```

### 事件数据流
```
ThreadExecutor → EventManager.emit() → EventListener → Client Handler
```

### 状态数据流
```
ThreadExecutor → StateManager.updateThreadStatus() → Thread.status → StateManager.getThread() → ThreadExecutor
```

## 优势

1. **简化架构**：减少了模块数量，降低了复杂度
2. **统一接口**：ThreadExecutor 提供统一的执行入口
3. **职责清晰**：每个模块职责单一，边界明确
4. **易于测试**：模块独立，易于单元测试
5. **易于扩展**：通过继承和组合支持新功能