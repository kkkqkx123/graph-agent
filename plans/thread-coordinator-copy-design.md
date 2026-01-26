# ThreadCoordinator Copy 功能设计

## 概述

为 ThreadCoordinator 添加 copy 功能，用于创建上下文完全相同的 thread 实例，使其能够独立执行。copy 操作与 fork 不同，不需要策略配置，创建的副本是完全独立的执行实例。

## 功能目标

- 创建与源 thread 上下文完全相同的副本
- 副本独立执行，互不影响
- 支持复制所有关键状态和数据
- 触发相应的事件通知

## 核心设计

### 1. Copy 操作定义

copy 方法接收源 thread ID，返回新创建的副本 thread ID。该方法负责创建一个与源 thread 状态完全相同的新 thread 实例。

### 2. 复制内容范围

需要复制以下内容：

#### 基础信息
- workflowId 和 workflowVersion
- 当前节点 ID（currentNodeId）
- 线程状态（重置为 CREATED）

#### 变量数据
- variables 数组（完整复制所有变量定义）
- variableValues 对象（完整复制所有变量值）
- input 对象（完整复制输入数据）
- output 对象（完整复制输出数据）

#### 执行历史
- nodeResults Map（完整复制所有节点执行结果）
- executionHistory 数组（完整复制执行历史记录）

#### 元数据
- metadata 对象（复制所有元数据，但需要更新 parentThreadId 字段指向源 thread）

#### 上下文数据
- contextData 对象（需要特殊处理 Conversation 实例）

### 3. Conversation 复制策略

Conversation 实例包含消息历史和 token 使用统计，需要深度复制：

- 创建新的 Conversation 实例
- 复制源 Conversation 的所有消息历史
- 复制 token 使用统计信息
- 保持相同的 token 限制配置
- 复制事件回调配置

### 4. 执行流程

copy 操作的执行步骤：

1. 验证源 thread 存在且状态有效
2. 获取源 thread 的完整数据
3. 创建新的 thread ID
4. 复制基础信息（workflowId、version 等）
5. 复制变量数据（variables、variableValues、input、output）
6. 复制执行历史（nodeResults、executionHistory）
7. 复制元数据（metadata，更新 parentThreadId）
8. 创建并复制 Conversation 实例
9. 重置副本状态为 CREATED
10. 重置副本时间戳（startTime 为当前时间，endTime 清空）
11. 将副本注册到状态管理器
12. 触发 THREAD_COPIED 事件
13. 返回副本 thread ID

### 5. 事件设计

需要新增 THREAD_COPIED 事件类型：

- 事件类型：THREAD_COPIED
- 包含信息：源 thread ID、副本 thread ID、时间戳、workflowId

### 6. 与 Fork 的区别

| 特性 | Copy | Fork |
|------|------|------|
| 目的 | 创建完全相同的副本 | 创建并行执行的子线程 |
| 策略 | 无需策略 | 需要 forkStrategy |
| 上下文 | 完全复制 | 可能部分共享 |
| 独立性 | 完全独立 | 可能需要 join |
| 使用场景 | 重放、测试、并行执行相同任务 | 分支处理、并行处理不同任务 |

### 7. 状态管理

- 副本 thread 的状态始终设置为 CREATED
- 副本 thread 的 startTime 设置为当前时间
- 副本 thread 的 endTime 清空
- 副本 thread 的 errors 数组清空（因为是新实例）

### 8. 依赖关系

copy 方法需要依赖以下组件：

- ThreadStateManager：用于创建和管理 thread 状态
- EventManager：用于触发 THREAD_COPIED 事件
- LLMWrapper 和 ToolService：用于创建新的 Conversation 实例

### 9. 错误处理

需要处理的错误场景：

- 源 thread 不存在
- 源 thread 状态无效（如已删除）
- Conversation 复制失败
- 状态管理器注册失败

### 10. 使用示例

典型使用场景：

1. **重放执行**：复制已完成的 thread，重新执行以验证结果
2. **并行测试**：复制 thread，使用不同输入并行执行
3. **A/B 测试**：复制 thread，修改部分配置后对比执行结果
4. **调试分析**：复制 thread，在不影响原 thread 的情况下进行调试

## 实现要点

1. **深度复制**：确保所有嵌套对象和 Map 都被正确复制
2. **独立性**：副本与源 thread 完全独立，修改副本不影响源 thread
3. **一致性**：副本的上下文与源 thread 在复制时刻完全一致
4. **可执行性**：副本创建后可以立即执行，无需额外配置
5. **事件通知**：通过事件机制通知外部系统 copy 操作完成

## 注意事项

1. Conversation 的消息历史可能很大，复制时需要考虑性能
2. nodeResults Map 需要正确转换为普通对象后再复制
3. metadata 中的 parentThreadId 需要正确设置
4. 副本的 errors 数组应该清空，因为是新实例
5. 副本的执行历史应该完整保留，便于追溯