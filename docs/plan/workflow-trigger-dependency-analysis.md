# WorkflowRegistry 对 TriggerManager 依赖问题分析

## 问题识别

当前 `WorkflowRegistry` 直接依赖 `TriggerManager` 存在严重的架构问题：

### 主要问题

1. **职责混淆**：WorkflowRegistry 作为工作流定义注册器，不应该负责运行时触发器管理
2. **静态 vs 动态混淆**：WorkflowDefinition 是静态定义，TriggerManager 是运行时组件
3. **违反关注点分离**：定义层不应该包含执行层的逻辑
4. **生命周期不匹配**：工作流定义生命周期与触发器运行时生命周期不同

### 当前代码问题

```typescript
// WorkflowRegistry.ts 中的问题代码
register(workflow: WorkflowDefinition): void {
  // ... 验证和存储
  
  // ❌ 问题：在定义注册时直接操作运行时组件
  if (workflow.triggers && workflow.triggers.length > 0 && this.triggerManager) {
    this.workflowTriggers.set(workflow.id, workflow.triggers);
    for (const workflowTrigger of workflow.triggers) {
      const trigger = convertToTrigger(workflowTrigger, workflow.id);
      this.triggerManager.register(trigger); // 直接调用运行时方法
    }
  }
}
```

## 正确的设计原则

### 核心原则
- **WorkflowRegistry 应该只负责静态定义管理**
- **触发器注册应该在执行层进行**
- **静态定义与运行时逻辑必须分离**

### 职责划分

| 组件 | 职责 | 生命周期 |
|------|------|----------|
| WorkflowRegistry | 工作流定义存储、验证、版本管理、静态分析 | 静态/配置期 |
| TriggerManager | 触发器运行时注册、状态管理、事件监听 | 运行时 |
| ExecutionContext | 协调各组件，处理执行时集成 | 运行时 |

## 解决方案

### 方案1：移除 WorkflowRegistry 对 TriggerManager 的依赖

**修改 WorkflowRegistry**：
- 移除 `triggerManager` 构造函数参数
- 移除 `workflowTriggers` 内部存储
- 移除所有触发器相关的注册/注销逻辑
- 移除 `getWorkflowTriggers()` 和 `hasWorkflowTriggers()` 方法

**结果**：WorkflowRegistry 变成纯粹的静态定义管理器

### 方案2：在执行层处理触发器注册

**在 ExecutionContext 或 ThreadExecutor 中处理**：

```typescript
// ThreadExecutor.execute()
async execute(threadContext: ThreadContext): Promise<ThreadResult> {
  const workflow = threadContext.getWorkflow();
  
  // ✅ 正确：在执行时注册触发器
  if (workflow.triggers && workflow.triggers.length > 0) {
    const triggerManager = this.executionContext.getTriggerManager();
    for (const workflowTrigger of workflow.triggers) {
      const trigger = convertToTrigger(workflowTrigger, workflow.id);
      triggerManager.register(trigger);
    }
  }
  
  // ... 执行逻辑
}
```

### 方案3：提供清理方法（可选）

为了支持工作流卸载场景，可以在 ExecutionContext 中提供清理方法：

```typescript
// ExecutionContext.cleanupWorkflowTriggers()
cleanupWorkflowTriggers(workflowId: string): void {
  const triggerManager = this.getTriggerManager();
  // 实现触发器清理逻辑
}
```

## 对目录结构重构的影响

这个发现强化了我们的重构方案：

### 更新后的目录结构
```
sdk/core/
├── services/                    # 全局单例服务
│   └── event-manager.ts        # EventManager (单例)
│
├── execution/                   # 执行相关组件（全部多实例）
│   ├── context/               # 执行上下文
│   │   └── execution-context.ts
│   │
│   ├── managers/              # 执行管理器（全部多实例）
│   │   ├── checkpoint-manager.ts
│   │   ├── lifecycle-manager.ts
│   │   ├── variable-manager.ts
│   │   ├── trigger-manager.ts      # ✅ 明确为多实例服务
│   │   ├── workflow-registry.ts    # ✅ 移除对TriggerManager的依赖
│   │   └── thread-registry.ts
│   │
│   └── coordinators/
│       └── thread-executor.ts     # ✅ 在这里处理触发器注册
```

## 迁移步骤

1. **移除 WorkflowRegistry 中的 TriggerManager 依赖**
   - 删除构造函数中的 triggerManager 参数
   - 删除所有触发器相关的内部状态和方法
   - 更新相关测试用例

2. **在 ThreadExecutor 中添加触发器注册逻辑**
   - 在工作流执行开始时注册触发器
   - 在工作流执行结束时清理触发器（如果需要）

3. **更新 ExecutionContext 初始化逻辑**
   - 独立创建 TriggerManager 实例
   - 确保正确的依赖注入顺序

4. **更新 API 层**
   - 移除 WorkflowRegistry API 中的触发器相关方法
   - 确保向后兼容性

## 预期收益

1. **架构清晰**：严格分离静态定义和运行时逻辑
2. **职责单一**：每个组件只负责自己的核心职责
3. **解耦**：WorkflowRegistry 可以独立使用
4. **灵活性**：可以选择是否启用触发器功能
5. **可测试性**：可以独立测试各组件
6. **维护性**：代码更容易理解和维护

## 风险评估

1. **API 变更**：需要移除 WorkflowRegistry 中的触发器相关方法
2. **行为变更**：触发器注册时机从定义注册变为执行开始
3. **迁移成本**：现有代码需要适配新的触发器注册方式

**缓解措施**：
- 提供详细的迁移文档
- 在过渡期提供兼容层
- 确保充分的测试覆盖