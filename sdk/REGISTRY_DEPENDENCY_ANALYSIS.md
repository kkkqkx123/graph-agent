# 注册表依赖关系分析与重构方案

## 文档概述

本文档详细分析了 `sdk/core/services` 中三个核心注册表服务（GraphRegistry、ThreadRegistry、WorkflowRegistry）之间的依赖关系问题，并提出了基于依赖注入的优化方案。

**分析日期**: 2025-01-XX  
**涉及模块**: 
- `sdk/core/services/graph-registry.ts`
- `sdk/core/services/thread-registry.ts`
- `sdk/core/services/workflow-registry.ts`
- `sdk/core/execution/managers/workflow-reference-manager.ts`

---

## 一、当前依赖关系分析

### 1.1 依赖关系图

```
┌─────────────────────────────────────────────────────────────┐
│                    SingletonRegistry                         │
│                  (全局单例协调器)                            │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────────────┐
│ GraphRegistry │  │ThreadRegistry │  │ WorkflowRegistry      │
│   (存储层)    │  │  (存储层)     │  │    (定义层)           │
└───────────────┘  └───────────────┘  └───────────────────────┘
                                              │
                                              │ 延迟获取
                                              ▼
                                    ┌───────────────────────┐
                                    │ WorkflowReferenceMgr  │
                                    │   (引用管理)          │
                                    └───────────────────────┘
                                              │
                                              │ 延迟获取
                                              ▼
                                    ┌───────────────┐
                                    │ThreadRegistry │
                                    └───────────────┘
```

### 1.2 具体依赖关系

#### WorkflowRegistry 的依赖
```typescript
// 1. 通过延迟获取依赖 GraphRegistry
private getGraphRegistry(): GraphRegistry {
  return SingletonRegistry.get<GraphRegistry>('graphRegistry');
}

// 2. 构造函数中创建 WorkflowReferenceManager 并传递自身
constructor(options: { maxRecursionDepth?: number } = {}) {
  this.maxRecursionDepth = options.maxRecursionDepth ?? 10;
  this.referenceManager = new WorkflowReferenceManager(this); // 循环依赖
}

// 3. 在 preprocessWorkflow 中使用 GraphRegistry
private async preprocessWorkflow(workflow: WorkflowDefinition): Promise<void> {
  const graphRegistry = this.getGraphRegistry();
  // ... 使用 graphRegistry
}
```

#### WorkflowReferenceManager 的依赖
```typescript
// 1. 构造函数接收 WorkflowRegistry（形成循环依赖）
constructor(private workflowRegistry: WorkflowRegistry) { }

// 2. 通过延迟获取依赖 ThreadRegistry
private getThreadRegistry(): ThreadRegistry {
  return SingletonRegistry.getThreadRegistry();
}

// 3. 在方法中使用 WorkflowRegistry
hasReferences(workflowId: string): boolean {
  const hasParentRelationship = this.workflowRegistry.getParentWorkflow(workflowId) !== null;
  // ...
}
```

### 1.3 依赖关系总结

| 源组件 | 目标组件 | 依赖方式 | 依赖类型 |
|--------|----------|----------|----------|
| WorkflowRegistry | GraphRegistry | 延迟获取 | 运行时依赖 |
| WorkflowRegistry | WorkflowReferenceManager | 构造函数注入 | 循环依赖 |
| WorkflowReferenceManager | WorkflowRegistry | 构造函数注入 | 循环依赖 |
| WorkflowReferenceManager | ThreadRegistry | 延迟获取 | 运行时依赖 |

---

## 二、问题诊断

### 2.1 循环依赖问题

**WorkflowRegistry ↔ WorkflowReferenceManager** 形成了循环依赖：

```
WorkflowRegistry 
    ↓ (构造函数创建)
WorkflowReferenceManager
    ↓ (构造函数参数)
WorkflowRegistry
```

这种循环依赖导致：
- 初始化顺序复杂，需要精心控制
- 单元测试困难，难以 mock
- 代码可维护性降低

### 2.2 延迟获取的弊端

当前使用 `SingletonRegistry.get()` 延迟获取依赖：
- **隐藏依赖关系**: 依赖关系不明确，难以从代码中看出
- **运行时错误**: 如果注册表未初始化，会在运行时抛出错误
- **测试困难**: 难以在测试中替换依赖

### 2.3 职责混淆

