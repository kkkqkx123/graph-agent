# SDK Core Execution 目录结构重构方案

## 背景分析

当前 `sdk/core/execution` 目录结构存在单例服务和多实例服务混合的问题，导致架构不够清晰，限制了多租户、多环境等高级场景的支持。

## 识别的服务类型

### 全局单例服务（Global Singleton Services）
这些服务应该保持单例，因为它们管理全局共享状态：

1. **EventManager** - 全局事件总线
   - 特征：纯状态管理（监听器注册）、全局可访问、无执行上下文依赖
   - 验证：只管理事件监听和分发，不包含任何执行状态

2. **WorkflowRegistry** - 工作流定义注册表  
   - 特征：状态共享性（工作流定义）、资源唯一性（工作流存储）、全局可访问
   - 验证：维护工作流的注册、版本、预处理缓存等全局状态

3. **ThreadRegistry** - 线程注册表
   - 特征：状态共享性（所有线程）、资源唯一性（线程存储）、全局可访问  
   - 验证：维护所有ThreadContext的映射，用于全局线程查询和管理

### 多实例服务（Multi-instance Services）
这些服务应该支持多实例，以满足不同配置和策略需求：

1. **CheckpointManager** - 检查点管理器
   - 问题：当前设计强制使用单例，但实际可能需要：
     - 不同的存储后端（内存、文件、数据库）
     - 不同的检查点策略（定期、节点级别、手动）
     - 测试时需要独立的存储实例
   - 建议：改为工厂模式，支持创建多个实例

2. **ThreadLifecycleManager** - 线程生命周期管理器
   - 问题：当前与EventManager强耦合，但可能需要：
     - 不同的生命周期事件处理策略
     - 测试时需要独立的生命周期管理器
   - 建议：通过构造函数注入EventManager，支持多实例

3. **ExecutionContext** - 执行上下文
   - 问题：模块级单例无法支持：
     - 多个独立的执行环境
     - 不同配置的执行上下文
     - 并行测试环境
   - 建议：移除单例模式，提供工厂方法创建实例

4. **ThreadContext** - 线程上下文
   - 特征：执行上下文相关、状态隔离性、生命周期绑定
   - 验证：每个线程执行都需要独立的上下文实例

## 新目录结构设计

```
sdk/core/
├── services/                    # 全局单例服务
│   ├── event-manager.ts        # EventManager (单例)
│   ├── workflow-registry.ts    # WorkflowRegistry (单例)  
│   └── thread-registry.ts      # ThreadRegistry (单例)
│
├── execution/                   # 执行相关组件（多实例）
│   ├── context/               # 执行上下文
│   │   ├── execution-context.ts    # ExecutionContext (多实例)
│   │   ├── thread-context.ts       # ThreadContext (多实例)
│   │   └── execution-state.ts      # ExecutionState (多实例)
│   │
│   ├── managers/              # 执行管理器（多实例）
│   │   ├── checkpoint-manager.ts   # CheckpointManager (多实例)
│   │   ├── lifecycle-manager.ts    # ThreadLifecycleManager (多实例)
│   │   ├── variable-manager.ts     # VariableManager (多实例)
│   │   └── trigger-manager.ts      # TriggerManager (多实例)
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

## 具体重构步骤

### 1. 创建新的 services 目录
- 将 `EventManager` 移动到 `sdk/core/services/event-manager.ts`
- 将 `WorkflowRegistry` 移动到 `sdk/core/services/workflow-registry.ts`  
- 将 `ThreadRegistry` 移动到 `sdk/core/services/thread-registry.ts`

### 2. 重构 ExecutionContext
- 移除单例模式，改为普通类
- 提供工厂方法 `create()` 创建实例
- 支持传入自定义的全局服务实例或使用默认实例

### 3. 重构 CheckpointManager
- 修改构造函数，支持传入不同的存储实现
- 移除对 ExecutionContext 单例的依赖
- 支持独立创建实例

### 4. 重构 ThreadLifecycleManager  
- 修改构造函数，通过参数注入 EventManager
- 支持传入自定义的 EventManager 实例
- 移除对 ExecutionContext 单例的依赖

### 5. 更新依赖关系
- 更新所有引用路径
- 确保类型定义正确
- 更新测试用例

## 接口变更说明

### ExecutionContext 变更
```typescript
// 旧接口（单例）
const context = ExecutionContext.getInstance();

// 新接口（多实例）
const context = ExecutionContext.create();
// 或者传入自定义服务
const context = ExecutionContext.create({
  eventManager: customEventManager,
  workflowRegistry: customWorkflowRegistry,
  threadRegistry: customThreadRegistry
});
```

### CheckpointManager 变更
```typescript
// 旧接口（依赖单例）
const manager = new CheckpointManager();

// 新接口（显式依赖注入）
const manager = new CheckpointManager({
  storage: customStorage,
  threadRegistry: customThreadRegistry,
  workflowRegistry: customWorkflowRegistry,
  eventManager: customEventManager
});
```

### ThreadLifecycleManager 变更
```typescript
// 旧接口（依赖单例）
const manager = new ThreadLifecycleManager();

// 新接口（显式依赖注入）
const manager = new ThreadLifecycleManager(customEventManager);
```

## 向后兼容性

为了保持向后兼容性，可以提供以下适配层：

1. **全局默认实例**：在 `services/index.ts` 中导出全局默认实例
2. **兼容性工厂方法**：在 `ExecutionContext` 中提供 `createDefault()` 方法
3. **渐进式迁移**：允许新旧接口并存一段时间

## 预期收益

1. **架构清晰**：明确区分全局单例服务和多实例执行服务
2. **灵活性提升**：支持多租户、多环境、并行测试等场景
3. **可测试性增强**：每个组件都可以独立实例化和测试
4. **扩展性改善**：更容易添加新的存储后端、策略配置等
5. **依赖解耦**：减少组件间的强耦合，提高代码质量

## 风险评估

1. **API 变更**：需要更新所有调用方代码
2. **迁移成本**：现有代码需要适配新接口
3. **测试覆盖**：需要确保所有场景都有充分测试

建议采用渐进式迁移策略，先提供兼容层，再逐步迁移到新架构。