# 依赖注入容器代码规范

## 概述

本文档定义了 Modular Agent Framework 依赖注入容器的代码规范，确保所有开发者遵循统一的编码标准，维护分层架构的完整性。

## 核心原则

### 1. 分层注册原则

**规则**: 每个容器只能注册属于自己层次的服务

| 容器类型 | 注册内容 | 依赖关系 |
|---------|---------|---------|
| InfrastructureContainer | Infrastructure层实现类 | 无依赖 |
| ApplicationContainer | Application层服务类 | 依赖InfrastructureContainer |
| InterfaceContainer | Interface层适配器类 | 依赖ApplicationContainer |

**示例**:

```typescript
// ✅ 正确：InfrastructureContainer注册Infrastructure服务
export class InfrastructureContainer extends BaseContainer {
  private registerInfrastructureServices(): void {
    const bindings = new InfrastructureLLMServiceBindings();
    bindings.registerServices(this, this.config);
  }
}

// ✅ 正确：ApplicationContainer注册Application服务
export class ApplicationContainer extends BaseContainer {
  private registerApplicationServices(): void {
    const bindings = new WorkflowServiceBindings();
    bindings.registerServices(this, this.config);
  }
}

// ❌ 错误：ApplicationContainer注册Infrastructure服务
export class ApplicationContainer extends BaseContainer {
  private registerApplicationServices(): void {
    // 错误：GraphAlgorithmService是Infrastructure层的服务
    container.registerFactory<GraphAlgorithmService>(
      'GraphAlgorithmService',
      () => new GraphAlgorithmServiceImpl(),
      { lifetime: ServiceLifetime.SINGLETON }
    );
  }
}
```

### 2. 服务键命名规范

**规则**: 服务键必须使用接口名称，格式为 `I{ServiceName}`

**命名格式**:
- 接口类型: `I{ServiceName}` (例如: `ILogger`, `IConfigManager`)
- 服务类型: `{ServiceName}` (例如: `SessionOrchestrationService`)

**示例**:

```typescript
// ✅ 正确：使用接口名称
container.registerFactory<ILogger>(
  'ILogger',
  () => loggerFactory.createLogger(),
  { lifetime: ServiceLifetime.SINGLETON }
);

container.registerFactory<SessionOrchestrationService>(
  'SessionOrchestrationService',
  () => new SessionOrchestrationServiceImpl(...),
  { lifetime: ServiceLifetime.SINGLETON }
);

// ❌ 错误：使用实现类名称
container.registerFactory<Logger>(
  'ConsoleLogger',
  () => new ConsoleLogger(),
  { lifetime: ServiceLifetime.SINGLETON }
);

// ❌ 错误：使用不规范的名称
container.registerFactory<ILogger>(
  'logger',
  () => loggerFactory.createLogger(),
  { lifetime: ServiceLifetime.SINGLETON }
);
```

### 3. 服务绑定类命名规范

**规则**: 绑定类名称必须以 `{Layer}ServiceBindings` 或 `{Layer}{Module}Bindings` 结尾

**命名格式**:
- 基础设施层: `Infrastructure{Module}Bindings` 或 `{Module}ServiceBindings`
- 应用层: `Application{Module}Bindings` 或 `{Module}ServiceBindings`
- 接口层: `Interface{Module}Bindings` 或 `{Module}ServiceBindings`

**示例**:

```typescript
// ✅ 正确：基础设施层绑定
export class InfrastructureLLMServiceBindings extends ServiceBindings { }
export class InfrastructureRepositoryBindings extends ServiceBindings { }
export class WorkflowExecutorBindings extends ServiceBindings { }

// ✅ 正确：应用层绑定
export class ApplicationWorkflowBindings extends ServiceBindings { }
export class WorkflowServiceBindings extends ServiceBindings { }
export class SessionServiceBindings extends ServiceBindings { }

// ✅ 正确：接口层绑定
export class HTTPServiceBindings extends ServiceBindings { }
export class CLIServiceBindings extends ServiceBindings { }
```

### 4. 生命周期使用规范

**规则**: 根据服务的特性选择合适的生命周期

| 生命周期 | 使用场景 | 示例 |
|---------|---------|------|
| SINGLETON | 无状态服务、配置管理、连接池 | `ILogger`, `IConfigManager`, `Database` |
| TRANSIENT | 有状态服务、每次请求需要新实例 | `RequestContext`, `WorkflowExecutor` |
| SCOPED | 请求范围内的共享实例 | `UserSession`, `TransactionContext` |

**示例**:

