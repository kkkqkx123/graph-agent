# SDK-Kit 架构设计文档

## 1. 架构总览

### 1.1 分层架构

```
┌─────────────────────────────────────────┐
│        应用层 (Application)             │
│  (使用 Kit 的应用代码)                  │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│    SDK-Kit 公共 API 层 (Public API)     │
│  - WorkflowAPI                          │
│  - ExecutionAPI                         │
│  - QueryAPI                             │
│  - ResourceAPI                          │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│  SDK-Kit 核心模块 (Core Modules)        │
│  - WorkflowBuilder                      │
│  - ExecutionRunner                      │
│  - QueryExecutor                        │
│  - ResourceManager                      │
│  - ErrorConverter                       │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│   SDK/API 层 (SDK Layer)                │
│  (被 Kit 内部使用)                      │
└─────────────────────────────────────────┘
```

### 1.2 核心特点

- **隔离性**：Kit 不修改 SDK，完全独立
- **透明性**：Kit 可以与 SDK 并行使用
- **可扩展**：易于添加新的 Builder 或 API

---

## 2. 目录结构

```
sdk-kit/
├── src/
│   ├── index.ts                 # 主入口
│   ├── kit.ts                   # SDKKit 类（主类）
│   │
│   ├── api/
│   │   ├── index.ts             # API 导出
│   │   ├── workflow.api.ts       # WorkflowAPI
│   │   ├── execution.api.ts      # ExecutionAPI
│   │   ├── query.api.ts          # QueryAPI
│   │   └── resource.api.ts       # ResourceAPI (可选)
│   │
│   ├── builders/
│   │   ├── workflow.builder.ts   # WorkflowBuilder 实现
│   │   └── execution.builder.ts  # ExecutionBuilder 实现
│   │
│   ├── executors/
│   │   ├── execution.executor.ts # 执行引擎
│   │   └── query.executor.ts     # 查询引擎
│   │
│   ├── converters/
│   │   ├── error.converter.ts    # SDK 错误转换
│   │   ├── result.converter.ts   # SDK 结果转换
│   │   └── event.converter.ts    # 事件转换
│   │
│   ├── types/
│   │   ├── index.ts              # 类型导出
│   │   ├── workflow.types.ts      # 工作流相关类型
│   │   ├── execution.types.ts     # 执行相关类型
│   │   ├── query.types.ts         # 查询相关类型
│   │   └── common.types.ts        # 通用类型
│   │
│   └── utils/
│       ├── validators.ts         # 验证工具
│       ├── transformers.ts       # 数据转换
│       └── helpers.ts            # 辅助函数
│
├── __tests__/
│   ├── unit/
│   │   ├── api/
│   │   ├── builders/
│   │   ├── executors/
│   │   └── converters/
│   └── integration/
│       ├── workflow.int.test.ts
│       ├── execution.int.test.ts
│       └── query.int.test.ts
│
├── package.json
└── tsconfig.json
```

---

## 3. 核心模块设计

### 3.1 SDKKit 主类

```typescript
/**
 * SDKKit 主类 - 工作流 SDK 的高级 API 入口
 */
class SDKKit {
  private readonly sdk: WorkflowSDK;
  private readonly workflowBuilder: WorkflowBuilder;
  private readonly executionRunner: ExecutionRunner;
  private readonly queryExecutor: QueryExecutor;
  private readonly errorConverter: ErrorConverter;

  constructor(sdk: WorkflowSDK) {
    this.sdk = sdk;
    this.workflowBuilder = new WorkflowBuilder(sdk);
    this.executionRunner = new ExecutionRunner(sdk, this.errorConverter);
    this.queryExecutor = new QueryExecutor(sdk, this.errorConverter);
    this.errorConverter = new ErrorConverter();
  }

  // 获取工作流 API
  workflow(): WorkflowAPI {
    return this.workflowBuilder.getAPI();
  }

  // 获取执行 API
  execution(): ExecutionAPI {
    return this.executionRunner.getAPI();
  }

  // 获取查询 API
  query(): QueryAPI {
    return this.queryExecutor.getAPI();
  }

  // 获取资源 API（可选）
  resource(): ResourceAPI {
    return new ResourceManager(this.sdk).getAPI();
  }

  // 获取底层 SDK（用于深度定制）
  getSDK(): WorkflowSDK {
    return this.sdk;
  }
}
```

