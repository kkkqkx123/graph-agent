# SDK Core 模块依赖分析

## 执行摘要

通过对 `sdk\core` 目录的深入分析，发现了当前依赖管理机制存在多个架构层面的问题。主要问题集中在循环依赖、依赖获取方式不一致、以及职责边界不清晰等方面。

## 主要依赖获取模式

### 1. ExecutionSingletons 模式（推荐）

**使用场景**：全局共享的核心组件
**实现方式**：通过单例管理器获取依赖
**优点**：
- 避免循环依赖
- 统一管理组件生命周期
- 支持测试时的重置

**示例代码**：
```typescript
constructor(workflowRegistry?: WorkflowRegistry) {
  this.workflowRegistry = workflowRegistry || ExecutionSingletons.getWorkflowRegistry();
  this.threadRegistry = ExecutionSingletons.getThreadRegistry();
  this.eventManager = ExecutionSingletons.getEventManager();
}
```

**应用模块**：
- [`ThreadExecutor`](sdk/core/execution/thread-executor.ts:43-57)
- [`ThreadBuilder`](sdk/core/execution/thread-builder.ts:30-33)
- [`CheckpointManager`](sdk/core/execution/managers/checkpoint-manager.ts:37-46)

### 2. 构造函数注入模式（推荐）

**使用场景**：模块间明确的依赖关系
**实现方式**：通过构造函数参数注入依赖
**优点**：
- 依赖关系清晰明确
- 便于单元测试（可注入mock）
- 符合依赖倒置原则

**示例代码**：
```typescript
constructor(
  private threadRegistry: ThreadRegistry,
  private threadBuilder: ThreadBuilder,
  private eventManager: EventManager
) {
  this.registerEventListeners();
}
```

**应用模块**：
- [`ThreadCoordinator`](sdk/core/execution/thread-coordinator.ts:57-64)
- [`ThreadLifecycleManager`](sdk/core/execution/thread-lifecycle-manager.ts:15-16)
- [`Router`](sdk/core/execution/router.ts:17-18)

### 3. 直接实例化模式（不推荐）

**使用场景**：简单的工具类或无状态组件
**实现方式**：在构造函数中直接 `new` 依赖
**问题**：
- 难以进行单元测试
- 依赖关系隐藏
- 违反依赖倒置原则

**示例代码**：
```typescript
constructor() {
  this.registry = new ToolRegistry();  // 直接实例化
  this.initializeExecutors();
}

private initializeExecutors(): void {
  this.executors.set(ToolType.BUILTIN, new BuiltinToolExecutor());
  this.executors.set(ToolType.NATIVE, new NativeToolExecutor());
}
```

**应用模块**：
- [`ToolService`](sdk/core/tools/tool-service.ts:24-37)
- [`VariableManager`](sdk/core/execution/managers/variable-manager.ts:11)

### 4. 静态工厂模式（混合）

**使用场景**：创建不同类型的执行器
**实现方式**：静态方法创建实例
**特点**：
- 适合创建型模式
- 但内部实现可能隐藏依赖问题

**示例代码**：
```typescript
static createExecutor(nodeType: NodeType): NodeExecutor {
  if (this.executorMap.size === 0) {
    this.initializeExecutorMap();
  }
  
  const ExecutorClass = this.executorMap.get(nodeType);
  if (!ExecutorClass) {
    throw new Error(`No executor found for node type: ${nodeType}`);
  }
  
  return new ExecutorClass();
}
```

**应用模块**：
- [`NodeExecutorFactory`](sdk/core/execution/executors/node-executor-factory.ts:57-69)
- [`ClientFactory`](sdk/core/llm/client-factory.ts:30-46)

## 发现的主要问题

### 1. 循环依赖风险 ⚠️

**问题模块**：[`TriggerManager`](sdk/core/execution/managers/trigger-manager.ts:26-30)

```typescript
constructor(
  private eventManager: EventManager,
  private threadExecutor: ThreadExecutor,  // ⚠️ 循环依赖
  private threadBuilder: ThreadBuilder
) { }
```