```typescript
// ✅ 正确：无状态服务使用SINGLETON
container.registerFactory<ILogger>(
  'ILogger',
  () => loggerFactory.createLogger(),
  { lifetime: ServiceLifetime.SINGLETON }
);

// ✅ 正确：有状态服务使用TRANSIENT
container.registerFactory<WorkflowExecutor>(
  'WorkflowExecutor',
  () => new WorkflowExecutor(...),
  { lifetime: ServiceLifetime.TRANSIENT }
);

// ✅ 正确：请求范围服务使用SCOPED
container.registerFactory<RequestContext>(
  'RequestContext',
  () => new RequestContext(...),
  { lifetime: ServiceLifetime.SCOPED }
);
```

### 5. 依赖解析规范

**规则**: 在factory函数中通过容器解析依赖，而不是直接创建实例

**示例**:

```typescript
// ✅ 正确：通过容器解析依赖
container.registerFactory<SessionOrchestrationService>(
  'SessionOrchestrationService',
  () => new SessionOrchestrationServiceImpl(
    container.get<SessionRepository>('SessionRepository'),
    container.get<ThreadRepository>('ThreadRepository'),
    container.get<SessionResourceService>('SessionResourceService')
  ),
  { lifetime: ServiceLifetime.SINGLETON }
);

// ❌ 错误：直接创建依赖实例
container.registerFactory<SessionOrchestrationService>(
  'SessionOrchestrationService',
  () => new SessionOrchestrationServiceImpl(
    new SessionRepositoryImpl(),  // 错误：直接创建实例
    new ThreadRepositoryImpl(),   // 错误：直接创建实例
    new SessionResourceServiceImpl() // 错误：直接创建实例
  ),
  { lifetime: ServiceLifetime.SINGLETON }
);
```

### 6. 分层依赖规范

**规则**: 服务只能依赖同层或下层的服务

**依赖关系**:
- Infrastructure层服务: 只能依赖Domain层
- Application层服务: 可以依赖Domain层和Infrastructure层
- Interface层服务: 可以依赖Domain层、Infrastructure层和Application层

**示例**:

```typescript
// ✅ 正确：Infrastructure层服务只依赖Domain层
export class SessionInfrastructureRepository implements SessionRepository {
  constructor(
    private connectionManager: ConnectionManager  // Infrastructure层
  ) {}
}

// ✅ 正确：Application层服务依赖Infrastructure层
export class SessionOrchestrationServiceImpl implements SessionOrchestrationService {
  constructor(
    private sessionRepository: SessionRepository,  // Domain接口，Infrastructure实现
    private threadRepository: ThreadRepository,    // Domain接口，Infrastructure实现
    private sessionResourceService: SessionResourceService  // Application层
  ) {}
}

// ❌ 错误：Infrastructure层服务依赖Application层
export class SomeInfrastructureService {
  constructor(
    private sessionOrchestrationService: SessionOrchestrationService  // 错误：依赖Application层
  ) {}
}
```

## 服务绑定类结构规范

### 标准结构

```typescript
/**
 * {模块名称}服务绑定
 * 
 * {简要描述}
 */
export class {BindingClassName} extends ServiceBindings {
  registerServices(container: IContainer, config: ContainerConfiguration): void {
    // 注册服务
    this.register{ServiceName}(container, config);
  }

  /**
   * 注册{服务名称}
   */
  private register{ServiceName}(container: IContainer, config: ContainerConfiguration): void {
    container.registerFactory<{ServiceInterface}>(
      '{ServiceKey}',
      () => new {ServiceImplementation}(
        container.get<{Dependency}>('{DependencyKey}'),
        container.get<{Dependency}>('{DependencyKey}')
      ),
      { lifetime: ServiceLifetime.{LIFETIME} }
    );
  }
}
```

### 完整示例

```typescript
/**
 * 会话编排服务绑定
 * 
 * 负责注册应用层的会话编排相关服务
 */
export class SessionServiceBindings extends ServiceBindings {
  registerServices(container: IContainer, config: ContainerConfiguration): void {
    this.registerSessionOrchestrationService(container, config);
    this.registerSessionResourceService(container, config);
  }

  /**
   * 注册会话编排服务
   */
  private registerSessionOrchestrationService(
    container: IContainer,
    config: ContainerConfiguration
  ): void {
    container.registerFactory<SessionOrchestrationService>(
      'SessionOrchestrationService',
      () => new SessionOrchestrationServiceImpl(
        container.get<SessionRepository>('SessionRepository'),
        container.get<ThreadRepository>('ThreadRepository'),
        container.get<SessionResourceService>('SessionResourceService'),
        container.get<ThreadCoordinatorService>('ThreadCoordinatorService')
      ),
      { lifetime: ServiceLifetime.SINGLETON }
    );
  }

  /**
   * 注册会话资源服务
   */
  private registerSessionResourceService(
    container: IContainer,
    config: ContainerConfiguration
  ): void {
    container.registerFactory<SessionResourceService>(
      'SessionResourceService',
      () => new SessionResourceServiceImpl(
        container.get<SessionRepository>('SessionRepository')
      ),
      { lifetime: ServiceLifetime.SINGLETON }
    );
  }
}
```

