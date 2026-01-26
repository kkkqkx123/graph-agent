# SDK重构实施路线图

## 一、需要完成的修改清单

### 1. 新增组件

#### 1.1 ThreadBuilder类
- **位置**：`sdk/core/execution/thread-builder.ts`
- **职责**：
  - 从WorkflowDefinition创建Thread实例
  - 初始化WorkflowContext并缓存
  - 创建Conversation实例
  - 提供Thread模板缓存
  - 支持Fork/Copy操作的深拷贝

#### 1.2 ThreadLifecycleManager类
- **位置**：`sdk/core/execution/thread-lifecycle-manager.ts`
- **职责**：
  - 管理Thread状态转换
  - 触发生命周期事件
  - 独立于执行逻辑
  - 不依赖超时销毁

### 2. 组件迁移

#### 2.1 WorkflowContext迁移
- **从**：`sdk/core/state/workflow-context.ts`
- **到**：`sdk/core/execution/workflow-context.ts`
- **原因**：属于执行上下文，非状态管理

#### 2.2 ThreadStateManager迁移
- **从**：`sdk/core/state/thread-state.ts`
- **到**：`sdk/core/execution/thread-state-manager.ts`
- **原因**：属于Thread执行引擎组成部分

### 3. 组件删除

#### 3.1 删除HistoryManager
- **位置**：`sdk/core/state/history-manager.ts`
- **原因**：历史记录应直接存储在Thread中

#### 3.2 删除VariableManager
- **位置**：`sdk/core/state/variable-manager.ts`
- **原因**：变量管理应整合到Thread中

### 4. 类型重构

#### 4.1 Thread类型简化
- **删除字段**：
  - `nodeResults: Map<string, NodeExecutionResult>`
  - `variables: ThreadVariable[]`
- **修改字段**：
  - `variables: Record<string, ThreadVariable>`（从数组改为Record）
  - `executionHistory: NodeExecutionResult[]`（合并nodeResults）
- **保留字段**：
  - `input: Record<string, any>`
  - `output: Record<string, any>`
  - `errors: any[]`
  - `metadata: ThreadMetadata`
  - `contextData: Record<string, any>`

#### 4.2 ThreadMetadata简化
- **保留字段**：
  - `parentThreadId?: string`
  - `childThreadIds?: string[]`
- **删除字段**：
  - `forkId`, `joinId`, `forkStrategy`, `joinStrategy`
  - `forkTime`, `joinTime`, `childThreadResults`

#### 4.3 NodeExecutionResult扩展
- **新增字段**：
  - `step: number`（执行步骤序号）
  - `input?: any`（节点输入）

#### 4.4 删除ExecutionHistoryEntry类型
- **原因**：功能被NodeExecutionResult替代

### 5. ThreadExecutor重构

#### 5.1 API分离
- **删除**：重载的`execute()`方法
- **新增**：
  - `executeWorkflow(workflow, options)` - 从Workflow执行
  - `executeThread(thread, options)` - 执行已有Thread

#### 5.2 依赖注入
- **新增依赖**：
  - `ThreadBuilder` - 用于创建Thread
  - `ThreadLifecycleManager` - 用于状态管理
- **保留依赖**：
  - `ThreadStateManager` - 管理Thread实例
  - `WorkflowContext` - 访问Workflow定义

#### 5.3 历史记录处理
- **删除**：HistoryManager调用
- **改为**：直接操作Thread.executionHistory

#### 5.4 变量管理
- **删除**：VariableManager调用
- **改为**：直接操作Thread.variables

### 6. ThreadCoordinator重构

#### 6.1 Fork操作
- **记录**：父Thread的childThreadIds
- **设置**：子Thread的parentThreadId
- **深拷贝**：子Thread的Conversation实例

#### 6.2 Join操作
- **查询**：通过childThreadIds获取子Thread
- **合并**：结果到父Thread.output
- **触发**：THREAD_JOINED事件

### 7. Conversation压缩

#### 7.1 Conversation类型扩展
- **新增字段**：
  - `compressionMarker?: number`
  - `compressedContext?: string`

#### 7.2 压缩方法
- **新增**：`compress()`方法
- **新增**：`getMessagesForLLM()`方法
- **新增**：`getFullHistory()`方法

### 8. 目录结构调整

```
sdk/core/
├── execution/                    # 执行引擎
│   ├── thread-executor.ts        # Thread执行器（重构）
│   ├── thread-builder.ts         # Thread构建器（新增）
│   ├── thread-lifecycle-manager.ts  # 生命周期管理（新增）
│   ├── thread-state-manager.ts   # Thread状态管理（迁移）
│   ├── workflow-context.ts       # Workflow上下文（迁移）
│   ├── thread-coordinator.ts     # Thread协调器（重构）
│   ├── router.ts                 # 路由器
│   ├── event-manager.ts          # 事件管理器
│   └── ...
├── state/                        # 状态管理（清理）
│   └── (删除history-manager.ts, variable-manager.ts)
└── ...
```