---

### 3.2 WorkflowBuilder 模块

```typescript
/**
 * 工作流构建器 - 编程方式定义工作流
 */
class WorkflowBuilder {
  private sdk: WorkflowSDK;
  private template: WorkflowTemplate;
  private api: WorkflowAPI;

  constructor(sdk: WorkflowSDK) {
    this.sdk = sdk;
    this.api = new WorkflowAPIImpl(this);
  }

  getAPI(): WorkflowAPI {
    return this.api;
  }

  // 内部方法 - 创建新工作流
  createNew(id: string): this {
    this.template = {
      id,
      version: '1.0',
      nodes: [],
      edges: [],
    };
    return this;
  }

  // 内部方法 - 添加节点
  addNode(id: string, config: NodeConfig): this {
    // 验证节点 ID 唯一性
    if (this.template.nodes.find(n => n.id === id)) {
      throw new KitError('Node ID already exists', 'DUPLICATE_NODE_ID');
    }
    
    this.template.nodes.push({
      id,
      type: config.type,
      config: config.config || {},
    });
    return this;
  }

  // 内部方法 - 添加边
  addEdge(from: string, to: string, condition?: EdgeCondition): this {
    // 验证节点存在
    if (!this.template.nodes.find(n => n.id === from)) {
      throw new KitError(`Node ${from} not found`, 'NODE_NOT_FOUND');
    }
    if (!this.template.nodes.find(n => n.id === to)) {
      throw new KitError(`Node ${to} not found`, 'NODE_NOT_FOUND');
    }

    this.template.edges.push({
      from,
      to,
      condition: condition || {},
    });
    return this;
  }

  // 内部方法 - 获取模板
  getTemplate(): WorkflowTemplate {
    return structuredClone(this.template);
  }

  // 内部方法 - 保存到 SDK
  async save(): Promise<WorkflowTemplate> {
    const registry = this.sdk.getFactory().getWorkflowRegistry();
    const saved = await registry.create(this.template);
    return saved;
  }
}

/**
 * WorkflowAPI 实现
 */
class WorkflowAPIImpl implements WorkflowAPI {
  constructor(private builder: WorkflowBuilder) {}

  create(id: string): WorkflowBuilder {
    return this.builder.createNew(id);
  }

  fromTemplate(template: WorkflowTemplate): WorkflowBuilder {
    // 从现有模板复制状态
    return this.builder;
  }
}
```

---

### 3.3 ExecutionRunner 模块

