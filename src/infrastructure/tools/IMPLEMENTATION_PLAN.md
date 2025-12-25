# Tools 架构重构实施计划

## 概述

本文档提供了 `src\infrastructure\tools` 目录架构重构的详细实施计划，包括具体的代码结构、接口定义和实施步骤。

## 阶段 1：基础重构（1-2周）

### 1.1 创建应用层服务结构

#### 1.1.1 创建应用层目录结构
```
src/application/tools/
├── index.ts
├── services/
│   ├── index.ts
│   ├── tool-management-service.ts
│   ├── tool-execution-service.ts
│   └── tool-orchestration-service.ts
├── interfaces/
│   ├── index.ts
│   ├── tool-management-service.interface.ts
│   ├── tool-execution-service.interface.ts
│   └── tool-orchestration-service.interface.ts
└── __tests__/
    └── services/
```

**注意：** 不在 Application 层创建 DTO，直接使用 Domain 实体

#### 1.1.2 定义核心接口

**工具管理服务接口**
```typescript
// src/application/tools/interfaces/tool-management-service.interface.ts
export interface IToolManagementService {
  registerTool(toolConfig: ToolConfigDto): Promise<void>;
  unregisterTool(toolId: string): Promise<void>;
  getTool(toolId: string): Promise<ToolDto | null>;
  getAllTools(): Promise<ToolDto[]>;
  updateTool(toolId: string, updates: Partial<ToolConfigDto>): Promise<void>;
  validateTool(toolConfig: ToolConfigDto): Promise<ValidationResult>;
}
```

**工具执行服务接口**
```typescript
// src/application/tools/interfaces/tool-execution-service.interface.ts
export interface IToolExecutionService {
  executeTool(request: ExecutionRequestDto): Promise<ExecutionResultDto>;
  executeToolBatch(requests: ExecutionRequestDto[]): Promise<ExecutionResultDto[]>;
  getExecutionStatus(executionId: string): Promise<ExecutionStatusDto>;
  cancelExecution(executionId: string): Promise<void>;
}
```

#### 1.1.3 Domain 实体直接使用策略

**Application 层直接使用 Domain 实体：**
```typescript
// src/application/tools/services/tool-management-service.ts
export class ToolManagementService implements IToolManagementService {
  async registerTool(toolConfig: ToolConfig): Promise<void> {
    // 直接使用 Domain 实体，不进行 DTO 转换
    const tool = Tool.create(/* ... */);
    // 业务逻辑处理
  }
}
```

**DTO 仅在 Interface 层定义：**
```
src/interfaces/http/tools/dto/
├── tool-request.dto.ts
├── tool-response.dto.ts
└── execution-request.dto.ts
```

### 1.2 扩展配置管理

#### 1.2.1 创建工具配置管理器
```typescript
// src/infrastructure/config/loading/tool-config-manager.ts
@injectable()
export class ToolConfigManager {
  constructor(
    @inject('ILogger') private logger: ILogger,
    @inject('IConfigManager') private configManager: IConfigManager,
    @inject('ToolLoader') private toolLoader: ToolLoader,
    @inject('ToolRule') private toolRule: ToolRule
  ) {}

  async initialize(): Promise<void>
  getToolConfig(type: string, name: string): ToolConfig
  validateToolConfig(config: ToolConfig): ValidationResult
  reload(): Promise<void>
  getStats(): ConfigStats
}
```

#### 1.2.2 增强工具规则验证
```typescript
// src/infrastructure/config/loading/rules/tool-rule.ts
export class ToolRule {
  validate(config: ToolConfig): ValidationResult
  validateBuiltinTool(config: ToolConfig): ValidationResult
  validateNativeTool(config: ToolConfig): ValidationResult
  validateRestTool(config: ToolConfig): ValidationResult
  validateMcpTool(config: ToolConfig): ValidationResult
}
```

### 1.3 重构依赖注入

#### 1.3.1 更新服务绑定
```typescript
// src/application/container/bindings/tool-bindings.ts
export class ToolServiceBindings extends ServiceBindings {
  registerServices(container: IContainer, config: ContainerConfiguration): void {
    // 工具配置管理器
    container.registerFactory<ToolConfigManager>(
      'ToolConfigManager',
      () => new ToolConfigManager(
        container.get<ILogger>('ILogger'),
        container.get<IConfigManager>('IConfigManager'),
        container.get<ToolLoader>('ToolLoader'),
        container.get<ToolRule>('ToolRule')
      ),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 工具管理服务
    container.registerFactory<IToolManagementService>(
      'IToolManagementService',
      () => new ToolManagementService(
        container.get<ILogger>('ILogger'),
        container.get<ToolConfigManager>('ToolConfigManager'),
        container.get<ToolRegistry>('ToolRegistry')
      ),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 工具执行服务
    container.registerFactory<IToolExecutionService>(
      'IToolExecutionService',
      () => new ToolExecutionService(
        container.get<ILogger>('ILogger'),
        container.get<ToolExecutorFactory>('ToolExecutorFactory')
      ),
      { lifetime: ServiceLifetime.SINGLETON }
    );
  }
}
```

