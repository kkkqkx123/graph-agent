# SDK Execution 模块单例化分析与简化方案

## 核心原则

对于SDK而言，应该遵循以下原则：
1. **保持简单**：避免引入复杂的依赖注入容器
2. **明确职责**：清晰区分全局状态管理和局部状态管理
3. **易于使用**：提供简洁的API，降低使用门槛
4. **性能优先**：减少不必要的抽象层和运行时开销

## 应该单例化的组件分析

### 必须单例的组件（全局状态管理）

#### 1. WorkflowRegistry（工作流注册器）
**理由**：
- 工作流定义是全局共享的资源
- 多个 ThreadExecutor 需要访问相同的工作流定义
- 避免重复加载和验证工作流
- 需要统一管理版本和缓存

**生命周期**：
- 应用启动时创建
- 整个应用生命周期内保持单例
- 线程安全（读多写少，需要同步机制）

#### 2. ThreadRegistry（线程注册表）
**理由**：
- 需要全局跟踪所有 ThreadContext 实例
- CheckpointManager、ThreadCoordinator 需要访问所有线程
- 调试和监控需要全局视图
- 避免线程ID冲突

**生命周期**：
- 应用启动时创建
- 整个应用生命周期内保持单例
- 需要线程安全机制

#### 3. EventManager（事件管理器）
**理由**：
- 事件系统需要全局协调
- 跨模块通信需要统一的事件总线
- 触发器系统依赖全局事件
- 调试和监控需要集中管理

**生命周期**：
- 应用启动时创建
- 整个应用生命周期内保持单例
- 必须线程安全

### 可选单例的组件（根据使用场景）

#### 4. CheckpointManager（检查点管理器）
**单例理由**：
- 统一管理所有线程的检查点
- 避免重复配置存储后端
- 便于集中管理和清理

**多例理由**：
- 不同业务可能需要不同的存储策略
- 测试时需要隔离

**建议**：**默认单例**，但支持创建多个实例

#### 5. VariableManager（变量管理器）
**分析**：
- 实际上是无状态的工具类
- 不需要保存实例状态
- 可以直接使用静态方法

**建议**：**改为静态工具类**，不需要实例化

### 不应该单例的组件（保持实例化）

#### 6. ThreadExecutor（线程执行器）
**理由**：
- 每个执行器可以有独立的配置
- 测试时需要隔离执行环境
- 支持多租户场景
- 无全局状态需要共享

**建议**：**保持多例**，由用户决定创建方式

#### 7. ThreadCoordinator（线程协调器）
**理由**：
- 依赖具体的 ThreadExecutor 实例
- Fork/Join 逻辑与执行器绑定
- 无独立的全局状态

**建议**：**保持多例**，与 ThreadExecutor 生命周期一致

#### 8. ThreadBuilder（线程构建器）
**理由**：
- 依赖 WorkflowRegistry（单例）
- 无独立的全局状态
- 创建成本较低

**建议**：**保持多例**，但可以复用实例

#### 9. LLMExecutor（LLM执行器）
**理由**：
- 每个线程需要独立的对话历史
- 配置可能不同（模型、参数等）
- 有状态（迭代次数、消息历史）

**建议**：**保持多例**，每个 ThreadContext 一个实例

#### 10. ConversationManager（对话管理器）
**理由**：
- 每个线程需要独立的对话历史
- Token 统计是线程级别的
- 有状态（消息数组、Token使用）

**建议**：**保持多例**，每个 ThreadContext 一个实例

## 简化后的依赖管理方案

### 方案一：模块级单例（推荐）

```typescript
// 在模块级别管理单例
// sdk/core/execution/singletons.ts

class ExecutionSingletons {
  private static workflowRegistry: WorkflowRegistry;
  private static threadRegistry: ThreadRegistry;
  private static eventManager: EventManager;
  private static checkpointManager: CheckpointManager;
  
  static getWorkflowRegistry(): WorkflowRegistry {
    if (!this.workflowRegistry) {
      this.workflowRegistry = new WorkflowRegistry();
    }
    return this.workflowRegistry;
  }
  
  static getThreadRegistry(): ThreadRegistry {
    if (!this.threadRegistry) {
      this.threadRegistry = new ThreadRegistry();
    }
    return this.threadRegistry;
  }
  
  static getEventManager(): EventManager {
    if (!this.eventManager) {
      this.eventManager = new EventManager();
    }
    return this.eventManager;
  }
  
  static getCheckpointManager(): CheckpointManager {
    if (!this.checkpointManager) {
      this.checkpointManager = new CheckpointManager(
        undefined,
        this.getThreadRegistry(),
        undefined,
        this.getWorkflowRegistry()
      );
    }
    return this.checkpointManager;
  }
  
  // 重置方法（主要用于测试）
  static reset(): void {
    this.workflowRegistry = undefined as any;
    this.threadRegistry = undefined as any;
    this.eventManager = undefined as any;
    this.checkpointManager = undefined as any;
  }
}

// 使用方式
const workflowRegistry = ExecutionSingletons.getWorkflowRegistry();
const eventManager = ExecutionSingletons.getEventManager();
```

