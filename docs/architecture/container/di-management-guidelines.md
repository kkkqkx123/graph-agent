# 依赖注入管理代码规范

## 概述

本文档定义了 Modular Agent Framework 中依赖注入（DI）系统的管理规范，确保代码的可维护性、类型安全和一致性。

## 目录

- [核心原则](#核心原则)
- [服务注册规范](#服务注册规范)
- [服务获取规范](#服务获取规范)
- [类型安全规范](#类型安全规范)
- [生命周期管理](#生命周期管理)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)

---

## 核心原则

### 1. 类型安全优先
- 所有服务必须使用类型安全的API
- 禁止使用不安全的泛型方法
- 编译时必须通过类型检查

### 2. 单一职责
- 每个服务只负责一个明确的职责
- 服务接口定义在Domain层
- 服务实现在Infrastructure或Application层

### 3. 依赖倒置
- 高层模块不依赖低层模块，都依赖抽象
- 接口定义在Domain层
- 实现在Infrastructure或Application层

### 4. 显式依赖
- 所有依赖通过构造函数注入
- 禁止使用服务定位器模式
- 依赖关系清晰可见

---

## 服务注册规范

### 1. 服务标识符定义

所有服务标识符必须在 [`src/di/service-keys.ts`](../../../src/di/service-keys.ts) 中定义：

```typescript
// ✅ 正确：在 service-keys.ts 中定义
export const TYPES: {
  [K in ServiceIdentifier]: TypedServiceIdentifier<K>
} = {
  SessionRepository: Symbol.for('SessionRepository') as TypedServiceIdentifier<'SessionRepository'>,
  WorkflowRepository: Symbol.for('WorkflowRepository') as TypedServiceIdentifier<'WorkflowRepository'>,
  // ...
};

// ❌ 错误：在其他地方定义服务标识符
const MY_SERVICE = Symbol('MyService');
```

### 2. 服务类型映射

在 [`ServiceTypes`](../../../src/di/service-keys.ts:48) 接口中添加服务类型映射：

```typescript
// ✅ 正确：添加服务类型映射
export interface ServiceTypes {
  // Domain层接口
  SessionRepository: SessionRepository;
  WorkflowRepository: WorkflowRepository;

  // Application层接口
  SessionOrchestrationService: SessionOrchestrationService;

  // Infrastructure层实现
  SessionRepositoryImpl: SessionInfrastructureRepository;
  // ...
}
```

### 3. 服务绑定

服务绑定按层级组织在 `src/di/bindings/` 目录：

#### Infrastructure层绑定

在 [`infrastructure-bindings.ts`](../../../src/di/bindings/infrastructure-bindings.ts) 中绑定Infrastructure层服务：

```typescript
// ✅ 正确：Infrastructure层绑定
export const infrastructureBindings = new ContainerModule((bind: any) => {
  // 仓储实现
  bind(TYPES.SessionRepositoryImpl)
    .to(SessionInfrastructureRepository)
    .inSingletonScope();

  // 业务服务实现
  bind(TYPES.GraphAlgorithmServiceImpl)
    .to(GraphAlgorithmServiceImpl)
    .inSingletonScope();

  // 基础设施服务
  bind(TYPES.ConnectionManager)
    .to(ConnectionManager)
    .inSingletonScope();
});
```

#### Application层绑定

在 [`application-bindings.ts`](../../../src/di/bindings/application-bindings.ts) 中绑定Application层服务和接口映射：

```typescript
// ✅ 正确：Application层绑定
export const applicationBindings = new ContainerModule((bind: any) => {
  // Application层服务实现
  bind(TYPES.SessionOrchestrationServiceImpl)
    .to(SessionOrchestrationServiceImpl)
    .inSingletonScope();

  // Domain层接口到Infrastructure实现的映射
  bind(TYPES.SessionRepository)
    .toDynamicValue((context: any) => {
      return context.container.get(TYPES.SessionRepositoryImpl);
    })
    .inSingletonScope();

  // Application层接口到实现的映射
  bind(TYPES.SessionOrchestrationService)
    .toDynamicValue((context: any) => {
      return context.container.get(TYPES.SessionOrchestrationServiceImpl);
    })
    .inSingletonScope();
});
```

### 4. 绑定规则

- **Domain层接口**：在Application层绑定到Infrastructure实现
- **Application层接口**：在Application层绑定到Application实现
- **Infrastructure层实现**：在Infrastructure层直接绑定
- **所有服务**：默认使用单例作用域（`inSingletonScope()`）

---

## 服务获取规范

### 1. 使用类型安全的API

```typescript
// ✅ 正确：使用类型安全的API
const sessionRepo = AppContainer.getService(TYPES.SessionRepository);
const workflowService = AppContainer.getService(TYPES.WorkflowOrchestrationService);

// ❌ 错误：使用不安全的泛型（已废弃）
const sessionRepo = AppContainer.getServiceUnsafe<SessionRepository>(TYPES.SessionRepository);
```

### 2. 在构造函数中注入

```typescript
// ✅ 正确：通过构造函数注入
export class SessionOrchestrationServiceImpl implements SessionOrchestrationService {
  constructor(
    @inject(TYPES.SessionRepository) private readonly sessionRepository: SessionRepository,
    @inject(TYPES.ThreadRepository) private readonly threadRepository: ThreadRepository,
    @inject(TYPES.SessionResourceService) private readonly sessionResourceService: SessionResourceService
  ) {}

  async orchestrateWorkflowExecution(sessionId: ID, workflowId: ID, context: Record<string, unknown>) {
    // 使用注入的服务
    const session = await this.sessionRepository.findById(sessionId);
    // ...
  }
}

// ❌ 错误：在方法中获取服务
export class SessionOrchestrationServiceImpl implements SessionOrchestrationService {
  async orchestrateWorkflowExecution(sessionId: ID, workflowId: ID, context: Record<string, unknown>) {
    const sessionRepo = AppContainer.getService(TYPES.SessionRepository); // 错误
    // ...
  }
}
```

### 3. 使用AppContainer静态方法

```typescript
// ✅ 正确：使用AppContainer静态方法
export class Application {
  async initialize(): Promise<void> {
    const logger = AppContainer.getService(TYPES.Logger);
    logger.info('正在初始化应用程序...');
  }
}

// ❌ 错误：直接使用ContainerManager
export class Application {
  async initialize(): Promise<void> {
    const containerManager = ContainerManager.getInstance();
    const logger = containerManager.getService(TYPES.Logger); // 错误
  }
}
```

---

## 类型安全规范

### 1. 使用TypedServiceIdentifier

```typescript
// ✅ 正确：使用TypedServiceIdentifier
function getService<K extends ServiceIdentifier>(
  container: any,
  serviceIdentifier: TypedServiceIdentifier<K>
): GetServiceType<K> {
  return container.get(serviceIdentifier) as GetServiceType<K>;
}

// ❌ 错误：使用普通symbol
function getService(container: any, serviceIdentifier: symbol): any {
  return container.get(serviceIdentifier);
}
```

### 2. 类型推断

```typescript
// ✅ 正确：类型自动推断
const sessionRepo = AppContainer.getService(TYPES.SessionRepository);
// sessionRepo 的类型自动推断为 SessionRepository

// ❌ 错误：手动指定类型
const sessionRepo: SessionRepository = AppContainer.getService(TYPES.SessionRepository);
// 类型推断已经足够，无需手动指定
```

### 3. 类型检查

```typescript
// ✅ 正确：类型不匹配会在编译时报错
const wrong: SessionRepository = AppContainer.getService(TYPES.WorkflowRepository);
// 编译错误：类型不匹配

// ✅ 正确：使用正确的类型
const correct: SessionRepository = AppContainer.getService(TYPES.SessionRepository);
```

---

## 生命周期管理

### 1. 容器初始化

```typescript
// ✅ 正确：在应用启动时初始化容器
AppContainer.initialize({
  enableLogging: true,
  enableCache: true
});

// ❌ 错误：在使用前未初始化容器
const service = AppContainer.getService(TYPES.SessionRepository);
// 运行时错误：容器未初始化
```

### 2. 作用域选择

```typescript
// ✅ 正确：使用单例作用域（默认）
bind(TYPES.SessionRepository)
  .to(SessionInfrastructureRepository)
  .inSingletonScope();

// ✅ 正确：使用瞬态作用域（如果需要）
bind(TYPES.RequestContext)
  .to(RequestContext)
  .inTransientScope();

// ❌ 错误：不指定作用域
bind(TYPES.SessionRepository)
  .to(SessionInfrastructureRepository);
// 应该明确指定作用域
```

### 3. 容器清理

```typescript
// ✅ 正确：在应用关闭时清理容器
AppContainer.reset();

// ❌ 错误：不清理容器
// 可能导致内存泄漏
```

---

## 最佳实践

### 1. 服务设计

```typescript
// ✅ 正确：服务接口定义在Domain层
// src/domain/sessions/repositories/session-repository.ts
export interface SessionRepository extends Repository<Session, ID> {
  findActiveSessionsForUser(userId: ID): Promise<Session[]>;
  // ...
}

// ✅ 正确：服务实现在Infrastructure层
// src/infrastructure/persistence/repositories/session-repository.ts
export class SessionRepository implements SessionRepository {
  constructor(
    @inject(TYPES.ConnectionManager) connectionManager: ConnectionManager
  ) {
    super(connectionManager);
  }
  // ...
}
```

### 2. 依赖注入

```typescript
// ✅ 正确：使用readonly和private
export class SessionOrchestrationServiceImpl implements SessionOrchestrationService {
  constructor(
    @inject(TYPES.SessionRepository) private readonly sessionRepository: SessionRepository,
    @inject(TYPES.ThreadRepository) private readonly threadRepository: ThreadRepository
  ) {}

  // 使用this.sessionRepository和this.threadRepository
}

// ❌ 错误：不使用readonly
export class SessionOrchestrationServiceImpl implements SessionOrchestrationService {
  constructor(
    @inject(TYPES.SessionRepository) private sessionRepository: SessionRepository
  ) {}
  // 可能被意外修改
}
```

### 3. 错误处理

```typescript
// ✅ 正确：使用tryGetService处理可能不存在的服务
const service = AppContainer.tryGetService(TYPES.OptionalService);
if (service) {
  // 服务存在，使用它
} else {
  // 服务不存在，处理错误
}

// ❌ 错误：直接使用getService可能导致运行时错误
const service = AppContainer.getService(TYPES.OptionalService);
// 如果服务未绑定，会抛出异常
```

### 4. 测试

```typescript
// ✅ 正确：在测试中使用容器
describe('SessionOrchestrationService', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    // 绑定mock服务
    container.bind(TYPES.SessionRepository).toConstantValue(mockSessionRepository);
    container.bind(TYPES.ThreadRepository).toConstantValue(mockThreadRepository);
  });

  it('should orchestrate workflow execution', async () => {
    const service = container.get(TYPES.SessionOrchestrationServiceImpl);
    // 测试逻辑
  });
});
```

---

## 常见问题

### Q1: 如何添加新的服务？

**A:** 按照以下步骤：

1. 在 [`service-keys.ts`](../../../src/di/service-keys.ts) 中添加服务标识符和类型映射
2. 在相应的绑定文件中添加服务绑定
3. 在需要的地方使用类型安全的API获取服务

```typescript
// 1. 添加服务标识符
export interface ServiceTypes {
  MyNewService: MyNewService;
}

export const TYPES = {
  MyNewService: Symbol.for('MyNewService') as TypedServiceIdentifier<'MyNewService'>,
};

// 2. 添加服务绑定
export const infrastructureBindings = new ContainerModule((bind: any) => {
  bind(TYPES.MyNewService)
    .to(MyNewServiceImpl)
    .inSingletonScope();
});

// 3. 使用服务
const service = AppContainer.getService(TYPES.MyNewService);
```

### Q2: 如何处理循环依赖？

**A:** 避免循环依赖，如果必须处理：

1. 重构代码，消除循环依赖
2. 使用事件或消息传递解耦
3. 使用延迟注入（不推荐）

```typescript
// ❌ 错误：循环依赖
class ServiceA {
  constructor(@inject(TYPES.ServiceB) private serviceB: ServiceB) {}
}

class ServiceB {
  constructor(@inject(TYPES.ServiceA) private serviceA: ServiceA) {}
}

// ✅ 正确：使用事件解耦
class ServiceA {
  constructor(@inject(TYPES.EventBus) private eventBus: EventBus) {}

  doSomething() {
    this.eventBus.emit('something-done', data);
  }
}

class ServiceB {
  constructor(@inject(TYPES.EventBus) private eventBus: EventBus) {
    this.eventBus.on('something-done', this.handleSomethingDone);
  }

  handleSomethingDone(data: any) {
    // 处理事件
  }
}
```

### Q3: 如何在测试中替换服务？

**A:** 使用容器的rebind方法：

```typescript
// ✅ 正确：在测试中替换服务
beforeEach(() => {
  const container = AppContainer.getContainerManager().getContainer();
  container.rebind(TYPES.SessionRepository).toConstantValue(mockSessionRepository);
});

afterEach(() => {
  // 恢复原始绑定
  AppContainer.reset();
});
```

### Q4: 如何处理可选依赖？

**A:** 使用tryGetService：

```typescript
// ✅ 正确：处理可选依赖
export class MyService {
  constructor(
    @inject(TYPES.RequiredService) private readonly requiredService: RequiredService
  ) {}

  async doSomething() {
    // 使用必需服务
    await this.requiredService.doWork();

    // 处理可选服务
    const optionalService = AppContainer.tryGetService(TYPES.OptionalService);
    if (optionalService) {
      await optionalService.doOptionalWork();
    }
  }
}
```

### Q5: 如何确保类型安全？

**A:** 遵循以下规则：

1. 始终使用类型安全的API（`getService<K>`）
2. 不要手动指定类型参数（让TypeScript推断）
3. 在编译时检查类型（运行 `npm run typecheck`）
4. 使用TypedServiceIdentifier而不是普通symbol

```typescript
// ✅ 正确：类型安全
const service = AppContainer.getService(TYPES.SessionRepository);
// 类型自动推断为 SessionRepository

// ❌ 错误：不类型安全
const service = AppContainer.getServiceUnsafe<SessionRepository>(TYPES.SessionRepository);
// 类型参数可能不匹配
```

---

## 参考资料

- [InversifyJS文档](https://inversify.io/)
- [TypeScript类型系统](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)
- [依赖注入模式](https://en.wikipedia.org/wiki/Dependency_injection)

---

## 版本历史

- **v1.0.0** (2024-12-28): 初始版本，定义DI管理规范