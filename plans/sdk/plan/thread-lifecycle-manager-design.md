# Thread生命周期管理独立设计

## 设计原则
- 生命周期管理独立于执行逻辑
- 不依赖超时销毁，主要依靠执行过程自然结束
- 提供完整的状态转换控制和监控
- 支持Thread的持久化和恢复

## 核心职责

### 1. 状态管理
管理Thread的完整生命周期状态：
- CREATED → RUNNING → COMPLETED/FAILED/CANCELLED
- 支持PAUSED状态的转换和恢复
- 记录状态转换历史和时间戳

### 2. 生命周期事件
- 在状态转换时触发对应事件
- 支持外部监听生命周期变化
- 提供生命周期钩子函数

### 3. 资源管理
- 跟踪Thread关联的资源（Conversation、上下文等）
- 在Thread结束时清理资源
- 提供资源使用统计

### 4. 持久化支持
- 在关键状态转换时触发持久化
- 支持从持久化状态恢复Thread
- 管理持久化策略和频率

## 状态转换规则

### 基本转换路径
```
CREATED → RUNNING → COMPLETED
         ↓         ↓
       PAUSED → CANCELLED
         ↓
       FAILED
```

### 转换约束
- CREATED只能转换为RUNNING
- RUNNING可以转换为PAUSED、COMPLETED、FAILED、CANCELLED
- PAUSED可以转换为RUNNING或CANCELLED
- COMPLETED/FAILED/CANCELLED为终止状态，不可再转换

### 转换触发条件
- CREATED→RUNNING：执行开始
- RUNNING→PAUSED：暂停调用或触发器触发
- PAUSED→RUNNING：恢复调用
- RUNNING→COMPLETED：正常执行完成
- RUNNING→FAILED：执行异常
- RUNNING/PAUSED→CANCELLED：取消调用

## 与ThreadExecutor协作

ThreadExecutor专注于执行逻辑，通过ThreadLifecycleManager进行状态管理：

1. 执行开始前：调用lifecycleManager.startThread()
2. 执行暂停时：调用lifecycleManager.pauseThread()
3. 执行恢复时：调用lifecycleManager.resumeThread()
4. 执行完成时：调用lifecycleManager.completeThread()
5. 执行失败时：调用lifecycleManager.failThread()
6. 执行取消时：调用lifecycleManager.cancelThread()

ThreadLifecycleManager负责：
- 验证状态转换的合法性
- 更新Thread状态
- 触发生命周期事件
- 记录转换历史
- 触发持久化（如配置）

## 监控和统计

提供Thread生命周期监控：
- 当前活跃的Thread数量和状态分布
- 历史Thread执行统计（成功率、平均执行时间等）
- 状态转换频率和耗时
- 资源使用情况统计

## 异常处理

- 非法状态转换时抛出错误
- 记录状态转换失败日志
- 提供恢复机制处理异常状态