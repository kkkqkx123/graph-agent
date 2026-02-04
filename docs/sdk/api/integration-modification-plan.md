# SDK API与Core层集成修改方案

## 1. 背景分析

基于对现有代码库的深入分析，新增的API模块（WorkflowBuilder、ExecutionBuilder、WorkflowComposer、Result类型、Observable）已经实现了基本功能，但在与Core层的集成方面仍存在一些需要优化和改进的地方。

## 2. 现存问题识别

### 2.1 类型定义冗余
- **问题**：`ExecuteOptions` (API层) 与 `ThreadOptions` (Core层) 功能重叠
- **影响**：增加维护成本，可能导致不一致
- **证据**：`sdk/api/types/core-types.ts` 中的注释明确指出此问题

### 2.2 错误处理不一致
- **问题**：部分API使用异常抛出，部分使用Result类型
- **影响**：用户需要同时处理两种错误处理模式
- **证据**：`ExecutionBuilder.execute()` 抛出异常，而 `executeSafe()` 返回Result

### 2.3 事件系统集成不够深入
- **问题**：Observable事件与Core层事件系统的映射不够完整
- **影响**：无法充分利用Core层的丰富事件信息
- **证据**：Observable事件类型较为简单，缺少Core层事件的详细信息

### 2.4 依赖注入灵活性不足
- **问题**：过度依赖全局单例，测试隔离困难
- **影响**：单元测试需要复杂的mock设置
- **证据**：`ThreadExecutorAPI` 构造函数虽然支持传入registry，但其他API模块仍硬编码使用全局单例

## 3. 修改方案

### 3.1 统一类型定义

#### 3.1.1 移除API层ExecuteOptions
```typescript
// 删除 sdk/api/types/core-types.ts 中的 ExecuteOptions 接口
// 直接使用 Core层的 ThreadOptions

// 修改 ExecutionBuilder 构造函数
class ExecutionBuilder {
  private options: ThreadOptions = {}; // 直接使用 ThreadOptions
  
  withInput(input: Record<string, any>): this {
    this.options.input = input;
    return this;
  }
  
  // ... 其他方法保持不变
}
```

#### 3.1.2 更新类型导出
```typescript
// sdk/api/index.ts
// 移除 ExecuteOptions 导出
// 添加 ThreadOptions 导出
export type { ThreadOptions } from '../../types/thread';
```

### 3.2 统一错误处理策略

#### 3.2.1 默认使用Result类型
```typescript
// 修改 ExecutionBuilder.execute() 方法
async execute(): Promise<Result<ThreadResult, Error>> {
  if (!this.workflowId) {
    return err(new Error('工作流ID未设置，请先调用withWorkflow()'));
  }

  try {
    const result = await this.executor.executeWorkflow(this.workflowId, this.options);
    // 触发进度回调...
    return ok(result);
  } catch (error) {
    // 触发错误回调...
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

// 保留 executePromise() 作为兼容性方法
async executePromise(): Promise<ThreadResult> {
  const result = await this.execute();
  if (result.isErr()) {
    throw result.error;
  }
  return result.value;
}
```

#### 3.2.2 更新文档示例
```typescript
// docs/sdk/api/usage-examples.md
// 推荐使用Result类型
const result = await sdk
  .execute('my-workflow')
  .withInput({ data: 'test' })
  .execute();

if (result.isOk()) {
  console.log('执行成功:', result.value);
} else {
  console.error('执行失败:', result.error);
}
```

### 3.3 增强事件系统集成

#### 3.3.1 扩展Observable事件类型
```typescript
// 扩展 ExecutionEvent 类型，包含更多Core层事件信息
export interface CompleteEvent {
  type: 'complete';
  timestamp: number;
  workflowId: string;
  threadId: string; // 新增
  result: ThreadResult;
  executionStats: {
    duration: number;
    steps: number;
    nodesExecuted: number;
  }; // 新增
}

export interface NodeExecutedEvent {
  type: 'nodeExecuted';
  timestamp: number;
  workflowId: string;
  threadId: string; // 新增
  nodeId: string; // 新增
  nodeType: NodeType; // 新增
  nodeResult: any;
  executionTime: number; // 新增
}
```

#### 3.3.2 集成Core层事件管理器
```typescript
// ExecutionBuilder.executeAsync() 方法增强
executeAsync(): Observable<ExecutionEvent> {
  // ... 现有代码 ...
  
  // 订阅Core层事件
  const coreEvents = this.executor.getEventManager().getObservable();
  const subscription = coreEvents.subscribe({
    next: (coreEvent) => {
      // 转换Core层事件为API层事件
      const apiEvent = this.convertCoreEventToApiEvent(coreEvent, workflowId);
      if (apiEvent) {
        observer.next(apiEvent);
      }
    },
    error: (error) => observer.error(error),
    complete: () => {}
  });
  
  // ... 返回subscription ...
}
```

### 3.4 改进依赖注入机制