**影响**：
- [`ThreadExecutor`](sdk/core/execution/thread-executor.ts:56) 依赖 `TriggerManager`
- `TriggerManager` 又依赖 `ThreadExecutor`
- 可能导致初始化死锁

**严重程度**：🔴 高

### 2. 职责边界不清晰 ⚠️

**问题模块**：[`VariableManager`](sdk/core/execution/managers/variable-manager.ts:11)

```typescript
export class VariableManager {
  // 无构造函数，直接操作 Thread 对象
  attachVariableMethods(thread: Thread): void {
    thread.getVariable = function (name: string): any {
      return this.variableValues[name];
    };
  }
}
```

**问题**：
- 将方法动态附加到 Thread 对象
- 破坏了 Thread 类型的纯净性
- 难以追踪 Thread 对象的行为

**严重程度**：🟡 中

### 3. 依赖获取方式不一致 ⚠️

**对比示例**：

```typescript
// 方式1：使用 ExecutionSingletons
class ThreadExecutor {
  constructor() {
    this.eventManager = ExecutionSingletons.getEventManager();
  }
}

// 方式2：构造函数注入
class ThreadCoordinator {
  constructor(private eventManager: EventManager) { }
}

// 方式3：直接实例化
class ToolService {
  constructor() {
    this.registry = new ToolRegistry();
  }
}
```

**问题**：
- 缺乏统一的依赖管理策略
- 新开发者难以遵循最佳实践
- 测试复杂度不一致

**严重程度**：🟡 中

### 4. 隐藏依赖问题 ⚠️

**问题模块**：[`NodeExecutor`](sdk/core/execution/executors/node/base-node-executor.ts:49-52)

```typescript
async execute(thread: Thread, node: Node, emitEvent?: Function): Promise<NodeExecutionResult> {
  // 步骤3：执行BEFORE_EXECUTE类型的Hook
  if (emitEvent && node.hooks && node.hooks.length > 0) {
    const hookExecutor = new HookExecutor();  // ⚠️ 隐藏依赖
    await hookExecutor.executeBeforeExecute({ thread, node }, emitEvent);
  }
}
```

**问题**：
- 在方法内部直接实例化 `HookExecutor`
- 依赖关系不明确
- 难以替换或mock HookExecutor

**严重程度**：🟡 中

### 5. 单例管理器职责过重 ⚠️

**问题模块**：[`ExecutionSingletons`](sdk/core/execution/singletons.ts:28-66)

```typescript
export class ExecutionSingletons {
  static initialize(): void {
    // 按依赖顺序初始化
    this.eventManager = new EventManager();
    this.workflowRegistry = new WorkflowRegistry();
    this.threadRegistry = new ThreadRegistry();
    this.conditionEvaluator = new ConditionEvaluator();
    this.checkpointManager = new CheckpointManager(
      undefined,
      this.threadRegistry,
      this.workflowRegistry
    );
  }
}
```

**问题**：
- 承担了依赖注入容器的职责
- 初始化逻辑集中，难以扩展
- 组件间依赖关系硬编码

**严重程度**：🟡 中

## 改进建议

### 1. 解决循环依赖

**方案**：使用事件驱动机制解耦

```typescript
// 修改 TriggerManager，移除对 ThreadExecutor 的直接依赖
export class TriggerManager {
  constructor(
    private eventManager: EventManager,
    private threadBuilder: ThreadBuilder
  ) {
    // 监听触发事件，而不是直接调用 ThreadExecutor
    this.eventManager.onInternal(InternalEventType.TRIGGER_ACTION, this.handleTriggerAction.bind(this));
  }
  
  private async handleTriggerAction(event: TriggerActionEvent): Promise<void> {
    // 通过事件总线协调，不直接依赖 ThreadExecutor
    const { action, context } = event;
    // ... 处理触发逻辑
  }
}
```

### 2. 统一依赖管理策略

**方案**：推广 ExecutionSingletons 模式