WorkflowRegistry 承担了过多职责：
1. 工作流定义的 CRUD
2. 工作流预处理
3. 引用关系管理
4. 活跃工作流管理

---

## 三、业务逻辑必要性分析

### 3.1 互操作的必要性

经过分析，当前的互操作从业务逻辑上是**必要的**：

#### WorkflowRegistry → GraphRegistry
- **原因**: 预处理是注册流程的自然延伸
- **业务逻辑**: 工作流注册后必须立即预处理，否则无法执行
- **不可分离**: 预处理失败应该阻止注册成功

#### WorkflowRegistry → WorkflowReferenceManager
- **原因**: 引用关系管理是工作流管理的核心职责
- **业务逻辑**: 工作流删除前必须检查引用关系
- **不可分离**: 引用检查是工作流生命周期管理的一部分

#### WorkflowReferenceManager → ThreadRegistry
- **原因**: 运行时引用检查需要线程状态信息
- **业务逻辑**: 检查工作流是否有活跃的运行实例
- **不可分离**: 运行时引用检查是安全删除的前提

### 3.2 结论

**不应该引入新的协调层**，原因：
1. 当前的互操作是业务需求，不是架构问题
2. 引入协调层会增加复杂度，但不会解决根本问题
3. SingletonRegistry 已经提供了良好的协调机制

---

## 四、优化方案：依赖注入 + 职责调整

### 4.1 核心思路

不引入新的协调层，而是通过**依赖注入**和**职责优化**解决循环依赖问题。

### 4.2 依赖关系优化

#### 优化后的依赖关系图

```
┌─────────────────────────────────────────────────────────────┐
│                    SingletonRegistry                         │
│                  (全局单例协调器)                            │
│                                                              │
│  初始化顺序：                                                 │
│  1. GraphRegistry (无依赖)                                   │
│  2. ThreadRegistry (无依赖)                                  │
│  3. WorkflowReferenceManager (无依赖)                        │
│  4. WorkflowRegistry (依赖 1, 2, 3)                          │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────────────┐
│ GraphRegistry │  │ThreadRegistry │  │ WorkflowReferenceMgr  │
│   (存储层)    │  │  (存储层)     │  │   (引用管理)          │
└───────────────┘  └───────────────┘  └───────────────────────┘
                                              ▲
                                              │ 构造函数注入
                                              │
                                    ┌───────────────────────┐
                                    │ WorkflowRegistry      │
                                    │    (定义层)           │
                                    └───────────────────────┘
```

### 4.3 具体改造方案

#### 4.3.1 WorkflowReferenceManager 改造

**改造前**:
```typescript
export class WorkflowReferenceManager {
  constructor(
    private workflowRegistry: WorkflowRegistry  // 循环依赖
  ) { }

  private getThreadRegistry(): ThreadRegistry {
    return SingletonRegistry.getThreadRegistry();
  }

  checkWorkflowReferences(workflowId: string): WorkflowReferenceInfo {
    return checkReferences(this.workflowRegistry, this.getThreadRegistry(), workflowId);
  }
}
```

**改造后**:
```typescript
export class WorkflowReferenceManager {
  // 移除构造函数依赖，改为无参构造
  constructor() { }

  // 方法改为接受 registry 参数
  checkWorkflowReferences(
    workflowRegistry: WorkflowRegistry,
    threadRegistry: ThreadRegistry,
    workflowId: string
  ): WorkflowReferenceInfo {
    return checkReferences(workflowRegistry, threadRegistry, workflowId);
  }

  hasReferences(
    workflowRegistry: WorkflowRegistry,
    workflowId: string
  ): boolean {
    const hasReferenceRelations = this.referenceRelations.has(workflowId) &&
      this.referenceRelations.get(workflowId)!.length > 0;
    const hasParentRelationship = workflowRegistry.getParentWorkflow(workflowId) !== null;
    return hasReferenceRelations || hasParentRelationship;
  }

  // 其他方法类似改造...
}
```

#### 4.3.2 WorkflowRegistry 改造

**改造前**:
```typescript
export class WorkflowRegistry {
  private referenceManager: WorkflowReferenceManager;

  constructor(options: { maxRecursionDepth?: number } = {}) {
    this.maxRecursionDepth = options.maxRecursionDepth ?? 10;
    this.referenceManager = new WorkflowReferenceManager(this); // 循环依赖
  }

  private getGraphRegistry(): GraphRegistry {
    return SingletonRegistry.get<GraphRegistry>('graphRegistry');
  }

  private async preprocessWorkflow(workflow: WorkflowDefinition): Promise<void> {
    const graphRegistry = this.getGraphRegistry();
    // ...
  }
}
```