## 阶段 2：组件优化（2-3周）

### 2.1 评估并移除适配器层

#### 2.1.1 分析当前 ToolAdapter 的职责
当前 [`ToolAdapter`](src/infrastructure/tools/adapters/tool-adapter.ts:8) 承担的职责：
- 配置适配和标准化
- 参数验证
- 执行结果转换

#### 2.1.2 职责重新分配方案

**配置适配 → 配置管理器**
```typescript
// src/infrastructure/config/loading/tool-config-manager.ts
@injectable()
export class ToolConfigManager {
  adaptToolConfig(toolConfig: any): ToolConfig
  normalizeParameterSchema(parameters: any): ParameterSchema
  inferToolType(toolConfig: any): ToolType
}
```

**验证逻辑 → Domain 实体**
```typescript
// src/domain/tools/entities/tool.ts (增强)
export class Tool {
  validate(): ValidationResult
  validateConfiguration(): ValidationResult
  validateParameters(parameters: any): ValidationResult
}
```

**转换逻辑 → 执行器内部**
```typescript
// src/infrastructure/tools/executors/base-executor.ts
export abstract class BaseToolExecutor {
  protected adaptParameters(tool: Tool, parameters: any): any
  protected adaptResult(tool: Tool, result: any): ToolResult
}
```

#### 2.1.3 逐步移除 Adapter
1. 将配置逻辑迁移到配置管理器
2. 将验证逻辑迁移到 Domain 实体
3. 将转换逻辑迁移到执行器
4. 删除 [`ToolAdapter`](src/infrastructure/tools/adapters/tool-adapter.ts:8) 及相关文件

### 2.2 优化注册表

#### 2.2.1 简化 ToolRegistry
```typescript
// src/infrastructure/tools/registries/tool-registry.ts (重构后)
@injectable()
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private toolCategories: Map<string, string[]> = new Map();

  // 基础存储和检索功能
  registerTool(tool: Tool): void
  unregisterTool(toolId: string): void
  getTool(toolId: string): Tool | null
  getToolByName(name: string): Tool | null
  getAllTools(): Tool[]
  
  // 查询功能
  getToolsByCategory(category: string): Tool[]
  getToolsByType(type: string): Tool[]
  searchTools(query: string): Tool[]
  
  // 统计功能
  getStats(): RegistryStats
  clear(): void
}
```

#### 2.2.2 创建工具工厂
```typescript
// src/infrastructure/tools/factories/tool-factory.ts
@injectable()
export class ToolFactory {
  constructor(
    @inject('ToolConfigManager') private configManager: ToolConfigManager
  ) {}

  createTool(config: ToolConfig): Tool
  updateTool(existingTool: Tool, updates: Partial<Tool>): Tool
  validateToolConfig(config: ToolConfig): ValidationResult
}
```

### 2.3 优化执行器

#### 2.3.1 重构执行器基类
```typescript
// src/infrastructure/tools/executors/core/tool-executor-core.ts
@injectable()
export abstract class ToolExecutorCore {
  protected isInitialized = false;
  protected config: Record<string, unknown> = {};

  // 核心抽象方法
  abstract execute(tool: Tool, execution: ToolExecution): Promise<ToolResult>;
  abstract getType(): string;
  abstract getName(): string;
  
  // 基础生命周期方法
  async initialize(config: Record<string, unknown>): Promise<boolean>
  async start(): Promise<boolean>
  async stop(): Promise<boolean>
  async cleanup(): Promise<boolean>
}

// src/infrastructure/tools/executors/mixins/statistics-mixin.ts
export class StatisticsMixin {
  protected executionStats = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    totalExecutionTime: 0
  };

  getExecutionStatistics(): ExecutionStatistics
  updateExecutionStats(success: boolean, executionTime: number): void
  resetStats(): void
}

// src/infrastructure/tools/executors/mixins/health-check-mixin.ts
export class HealthCheckMixin {
  async healthCheck(): Promise<ToolExecutorHealthCheck>
  async getStatus(): Promise<ToolExecutorStatus>
}
```