---

## 二、分阶段实施方案

### 第一阶段：基础架构调整（低风险）

**目标**：建立新的组件结构，不影响现有功能

#### 1.1 创建新组件
- [ ] 创建`ThreadBuilder`类（空实现）
- [ ] 创建`ThreadLifecycleManager`类（空实现）
- [ ] 创建`ThreadStateManager`（从state迁移，保持接口兼容）

#### 1.2 迁移WorkflowContext
- [ ] 将`workflow-context.ts`从state迁移到execution
- [ ] 更新所有import路径
- [ ] 运行测试确保兼容性

#### 1.3 更新目录结构
- [ ] 创建新的目录结构
- [ ] 移动文件到新位置
- [ ] 更新所有import路径

**验收标准**：
- 所有现有测试通过
- 无功能回归
- 目录结构符合设计

---

### 第二阶段：Thread类型重构（中风险）

**目标**：简化Thread类型，合并冗余字段

#### 2.1 修改Thread类型定义
- [ ] 修改`variables`从数组改为Record
- [ ] 删除`nodeResults`字段
- [ ] 修改`executionHistory`类型为`NodeExecutionResult[]`
- [ ] 删除`ExecutionHistoryEntry`类型

#### 2.2 扩展NodeExecutionResult
- [ ] 添加`step`字段
- [ ] 添加`input`字段

#### 2.3 简化ThreadMetadata
- [ ] 删除forkId、joinId等冗余字段
- [ ] 只保留parentThreadId和childThreadIds

#### 2.4 数据迁移工具
- [ ] 创建数据迁移函数
- [ ] 支持旧格式到新格式的转换
- [ ] 添加单元测试

**验收标准**：
- 类型定义符合设计
- 数据迁移工具测试通过
- 序列化/反序列化正常

---

### 第三阶段：删除冗余组件（中风险）

**目标**：删除HistoryManager和VariableManager

#### 3.1 删除HistoryManager
- [ ] 删除`history-manager.ts`文件
- [ ] 移除ThreadExecutor中的HistoryManager引用
- [ ] 将历史记录直接写入Thread.executionHistory

#### 3.2 删除VariableManager
- [ ] 删除`variable-manager.ts`文件
- [ ] 移除ThreadExecutor中的VariableManager引用
- [ ] 将变量操作改为直接操作Thread.variables

#### 3.3 添加Thread方法
- [ ] 添加`getVariable()`方法
- [ ] 添加`setVariable()`方法
- [ ] 添加`hasVariable()`方法
- [ ] 添加`deleteVariable()`方法
- [ ] 添加`getAllVariables()`方法

**验收标准**：
- 冗余组件已删除
- Thread方法测试通过
- 变量和历史记录功能正常

---

### 第四阶段：ThreadBuilder实现（中风险）

**目标**：实现ThreadBuilder，接管Thread创建逻辑

#### 4.1 实现ThreadBuilder核心功能
- [ ] 实现`build()`方法
- [ ] 实现`createCopy()`方法
- [ ] 实现`createFork()`方法
- [ ] 实现WorkflowContext缓存

#### 4.2 集成Conversation初始化
- [ ] 在ThreadBuilder中创建Conversation
- [ ] 配置tokenLimit和回调
- [ ] 存储到Thread.contextData

#### 4.3 深拷贝支持
- [ ] 实现Thread深拷贝
- [ ] 实现Conversation深拷贝
- [ ] 处理变量和上下文拷贝

#### 4.4 集成到ThreadExecutor
- [ ] ThreadExecutor使用ThreadBuilder创建Thread
- [ ] 移除ThreadExecutor中的创建逻辑
- [ ] 更新测试用例

**验收标准**：
- ThreadBuilder功能完整
- 深拷贝测试通过
- ThreadExecutor集成正常

---

### 第五阶段：ThreadLifecycleManager实现（中风险）

**目标**：实现独立的生命周期管理

#### 5.1 实现状态转换
- [ ] 实现`startThread()`方法
- [ ] 实现`pauseThread()`方法
- [ ] 实现`resumeThread()`方法
- [ ] 实现`completeThread()`方法
- [ ] 实现`failThread()`方法
- [ ] 实现`cancelThread()`方法

#### 5.2 状态验证
- [ ] 添加状态转换验证逻辑
- [ ] 抛出非法状态转换错误
- [ ] 记录状态转换历史

#### 5.3 事件触发
- [ ] 在状态转换时触发事件
- [ ] 支持外部监听
- [ ] 添加生命周期钩子

#### 5.4 集成到ThreadExecutor
- [ ] ThreadExecutor调用ThreadLifecycleManager
- [ ] 移除ThreadExecutor中的状态管理逻辑
- [ ] 更新测试用例

**验收标准**：
- 状态转换正确
- 事件触发正常
- ThreadExecutor集成正常

---

### 第六阶段：ThreadExecutor API重构（高风险）

**目标**：分离API，明确职责