```typescript
/**
 * 执行运行器 - 简化工作流执行
 */
class ExecutionRunner {
  private sdk: WorkflowSDK;
  private errorConverter: ErrorConverter;
  private api: ExecutionAPI;
  private eventEmitter: EventEmitter;

  constructor(sdk: WorkflowSDK, errorConverter: ErrorConverter) {
    this.sdk = sdk;
    this.errorConverter = errorConverter;
    this.eventEmitter = new EventEmitter();
    this.api = new ExecutionAPIImpl(this);
  }

  getAPI(): ExecutionAPI {
    return this.api;
  }

  // 内部方法 - 执行工作流
  async executeWorkflow(
    workflowId: string,
    input?: Record<string, unknown>,
    options?: ExecutionOptions
  ): Promise<ExecutionResult> {
    try {
      // 1. 获取依赖
      const dependencies = this.sdk.getFactory().getDependencies();

      // 2. 创建命令
      const command = new ExecuteWorkflowCommand(
        { workflowId, options: { input } },
        dependencies
      );

      // 3. 执行命令
      const result = await this.sdk.executeCommand(command);

      // 4. 转换结果（自动处理错误）
      const execution = this.errorConverter.convertResult(result);

      // 5. 发送完成事件
      this.eventEmitter.emit('completed', {
        executionId: execution.executionId,
        output: execution.output,
      });

      return {
        executionId: execution.executionId,
        status: 'completed',
        output: execution.output,
        duration: Date.now() - execution.startTime,
      };
    } catch (error) {
      const kitError = this.errorConverter.convertError(error);
      this.eventEmitter.emit('error', kitError);
      throw kitError;
    }
  }

  // 监听事件
  onEvent(event: string, handler: (data: any) => void) {
    this.eventEmitter.on(event, handler);
  }
}

/**
 * ExecutionAPI 实现
 */
class ExecutionAPIImpl implements ExecutionAPI {
  private context: ExecutionContext = {};

  constructor(private runner: ExecutionRunner) {}

  workflow(id: string): ExecutionBuilder {
    this.context.workflowId = id;
    return new ExecutionBuilderImpl(this.runner, this.context);
  }
}

/**
 * ExecutionBuilder 实现
 */
class ExecutionBuilderImpl implements ExecutionBuilder {
  constructor(
    private runner: ExecutionRunner,
    private context: ExecutionContext
  ) {}

  input(data: Record<string, unknown>): this {
    this.context.input = data;
    return this;
  }

  onProgress(handler: (event: ExecutionEvent) => void): this {
    this.runner.onEvent('progress', handler);
    return this;
  }

  onError(handler: (error: Error) => void): this {
    this.runner.onEvent('error', handler);
    return this;
  }

  async execute(): Promise<ExecutionResult> {
    return this.runner.executeWorkflow(
      this.context.workflowId!,
      this.context.input,
      this.context.options
    );
  }

  getExecutionId(): string {
    return this.context.executionId || '';
  }
}
```

---

### 3.4 QueryExecutor 模块

```typescript
/**
 * 查询执行器 - 简化执行查询
 */
class QueryExecutor {
  private sdk: WorkflowSDK;
  private errorConverter: ErrorConverter;
  private api: QueryAPI;

  constructor(sdk: WorkflowSDK, errorConverter: ErrorConverter) {
    this.sdk = sdk;
    this.errorConverter = errorConverter;
    this.api = new QueryAPIImpl(this);
  }

  getAPI(): QueryAPI {
    return this.api;
  }

  // 内部方法 - 执行查询
  async query(
    filters?: FilterCriteria,
    sort?: SortOptions,
    pagination?: PaginationOptions
  ): Promise<ExecutionRecord[]> {
    try {
      const registry = this.sdk.getFactory().getWorkflowExecutionRegistry();
      
      // 转换过滤条件
      const sdkFilters = this.convertFilters(filters);
      
      // 执行 SDK 查询
      const results = await registry.query({
        filters: sdkFilters,
        sort,
        pagination,
      });

      // 转换结果
      return results.map(this.convertRecord);
    } catch (error) {
      throw this.errorConverter.convertError(error);
    }
  }

  private convertFilters(filters?: FilterCriteria): any {
    // 将高级过滤条件转换为 SDK 格式
    if (!filters) return {};
    
    return {
      workflowId: filters.workflowId,
      status: filters.status,
      createdAfter: filters.startTime?.from,
      createdBefore: filters.startTime?.to,
      tags: filters.tags,
      ...filters.custom,
    };
  }

  private convertRecord(record: any): ExecutionRecord {
    return {
      executionId: record.id,
      workflowId: record.workflowId,
      status: record.status,
      input: record.input,
      output: record.output,
      error: record.error?.message,
      startTime: record.createdAt,
      endTime: record.completedAt,
      duration: record.completedAt
        ? record.completedAt - record.createdAt
        : undefined,
    };
  }
}

/**
 * QueryAPI 实现
 */
class QueryAPIImpl implements QueryAPI {
  constructor(private executor: QueryExecutor) {}

  executions(): QueryBuilder {
    return new QueryBuilderImpl(this.executor);
  }
}

/**
 * QueryBuilder 实现
 */
class QueryBuilderImpl implements QueryBuilder {
  private filters?: FilterCriteria;
  private sort?: SortOptions;
  private pagination: PaginationOptions = { limit: 100, offset: 0 };

  constructor(private executor: QueryExecutor) {}

  filter(criteria: FilterCriteria): this {
    this.filters = { ...this.filters, ...criteria };
    return this;
  }

  sort(field: string, order: 'asc' | 'desc'): this {
    this.sort = { field, order };
    return this;
  }

  limit(count: number): this {
    this.pagination.limit = count;
    return this;
  }

  offset(count: number): this {
    this.pagination.offset = count;
    return this;
  }

  async get(): Promise<ExecutionRecord[]> {
    return this.executor.query(this.filters, this.sort, this.pagination);
  }

  async first(): Promise<ExecutionRecord | null> {
    const results = await this.executor.query(
      this.filters,
      this.sort,
      { limit: 1, offset: 0 }
    );
    return results[0] || null;
  }

  async count(): Promise<number> {
    const results = await this.executor.query(this.filters);
    return results.length;
  }
}
```