**改造后**:
```typescript
export class WorkflowRegistry {
  private referenceManager: WorkflowReferenceManager;

  constructor(
    private graphRegistry: GraphRegistry,  // 构造函数注入
    private threadRegistry: ThreadRegistry, // 构造函数注入
    options: { maxRecursionDepth?: number } = {}
  ) {
    this.maxRecursionDepth = options.maxRecursionDepth ?? 10;
    this.referenceManager = new WorkflowReferenceManager(); // 无循环依赖
  }

  // 移除延迟获取方法
  // private getGraphRegistry(): GraphRegistry { ... }

  private async preprocessWorkflow(workflow: WorkflowDefinition): Promise<void> {
    // 直接使用注入的 graphRegistry
    if (this.graphRegistry.has(workflow.id)) {
      return;
    }
    // ...
  }

  // 更新调用 referenceManager 的方法
  checkWorkflowReferences(workflowId: string): WorkflowReferenceInfo {
    return this.referenceManager.checkWorkflowReferences(
      this, 
      this.threadRegistry, 
      workflowId
    );
  }

  hasReferences(workflowId: string): boolean {
    return this.referenceManager.hasReferences(this, workflowId);
  }
}
```

#### 4.3.3 SingletonRegistry 初始化优化

**改造前**:
```typescript
static initialize(): void {
  // 第三层：相互依赖的服务
  if (!this.has('threadRegistry')) {
    this.register('threadRegistry', new ThreadRegistry());
  }
  if (!this.has('graphRegistry')) {
    this.register('graphRegistry', new GraphRegistry());
  }
  if (!this.has('workflowRegistry')) {
    this.register('workflowRegistry', new WorkflowRegistry({ maxRecursionDepth: 10 }));
  }
}
```

**改造后**:
```typescript
static initialize(): void {
  // 第一层：无依赖的服务
  if (!this.has('eventManager')) {
    this.register('eventManager', new EventManager());
  }
  if (!this.has('globalMessageStorage')) {
    this.register('globalMessageStorage', new GlobalMessageStorage());
  }
  if (!this.has('nodeTemplateRegistry')) {
    this.register('nodeTemplateRegistry', new NodeTemplateRegistry());
  }
  if (!this.has('triggerTemplateRegistry')) {
    this.register('triggerTemplateRegistry', new TriggerTemplateRegistry());
  }
  if (!this.has('codeService')) {
    this.register('codeService', new CodeService());
  }
  if (!this.has('toolService')) {
    this.register('toolService', new ToolService());
  }
  if (!this.has('taskRegistry')) {
    this.register('taskRegistry', TaskRegistry.getInstance());
  }
  if (!this.has('llmExecutor')) {
    this.register('llmExecutor', LLMExecutor.getInstance());
  }

  // 第二层：依赖第一层的服务
  if (!this.has('errorService')) {
    const eventManager = this.instances.get('eventManager') as EventManager;
    this.register('errorService', new ErrorService(eventManager));
  }

  // 第三层：无依赖的注册表服务
  if (!this.has('threadRegistry')) {
    this.register('threadRegistry', new ThreadRegistry());
  }
  if (!this.has('graphRegistry')) {
    this.register('graphRegistry', new GraphRegistry());
  }
  if (!this.has('workflowReferenceManager')) {
    this.register('workflowReferenceManager', new WorkflowReferenceManager());
  }

  // 第四层：依赖第三层的复杂服务
  if (!this.has('workflowRegistry')) {
    const graphRegistry = this.instances.get('graphRegistry') as GraphRegistry;
    const threadRegistry = this.instances.get('threadRegistry') as ThreadRegistry;
    this.register('workflowRegistry', new WorkflowRegistry(
      graphRegistry,
      threadRegistry,
      { maxRecursionDepth: 10 }
    ));
  }

  this.initialized = true;
}
```

### 4.4 优势分析

