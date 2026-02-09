# Core层修改需求分析

## 背景
基于对API层架构分析文档的深入理解，以及对当前代码架构的实际分析，本文档明确了Core层需要进行的正确修改。

## 问题本质

### SDK项目特性
- 这是一个**SDK项目**，不是后端服务
- SDK需要**暴露内部类型**供用户使用，而不是隐藏实现细节
- **DTO模式完全不适用**，因为会破坏SDK的灵活性和可用性

### 真正的设计目标
- **严格约束实例获取方式**
- **保证API层不会以错误的方式获取各类实例**
- **规范化依赖管理**

## 当前架构分析

### 实例类型分类
1. **全局单例服务**（通过`SingletonRegistry`管理）
   - `eventManager`, `workflowRegistry`, `threadRegistry`
   - `toolService`, `llmExecutor`, `graphRegistry`
   - 特点：无状态或共享状态，全局唯一

2. **有状态执行组件**（通过`ExecutionContext`管理）
   - `CheckpointStateManager`（有状态）
   - `ThreadLifecycleManager`（有状态）
   - `ThreadLifecycleCoordinator`（协调器）
   - 特点：每个执行上下文独立实例

3. **静态工具类**
   - `CheckpointCoordinator`
   - 特点：完全无状态，只提供静态方法

### API层当前问题
- 直接导入和使用全局单例（如`workflowRegistry`）
- 直接实例化有状态组件（如`new CheckpointStateManager()`）
- 混合使用多种依赖获取方式
- 无法保证实例获取的正确性和一致性

## 正确的修改方案

### 核心原则
**通过严格的依赖注入机制，约束API层只能通过正确的方式获取实例**

### 具体实施步骤

#### 1. 创建API层专用依赖接口
```typescript
// sdk/api/core/api-dependencies.ts
export interface APIDependencies {
  getWorkflowRegistry(): WorkflowRegistry;
  getThreadRegistry(): ThreadRegistry;
  getCheckpointStateManager(): CheckpointStateManager;
  getEventManager(): EventManager;
  getToolService(): ToolService;
  getLlmExecutor(): LLMExecutor;
  getGraphRegistry(): GraphRegistry;
  // ... 其他依赖方法
}
```

#### 2. 实现依赖容器
```typescript
// sdk/api/core/api-dependencies.ts
export class SDKAPIDependencies implements APIDependencies {
  private executionContext: ExecutionContext;
  
  constructor() {
    this.executionContext = ExecutionContext.createDefault();
  }
  
  getWorkflowRegistry(): WorkflowRegistry {
    return this.executionContext.getWorkflowRegistry();
  }
  
  getThreadRegistry(): ThreadRegistry {
    return this.executionContext.getThreadRegistry();
  }
  
  getCheckpointStateManager(): CheckpointStateManager {
    return this.executionContext.getCheckpointStateManager();
  }
  
  // ... 其他实现方法
}
```

#### 3. 重构所有ResourceAPI
```typescript
// sdk/api/resources/workflows/workflow-registry-api.ts
export class WorkflowRegistryAPI extends GenericResourceAPI<WorkflowDefinition, string, WorkflowFilter> {
  constructor(private readonly dependencies: APIDependencies) {
    super();
  }
  
  protected async getResource(id: string): Promise<WorkflowDefinition | null> {
    return this.dependencies.getWorkflowRegistry().get(id) || null;
  }
  
  protected async getAllResources(): Promise<WorkflowDefinition[]> {
    const summaries = this.dependencies.getWorkflowRegistry().list();
    const workflows: WorkflowDefinition[] = [];
    for (const summary of summaries) {
      const workflow = this.dependencies.getWorkflowRegistry().get(summary.id);
      if (workflow) {
        workflows.push(workflow);
      }
    }
    return workflows;
  }
  
  // ... 其他方法使用dependencies获取实例
}
```

#### 4. 重构APIFactory
```typescript
// sdk/api/core/api-factory.ts
export class APIFactory {
  private static instance: APIFactory;
  private config: SDKAPIConfig = {};
  private apiInstances: Partial<AllAPIs> = {};
  private dependencies: APIDependencies = new SDKAPIDependencies();

  private constructor() { }

  public static getInstance(): APIFactory {
    if (!APIFactory.instance) {
      APIFactory.instance = new APIFactory();
    }
    return APIFactory.instance;
  }

  public createWorkflowAPI(): WorkflowRegistryAPI {
    if (!this.apiInstances.workflows) {
      this.apiInstances.workflows = new WorkflowRegistryAPI(this.dependencies);
    }
    return this.apiInstances.workflows;
  }

  // ... 其他create方法同样注入dependencies
}
```

### 实例获取规则

| 实例类型 | 正确获取方式 | 错误方式 |
|---------|-------------|----------|
| 全局单例服务 | `dependencies.getXXX()` | 直接导入、直接实例化 |
| 有状态组件 | `dependencies.getXXX()` | 直接实例化 |
| 静态工具类 | 静态方法调用 | 实例化 |

## 方案优势

### 1. 符合SDK特性
- **保持类型暴露**：SDK用户仍然可以访问所有内部类型
- **不影响灵活性**：用户可以直接使用Core组件，只是API层被规范化
- **保持向后兼容**：现有用户代码不受影响

### 2. 解决根本问题
- **严格约束**：API层只能通过`dependencies.getXXX()`获取实例
- **防止错误**：无法直接实例化有状态组件
- **统一管理**：所有依赖获取方式一致

### 3. 保持架构清晰
- **尊重现有设计**：不破坏`SingletonRegistry`和`ExecutionContext`的分离
- **职责明确**：单例服务 vs 有状态组件的界限清晰
- **扩展性好**：新增依赖只需在接口中添加方法

### 4. 支持测试
- **易于Mock**：可以注入Mock的`APIDependencies`进行单元测试
- **隔离性好**：测试时不会影响全局单例状态
- **可预测性**：依赖关系明确，测试行为可预测

## 实施计划

### 阶段1：基础设施
- 创建`sdk/api/core/api-dependencies.ts`
- 定义`APIDependencies`接口和`SDKAPIDependencies`实现

### 阶段2：重构ResourceAPI
- 按模块逐步重构所有ResourceAPI
- 修改构造函数接受`APIDependencies`参数
- 更新所有实例获取代码

### 阶段3：重构APIFactory
- 更新APIFactory使用`SDKAPIDependencies`
- 确保所有API实例正确注入依赖

### 阶段4：测试和验证
- 更新所有相关测试
- 验证功能完整性

## 预期效果

- **API层**：只能通过`dependencies.getXXX()`获取实例，无法直接访问Core内部
- **Core层**：保持现有架构不变，无需任何修改
- **依赖管理**：完全规范化，消除混乱的依赖获取方式
- **SDK特性**：保持类型暴露和用户灵活性，不影响现有用户代码

这种方案完全符合设计意图：**严格约束实例获取方式，保证API层不会以错误方式获取各类实例**，同时保持SDK项目的特性和灵活性。