---

### 3.5 ErrorConverter 模块

```typescript
/**
 * 错误转换器 - SDK 错误 → JS 异常
 */
class ErrorConverter {
  /**
   * 转换 SDK 的 Result 类型为异常（如果失败）
   */
  convertResult<T>(result: Result<T, SDKError>): T {
    if (isSuccess(result)) {
      return getSuccessData(result);
    }

    const error = getError(result);
    throw this.convertError(error);
  }

  /**
   * 转换 SDK 错误为 KitError
   */
  convertError(error: any): KitError {
    if (error instanceof KitError) {
      return error;
    }

    // 识别常见的 SDK 错误
    let code = ErrorCode.INTERNAL_ERROR;
    let message = error?.message || 'Unknown error';

    if (error?.code === 'WORKFLOW_NOT_FOUND') {
      code = ErrorCode.WORKFLOW_NOT_FOUND;
    } else if (error?.code === 'EXECUTION_FAILED') {
      code = ErrorCode.EXECUTION_FAILED;
    } else if (error?.code === 'VALIDATION_ERROR') {
      code = ErrorCode.VALIDATION_ERROR;
    } else if (error?.code === 'TIMEOUT') {
      code = ErrorCode.TIMEOUT;
    }

    return new KitError(message, code, {
      originalError: error,
    });
  }
}

/**
 * 自定义错误类
 */
class KitError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'KitError';
  }

  toString(): string {
    return `${this.name}[${this.code}]: ${this.message}`;
  }
}

enum ErrorCode {
  WORKFLOW_NOT_FOUND = 'WORKFLOW_NOT_FOUND',
  EXECUTION_FAILED = 'EXECUTION_FAILED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TIMEOUT = 'TIMEOUT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DUPLICATE_NODE_ID = 'DUPLICATE_NODE_ID',
  NODE_NOT_FOUND = 'NODE_NOT_FOUND',
}
```

---

## 4. 交互流程

### 4.1 工作流定义流程

```
用户代码
    │
    ▼
kit.workflow()
    │
    ▼
WorkflowBuilder (链式调用)
    │
    ├─► addNode()    (验证和收集)
    │
    ├─► addEdge()    (验证和收集)
    │
    ├─► metadata()   (设置元数据)
    │
    ▼
build() / save()
    │
    ▼
WorkflowRegistry API
    │
    ▼
返回 WorkflowTemplate
```

### 4.2 工作流执行流程

```
用户代码
    │
    ▼
kit.execution().workflow('id').execute()
    │
    ▼
ExecutionRunner
    │
    ├─► 获取 SDK dependencies
    │
    ├─► 创建 ExecuteWorkflowCommand
    │
    ├─► 调用 sdk.executeCommand()
    │
    ├─► ErrorConverter.convertResult()
    │
    ├─► 发送事件 (progress, completed, error)
    │
    ▼
返回 ExecutionResult / 抛出异常
```

### 4.3 查询流程

