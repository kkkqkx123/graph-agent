# WorkflowToThreadConverter 设计文档

## 需求分析

### 核心需求
将 workflow 定义转换为可执行的 thread 实例，作为执行引擎的入口。

### 功能需求
1. 解析 workflow 定义
2. 创建初始 thread 实例
3. 设置 thread 的初始状态
4. 验证 workflow 定义的有效性
5. 处理 workflow 配置和元数据

### 非功能需求
1. 类型安全：充分利用 TypeScript 类型系统
2. 错误处理：提供清晰的错误信息
3. 可扩展性：支持未来扩展

## 核心职责

1. Workflow 解析和验证
2. Thread 实例创建
3. 初始状态设置
4. 配置转换

## 主要属性

- stateManager: Thread 状态管理器，用于创建和管理 thread
- workflowValidator: Workflow 验证器，用于验证 workflow 定义

## 核心方法

### convert 方法

接收 workflow 定义和可选的输入数据，返回 thread 实例。

执行步骤：

步骤 1：验证 workflow 定义
- 调用 workflowValidator 验证 workflow
- 检查 workflow 是否包含 START 节点
- 检查 workflow 是否包含 END 节点
- 检查节点和边的引用是否有效
- 如果验证失败，抛出 ValidationError

步骤 2：创建 thread 实例
- 调用 stateManager.createThread 创建 thread
- 设置 workflowId 为 workflow.id
- 设置 workflowVersion 为 workflow.version
- 设置 input 为传入的输入数据
- 设置 status 为 CREATED
- 设置 startTime 为当前时间戳

步骤 3：设置初始节点
- 从 workflow 中查找 START 节点
- 设置 thread.currentNodeId 为 START 节点的 id
- 如果找不到 START 节点，抛出 ValidationError

步骤 4：复制 workflow 配置
- 将 workflow.config 复制到 thread.metadata
- 处理 workflow 的全局变量
- 处理 workflow 的标签和元数据

步骤 5：初始化 thread 变量
- 从 workflow.config 中提取变量定义
- 创建初始变量实例
- 设置变量的初始值

步骤 6：返回 thread 实例
- 返回创建的 thread 实例

## 错误处理

### Workflow 验证失败
- 抛出 ValidationError
- 包含详细的验证错误信息
- 指出错误的位置和原因

### START 节点缺失
- 抛出 ValidationError
- 提示 workflow 必须包含 START 节点

### 配置转换失败
- 抛出 ValidationError
- 记录配置转换的详细错误

## 注意事项

1. **验证优先**：在创建 thread 之前必须验证 workflow
2. **状态一致性**：确保 thread 的初始状态正确
3. **引用完整性**：确保所有引用的节点和边都存在
4. **类型安全**：充分利用 TypeScript 类型检查
5. **错误信息**：提供清晰、详细的错误信息