**优点**：
- 简单明了，无外部依赖
- 延迟初始化，按需创建
- 易于理解和调试
- 支持测试时的重置

**缺点**：
- 仍然是全局状态
- 需要手动管理生命周期

### 方案二：初始化配置模式

```typescript
// 定义配置接口
interface ExecutionConfig {
  workflowRegistry?: WorkflowRegistry;
  threadRegistry?: ThreadRegistry;
  eventManager?: EventManager;
  checkpointStorage?: CheckpointStorage;
}

// 默认配置
const defaultConfig: ExecutionConfig = {
  workflowRegistry: new WorkflowRegistry(),
  threadRegistry: new ThreadRegistry(),
  eventManager: new EventManager(),
  checkpointStorage: new MemoryStorage()
};

// 配置持有者
class ExecutionConfigHolder {
  private static config: ExecutionConfig = { ...defaultConfig };
  
  static initialize(config: Partial<ExecutionConfig>): void {
    this.config = {
      ...defaultConfig,
      ...config
    };
  }
  
  static getConfig(): ExecutionConfig {
    return this.config;
  }
  
  static reset(): void {
    this.config = { ...defaultConfig };
  }
}

// 使用方式
// 应用启动时初始化
ExecutionConfigHolder.initialize({
  checkpointStorage: new FileStorage('./checkpoints')
});

// 在需要的地方获取
const config = ExecutionConfigHolder.getConfig();
const threadExecutor = new ThreadExecutor(config);
```

**优点**：
- 配置集中管理
- 支持自定义和覆盖
- 初始化时机明确
- 易于测试（可以传入 Mock）

**缺点**：
- 需要在使用前初始化
- 仍然是全局状态

### 方案三：上下文传递模式

```typescript
// 定义执行上下文
interface ExecutionContext {
  workflowRegistry: WorkflowRegistry;
  threadRegistry: ThreadRegistry;
  eventManager: EventManager;
  checkpointManager: CheckpointManager;
}

// 创建上下文（应用入口）
function createExecutionContext(): ExecutionContext {
  const workflowRegistry = new WorkflowRegistry();
  const threadRegistry = new ThreadRegistry();
  const eventManager = new EventManager();
  const checkpointManager = new CheckpointManager(
    undefined,
    threadRegistry,
    undefined,
    workflowRegistry
  );
  
  return {
    workflowRegistry,
    threadRegistry,
    eventManager,
    checkpointManager
  };
}

// 使用上下文创建对象
class ThreadExecutor {
  constructor(private context: ExecutionContext) {}
  
  execute(threadContext: ThreadContext): Promise<ThreadResult> {
    // 使用 context.workflowRegistry
    // 使用 context.eventManager
  }
}

// 使用方式
const context = createExecutionContext();
const threadExecutor = new ThreadExecutor(context);
```

**优点**：
- 无全局状态
- 依赖关系明确
- 支持多实例并行
- 测试友好

**缺点**：
- 需要传递 context 对象
- 有一定的侵入性

## 推荐的组合方案

### 对于SDK用户（简化API）

```typescript
// 提供默认的全局实例
// sdk/index.ts

import { ExecutionSingletons } from './core/execution/singletons';
import { ThreadExecutor } from './core/execution/thread-executor';

// 默认的 ThreadExecutor 实例
let defaultThreadExecutor: ThreadExecutor;

export function getDefaultThreadExecutor(): ThreadExecutor {
  if (!defaultThreadExecutor) {
    const context = {
      workflowRegistry: ExecutionSingletons.getWorkflowRegistry(),
      threadRegistry: ExecutionSingletons.getThreadRegistry(),
      eventManager: ExecutionSingletons.getEventManager(),
      checkpointManager: ExecutionSingletons.getCheckpointManager()
    };
    
    defaultThreadExecutor = new ThreadExecutor(context);
  }
  return defaultThreadExecutor;
}

// 简化API
export async function executeWorkflow(
  workflowId: string, 
  input: Record<string, any> = {}
): Promise<ThreadResult> {
  const executor = getDefaultThreadExecutor();
  return executor.executeWorkflow(workflowId, input);
}

// 高级用法：自定义配置
export function createThreadExecutor(config?: Partial<ExecutionContext>): ThreadExecutor {
  const context = {
    workflowRegistry: config?.workflowRegistry || ExecutionSingletons.getWorkflowRegistry(),
    threadRegistry: config?.threadRegistry || ExecutionSingletons.getThreadRegistry(),
    eventManager: config?.eventManager || ExecutionSingletons.getEventManager(),
    checkpointManager: config?.checkpointManager || ExecutionSingletons.getCheckpointManager()
  };
  
  return new ThreadExecutor(context);
}
```

**使用方式**：

```typescript
// 简单用法（使用默认单例）
import { executeWorkflow } from 'sdk';

const result = await executeWorkflow('workflow-1', { input: 'data' });

// 高级用法（自定义配置）
import { createThreadExecutor, ExecutionSingletons } from 'sdk';

const customExecutor = createThreadExecutor({
  checkpointManager: new CheckpointManager(new FileStorage('./checkpoints'))
});

const result = await customExecutor.executeWorkflow('workflow-1', { input: 'data' });
```

