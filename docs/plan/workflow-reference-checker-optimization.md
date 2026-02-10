# 工作流引用检查器优化设计方案

## 背景

当前 [`workflow-reference-checker.ts`](../sdk/utils/workflow-reference-checker.ts) 在检查运行时线程引用时存在性能问题，需要遍历所有线程来检查工作流引用。本方案提出通过维护活跃工作流集合来优化性能。

## 设计目标

1. **性能优化**：将线程引用检查从 O(n) 降低到 O(1)
2. **架构清晰**：保持职责分离，避免循环依赖
3. **可扩展性**：为未来功能扩展提供基础

## 架构设计

### 组件关系图

```
┌─────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│ WorkflowRegistry │◄───│ ThreadRegistry       │◄───│ ThreadLifecycleCoordinator │
│                 │    │                     │    │                     │
│ - activeWorkflows│    │ - threadContexts    │    │ - lifecycleManager  │
│   Set<string>    │    │ - workflowRegistry  │    │ - cascadeManager    │
└─────────────────┘    └─────────────────────┘    └─────────────────────┘
         │                         │                         │
         └─────────────────────────┼─────────────────────────┘
                                   │
                         ┌─────────▼─────────┐
                         │ ThreadBuilder     │
                         │                   │
                         │ - build()         │
                         │ - createFork()    │
                         │ - createCopy()    │
                         └───────────────────┘
```

### 核心组件职责

#### 1. WorkflowRegistry（增强）
- **新增功能**：管理活跃工作流集合
- **接口扩展**：
  ```typescript
  class WorkflowRegistry {
    private activeWorkflows: Set<string> = new Set();
    
    // 添加活跃工作流
    addActiveWorkflow(workflowId: string): void;
    
    // 移除活跃工作流  
    removeActiveWorkflow(workflowId: string): void;
    
    // 检查工作流是否活跃
    isWorkflowActive(workflowId: string): boolean;
    
    // 获取所有活跃工作流
    getActiveWorkflows(): string[];
  }
  ```

#### 2. ThreadRegistry（增强）
- **新增依赖**：持有 WorkflowRegistry 引用
- **接口扩展**：
  ```typescript
  class ThreadRegistry {
    private workflowRegistry: WorkflowRegistry;
    
    register(threadContext: ThreadContext): void {
      this.threadContexts.set(threadContext.getThreadId(), threadContext);
      // 自动更新活跃工作流
      this.workflowRegistry.addActiveWorkflow(threadContext.getWorkflowId());
    }
    
    delete(threadId: string): void {
      const threadContext = this.threadContexts.get(threadId);
      if (threadContext) {
        // 自动移除活跃工作流
        this.workflowRegistry.removeActiveWorkflow(threadContext.getWorkflowId());
      }
      this.threadContexts.delete(threadId);
    }
  }
  ```

#### 3. 优化后的引用检查器
```typescript
function checkThreadReferences(
  threadRegistry: ThreadRegistry,
  workflowId: string
): WorkflowReference[] {
  // 快速检查：直接查询活跃工作流集合
  if (!threadRegistry.isWorkflowActive(workflowId)) {
    return [];
  }
  
  // 详细检查：仅对活跃工作流进行详细遍历
  return getDetailedThreadReferences(threadRegistry, workflowId);
}
```

## 实现步骤

### 阶段一：基础架构改造
1. **修改 WorkflowRegistry**：添加活跃工作流集合和相关方法
2. **修改 ThreadRegistry**：添加 WorkflowRegistry 依赖，集成活跃状态管理
3. **更新依赖注入**：确保 ThreadRegistry 正确获取 WorkflowRegistry 实例

### 阶段二：协调器集成
1. **更新 ThreadLifecycleCoordinator**：确保所有线程创建路径都通过 ThreadRegistry
2. **更新 ThreadOperationCoordinator**：确保 Fork/Copy 操作正确注册线程
3. **更新 CheckpointCoordinator**：确保恢复检查点时正确注册线程

### 阶段三：引用检查器优化
1. **修改 workflow-reference-checker**：使用新的快速检查方法
2. **添加性能测试**：验证优化效果
3. **更新文档**：记录新的架构和性能特性

## 性能预期

### 优化前
- **时间复杂度**：O(n) - 需要遍历所有线程
- **内存使用**：无额外开销
- **检查耗时**：与线程数量成正比

### 优化后
- **时间复杂度**：O(1) - 直接 Set 查询
- **内存使用**：增加 Set 数据结构（每个工作流ID约50字节）
- **检查耗时**：常数时间，与线程数量无关

## 风险与缓解

### 风险1：循环依赖
- **描述**：WorkflowRegistry 和 ThreadRegistry 可能形成循环依赖
- **缓解**：通过 ExecutionContext 进行依赖注入，避免直接相互引用

### 风险2：状态不一致
- **描述**：线程状态变化可能导致活跃状态不一致
- **缓解**：仅在注册/删除时更新活跃状态，状态变化不影响活跃性

### 风险3：并发安全
- **描述**：多线程环境下 Set 操作可能不安全
- **缓解**：使用线程安全的数据结构或加锁机制

## 测试策略

### 单元测试
1. **WorkflowRegistry 活跃状态管理**
2. **ThreadRegistry 集成测试**
3. **引用检查器性能测试**

### 集成测试
1. **完整生命周期测试**：创建→执行→完成→删除
2. **并发测试**：多线程环境下的状态一致性
3. **性能对比测试**：优化前后的性能对比

## 结论

本优化方案通过维护活跃工作流集合，能够显著提升引用检查性能，特别是在线程数量较多的场景下。实现成本可控，架构清晰，建议采纳此方案。