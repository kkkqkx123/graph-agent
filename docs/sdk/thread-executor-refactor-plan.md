# ThreadExecutor 重构方案

## 问题分析

### 当前架构问题

1. **冗余的调用链**
   - ThreadExecutor → NodeExecutorFactory → ForkNodeExecutor/JoinNodeExecutor → (应该调用 ThreadCoordinator)
   - ForkNodeExecutor 和 JoinNodeExecutor 只是模拟实现（mock），注释明确说明"实际实现应该使用ThreadExecutor或ForkJoinManager"
   - ThreadCoordinator 已经有完整的 fork() 和 join() 实现

2. **ThreadExecutor 缺少 FORK/JOIN/COPY 处理**
   - 当前代码只处理普通节点、START 和 END 节点
   - 完全没有处理 FORK、JOIN、COPY 节点的逻辑
   - 导致这些节点类型无法正常工作

3. **职责不清晰**
   - ForkNodeExecutor 和 JoinNodeExecutor 试图实现 FORK/JOIN 逻辑，但只是模拟
   - ThreadCoordinator 已经实现了完整的 FORK/JOIN/COPY 功能
   - 两者功能重复，造成维护困难

### ThreadCoordinator 当前实现

ThreadCoordinator 已经提供了完整的 FORK/JOIN/COPY 功能：

- **fork()**: 创建子线程，支持串行和并行策略
- **join()**: 等待子线程完成，根据策略合并结果
- **copy()**: 创建线程的完全相同的副本

这些方法已经实现了完整的业务逻辑，包括：
- 参数验证
- 子线程创建和管理
- 等待和超时处理
- 结果合并
- 事件触发

## 重构方案

### 目标架构

```
ThreadExecutor:
├── 遇到 FORK 节点 → 直接调用 ThreadCoordinator.fork()
├── 遇到 JOIN 节点 → 直接调用 ThreadCoordinator.join()
├── 遇到 COPY 节点 → 直接调用 ThreadCoordinator.copy()
└── 遇到普通节点 → 使用 NodeExecutorFactory 创建执行器

ThreadCoordinator:
├── fork() - 创建子线程
├── join() - 等待并合并子线程结果
└── copy() - 复制线程
```

### 职责划分

**ThreadExecutor 职责**：
- 执行线程的主循环
- 识别节点类型
- 对于 FORK/JOIN/COPY 节点，直接调用 ThreadCoordinator
- 对于普通节点，使用 NodeExecutorFactory 创建执行器
- 管理线程生命周期

**ThreadCoordinator 职责**：
- 处理 FORK 操作（创建子线程）
- 处理 JOIN 操作（等待并合并子线程结果）
- 处理 COPY 操作（复制线程）
- 管理 Fork/Join 配对关系

**NodeExecutorFactory 职责**：
- 为普通节点类型创建对应的执行器
- 不再为 FORK/JOIN/COPY 节点创建执行器

## 具体修改步骤

### 步骤 1：删除 ForkNodeExecutor 和 JoinNodeExecutor

**原因**：
- 这两个类只是模拟实现，没有实际功能
- ThreadCoordinator 已经实现了完整的 FORK/JOIN 逻辑
- 避免功能重复和维护负担

**操作**：
- 删除 `sdk/core/execution/executors/node/fork-node-executor.ts`
- 删除 `sdk/core/execution/executors/node/join-node-executor.ts`
- 从 NodeExecutorFactory 中移除对这两个执行器的注册

### 步骤 2：修改 ThreadExecutor 构造函数

**目标**：注入 ThreadCoordinator 依赖

**操作**：
- 在构造函数中添加 ThreadCoordinator 参数
- 将 ThreadCoordinator 保存为实例变量
- 如果未提供，从 ExecutionContext 获取

### 步骤 3：修改 ThreadExecutor.executeNode() 方法

**目标**：在执行节点前检查节点类型，特殊处理 FORK/JOIN/COPY 节点

**逻辑**：
1. 检查节点类型
2. 如果是 FORK 节点：
   - 从节点配置中提取 forkId 和 forkStrategy
   - 调用 ThreadCoordinator.fork()
   - 等待 fork 完成
   - 返回执行结果
3. 如果是 JOIN 节点：
   - 从节点配置中提取 joinId、joinStrategy、timeout
   - 调用 ThreadCoordinator.join()
   - 等待 join 完成
   - 返回执行结果
4. 如果是 COPY 节点：
   - 从节点配置中提取 sourceThreadId
   - 调用 ThreadCoordinator.copy()
   - 等待 copy 完成
   - 返回执行结果
5. 如果是普通节点：
   - 使用 NodeExecutorFactory 创建执行器
   - 执行节点
   - 返回执行结果

### 步骤 4：修改 NodeExecutorFactory

**目标**：移除对 FORK/JOIN/COPY 节点的支持

**操作**：
- 移除 ForkNodeExecutor 的导入和注册
- 移除 JoinNodeExecutor 的导入和注册
- 如果有 CopyNodeExecutor，也一并移除
- 更新 createExecutor() 方法，不再处理这些节点类型

### 步骤 5：更新 ThreadCoordinator

**目标**：确保 ThreadCoordinator 的方法可以被 ThreadExecutor 直接调用

**操作**：
- 确认 fork()、join()、copy() 方法的签名正确
- 确认这些方法返回的结果格式符合 ThreadExecutor 的需求
- 如果需要，调整返回值格式

### 步骤 6：更新 ExecutionContext

**目标**：确保 ExecutionContext 提供 ThreadCoordinator 实例

**操作**：
- 在 ExecutionContext 中添加 ThreadCoordinator 的初始化
- 提供获取 ThreadCoordinator 的方法
- 确保依赖注入正确

## 预期效果

### 优点

1. **消除冗余代码**
   - 删除 ForkNodeExecutor 和 JoinNodeExecutor 的模拟实现
   - 避免功能重复

2. **简化调用链**
   - ThreadExecutor 直接调用 ThreadCoordinator
   - 减少中间层，提高性能

3. **职责清晰**
   - ThreadExecutor 负责线程执行流程
   - ThreadCoordinator 负责 FORK/JOIN/COPY 操作
   - NodeExecutorFactory 负责普通节点的执行器创建

4. **易于维护**
   - FORK/JOIN/COPY 逻辑集中在 ThreadCoordinator
   - 修改时只需要修改一个地方

5. **符合单一职责原则**
   - 每个类只负责一个明确的功能
   - 代码结构更清晰

### 注意事项

1. **向后兼容性**
   - 确保修改不影响现有的工作流定义
   - FORK/JOIN/COPY 节点的配置格式保持不变

2. **错误处理**
   - 确保 ThreadCoordinator 抛出的错误能被 ThreadExecutor 正确处理
   - 提供清晰的错误信息

3. **测试覆盖**
   - 为新的执行流程编写测试用例
   - 确保 FORK/JOIN/COPY 操作正常工作

4. **事件触发**
   - ThreadCoordinator 已经触发了相关事件
   - 确保事件触发逻辑正确

## 实施建议

1. **分步实施**
   - 先删除 ForkNodeExecutor 和 JoinNodeExecutor
   - 再修改 ThreadExecutor
   - 最后更新 NodeExecutorFactory

2. **充分测试**
   - 测试 FORK 节点的串行和并行执行
   - 测试 JOIN 节点的各种策略
   - 测试 COPY 节点的复制功能

3. **文档更新**
   - 更新架构文档
   - 更新 API 文档
   - 添加使用示例

4. **代码审查**
   - 确保代码质量
   - 确保符合编码规范
   - 确保没有引入新的问题