#### 3.4.1 SDK构造函数支持完整依赖注入
```typescript
// sdk/api/core/sdk.ts
interface SDKDependencies {
  workflowRegistry?: WorkflowRegistry;
  threadRegistry?: ThreadRegistry;
  eventManager?: EventManager;
  // ... 其他可注入的依赖
}

class SDK {
  constructor(options?: SDKOptions, dependencies?: SDKDependencies) {
    // 使用传入的依赖或全局单例
    this.internalWorkflowRegistry = dependencies?.workflowRegistry || workflowRegistry;
    this.internalThreadRegistry = dependencies?.threadRegistry || threadRegistry;
    
    // 初始化API模块时传入依赖
    this.executor = new ThreadExecutorAPI(
      this.internalWorkflowRegistry,
      dependencies?.eventManager
    );
    // ... 其他初始化 ...
  }
}
```

#### 3.4.2 API模块支持依赖注入
```typescript
// ThreadExecutorAPI 支持更多依赖注入
class ThreadExecutorAPI {
  constructor(
    workflowRegistryParam?: WorkflowRegistry,
    eventManagerParam?: EventManager
  ) {
    this.workflowRegistry = workflowRegistryParam || workflowRegistry;
    this.executionContext = ExecutionContext.createWithDependencies({
      workflowRegistry: this.workflowRegistry,
      eventManager: eventManagerParam
    });
    // ... 其他初始化 ...
  }
}
```

### 3.5 增强WorkflowComposer功能

#### 3.5.1 支持更灵活的组合策略
```typescript
// 扩展 MergeStrategy 类型
export type MergeStrategy<T> = 
  | 'first' 
  | 'last' 
  | 'all' 
  | 'custom' 
  | ((results: T[]) => T)
  | 'weighted' // 新增：加权合并
  | 'conditional'; // 新增：条件合并

// 新增加权合并策略
setWeightedMerge(weights: number[]): this {
  this.config.mergeStrategy = 'weighted';
  this.config.weights = weights;
  return this;
}

// 新增条件合并策略  
setConditionalMerge(conditionFn: (results: ThreadResult[]) => ThreadResult): this {
  this.config.mergeStrategy = 'conditional';
  this.config.conditionFn = conditionFn;
  return this;
}
```

#### 3.5.2 支持动态工作流组合
```typescript
// 支持运行时动态添加工作流
addWorkflowDynamic(
  workflowProvider: () => Promise<WorkflowDefinition>,
  workflowId: string,
  inputProvider?: () => Promise<Record<string, any>>
): this {
  // ... 实现动态工作流添加逻辑
}
```

## 4. 实施计划

### 阶段1：基础重构（1-2周）
- [ ] 统一类型定义，移除冗余接口
- [ ] 改进依赖注入机制
- [ ] 更新相关测试用例

### 阶段2：错误处理统一（1周）
- [ ] 默认使用Result类型
- [ ] 保留兼容性方法
- [ ] 更新文档和示例

### 阶段3：事件系统增强（1-2周）
- [ ] 扩展Observable事件类型
- [ ] 集成Core层事件管理器
- [ ] 添加事件转换逻辑

### 阶段4：高级功能增强（2周）
- [ ] 增强WorkflowComposer功能
- [ ] 添加动态工作流组合支持
- [ ] 完善集成测试

### 阶段5：文档和发布（1周）
- [ ] 更新API文档
- [ ] 编写迁移指南
- [ ] 发布新版本

## 5. 向后兼容性保证

### 5.1 兼容性策略
- **Major版本变更**：由于涉及API行为改变，建议发布v3.0.0
- **渐进式迁移**：提供迁移工具和指南
- **兼容层**：保留关键的旧API方法作为deprecated

### 5.2 迁移指南
```typescript
// 旧代码
const result = await sdk.execute('workflow').execute();

// 新代码（推荐）
const result = await sdk.execute('workflow').execute();
if (result.isOk()) {
  // 处理成功结果
}

// 兼容代码（临时）
const result = await sdk.execute('workflow').executePromise();
```

## 6. 测试策略

### 6.1 单元测试覆盖
- [ ] 类型定义一致性测试
- [ ] Result类型链式操作测试
- [ ] Observable事件转换测试
- [ ] 依赖注入配置测试

### 6.2 集成测试场景
- [ ] 端到端工作流执行
- [ ] 错误处理场景验证
- [ ] 并发执行和资源管理
- [ ] 事件系统完整性验证

### 6.3 性能测试
- [ ] 内存使用监控
- [ ] 执行性能基准
- [ ] 并发性能测试

## 7. 风险评估和缓解

### 7.1 主要风险
- **API破坏性变更**：可能影响现有用户
- **性能影响**：新增功能可能带来性能开销
- **复杂度增加**：功能增强可能增加维护复杂度

### 7.2 缓解措施
- **充分的测试覆盖**：确保变更不会引入回归
- **分阶段发布**：先发布beta版本收集反馈
- **详细的文档**：提供完整的迁移指南和最佳实践
- **社区支持**：建立专门的支持渠道帮助用户迁移

## 8. 结论

本修改方案旨在解决当前API与Core层集成中的问题，提升系统的整体质量和用户体验。通过统一类型定义、标准化错误处理、增强事件系统集成、改进依赖注入机制等措施，将使SDK更加健壮、易用和可维护。

实施该方案需要约6-8周的时间，建议按照分阶段的方式逐步推进，确保每个阶段的质量和稳定性。