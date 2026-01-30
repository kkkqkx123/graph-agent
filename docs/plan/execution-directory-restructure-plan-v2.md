# SDK Core Execution 目录结构重构方案（修订版）

## 背景分析

经过深入分析，发现原始分析中对某些组件的单例/多实例判断需要修正。为了提供更好的架构灵活性和多租户支持，大部分核心服务都应该支持多实例。

## 修正后的服务分类

### 全局单例服务（Global Singleton Services）
只有以下组件应该保持单例：

1. **EventManager** - 全局事件总线
   - 特征：纯状态管理（监听器注册）、全局可访问、无执行上下文依赖
   - 验证：只管理事件监听和分发，不包含任何执行状态
   - **理由**：事件系统需要全局统一，所有组件都能监听到相同的事件

### 多实例服务（Multi-instance Services）
以下所有组件都应该支持多实例：

1. **WorkflowRegistry** - 工作流注册表
   - **修正理由**：
     - 多租户场景需要隔离的工作流定义
     - 测试环境需要独立的工作流注册表
     - 不同环境（开发/测试/生产）可能需要不同的工作流版本
     - 避免全局状态污染

2. **ThreadRegistry** - 线程注册表  
   - **修正理由**：
     - 每个执行环境应该管理自己的线程实例
     - 避免不同执行环境之间的线程干扰
     - 更好的资源隔离和清理

3. **CheckpointManager** - 检查点管理器
   - 问题：当前设计强制使用单例，但实际可能需要：
     - 不同的存储后端（内存、文件、数据库）
     - 不同的检查点策略（定期、节点级别、手动）
     - 测试时需要独立的存储实例
   - 建议：改为工厂模式，支持创建多个实例

4. **ThreadLifecycleManager** - 线程生命周期管理器
   - 问题：当前与EventManager强耦合，但可能需要：
     - 不同的生命周期事件处理策略
     - 测试时需要独立的生命周期管理器
   - 建议：通过构造函数注入EventManager，支持多实例

5. **ExecutionContext** - 执行上下文
   - 问题：模块级单例无法支持：
     - 多个独立的执行环境
     - 不同配置的执行上下文
     - 并行测试环境
   - 建议：移除单例模式，提供工厂方法创建实例

6. **ThreadContext** - 线程上下文
   - 特征：执行上下文相关、状态隔离性、生命周期绑定
   - 验证：每个线程执行都需要独立的上下文实例

7. **TriggerManager** - 触发器管理器
   - 特征：每个执行环境可能需要独立的触发器配置
   - 验证：当前实现已经是多实例友好的

## 新目录结构设计

```
sdk/core/
├── services/                    # 全局单例服务（仅EventManager）
│   └── event-manager.ts        # EventManager (单例)
│
├── execution/                   # 执行相关组件（全部多实例）
│   ├── context/               # 执行上下文
│   │   ├── execution-context.ts    # ExecutionContext (多实例)
│   │   ├── thread-context.ts       # ThreadContext (多实例)
│   │   └── execution-state.ts      # ExecutionState (多实例)
│   │
│   ├── managers/              # 执行管理器（全部多实例）
│   │   ├── checkpoint-manager.ts   # CheckpointManager (多实例)
│   │   ├── lifecycle-manager.ts    # ThreadLifecycleManager (多实例)
│   │   ├── variable-manager.ts     # VariableManager (多实例)
│   │   ├── trigger-manager.ts      # TriggerManager (多实例)
│   │   ├── workflow-registry.ts    # WorkflowRegistry (多实例)
│   │   └── thread-registry.ts      # ThreadRegistry (多实例)
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

## 关键变更说明

### 1. WorkflowRegistry 和 ThreadRegistry 移动到 managers 目录
- 这两个组件现在都是多实例服务
- 它们将作为 ExecutionContext 的组成部分被创建和管理
- 每个 ExecutionContext 实例都有自己的 WorkflowRegistry 和 ThreadRegistry

### 2. EventManager 保持在 services 目录
- 作为唯一的全局单例服务
- 所有 ExecutionContext 实例共享同一个 EventManager
- 通过依赖注入传递给需要的组件

### 3. ExecutionContext 重构
```typescript
// 新的 ExecutionContext 构造函数
constructor(options: {
  eventManager?: EventManager;           // 可选，使用全局默认或自定义
  workflowRegistry?: WorkflowRegistry;   // 可选，创建新的或传入现有
  threadRegistry?: ThreadRegistry;       // 可选，创建新的或传入现有
  enablePreprocessing?: boolean;
  maxRecursionDepth?: number;
} = {}) {
  // 使用传入的实例或创建新的实例
  this.eventManager = options.eventManager || GlobalServices.getEventManager();
  this.workflowRegistry = options.workflowRegistry || new WorkflowRegistry({
    enablePreprocessing: options.enablePreprocessing,
    maxRecursionDepth: options.maxRecursionDepth
  });
  this.threadRegistry = options.threadRegistry || new ThreadRegistry();
  // ... 其他初始化
}
```

### 4. 全局服务管理器
为了提供向后兼容性，创建一个全局服务管理器：

```typescript
// sdk/core/services/global-services.ts
export class GlobalServices {
  private static eventManager: EventManager;
  
  static getEventManager(): EventManager {
    if (!this.eventManager) {
      this.eventManager = new EventManager();
    }
    return this.eventManager;
  }
  
  static reset(): void {
    this.eventManager = null as any;
  }
}
```

### 5. 工厂方法
提供便捷的工厂方法：

```typescript
// 创建独立的执行环境
const isolatedContext = ExecutionContext.createIsolated();

// 创建共享事件管理器的执行环境  
const sharedContext = ExecutionContext.createShared();

// 创建自定义配置的执行环境
const customContext = ExecutionContext.create({
  eventManager: customEventManager,
  workflowRegistry: customWorkflowRegistry,
  threadRegistry: customThreadRegistry
});
```

## 向后兼容性策略

1. **默认行为保持不变**：`ExecutionContext.createDefault()` 仍然使用全局 EventManager
2. **渐进式迁移**：现有代码无需修改即可继续工作
3. **新功能支持**：新代码可以选择使用完全隔离的执行环境

## 预期收益

1. **真正的多租户支持**：每个租户可以有完全独立的执行环境
2. **更好的测试隔离**：每个测试用例可以创建独立的执行环境
3. **灵活的配置选项**：可以根据需要选择共享或隔离的组件
4. **清晰的架构边界**：明确区分全局服务和执行服务
5. **向后兼容**：现有代码无需修改

## 迁移步骤

1. 创建 `services` 目录并移动 EventManager
2. 将 WorkflowRegistry 和 ThreadRegistry 移动到 `execution/managers` 目录
3. 更新 ExecutionContext 的依赖注入逻辑
4. 创建 GlobalServices 类提供全局默认实例
5. 更新所有引用路径和导入语句
6. 更新测试用例以支持新的架构
7. 提供详细的迁移文档