```
用户代码
    │
    ▼
kit.query().executions()
    │
    ├─► filter()     (链式构建过滤条件)
    │
    ├─► sort()       (排序)
    │
    ├─► limit()      (分页)
    │
    ▼
get() / first() / count()
    │
    ▼
QueryExecutor
    │
    ├─► 获取 WorkflowExecutionRegistry
    │
    ├─► 转换过滤条件
    │
    ├─► 调用 registry.query()
    │
    ├─► 转换结果记录
    │
    ▼
返回 ExecutionRecord[]
```

---

## 5. 依赖关系图

```
┌─────────────────────────────────────────────────┐
│           SDKKit (入口)                          │
│  - 管理所有模块的生命周期                        │
└─────────────────────────────────────────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
   WorkflowBuilder ExecutionRunner QueryExecutor
        │          │          │
        └──────────┼──────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
   ErrorConverter ResultConverter EventEmitter
        │
        ▼
   WorkflowSDK (依赖)
```

---

## 6. 关键设计决策

### 6.1 为什么使用 Builder 模式？

- **链式 API**：自然流畅的代码风格
- **中间状态隐藏**：用户不需要关心细节
- **验证集中**：在 build 时统一验证

### 6.2 为什么隔离错误处理？

- **一致性**：所有 Kit API 都使用同一错误模型
- **简化用户代码**：用户只需处理 JS 异常，不需要理解 SDK 的 Result 类型
- **可维护性**：错误映射集中管理

### 6.3 为什么使用事件发射？

- **异步通知**：工作流执行期间的实时反馈
- **非侵入式**：用户可选择是否监听
- **可扩展**：易于添加新的事件类型

---

## 7. 扩展性设计

### 7.1 添加新的 API

```typescript
// 在 SDKKit 中添加新 API
class SDKKit {
  // ... 现有代码 ...

  // 添加新功能
  monitoring(): MonitoringAPI {
    return new MonitoringManager(this.sdk).getAPI();
  }
}

// 新模块遵循相同的模式
class MonitoringManager {
  private sdk: WorkflowSDK;
  private api: MonitoringAPI;

  constructor(sdk: WorkflowSDK) {
    this.sdk = sdk;
    this.api = new MonitoringAPIImpl(this);
  }

  getAPI(): MonitoringAPI {
    return this.api;
  }
}
```

### 7.2 自定义转换器

```typescript
// 用户可以扩展错误转换
class CustomErrorConverter extends ErrorConverter {
  convertError(error: any): KitError {
    // 自定义逻辑
    return super.convertError(error);
  }
}
```

---

## 8. 类型系统

### 8.1 核心类型定义位置

```
types/
├── workflow.types.ts      # WorkflowBuilder 相关
├── execution.types.ts     # ExecutionAPI 相关
├── query.types.ts         # QueryAPI 相关
└── common.types.ts        # 共享类型
```

### 8.2 类型导出策略

```typescript
// types/index.ts
export * from './workflow.types';
export * from './execution.types';
export * from './query.types';
export * from './common.types';
export { SDKKit } from '../kit';
export { KitError, ErrorCode } from '../converters/error.converter';
```

---

## 9. 测试架构

### 9.1 单元测试结构

```
__tests__/unit/
├── api/
│   ├── workflow.api.spec.ts
│   ├── execution.api.spec.ts
│   └── query.api.spec.ts
├── builders/
│   ├── workflow.builder.spec.ts
│   └── execution.builder.spec.ts
├── executors/
│   ├── execution.executor.spec.ts
│   └── query.executor.spec.ts
└── converters/
    ├── error.converter.spec.ts
    └── result.converter.spec.ts
```

### 9.2 集成测试结构

```
__tests__/integration/
├── workflow.int.test.ts       # 完整的工作流定义和保存
├── execution.int.test.ts      # 完整的工作流执行
└── query.int.test.ts          # 完整的查询和过滤
```

---

## 10. 性能考虑

### 10.1 缓存策略

- **工作流模板缓存**：避免重复加载
- **SDK 实例缓存**：共享同一 SDK 实例

### 10.2 异步设计

- 所有 IO 操作都是异步的
- 事件系统基于事件驱动
- 支持并发执行

### 10.3 内存管理

- 及时释放事件监听
- 清理临时数据结构
