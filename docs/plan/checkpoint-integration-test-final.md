# 检查点模块集成测试计划（最终版）

## 核心集成测试场景

基于对现有代码的分析，检查点模块的集成测试应聚焦以下**三个核心场景**：

### 场景1: 端到端检查点生命周期验证
**目标**: 验证从工作流执行 → 检查点创建 → 检查点恢复 → 继续执行的完整流程

**测试步骤**:
1. 创建简单线性工作流 (START → CODE → END)
2. 注册工作流并构建 ThreadContext
3. 执行到 CODE 节点后手动创建检查点
4. 从检查点恢复 ThreadContext  
5. 继续执行到 END 节点

**验证点**:
- ✅ 检查点成功创建并保存到存储
- ✅ 恢复的 ThreadContext 状态与创建时一致
- ✅ 恢复后能正常继续执行工作流

### 场景2: 自动触发机制集成验证
**目标**: 验证配置驱动的自动检查点创建机制

**测试步骤**:
1. 配置工作流 `enableCheckpoints: true` + `checkpointAfterNode: true`
2. 执行工作流，验证在每个节点后自动创建检查点
3. 配置特定节点 `checkpointAfterExecute: false` 
4. 验证该节点不创建检查点（配置覆盖）
5. 配置 Hook `createCheckpoint: true`
6. 验证 Hook 执行时创建检查点（最高优先级）

**验证点**:
- ✅ 自动检查点在正确时机创建
- ✅ 配置优先级规则正确应用 (Hook > Node > Global)
- ✅ 检查点数量符合预期

### 场景3: 复杂工作流结构支持验证  
**目标**: 验证 FORK/JOIN 和子工作流的检查点处理

**测试步骤**:
1. 创建 FORK/JOIN 工作流
2. 在 FORK 节点后创建检查点
3. 恢复检查点并验证能正确继续并行执行
4. 创建包含 Triggered 子工作流的工作流
5. 在子工作流执行中创建检查点
6. 恢复主工作流并验证子工作流状态正确

**验证点**:
- ✅ forkJoinContext 正确保存和恢复
- ✅ triggeredSubworkflowContext 正确处理
- ✅ 父子线程关系正确重建

## 异常处理集成测试

### 关键异常场景:
1. **检查点不存在**: 恢复不存在的检查点ID → NotFoundError
2. **工作流不存在**: 检查点对应工作流已删除 → NotFoundError  
3. **消息历史丢失**: GlobalMessageStorage 中消息已清理 → NotFoundError

## 测试实现要点

### 测试环境设置:
- 使用真实的 WorkflowRegistry、ThreadRegistry
- 使用 MemoryCheckpointStorage 进行测试
- 预注册必要的测试脚本和工作流

### 测试数据:
- 简单线性工作流模板
- FORK/JOIN 工作流模板  
- Triggered 子工作流模板

### 验证方法:
- 直接验证 ThreadContext 状态属性
- 验证存储中的检查点数量和内容
- 验证工作流能正常继续执行完成

## 测试文件建议

创建单个集成测试文件，包含上述核心场景：

```
sdk/tests/integration/checkpoint-lifecycle-integration.test.ts
```

这样可以:
- 减少测试文件数量
- 聚焦核心集成点
- 避免重复单元测试已覆盖的内容
- 提供完整的端到端验证