```typescript
// 统一所有核心组件使用 ExecutionSingletons
export class ToolService {
  private registry: ToolRegistry;
  private executors: Map<string, BaseToolExecutor> = new Map();

  constructor(
    registry?: ToolRegistry,
    builtinExecutor?: BuiltinToolExecutor,
    nativeExecutor?: NativeToolExecutor
  ) {
    this.registry = registry || ExecutionSingletons.getToolRegistry();
    
    // 使用可选参数或工厂方法获取执行器
    this.executors.set(ToolType.BUILTIN, builtinExecutor || ExecutionSingletons.getBuiltinToolExecutor());
    this.executors.set(ToolType.NATIVE, nativeExecutor || ExecutionSingletons.getNativeToolExecutor());
  }
}
```

### 3. 重构 VariableManager

**方案**：改为不可变的数据访问模式

```typescript
export class VariableManager {
  // 不再修改 Thread 对象，而是提供纯函数
  getVariable(thread: Thread, name: string): any {
    return thread.variableValues[name];
  }
  
  setVariable(thread: Thread, name: string, value: any): Thread {
    // 返回新的 Thread 对象，而不是修改原对象
    return {
      ...thread,
      variableValues: {
        ...thread.variableValues,
        [name]: value
      }
    };
  }
}
```

### 4. 引入依赖注入容器

**方案**：使用轻量级 DI 容器替代 ExecutionSingletons

```typescript
// 定义容器接口
interface DIContainer {
  register<T>(token: string, factory: () => T): void;
  resolve<T>(token: string): T;
}

// 使用示例
const container = new SimpleDIContainer();

// 注册组件
container.register('EventManager', () => new EventManager());
container.register('WorkflowRegistry', () => new WorkflowRegistry());
container.register('ThreadExecutor', (c) => new ThreadExecutor(
  c.resolve('WorkflowRegistry')
));

// 解析组件
const threadExecutor = container.resolve<ThreadExecutor>('ThreadExecutor');
```

### 5. 优化 NodeExecutorFactory

**方案**：使用依赖注入创建执行器

```typescript
export class NodeExecutorFactory {
  private static executorMap: Map<NodeType, (container: DIContainer) => NodeExecutor> = new Map();

  static initializeExecutorMap(container: DIContainer): void {
    this.executorMap.set(NodeType.LLM, () => new LLMNodeExecutor(
      container.resolve('LLMExecutor')
    ));
    this.executorMap.set(NodeType.TOOL, () => new ToolNodeExecutor(
      container.resolve('ToolService')
    ));
    // ... 其他执行器
  }

  static createExecutor(nodeType: NodeType, container: DIContainer): NodeExecutor {
    const factory = this.executorMap.get(nodeType);
    if (!factory) {
      throw new Error(`No executor found for node type: ${nodeType}`);
    }
    return factory(container);
  }
}
```

## 重构优先级

### 高优先级（立即处理）
1. **解决 TriggerManager 循环依赖** - 可能导致系统不稳定
2. **统一依赖获取方式** - 建立团队开发规范

### 中优先级（下个迭代）
3. **重构 VariableManager** - 改善代码可维护性
4. **优化隐藏依赖** - 提高代码透明度

### 低优先级（长期规划）
5. **引入 DI 容器** - 架构升级，需要充分测试
6. **完善单例管理** - 增强系统扩展性

## 测试策略

### 单元测试改进
```typescript
// 改进后的可测试代码
describe('ThreadExecutor', () => {
  it('should execute thread successfully', async () => {
    // 使用 mock 依赖
    const mockEventManager = new MockEventManager();
    const mockThreadRegistry = new MockThreadRegistry();
    
    const executor = new ThreadExecutor(
      mockEventManager,
      mockThreadRegistry
    );
    
    // ... 测试逻辑
  });
});
```

### 集成测试重点
- 验证事件驱动机制的正确性
- 测试循环依赖解除后的系统稳定性
- 验证 DI 容器的组件解析逻辑

## 结论

当前 `sdk\core` 模块的依赖管理存在多个架构层面的问题，主要集中在循环依赖、职责边界不清晰和依赖获取方式不一致等方面。通过引入事件驱动机制、统一使用 ExecutionSingletons 模式、以及逐步引入轻量级 DI 容器，可以显著改善代码质量和系统可维护性。

建议优先解决循环依赖问题，然后逐步推进其他改进措施，确保系统的稳定性和可测试性。