## 容器初始化规范

### InfrastructureContainer

```typescript
export class InfrastructureContainer extends BaseContainer {
  constructor(config: ContainerConfiguration = {}) {
    super();
    this.configure(config);
    this.registerInfrastructureServices();
  }

  private registerInfrastructureServices(): void {
    // 按照依赖顺序注册服务
    const loggerBindings = new LoggerServiceBindings();
    loggerBindings.registerServices(this, this.config);

    const configBindings = new ConfigServiceBindings();
    configBindings.registerServices(this, this.config);

    const databaseBindings = new DatabaseServiceBindings();
    databaseBindings.registerServices(this, this.config);

    const llmBindings = new InfrastructureLLMServiceBindings();
    llmBindings.registerServices(this, this.config);

    const repositoryBindings = new InfrastructureRepositoryBindings();
    repositoryBindings.registerServices(this, this.config);

    const workflowBindings = new WorkflowExecutorBindings();
    workflowBindings.registerServices(this, this.config);
  }
}
```

### ApplicationContainer

```typescript
export class ApplicationContainer extends BaseContainer {
  constructor(
    infrastructureContainer: IContainer,
    config: ContainerConfiguration = {}
  ) {
    super(infrastructureContainer);
    this.configure(config);
    this.registerApplicationServices();
  }

  private registerApplicationServices(): void {
    // 只注册应用层的服务
    const workflowBindings = new WorkflowServiceBindings();
    workflowBindings.registerServices(this, this.config);

    const sessionBindings = new SessionServiceBindings();
    sessionBindings.registerServices(this, this.config);

    const promptBindings = new PromptServiceBindings();
    promptBindings.registerServices(this, this.config);
  }
}
```

### InterfaceContainer

```typescript
export class InterfaceContainer extends BaseContainer {
  constructor(
    applicationContainer: IContainer,
    config: ContainerConfiguration = {}
  ) {
    super(applicationContainer);
    this.configure(config);
    this.registerInterfaceServices();
  }

  private registerInterfaceServices(): void {
    // 只注册接口层的适配器
    const httpBindings = new HTTPServiceBindings();
    httpBindings.registerServices(this, this.config);

    const cliBindings = new CLIServiceBindings();
    cliBindings.registerServices(this, this.config);

    const requestContextBindings = new RequestContextBindings();
    requestContextBindings.registerServices(this, this.config);

    const apiControllerBindings = new ApiControllerBindings();
    apiControllerBindings.registerServices(this, this.config);
  }
}
```

## 最佳实践

### 1. 服务注册顺序

**规则**: 按照依赖关系顺序注册服务

```typescript
// ✅ 正确：先注册依赖，再注册依赖者
private registerServices(container: IContainer): void {
  // 先注册基础服务
  this.registerLogger(container);
  this.registerConfigManager(container);

  // 再注册依赖基础服务的服务
  this.registerRepository(container);
  this.registerService(container);
}

// ❌ 错误：顺序混乱
private registerServices(container: IContainer): void {
  this.registerService(container);  // 错误：依赖还未注册
  this.registerLogger(container);
  this.registerConfigManager(container);
}
```

### 2. 服务键常量化

**规则**: 将服务键定义为常量，避免硬编码

```typescript
// ✅ 正确：使用常量
export const SERVICE_KEYS = {
  LOGGER: 'ILogger',
  CONFIG_MANAGER: 'IConfigManager',
  SESSION_REPOSITORY: 'SessionRepository',
  SESSION_ORCHESTRATION_SERVICE: 'SessionOrchestrationService'
} as const;

container.registerFactory<ILogger>(
  SERVICE_KEYS.LOGGER,
  () => loggerFactory.createLogger(),
  { lifetime: ServiceLifetime.SINGLETON }
);

// ❌ 错误：硬编码字符串
container.registerFactory<ILogger>(
  'ILogger',
  () => loggerFactory.createLogger(),
  { lifetime: ServiceLifetime.SINGLETON }
);
```