### 对于SDK内部实现

```typescript
// 内部使用上下文模式
// sdk/core/execution/thread-executor.ts

class ThreadExecutor {
  constructor(private context: ExecutionContext) {}
  
  async execute(threadContext: ThreadContext): Promise<ThreadResult> {
    // 使用 context 中的共享组件
    this.context.threadRegistry.register(threadContext);
    this.context.eventManager.emit(event);
    
    // 创建非单例组件
    const coordinator = new ThreadCoordinator(
      this.context.threadRegistry,
      new ThreadBuilder(this.context.workflowRegistry),
      this.context.eventManager
    );
  }
}
```

## 解决循环依赖的简化方案

### 问题回顾
ThreadExecutor 依赖 ThreadCoordinator，ThreadCoordinator 又依赖 ThreadExecutor。

### 简化解决方案：事件驱动 + 延迟获取

```typescript
// 方案1：事件驱动（推荐）
class ThreadExecutor {
  constructor(private context: ExecutionContext) {}
  
  async executeFork(parentThread: ThreadContext, forkConfig: any): Promise<string[]> {
    // 发布 FORK 事件，由 ThreadCoordinator 监听处理
    const event: ForkEvent = {
      type: 'FORK',
      parentThreadId: parentThread.getThreadId(),
      forkConfig
    };
    
    await this.context.eventManager.emit(event);
    
    // 从事件结果中获取子线程ID
    return event.childThreadIds || [];
  }
}

class ThreadCoordinator {
  constructor(private context: ExecutionContext) {
    // 监听 FORK 事件
    this.context.eventManager.on('FORK', this.handleFork.bind(this));
  }
  
  private async handleFork(event: ForkEvent): Promise<void> {
    // 处理 Fork 逻辑
    const childThreadIds = await this.doFork(event);
    event.childThreadIds = childThreadIds;
  }
}

// 方案2：延迟获取（备选）
class ThreadCoordinator {
  private threadExecutor?: ThreadExecutor;
  
  constructor(private context: ExecutionContext) {}
  
  // 延迟设置 ThreadExecutor
  setThreadExecutor(executor: ThreadExecutor): void {
    this.threadExecutor = executor;
  }
  
  async join(parentThread: ThreadContext, childThreadIds: string[]): Promise<JoinResult> {
    if (!this.threadExecutor) {
      throw new Error('ThreadExecutor not set');
    }
    
    // 使用 threadExecutor
  }
}

class ThreadExecutor {
  constructor(private context: ExecutionContext) {
    // 创建 coordinator 后，将自己设置进去
    const coordinator = new ThreadCoordinator(this.context);
    coordinator.setThreadExecutor(this);
    this.coordinator = coordinator;
  }
}
```

**推荐方案**：事件驱动模式，完全消除循环依赖。

## 性能考虑

### 单例的性能优势
1. **减少内存占用**：共享实例减少重复创建
2. **提高缓存效率**：WorkflowRegistry 可以缓存工作流定义
3. **减少初始化开销**：EventManager 只需初始化一次

### 需要注意的性能问题
1. **线程安全**：单例需要保证线程安全，可能有锁开销
2. **全局状态竞争**：高并发时可能成为瓶颈
3. **内存泄漏风险**：单例生命周期长，需要注意清理

### 优化建议
1. **WorkflowRegistry**：使用读写锁，提高并发读取性能
2. **ThreadRegistry**：使用 ConcurrentHashMap，减少锁竞争
3. **EventManager**：使用异步事件处理，避免阻塞
4. **CheckpointManager**：支持并行存储，提高IO性能

## 测试策略

### 单例组件的测试

```typescript
// 测试前重置单例
describe('ThreadExecutor', () => {
  beforeEach(() => {
    ExecutionSingletons.reset();
  });
  
  it('should execute workflow', async () => {
    const executor = getDefaultThreadExecutor();
    // ... 测试逻辑
  });
});

// 使用 Mock 测试
describe('ThreadExecutor with Mock', () => {
  it('should use custom event manager', async () => {
    const mockEventManager = new MockEventManager();
    const executor = createThreadExecutor({
      eventManager: mockEventManager
    });
    
    // ... 测试逻辑
  });
});
```

## 总结

### 推荐方案

1. **全局单例组件**：WorkflowRegistry、ThreadRegistry、EventManager
2. **内部实现**：使用上下文模式传递依赖
3. **对外API**：提供简化接口，支持默认单例和自定义配置
4. **循环依赖**：使用事件驱动模式解决

### 优势

- **简单易用**：用户可以使用默认单例，一行代码执行工作流
- **灵活可控**：高级用户可以自定义任何组件
- **性能优秀**：共享单例减少资源消耗
- **测试友好**：支持 Mock 和自定义配置
- **无外部依赖**：不引入复杂的 DI 容器

### 实施步骤

1. **第一步**：创建 ExecutionSingletons 管理全局单例
2. **第二步**：重构核心类，使用上下文模式
3. **第三步**：解决循环依赖（事件驱动）
4. **第四步**：提供简化的对外API
5. **第五步**：完善测试和文档
