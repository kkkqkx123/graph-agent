# SDK状态模块重构分析

## 问题诊断

### 1. ThreadStateManager定位错误

**当前问题：**
- 位于`sdk/core/state/`模块，但实际职责是管理Thread执行实例
- 导入的`ThreadVariable`, `NodeExecutionResult`, `ExecutionHistoryEntry`未使用，设计不完整
- 职责模糊：既是Thread工厂，又是Thread存储，还负责序列化

**正确职责：**
ThreadStateManager应该作为**Thread执行引擎的组成部分**，而不是独立的状态模块。它的核心职责是：
- 管理Thread实例的生命周期（创建、获取、更新、删除）
- 维护Thread的运行时状态
- 支持Thread的序列化和反序列化

**修改建议：**
- 将ThreadStateManager移动到`sdk/core/execution/`目录
- 删除未使用的类型导入
- 明确作为ThreadExecutor的依赖组件
- 职责聚焦：只管理Thread实例，不处理业务逻辑

### 2. HistoryManager职责混淆

**当前问题：**
- 仅提供历史查询功能，但历史记录实际由ThreadExecutor产生
- 与Thread执行过程紧密耦合，却作为独立服务
- 历史数据存储在HistoryManager中，但Thread本身也有executionHistory字段

**正确职责：**
HistoryManager应该**完全剥离**，其职责由Thread执行实例直接承担：
- 节点执行历史 → 记录在Thread.executionHistory
- 工具调用历史 → 记录在Thread.toolCalls（需扩展Thread类型）
- 错误历史 → 记录在Thread.errors

**修改建议：**
- 删除HistoryManager类
- 扩展Thread类型，增加历史记录字段
- ThreadExecutor直接操作Thread的历史记录
- 查询历史时直接访问Thread实例

### 3. WorkflowContext模块位置错误

**当前问题：**
- 放在`state`模块，但职责是提供Workflow定义的缓存和查询
- 与Thread状态无关，与执行逻辑紧密相关
- 由ThreadExecutor使用，却不在execution模块

**正确职责：**
WorkflowContext应该作为**执行上下文**，由ThreadBuilder或ThreadExecutor管理：
- 缓存Workflow定义，提供快速访问
- 构建节点和边的索引映射
- 支持Workflow定义的验证

**修改建议：**
- 将WorkflowContext移动到`sdk/core/execution/`目录
- 由ThreadBuilder在创建Thread时初始化并缓存
- ThreadExecutor从ThreadBuilder或缓存获取WorkflowContext
- 职责明确：只提供Workflow定义的访问，不管理状态

## 重构方案

### 目录结构调整

```
sdk/core/
├── execution/              # 执行引擎
│   ├── thread-executor.ts  # Thread执行器
│   ├── thread-builder.ts   # Thread构建器（新增）
│   ├── thread-lifecycle-manager.ts  # 生命周期管理（新增）
│   ├── workflow-context.ts # 从state模块迁移
│   └── ...
├── state/                  # 状态管理（清理后）
│   └── variable-manager.ts # 变量管理（保留）
└── ...
```

### 职责重新划分

**ThreadExecutor：**
- 负责Thread的执行逻辑
- 持有ThreadStateManager管理Thread实例
- 持有WorkflowContext访问Workflow定义
- 直接记录执行历史到Thread

**ThreadBuilder（新增）：**
- 负责Workflow到Thread的转换
- 初始化WorkflowContext并缓存
- 创建Conversation实例
- 提供Thread模板缓存

**ThreadLifecycleManager（新增）：**
- 负责Thread状态转换管理
- 独立于执行逻辑
- 提供生命周期事件

**VariableManager（保留）：**
- 变量管理逻辑较独立，保留在state模块
- 由ThreadExecutor调用

### 数据流向优化

**创建Thread流程：**
1. ThreadBuilder接收WorkflowDefinition
2. 创建WorkflowContext并缓存
3. 创建Thread实例（通过ThreadStateManager）
4. 初始化Conversation
5. 返回Thread

**执行Thread流程：**
1. ThreadExecutor接收Thread
2. 从缓存获取WorkflowContext
3. 执行节点，直接更新Thread状态和历史
4. 状态变更通过ThreadLifecycleManager
5. 执行完成，Thread包含完整历史

**查询历史流程：**
1. 通过ThreadStateManager获取Thread
2. 直接访问Thread.executionHistory
3. 无需HistoryManager中介

## 预期收益

1. **职责清晰**：每个类的职责单一明确
2. **依赖简化**：减少不必要的组件间依赖
3. **性能提升**：减少历史记录的数据复制
4. **可维护性**：代码结构更符合逻辑分层
5. **测试便利**：各组件可独立测试

## 实施步骤

1. **第一阶段**：移动WorkflowContext到execution模块
2. **第二阶段**：删除HistoryManager，将历史记录整合到Thread
3. **第三阶段**：移动ThreadStateManager到execution模块
4. **第四阶段**：新增ThreadBuilder和ThreadLifecycleManager
5. **第五阶段**：重构ThreadExecutor，适配新架构