# Core层修改需求分析

## 1. 问题背景

基于对 `docs/api-layer-architecture-analysis.md` 文档的分析，当前API层存在以下核心问题：

- **直接暴露Core内部类型**：API层直接返回 `Checkpoint`、`LLMProfile` 等Core内部类型
- **缺乏DTO隔离**：没有专门的API层数据传输对象，导致敏感信息（如apiKey）可能泄露
- **依赖管理混乱**：API层混合使用全局单例和直接实例化Core组件
- **接口不稳定**：Core内部模型变更会直接影响API接口

## 2. 架构现状深度分析

### 2.1 Core层真实架构

通过深入分析代码，发现Core层实际上具有清晰的分层结构：

#### 全局单例服务（通过 `SingletonRegistry` 管理）
- `eventManager`：事件管理器
- `workflowRegistry`：工作流注册表  
- `threadRegistry`：线程注册表
- `toolService`：工具服务
- `llmExecutor`：LLM执行器
- `graphRegistry`：图注册表

这些是真正的无状态/共享状态服务，适合全局单例模式。

#### 有状态执行组件（通过 `ExecutionContext` 管理）
- `CheckpointStateManager`：检查点状态管理器（有状态）
- `ThreadLifecycleManager`：线程生命周期管理器（有状态）
- `ThreadLifecycleCoordinator`：线程生命周期协调器（协调器）

这些组件维护执行时的状态，不适合全局单例。

### 2.2 API层当前问题

1. **依赖获取方式不统一**：
   - `WorkflowRegistryAPI` 直接使用全局单例 `workflowRegistry`
   - `LLMProfileRegistryAPI` 直接实例化 `ProfileManager`
   - `CheckpointResourceAPI` 直接实例化 `CheckpointStateManager` 和 `MemoryCheckpointStorage`

2. **违反单例/多实例分离原则**：
   - 混淆了全局单例服务和有状态组件的概念
   - 导致无法正确区分有状态类和无状态类

3. **安全风险**：
   - 直接暴露包含敏感信息的Core内部类型
   - 如 `LLMProfile` 包含 `apiKey`，`Checkpoint` 包含完整的 `threadState`

## 3. 正确的修改方案

### 3.1 核心原则

**尊重现有架构，区分单例服务和有状态组件，为API层提供统一的依赖获取机制**

### 3.2 具体解决方案

#### 3.2.1 创建API专用的ExecutionContext工厂

```typescript
// sdk/api/core/api-execution-context.ts
export class APIExecutionContext {
  private static instance: ExecutionContext;
  
  static getInstance(): ExecutionContext {
    if (!this.instance) {
      this.instance = ExecutionContext.createDefault();
    }
    return this.instance;
  }
}
```

#### 3.2.2 重构API层使用ExecutionContext

```typescript
// CheckpointResourceAPI重构示例
export class CheckpointResourceAPI extends GenericResourceAPI<Checkpoint, string, CheckpointFilter> {
  private executionContext: ExecutionContext;

  constructor(executionContext: ExecutionContext = APIExecutionContext.getInstance()) {
    super();
    this.executionContext = executionContext;
  }

  // 使用executionContext获取所有依赖
  protected async getResource(id: string): Promise<Checkpoint | null> {
    const stateManager = this.executionContext.getCheckpointStateManager();
    return stateManager.get(id) || null;
  }
}
```

#### 3.2.3 保持架构分离

- **单例服务**：继续通过 `SingletonRegistry` 管理
- **有状态组件**：通过 `ExecutionContext` 管理  
- **API层**：通过 `APIExecutionContext` 获取统一的执行上下文

#### 3.2.4 添加DTO转换层

在API方法中添加DTO转换，防止敏感信息泄露：

```typescript
// Profile API DTO转换示例
async getDefaultProfile(): Promise<ProfileSummaryDTO | null> {
  const profile = this.executionContext.getWorkflowRegistry().getDefaultProfile();
  if (!profile) return null;
  
  return {
    id: profile.id,
    name: profile.name,
    provider: profile.provider,
    model: profile.model,
    isDefault: true
    // 不包含apiKey等敏感信息
  };
}
```

### 3.3 为什么这个方案正确？

1. **尊重现有架构**：
   - 保持 `SingletonRegistry` 专门管理单例服务
   - 保持 `ExecutionContext` 管理有状态组件
   - 不混淆单例和多实例的概念

2. **解决依赖管理问题**：
   - API层通过统一的 `APIExecutionContext` 获取所有依赖
   - 避免直接实例化Core组件
   - 支持测试时注入Mock的ExecutionContext

3. **保持类型安全**：
   - `ExecutionContext` 提供类型安全的get方法
   - 不需要额外的接口抽象层

4. **支持安全隔离**：
   - 通过DTO层防止敏感信息泄露
   - API层不直接暴露Core内部类型

## 4. 实施步骤

### 阶段1：创建APIExecutionContext（1天）
- 创建 `sdk/api/core/api-execution-context.ts`
- 提供单例的ExecutionContext实例

### 阶段2：重构所有ResourceAPI（3-5天）
- 修改构造函数接受ExecutionContext参数
- 使用ExecutionContext获取所有依赖
- 移除直接实例化代码

### 阶段3：重构APIFactory（1天）
- APIFactory使用APIExecutionContext
- 注入ExecutionContext到各个API实例

### 阶段4：添加DTO转换（2-3天）
- 创建相应的DTO类型定义
- 在所有API方法中添加DTO转换逻辑
- 确保敏感信息不被暴露

## 5. 最终架构

```
API Layer → APIExecutionContext → ExecutionContext
                                 ├── SingletonRegistry (单例服务)
                                 └── ComponentRegistry (有状态组件)
                                          ↓
                                       DTO Layer (安全过滤)
```

这种方案完全尊重现有的单例/多实例分离设计，同时解决了API层架构分析文档中的所有问题，是最符合当前代码实际情况的正确解决方案。