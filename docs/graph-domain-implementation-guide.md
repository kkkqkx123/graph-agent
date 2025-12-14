# 图领域实现指南

本文档说明了在TypeScript实现中新增的图领域概念和用法，这些概念基于Python实现的分析，为图系统提供了完整的扩展能力。

## 概述

我们为图领域系统添加了以下核心模块：

1. **扩展系统** - 提供钩子、插件和触发器机制
2. **状态管理** - 提供图执行过程中的状态管理
3. **编译和验证** - 提供图编译和验证功能
4. **执行上下文** - 提供图执行上下文管理
5. **领域服务** - 提供图构建和执行服务
6. **领域事件** - 提供图相关的事件系统

## 扩展系统

### 钩子系统

钩子系统允许在图执行的关键点插入自定义逻辑。

#### 核心组件

- **BaseHook**: 钩子的抽象基类
- **HookContext**: 钩子执行上下文
- **HookExecutionResult**: 钩子执行结果
- **HookChain**: 钩子链管理
- **HookExecutionManager**: 钩子执行管理器

#### 使用示例

```typescript
import { BaseHook, HookPoint, HookContextUtils } from '@/domain/graph/extensions/hooks';

class CustomLoggingHook extends BaseHook {
  constructor() {
    super('custom-logging', HookPoint.NODE_BEFORE, '自定义日志钩子');
  }

  async execute(context: HookContext): Promise<HookExecutionResult> {
    console.log(`执行节点 ${context.nodeId} 的前置日志`);
    return HookExecutionResultUtils.success(this.id, '日志记录成功');
  }
}

// 注册钩子
const hook = new CustomLoggingHook();
hookManager.registerHook(hook);
```

### 插件系统

插件系统提供了更强大的扩展能力，可以注册和管理插件。

#### 核心组件

- **BasePlugin**: 插件的抽象基类
- **PluginContext**: 插件执行上下文
- **PluginExecutionResult**: 插件执行结果

#### 使用示例

```typescript
import { BasePlugin } from '@/domain/graph/extensions/plugins';

class CustomAnalyticsPlugin extends BasePlugin {
  constructor() {
    super('custom-analytics', '自定义分析插件', '1.0.0');
  }

  async onNodeExecute(context: PluginContext): Promise<void> {
    // 分析节点执行数据
    this.recordAnalytics(context.nodeId, context.executionTime);
  }
}

// 注册插件
const plugin = new CustomAnalyticsPlugin();
pluginManager.registerPlugin(plugin);
```

### 触发器系统

触发器系统允许基于各种条件触发图执行。

#### 核心组件

- **BaseTrigger**: 触发器的抽象基类
- **TriggerContext**: 触发器执行上下文
- **TriggerExecutionResult**: 触发器执行结果
- **TriggerManager**: 触发器管理器

#### 预定义触发器类型

- **TimeTrigger**: 基于时间的触发器
- **EventTrigger**: 基于事件的触发器
- **ConditionTrigger**: 基于条件的触发器
- **ManualTrigger**: 手动触发器

#### 使用示例

```typescript
import { TimeTrigger, TriggerUtils } from '@/domain/graph/extensions/triggers';

// 创建时间触发器
const timeTrigger = TriggerUtils.createTimeTriggerConfig(
  'daily-report',
  '每日报告触发器',
  'graph-123',
  '0 0 8 * * *', // 每天8点
  'UTC',
  true
);

const trigger = new TimeTrigger(timeTrigger);
triggerManager.registerTrigger(trigger);
```

## 状态管理

状态管理系统提供了图执行过程中的状态存储和管理功能。

### 核心组件

- **StateValue**: 状态值对象
- **StateStore**: 状态存储接口
- **StateManager**: 状态管理器

### 使用示例

```typescript
import { StateUtils, DefaultStateManager } from '@/domain/graph/state';

const stateManager = new DefaultStateManager(stateStore);

// 设置图级别状态
await stateManager.setState('graph-123', 'user_count', 100);

// 设置节点级别状态
await stateManager.setState('graph-123', 'processing_status', 'running', 'node-456');

// 获取状态
const userCount = await stateManager.getState('graph-123', 'user_count');
```

## 编译和验证

编译和验证系统提供了图的编译和验证功能。

### 核心组件

- **IGraphCompiler**: 图编译器接口
- **IValidator**: 验证器接口
- **ValidationResult**: 验证结果
- **CompilationResult**: 编译结果

### 预定义验证规则

- **GraphStructureRule**: 图结构验证
- **NodeReferenceRule**: 节点引用验证
- **CycleDetectionRule**: 循环检测
- **NodeTypeRule**: 节点类型验证
- **EdgeTypeRule**: 边类型验证

### 使用示例

```typescript
import { getPredefinedValidationRules, DefaultGraphCompiler } from '@/domain/graph/validation';

const compiler = new DefaultGraphCompiler();
const rules = getPredefinedValidationRules();

// 编译图
const result = await compiler.compile('graph-123', graphData, {
  target: 'memory',
  validation: {
    enabled: true,
    rules
  }
});

if (!result.success) {
  console.log('编译失败:', result.validation.errors);
}
```

## 执行上下文

执行上下文系统提供了图执行过程中的上下文管理。

### 核心组件

- **ExecutionContext**: 执行上下文
- **NodeExecutionContext**: 节点执行上下文
- **EdgeExecutionContext**: 边执行上下文
- **IExecutionContextManager**: 执行上下文管理器

### 使用示例