| 方面 | 改造前 | 改造后 |
|------|--------|--------|
| 循环依赖 | 存在 | 消除 |
| 依赖关系 | 隐藏（延迟获取） | 明确（构造函数注入） |
| 初始化顺序 | 复杂 | 清晰（分层初始化） |
| 可测试性 | 困难 | 容易（依赖注入） |
| 代码可维护性 | 中等 | 高 |
| 业务逻辑 | 完整 | 完整 |

---

## 五、实施计划

### 5.1 改造步骤

#### 阶段一：准备工作
1. **备份现有代码**
   - 创建分支 `refactor/registry-dependency`
   - 确保所有测试通过

2. **改造 WorkflowReferenceManager**
   - 移除构造函数中的 WorkflowRegistry 依赖
   - 将所有方法改为接受必要的 registry 参数
   - 更新所有调用点

#### 阶段二：核心迁移
3. **改造 WorkflowRegistry**
   - 修改构造函数，接受 GraphRegistry 和 ThreadRegistry
   - 移除 `getGraphRegistry()` 方法
   - 更新 `preprocessWorkflow` 方法
   - 更新所有调用 referenceManager 的方法

4. **更新 SingletonRegistry**
   - 修改初始化顺序
   - 添加 WorkflowReferenceManager 的注册
   - 更新 WorkflowRegistry 的实例化逻辑

#### 阶段三：清理和验证
5. **更新所有调用点**
   - 搜索所有使用 `SingletonRegistry.get<WorkflowRegistry>()` 的地方
   - 确保依赖注入正确传递

6. **测试验证**
   - 运行所有单元测试
   - 运行所有集成测试
   - 验证功能完整性

### 5.2 影响范围评估

#### 需要修改的文件
1. `sdk/core/services/workflow-registry.ts`
2. `sdk/core/execution/managers/workflow-reference-manager.ts`
3. `sdk/core/execution/context/singleton-registry.ts`

#### 可能受影响的文件
1. `sdk/core/graph/workflow-processor.ts` - 使用 WorkflowRegistry
2. `sdk/core/graph/graph-builder.ts` - 使用 WorkflowRegistry
3. `sdk/core/execution/thread-builder.ts` - 使用 GraphRegistry
4. 所有测试文件

#### 风险评估
- **低风险**: 改造主要是内部实现，对外接口基本不变
- **中风险**: 需要更新所有测试文件
- **可控风险**: 可以通过分支和测试来控制

### 5.3 回滚计划

如果改造出现问题，可以快速回滚：
1. 切换回主分支
2. 恢复原有代码
3. 重新运行测试

---

## 六、总结

### 6.1 核心结论

1. **互操作是必要的**: 当前的互操作是业务需求，不应该引入新的协调层
2. **循环依赖是问题**: WorkflowRegistry 和 WorkflowReferenceManager 之间的循环依赖需要解决
3. **依赖注入是方案**: 通过构造函数注入和参数注入可以消除循环依赖
4. **SingletonRegistry 是关键**: 保持 SingletonRegistry 作为协调者，优化初始化顺序

### 6.2 架构原则

1. **单向依赖**: 依赖关系应该是单向的，从高层到低层
2. **明确依赖**: 通过构造函数注入明确依赖关系
3. **职责单一**: 每个组件只负责一个明确的职责
4. **易于测试**: 依赖注入使得单元测试更容易

### 6.3 后续建议

1. **代码审查**: 改造完成后进行代码审查
2. **性能测试**: 确保改造不影响性能
3. **文档更新**: 更新相关文档和注释
4. **持续监控**: 监控改造后的运行情况

---

## 附录

### A. 相关文件清单

| 文件路径 | 说明 |
|----------|------|
| `sdk/core/services/graph-registry.ts` | 图注册表 |
| `sdk/core/services/thread-registry.ts` | 线程注册表 |
| `sdk/core/services/workflow-registry.ts` | 工作流注册表 |
| `sdk/core/execution/managers/workflow-reference-manager.ts` | 工作流引用管理器 |
| `sdk/core/execution/context/singleton-registry.ts` | 单例注册表 |

### B. 参考资料

- [依赖注入模式](https://en.wikipedia.org/wiki/Dependency_injection)
- [循环依赖解决方案](https://stackoverflow.com/questions/3457190/what-is-circular-dependency)
- [Singleton 模式](https://en.wikipedia.org/wiki/Singleton_pattern)

### C. 变更历史

| 日期 | 版本 | 说明 | 作者 |
|------|------|------|------|
| 2025-01-XX | 1.0 | 初始版本 | AI Assistant |