### 3. 服务注册验证

**规则**: 在注册服务后验证依赖是否可用

```typescript
// ✅ 正确：验证依赖
private registerSessionOrchestrationService(container: IContainer): void {
  // 验证依赖是否已注册
  if (!container.has('SessionRepository')) {
    throw new Error('SessionRepository must be registered before SessionOrchestrationService');
  }

  container.registerFactory<SessionOrchestrationService>(
    'SessionOrchestrationService',
    () => new SessionOrchestrationServiceImpl(
      container.get<SessionRepository>('SessionRepository')
    ),
    { lifetime: ServiceLifetime.SINGLETON }
  );
}
```

### 4. 错误处理

**规则**: 在factory函数中提供清晰的错误信息

```typescript
// ✅ 正确：提供清晰的错误信息
container.registerFactory<SessionOrchestrationService>(
  'SessionOrchestrationService',
  () => {
    try {
      const sessionRepository = container.get<SessionRepository>('SessionRepository');
      const threadRepository = container.get<ThreadRepository>('ThreadRepository');
      return new SessionOrchestrationServiceImpl(sessionRepository, threadRepository);
    } catch (error) {
      throw new Error(`Failed to create SessionOrchestrationService: ${error.message}`);
    }
  },
  { lifetime: ServiceLifetime.SINGLETON }
);
```

### 5. 服务生命周期管理

**规则**: 实现dispose方法以清理资源

```typescript
// ✅ 正确：实现dispose方法
export class DatabaseService implements IDisposable {
  private connection: Connection;

  constructor(config: DatabaseConfig) {
    this.connection = new Connection(config);
  }

  dispose(): void {
    if (this.connection) {
      this.connection.close();
    }
  }
}

// 容器会自动调用dispose
container.dispose();
```

## 禁止事项

### 1. 禁止跨层注册

```typescript
// ❌ 禁止：Application层注册Infrastructure服务
export class ApplicationContainer extends BaseContainer {
  private registerApplicationServices(): void {
    container.registerFactory<GraphAlgorithmService>(
      'GraphAlgorithmService',
      () => new GraphAlgorithmServiceImpl(),
      { lifetime: ServiceLifetime.SINGLETON }
    );
  }
}
```

### 2. 禁止直接创建依赖实例

```typescript
// ❌ 禁止：直接创建依赖实例
container.registerFactory<SessionOrchestrationService>(
  'SessionOrchestrationService',
  () => new SessionOrchestrationServiceImpl(
    new SessionRepositoryImpl()  // 禁止
  ),
  { lifetime: ServiceLifetime.SINGLETON }
);
```

### 3. 禁止使用不规范的命名

```typescript
// ❌ 禁止：使用不规范的命名
container.registerFactory<ILogger>(
  'logger',  // 禁止：小写
  () => loggerFactory.createLogger(),
  { lifetime: ServiceLifetime.SINGLETON }
);

container.registerFactory<ILogger>(
  'ConsoleLogger',  // 禁止：使用实现类名称
  () => new ConsoleLogger(),
  { lifetime: ServiceLifetime.SINGLETON }
);
```

### 4. 禁止循环依赖

```typescript
// ❌ 禁止：循环依赖
// ServiceA依赖ServiceB
container.registerFactory<ServiceA>(
  'ServiceA',
  () => new ServiceA(container.get<ServiceB>('ServiceB')),
  { lifetime: ServiceLifetime.SINGLETON }
);

// ServiceB依赖ServiceA
container.registerFactory<ServiceB>(
  'ServiceB',
  () => new ServiceB(container.get<ServiceA>('ServiceA')),
  { lifetime: ServiceLifetime.SINGLETON }
);
```

## 代码审查检查清单

在提交依赖注入相关的代码时，请确保：

- [ ] 服务注册在正确的容器中
- [ ] 服务键使用接口名称
- [ ] 绑定类命名符合规范
- [ ] 生命周期选择正确
- [ ] 依赖通过容器解析
- [ ] 没有跨层依赖
- [ ] 没有循环依赖
- [ ] 服务注册顺序正确
- [ ] 提供了清晰的错误处理
- [ ] 实现了dispose方法（如果需要）

## 总结

遵循本规范可以确保：
1. 维护分层架构的完整性
2. 提高代码的可维护性
3. 减少运行时错误
4. 提高开发效率
5. 便于单元测试

所有开发者都应该熟悉并遵循这些规范，在代码审查时严格执行。