#### 2.3.2 创建执行器工厂
```typescript
// src/infrastructure/tools/factories/tool-executor-factory.ts
@injectable()
export class ToolExecutorFactory {
  private executors: Map<string, ToolExecutorBase> = new Map();

  constructor(
    @inject('BuiltinExecutor') private builtinExecutor: BuiltinExecutor,
    @inject('NativeExecutor') private nativeExecutor: NativeExecutor,
    @inject('RestExecutor') private restExecutor: RestExecutor,
    @inject('McpExecutor') private mcpExecutor: McpExecutor
  ) {}

  getExecutor(toolType: string): ToolExecutorBase
  registerExecutor(type: string, executor: ToolExecutorBase): void
  getAllExecutors(): ToolExecutorBase[]
}
```

## 阶段 3：完善细节（1-2周）

### 3.1 统一错误处理

#### 3.1.1 创建错误处理器
```typescript
// src/infrastructure/tools/error/tool-error-handler.ts
@injectable()
export class ToolErrorHandler {
  handleError(error: Error, context: ErrorContext): ToolError
  shouldRetry(error: ToolError): boolean
  calculateRetryDelay(attempt: number, error: ToolError): number
  createErrorResult(error: ToolError, executionId: string): ToolResult
}

// src/infrastructure/tools/error/types.ts
export class ToolError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly category: ErrorCategory,
    public readonly retryable: boolean = false,
    public readonly context?: ErrorContext
  ) {
    super(message);
  }
}
```

### 3.2 标准化重试机制

#### 3.2.1 创建重试管理器
```typescript
// src/infrastructure/tools/retry/retry-manager.ts
@injectable()
export class RetryManager {
  constructor(
    @inject('ToolErrorHandler') private errorHandler: ToolErrorHandler
  ) {}

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig
  ): Promise<T>
  
  shouldRetry(error: ToolError, attempt: number, config: RetryConfig): boolean
  calculateDelay(attempt: number, config: RetryConfig): number
}
```

### 3.3 完善测试覆盖

#### 3.3.1 单元测试结构
```
src/infrastructure/tools/__tests__/
├── executors/
│   ├── builtin-executor.test.ts
│   ├── native-executor.test.ts
│   ├── rest-executor.test.ts
│   └── mcp-executor.test.ts
├── registries/
│   ├── tool-registry.test.ts
│   └── function-registry.test.ts
├── factories/
│   ├── tool-factory.test.ts
│   └── tool-executor-factory.test.ts
├── error/
│   └── tool-error-handler.test.ts
└── retry/
    └── retry-manager.test.ts
```

**注意：** 移除了 adapters 测试，因为适配器层将被删除

## 实施检查清单

### 阶段 1 检查清单
- [ ] 创建应用层服务目录结构（不包含 DTO）
- [ ] 定义核心接口，直接使用 Domain 实体
- [ ] 实现 ToolConfigManager
- [ ] 增强 ToolRule 验证
- [ ] 更新依赖注入配置
- [ ] 编写基础单元测试

### 阶段 2 检查清单
- [ ] 评估并逐步移除 ToolAdapter
- [ ] 将适配器职责重新分配到合适组件
- [ ] 简化 ToolRegistry 职责
- [ ] 重构执行器基类和混入
- [ ] 创建工具和执行器工厂
- [ ] 更新所有依赖关系
- [ ] 编写集成测试

### 阶段 3 检查清单
- [ ] 实现统一错误处理
- [ ] 标准化重试机制
- [ ] 完善测试覆盖（目标 90%）
- [ ] 性能优化
- [ ] 文档更新
- [ ] 代码审查

## 风险缓解措施

### 技术风险
- **向后兼容性**：保持现有 API 兼容，逐步迁移
- **性能影响**：实施性能基准测试，监控关键指标
- **依赖复杂性**：使用依赖注入容器管理复杂依赖

### 项目风险
- **时间延期**：采用迭代式开发，优先核心功能
- **资源不足**：分阶段实施，关键路径优先
- **需求变更**：保持架构灵活性，支持扩展

## 成功标准

### 代码质量
- [ ] 代码复杂度降低 30%
- [ ] 单元测试覆盖率达到 90%
- [ ] 集成测试覆盖关键流程
- [ ] 代码重复率降低 50%

### 功能指标
- [ ] 新工具类型添加时间减少 50%
- [ ] 配置错误减少 80%
- [ ] 工具执行性能提升 20%
- [ ] 错误恢复时间减少 40%

### 维护性
- [ ] 新开发者上手时间减少 60%
- [ ] 代码审查时间减少 30%
- [ ] 文档完整性达到 95%
- [ ] 部署成功率提升到 99%