#### 6.1 API分离
- [ ] 删除重载的`execute()`方法
- [ ] 实现`executeWorkflow()`方法
- [ ] 实现`executeThread()`方法
- [ ] 标记旧API为deprecated

#### 6.2 依赖注入
- [ ] 注入ThreadBuilder
- [ ] 注入ThreadLifecycleManager
- [ ] 更新构造函数

#### 6.3 向后兼容
- [ ] 提供兼容层
- [ ] 更新文档
- [ ] 添加迁移指南

**验收标准**：
- 新API功能正常
- 旧API兼容
- 文档完整

---

### 第七阶段：ThreadCoordinator重构（中风险）

**目标**：实现简化的Fork/Join记录机制

#### 7.1 Fork操作重构
- [ ] 记录父Thread的childThreadIds
- [ ] 设置子Thread的parentThreadId
- [ ] 深拷贝Conversation
- [ ] 触发THREAD_FORKED事件

#### 7.2 Join操作重构
- [ ] 通过childThreadIds查询子Thread
- [ ] 等待子Thread完成
- [ ] 合并结果到父Thread
- [ ] 触发THREAD_JOINED事件

#### 7.3 查询接口
- [ ] 实现`getThreadTree()`方法
- [ ] 实现`getForkJoinHistory()`方法

**验收标准**：
- Fork/Join功能正常
- 父子关系正确
- 查询接口正常

---

### 第八阶段：Conversation压缩（低风险）

**目标**：实现对话历史压缩功能

#### 8.1 扩展Conversation类型
- [ ] 添加`compressionMarker`字段
- [ ] 添加`compressedContext`字段

#### 8.2 实现压缩方法
- [ ] 实现`compress()`方法
- [ ] 实现`getMessagesForLLM()`方法
- [ ] 实现`getFullHistory()`方法

#### 8.3 集成到ThreadExecutor
- [ ] 监控token使用量
- [ ] 触发压缩操作
- [ ] 处理压缩异常

#### 8.4 事件记录
- [ ] 触发COMPRESSION_PERFORMED事件
- [ ] 记录压缩统计

**验收标准**：
- 压缩功能正常
- 消息访问正确
- 事件触发正常

---

### 第九阶段：清理和优化（低风险）

**目标**：清理遗留代码，优化性能

#### 9.1 清理遗留代码
- [ ] 删除deprecated代码
- [ ] 删除未使用的导入
- [ ] 清理注释

#### 9.2 性能优化
- [ ] 优化缓存策略
- [ ] 优化序列化性能
- [ ] 优化查询性能

#### 9.3 文档更新
- [ ] 更新API文档
- [ ] 更新架构文档
- [ ] 更新示例代码

#### 9.4 测试完善
- [ ] 补充单元测试
- [ ] 补充集成测试
- [ ] 性能测试

**验收标准**：
- 代码整洁
- 性能达标
- 文档完整
- 测试覆盖充分

---

## 三、风险评估

### 高风险阶段
- **第六阶段**：ThreadExecutor API重构
  - 风险：影响所有调用方
  - 缓解：提供兼容层，充分测试

### 中风险阶段
- **第二阶段**：Thread类型重构
  - 风险：影响序列化/反序列化
  - 缓解：提供数据迁移工具

- **第三阶段**：删除冗余组件
  - 风险：可能遗漏依赖
  - 缓解：全面搜索引用

- **第四阶段**：ThreadBuilder实现
  - 风险：创建逻辑复杂
  - 缓解：充分测试深拷贝

- **第五阶段**：ThreadLifecycleManager实现
  - 风险：状态转换逻辑复杂
  - 缓解：严格的状态机验证

- **第七阶段**：ThreadCoordinator重构
  - 风险：Fork/Join逻辑复杂
  - 缓解：详细的测试用例

### 低风险阶段
- **第一阶段**：基础架构调整
- **第八阶段**：Conversation压缩
- **第九阶段**：清理和优化

---

## 四、时间估算

| 阶段 | 预估时间 | 优先级 |
|------|---------|--------|
| 第一阶段 | 2天 | 高 |
| 第二阶段 | 3天 | 高 |
| 第三阶段 | 2天 | 高 |
| 第四阶段 | 4天 | 中 |
| 第五阶段 | 3天 | 中 |
| 第六阶段 | 5天 | 高 |
| 第七阶段 | 3天 | 中 |
| 第八阶段 | 2天 | 低 |
| 第九阶段 | 3天 | 低 |
| **总计** | **27天** | - |

---

## 五、依赖关系

```
第一阶段 → 第二阶段 → 第三阶段 → 第四阶段 → 第五阶段
                                              ↓
第六阶段 ←─────────────────────────────────────┘
                                              ↓
第七阶段 ←─────────────────────────────────────┘
                                              ↓
第八阶段 → 第九阶段
```

**关键路径**：第一阶段 → 第二阶段 → 第三阶段 → 第四阶段 → 第五阶段 → 第六阶段 → 第七阶段 → 第九阶段

**可并行**：第八阶段可在第七阶段后独立进行