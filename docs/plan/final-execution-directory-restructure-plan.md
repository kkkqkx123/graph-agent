# SDK Core Execution 最终目录结构重构方案

## 修正后的服务分类分析

基于深入讨论，重新评估了WorkflowRegistry的单例/多实例性质：

### 用户观点的正确性
**"工作流本身就是静态定义，thread不会修改workflow"** - 这个观点完全正确。

### WorkflowRegistry 应该是单例的理由
1. **工作流定义是只读的** - 一旦注册，执行过程不会修改
2. **全局共享是合理的** - 所有执行环境应访问相同的工作流定义  
3. **内存效率** - 避免重复存储相同的工作流定义
4. **一致性保证** - 确保所有执行使用相同的工作流版本
5. **符合直觉** - 工作流定义天然就是全局配置

### ThreadRegistry 应该是多实例的理由
1. **线程状态是动态的** - 每个执行都有独立的线程状态
2. **需要完全隔离** - 不同执行环境的线程不应互相干扰
3. **生命周期绑定** - 线程与具体执行上下文绑定

## 最终服务分类

### 全局单例服务（Global Singleton Services）
1. **EventManager** - 全局事件总线
   - 特征：纯状态管理、全局可访问、无执行上下文依赖
   
2. **WorkflowRegistry** - 工作流定义注册表 ✅ **修正为单例**
   - 特征：静态定义存储、全局共享、只读访问

### 多实例服务（Multi-instance Services）
1. **ThreadRegistry** - 线程注册表
2. **CheckpointManager** - 检查点管理器  
3. **ThreadLifecycleManager** - 生命周期管理器
4. **ExecutionContext** - 执行上下文
5. **ThreadContext** - 线程上下文
6. **TriggerManager** - 触发器管理器

## 最终目录结构

```
sdk/core/
├── services/                    # 全局单例服务
│   ├── event-manager.ts        # EventManager (单例)
│   └── workflow-registry.ts    # WorkflowRegistry (单例) ← 从 registry/ 移动
│
├── execution/                   # 执行相关组件（多实例）
│   ├── context/               # 执行上下文
│   │   ├── execution-context.ts
│   │   ├── thread-context.ts  
│   │   └── execution-state.ts
│   │
│   ├── managers/              # 执行管理器（多实例）
│   │   ├── checkpoint-manager.ts
│   │   ├── lifecycle-manager.ts
│   │   ├── variable-manager.ts
│   │   ├── trigger-manager.ts
│   │   └── thread-registry.ts      # ThreadRegistry (多实例) ← 从 registry/ 移动
│   │
│   ├── coordinators/          # 执行协调器
│   ├── handlers/             # 节点处理器  
│   ├── conversation/         # 对话管理
│   └── thread-operations/    # 线程操作
│
└── graph/                    # 图相关组件
    ├── graph-builder.ts
    ├── graph-navigator.ts
    ├── graph-validator.ts
    └── graph-data.ts
```

## 关键实现细节

### 全局服务管理器
```typescript
// sdk/core/services/global-services.ts
export class GlobalServices {
  private static eventManager: EventManager;
  private static workflowRegistry: WorkflowRegistry;
  
  static getEventManager(): EventManager {
    if (!this.eventManager) {
      this.eventManager = new EventManager();
    }
    return this.eventManager;
  }
  
  static getWorkflowRegistry(): WorkflowRegistry {
    if (!this.workflowRegistry) {
      this.workflowRegistry = new WorkflowRegistry({
        enablePreprocessing: true,
        maxRecursionDepth: 10
      });
    }
    return this.workflowRegistry;
  }
}
```

### ExecutionContext 依赖注入
```typescript
// ExecutionContext.ts
initialize(): void {
  // 全局单例服务
  const eventManager = GlobalServices.getEventManager();
  const workflowRegistry = GlobalServices.getWorkflowRegistry();
  
  // 多实例服务
  const threadRegistry = new ThreadRegistry();
  const triggerManager = new TriggerManager();
  
  this.register('eventManager', eventManager);
  this.register('workflowRegistry', workflowRegistry);
  this.register('threadRegistry', threadRegistry);
  this.register('triggerManager', triggerManager);
}
```

### 触发器注册逻辑迁移
由于WorkflowRegistry不再处理触发器，触发器注册移到执行层：

```typescript
// ThreadExecutor.execute()
async execute(threadContext: ThreadContext): Promise<ThreadResult> {
  const workflow = threadContext.getWorkflow();
  
  // 在执行开始时注册工作流中的触发器
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

## 迁移步骤

1. **创建 services 目录**
   ```bash
   mkdir sdk/core/services
   ```

2. **移动文件**
   ```bash
   # 移动 EventManager
   mv sdk/core/execution/managers/event-manager.ts sdk/core/services/event-manager.ts
   
   # 移动 WorkflowRegistry  
   mv sdk/core/registry/workflow-registry.ts sdk/core/services/workflow-registry.ts
   
   # 移动 ThreadRegistry
   mv sdk/core/registry/thread-registry.ts sdk/core/execution/managers/thread-registry.ts
   
   # 删除空的 registry 目录
   rmdir sdk/core/registry
   ```

3. **创建全局服务管理器**
   - 创建 `sdk/core/services/global-services.ts`

4. **更新 ExecutionContext**
   - 修改导入路径
   - 更新初始化逻辑

5. **更新 ThreadExecutor**  
   - 添加触发器注册逻辑

6. **更新所有相关导入路径**

## 架构收益

1. **职责清晰**：严格区分全局单例服务和多实例执行服务
2. **符合实际需求**：WorkflowRegistry作为单例更符合工作流定义的静态特性
3. **内存效率**：避免重复存储工作流定义
4. **执行隔离**：ThreadRegistry多实例确保执行环境完全隔离
5. **向后兼容**：通过适当的路径更新保持API兼容性

这个最终方案既解决了原始的架构问题，又符合工作流引擎的实际使用场景。