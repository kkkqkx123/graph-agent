# 检查点模块集成测试方案（按阶段划分）

## 测试原则

- **不重复单元测试**: 单元测试已覆盖各组件内部逻辑，集成测试只验证组件间协作
- **端到端验证**: 从触发到完成的完整流程验证
- **真实环境模拟**: 使用真实的 WorkflowRegistry、ThreadRegistry 等服务
- **场景驱动**: 基于实际使用场景设计测试用例

## 集成测试阶段划分

### 阶段1: 检查点触发与创建集成

**测试目标**: 验证配置解析器与协调器的集成，确保在正确时机创建检查点

**关键集成点**:
- CheckpointConfigResolver → CheckpointCoordinator
- 工作流执行引擎 → CheckpointCoordinator

**测试场景**:
1. **全局配置触发**: 工作流配置 `enableCheckpoints: true` + `checkpointAfterNode: true`
   - 执行工作流节点后自动创建检查点
   - 验证检查点元数据包含正确的描述

2. **节点配置覆盖**: 节点配置 `checkpointAfterExecute: false` 覆盖全局配置
   - 执行该节点后不创建检查点
   - 验证配置优先级正确应用

3. **Hook 触发**: Hook 配置 `createCheckpoint: true`
   - Hook 执行时创建检查点
   - 验证 Hook 配置具有最高优先级

**验证重点**:
- ✅ 检查点在预期时机被创建
- ✅ 检查点数量符合预期
- ✅ 检查点元数据正确反映触发源

### 阶段2: 完整状态保存与加载集成

**测试目标**: 验证 ThreadStateSnapshot 的完整性和 CheckpointStateManager 的正确性

**关键集成点**:
- ThreadContext → CheckpointCoordinator → CheckpointStateManager → MemoryCheckpointStorage
- MemoryCheckpointStorage → CheckpointStateManager → CheckpointCoordinator → ThreadContext

**测试场景**:
1. **基础线性工作流**: START → CODE → END
   - 在 CODE 节点执行后创建检查点
   - 验证变量、节点结果、对话状态完整保存
   - 从检查点恢复后能继续正常执行

2. **复杂状态工作流**: 包含变量作用域、触发器状态、工具调用状态
   - 验证所有状态信息正确序列化/反序列化
   - 恢复后的 ThreadContext 与原始状态一致

3. **大型检查点**: 包含大量消息历史和复杂变量
   - 验证序列化/反序列化性能和正确性
   - 验证内存使用合理性

**验证重点**:
- ✅ ThreadStateSnapshot 包含所有必要状态信息
- ✅ 序列化/反序列化过程无数据丢失
- ✅ 恢复后的 ThreadContext 功能完整

### 阶段3: 复杂工作流结构集成

**测试目标**: 验证 FORK/JOIN 和 Triggered 子工作流的检查点处理

**关键集成点**:
- ForkJoinContext → CheckpointCoordinator
- TriggeredSubworkflowContext → CheckpointCoordinator  
- ThreadRegistry → CheckpointCoordinator (子线程管理)

**测试场景**:
1. **FORK/JOIN 工作流**: 
   - 在 FORK 节点后创建检查点
   - 恢复后能正确继续并行执行
   - 验证 forkJoinContext 正确保存和恢复

2. **Triggered 子工作流**:
   - 主工作流触发子工作流后创建检查点
   - 恢复主工作流时子工作流状态也正确恢复
   - 验证父子线程关系正确重建

3. **嵌套复杂场景**: FORK 中包含 Triggered 子工作流
   - 验证多层嵌套状态的正确处理
   - 验证所有上下文信息完整保存

**验证重点**:
- ✅ 复杂工作流结构的状态完整性
- ✅ 上下文信息正确关联和恢复
- ✅ 并行和嵌套执行状态正确维护

### 阶段4: 自动清理策略集成

**测试目标**: 验证清理策略与存储系统的集成

**关键集成点**:
- CheckpointStateManager → CleanupPolicy → MemoryCheckpointStorage
- CheckpointStateManager → CheckpointSizes tracking

**测试场景**:
1. **数量限制清理**: maxCount=3, minRetention=1
   - 创建5个检查点，验证自动清理最旧的2个
   - 验证至少保留1个检查点的安全机制

2. **时间限制清理**: retentionDays=1
   - 创建过期检查点，验证自动清理
   - 验证未过期检查点不受影响

3. **空间限制清理**: maxSizeBytes=1000
   - 创建超过空间限制的检查点
   - 验证按时间顺序删除最旧检查点直到满足空间要求

**验证重点**:
- ✅ 清理策略正确识别需要删除的检查点
- ✅ 安全机制（minRetention）正常工作
- ✅ 清理操作不影响正在使用的检查点

### 阶段5: 异常处理与边界条件集成

**测试目标**: 验证系统在异常情况下的健壮性

**关键集成点**:
- Error handling across all components
- Resource cleanup in failure scenarios

**测试场景**:
1. **检查点不存在**: 尝试恢复不存在的检查点ID
   - 验证抛出 NotFoundError
   - 验证错误信息包含检查点ID

2. **工作流不存在**: 检查点对应的工作流已被删除
   - 验证抛出 NotFoundError  
   - 验证错误信息包含工作流ID

3. **消息历史丢失**: GlobalMessageStorage 中的消息历史已被清理
   - 验证抛出 NotFoundError
   - 验证错误信息包含线程ID

4. **检查点数据损坏**: 模拟存储中的检查点数据损坏
   - 验证适当的错误处理
   - 验证系统不会崩溃

**验证重点**:
- ✅ 所有异常路径都有适当的错误处理
- ✅ 错误信息提供足够的调试信息
- ✅ 系统状态保持一致性

## 测试文件组织

```
sdk/tests/integration/checkpoints/
├── checkpoint-trigger-integration.test.ts      # 阶段1: 触发与创建
├── checkpoint-state-integration.test.ts        # 阶段2: 状态保存与加载  
├── checkpoint-complex-workflow-integration.test.ts  # 阶段3: 复杂工作流
├── checkpoint-cleanup-integration.test.ts      # 阶段4: 自动清理
└── checkpoint-error-handling-integration.test.ts    # 阶段5: 异常处理
```

## 测试依赖设置

每个测试文件都需要：
- 真实的 WorkflowRegistry 实例
- 真实的 ThreadRegistry 实例  
- MemoryCheckpointStorage 实例
- GlobalMessageStorage 实例
- 预注册的测试工作流和脚本

## 验收标准

- 每个阶段的核心集成点都有对应的测试用例
- 测试覆盖所有主要的使用场景
- 异常路径都有相应的错误处理测试
- 测试运行稳定，不依赖特定的执行顺序
- 测试性能合理，单个测试不超过 5 秒