```typescript
import { ExecutionContextUtils, DefaultExecutionContextManager } from '@/domain/graph/execution';

const contextManager = new DefaultExecutionContextManager();

// 创建执行上下文
const context = ExecutionContextUtils.create('exec-123', 'graph-456')
  .withMode(ExecutionMode.SYNC)
  .withPriority(ExecutionPriority.NORMAL)
  .build();

await contextManager.createContext('exec-123', 'graph-456');
```

## 领域服务

领域服务提供了图构建和执行的高级服务。

### 核心服务

- **IGraphBuildService**: 图构建服务
- **IGraphExecutionService**: 图执行服务
- **GraphDomainService**: 图领域服务（已存在）

### 使用示例

```typescript
import { DefaultGraphBuildService, DefaultGraphExecutionService } from '@/domain/graph/services';

const buildService = new DefaultGraphBuildService(graphRepository, nodeRepository, edgeRepository);
const executionService = new DefaultGraphExecutionService(contextManager, compiler, triggerManager, stateManager);

// 构建图
const graph = await buildService.createGraph('新图', '图描述');

// 添加节点
const node = await buildService.addNode(graph.graphId, {
  nodeType: 'llm',
  nodeName: 'LLM节点',
  position: { x: 100, y: 100 }
});

// 执行图
const result = await executionService.execute({
  executionId: 'exec-123',
  graphId: graph.graphId,
  mode: ExecutionMode.SYNC,
  priority: ExecutionPriority.NORMAL,
  config: {},
  inputData: { input: '测试输入' },
  parameters: {}
});
```

## 领域事件

领域事件系统提供了图相关的事件发布和订阅机制。

### 事件类型

- **图执行事件**: 图执行开始、完成、失败等
- **节点执行事件**: 节点执行开始、完成、失败等
- **状态管理事件**: 状态设置、删除、快照等

### 使用示例

```typescript
import { 
  GraphExecutionStartedEvent, 
  NodeExecutionCompletedEvent,
  StateSetEvent 
} from '@/domain/graph/events';

// 发布事件
const event = new GraphExecutionStartedEvent(
  'exec-123',
  'graph-456',
  ExecutionMode.SYNC,
  ExecutionPriority.NORMAL,
  { input: '测试' },
  {}
);

eventBus.publish(event);

// 订阅事件
eventBus.subscribe(GraphExecutionStartedEvent, (event) => {
  console.log('图执行开始:', event.executionId);
});
```

## 架构设计原则

### 1. 领域驱动设计

所有新增的模块都遵循领域驱动设计原则：
- **实体**: 具有唯一标识的业务对象
- **值对象**: 不可变的值对象
- **聚合根**: 管理实体和值对象的聚合
- **领域服务**: 提供领域业务逻辑
- **仓储**: 提供持久化抽象

### 2. 依赖倒置

所有模块都依赖于抽象接口，而不是具体实现：
- 使用接口定义服务契约
- 通过依赖注入提供具体实现
- 便于测试和扩展

### 3. 单一职责

每个模块都有明确的职责：
- 扩展系统负责扩展机制
- 状态管理负责状态存储
- 编译验证负责图编译和验证
- 执行上下文负责执行过程管理

### 4. 开放封闭

系统对扩展开放，对修改封闭：
- 通过插件和钩子机制支持扩展
- 核心逻辑保持稳定
- 新功能通过扩展点添加

## 最佳实践

### 1. 使用钩子系统

```typescript
// 推荐：使用预定义钩子点
const hook = new LoggingHook(HookPoint.NODE_BEFORE);

// 避免：在不合适的时机执行钩子
const hook = new CustomHook(HookPoint.NODE_AFTER); // 可能影响性能
```

### 2. 状态管理

```typescript
// 推荐：使用命名空间组织状态
await stateManager.setState('graph-123', 'user_data', data, undefined, 'user');

// 避免：状态键名冲突
await stateManager.setState('graph-123', 'data', data); // 可能与其他模块冲突
```

### 3. 错误处理

```typescript
// 推荐：使用领域错误
throw new DomainError('图名称已存在');

// 避免：使用通用错误
throw new Error('图名称已存在'); // 缺少上下文信息
```

### 4. 事件处理

```typescript
// 推荐：使用强类型事件
eventBus.subscribe(NodeExecutionCompletedEvent, handler);

// 避免：使用通用事件处理
eventBus.subscribe('*', handler); // 难以维护和调试
```

## 扩展指南

### 添加新的钩子点

1. 在 `HookPoint` 枚举中添加新的钩子点
2. 在相应的执行位置调用钩子
3. 更新文档说明新钩子点的用途

### 添加新的触发器类型

1. 创建新的触发器类继承 `BaseTrigger`
2. 实现 `checkCondition` 和 `onTrigger` 方法
3. 在 `TriggerType` 枚举中添加新类型
4. 更新工厂类支持新类型

### 添加新的验证规则

1. 创建新的验证规则类实现 `ValidationRule`
2. 在 `getPredefinedValidationRules` 中注册新规则
3. 更新文档说明新规则的用途

## 总结

通过这些新增的领域概念，TypeScript图系统现在具备了：

1. **完整的扩展能力** - 通过钩子、插件和触发器
2. **强大的状态管理** - 支持图、节点和边级别的状态
3. **可靠的编译验证** - 确保图的正确性
4. **灵活的执行管理** - 支持多种执行模式和上下文管理
5. **丰富的事件系统** - 支持事件驱动的架构

这些功能为图系统提供了企业级的能力，支持复杂的业务场景和扩展需求。