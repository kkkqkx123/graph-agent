# 轮询池和任务组架构目录结构

## 目录结构概览

基于DDD架构原则，轮询池和任务组功能的目录结构如下：

```
src/
├── domain/
│   └── llm/
│       ├── entities/
│       │   ├── pool.ts
│       │   ├── task-group.ts
│       │   └── pool-instance.ts
│       ├── value-objects/
│       │   ├── rotation-strategy.ts
│       │   ├── echelon-config.ts
│       │   ├── fallback-strategy.ts
│       │   ├── circuit-breaker-config.ts
│       │   ├── pool-status.ts
│       │   └── health-status.ts
│       ├── interfaces/
│       │   ├── pool-manager.interface.ts
│       │   ├── task-group-manager.interface.ts
│       │   ├── llm-wrapper.interface.ts
│       │   ├── pool-config.interface.ts
│       │   ├── task-group-config.interface.ts
│       │   └── wrapper-config.interface.ts
│       ├── services/
│       │   ├── health-check.service.ts
│       │   ├── metrics-collector.service.ts
│       │   └── error-recovery.service.ts
│       ├── exceptions/
│       │   ├── pool.exceptions.ts
│       │   ├── task-group.exceptions.ts
│       │   └── wrapper.exceptions.ts
│       └── index.ts
├── application/
│   └── llm/
│       ├── services/
│       │   ├── pool.service.ts
│       │   ├── task-group.service.ts
│       │   ├── wrapper.service.ts
│       │   ├── orchestration.service.ts
│       │   └── config-management.service.ts
│       ├── factories/
│       │   ├── wrapper.factory.ts
│       │   ├── strategy.factory.ts
│       │   └── client.factory.ts
│       ├── use-cases/
│       │   ├── process-request.use-case.ts
│       │   ├── manage-pool.use-case.ts
│       │   └── handle-fallback.use-case.ts
│       └── index.ts
├── infrastructure/
│   └── llm/
│       ├── config/
│       │   ├── loaders/
│       │   │   ├── pool-config.loader.ts
│       │   │   ├── task-group-config.loader.ts
│       │   │   └── wrapper-config.loader.ts
│       │   ├── processors/
│       │   │   ├── environment.processor.ts
│       │   │   ├── inheritance.processor.ts
│       │   │   └── validation.processor.ts
│       │   ├── registry/
│       │   │   └── config-registry.ts
│       │   └── cache/
│       │       └── config-cache.ts
│       ├── repositories/
│       │   ├── pool.repository.ts
│       │   ├── task-group.repository.ts
│       │   └── wrapper.repository.ts
│       ├── clients/
│       │   ├── cache/
│       │   │   └── client-cache.ts
│       │   ├── pools/
│       │   │   └── connection-pool.ts
│       │   └── adapters/
│       │       └── client-adapter.ts
│       ├── strategies/
│       │   ├── rotation/
│       │   │   ├── round-robin.strategy.ts
│       │   │   ├── weighted-random.strategy.ts
│       │   │   └── least-connections.strategy.ts
│       │   ├── fallback/
│       │   │   ├── echelon-down.strategy.ts
│       │   │   ├── group-fallback.strategy.ts
│       │   │   └── instance-rotation.strategy.ts
│       │   └── load-balancing/
│       │       ├── response-time.strategy.ts
│       │       └── resource-usage.strategy.ts
│       ├── monitoring/
│       │   ├── collectors/
│       │   │   ├── metrics.collector.ts
│       │   │   └── health.collector.ts
│       │   ├── checkers/
│       │   │   ├── pool.health-checker.ts
│       │   │   └── instance.health-checker.ts
│       │   └── alerting/
│       │       └── alert.manager.ts
│       └── index.ts
└── interfaces/
    └── llm/
        ├── controllers/
        │   ├── pool.controller.ts
        │   ├── task-group.controller.ts
        │   └── wrapper.controller.ts
        ├── dto/
        │   ├── pool.dto.ts
        │   ├── task-group.dto.ts
        │   └── wrapper.dto.ts
        └── index.ts
```

## 配置文件结构

```
configs/
├── llms/
│   ├── pools/
│   │   ├── fast-pool.toml
│   │   ├── thinking-pool.toml
│   │   ├── plan-pool.toml
│   │   └── high-concurrency-pool.toml
│   ├── task-groups/
│   │   ├── fast-group.toml
│   │   ├── thinking-group.toml
│   │   ├── plan-group.toml
│   │   ├── execute-group.toml
│   │   └── review-group.toml
│   ├── wrappers/
│   │   ├── pool-wrappers.toml
│   │   ├── task-group-wrappers.toml
│   │   └── direct-wrappers.toml
│   ├── strategies/
│   │   ├── rotation-strategies.toml
│   │   └── fallback-strategies.toml
│   └── _registry.toml
```

## 测试目录结构

```
src/
├── domain/
│   └── llm/
│       └── __tests__/
│           ├── entities/
│           │   ├── pool.test.ts
│           │   ├── task-group.test.ts
│           │   └── pool-instance.test.ts
│           ├── value-objects/
│           │   ├── rotation-strategy.test.ts
│           │   ├── echelon-config.test.ts
│           │   └── fallback-strategy.test.ts
│           ├── services/
│           │   ├── health-check.service.test.ts
│           │   └── metrics-collector.service.test.ts
│           └── exceptions/
│               └── pool.exceptions.test.ts
├── application/
│   └── llm/
│       └── __tests__/
│           ├── services/
│           │   ├── pool.service.test.ts
│           │   ├── task-group.service.test.ts
│           │   └── wrapper.service.test.ts
│           ├── factories/
│           │   ├── wrapper.factory.test.ts
│           │   └── client.factory.test.ts
│           └── use-cases/
│               ├── process-request.use-case.test.ts
│               └── manage-pool.use-case.test.ts
├── infrastructure/
│   └── llm/
│       └── __tests__/
│           ├── config/
│           │   ├── loaders/
│           │   │   └── pool-config.loader.test.ts
│           │   └── processors/
│           │       └── environment.processor.test.ts
│           ├── repositories/
│           │   └── pool.repository.test.ts
│           ├── strategies/
│           │   ├── rotation/
│           │   │   └── round-robin.strategy.test.ts
│           │   └── fallback/
│           │       └── echelon-down.strategy.test.ts
│           └── monitoring/
│               ├── collectors/
│               │   └── metrics.collector.test.ts
│               └── checkers/
│                   └── pool.health-checker.test.ts
└── interfaces/
    └── llm/
        └── __tests__/
            ├── controllers/
            │   ├── pool.controller.test.ts
            │   └── task-group.controller.test.ts
            └── dto/
                ├── pool.dto.test.ts
                └── task-group.dto.test.ts
```

## 命名约定

### 文件命名规则

#### 实体文件
- 使用单数形式：`pool.ts`、`task-group.ts`
- 避免使用后缀如`entity.ts`

#### 值对象文件
- 使用描述性名称：`rotation-strategy.ts`、`echelon-config.ts`
- 使用连字符分隔单词

#### 接口文件
- 以`.interface.ts`结尾：`pool-manager.interface.ts`
- 描述功能而非实现

#### 服务文件
- 以`.service.ts`结尾：`health-check.service.ts`
- 使用动词-名词模式

#### 工厂文件
- 以`.factory.ts`结尾：`wrapper.factory.ts`
- 明确创建的对象类型

#### 策略文件
- 以`.strategy.ts`结尾：`round-robin.strategy.ts`
- 描述具体策略

#### 控制器文件
- 以`.controller.ts`结尾：`pool.controller.ts`
- 对应管理的资源

### 类和方法命名规则

#### 实体类
- 使用PascalCase：`Pool`、`TaskGroup`
- 避免使用`Entity`后缀

#### 值对象类
- 使用描述性PascalCase：`RotationStrategy`、`EchelonConfig`
- 避免使用`ValueObject`后缀

#### 服务类
- 使用功能导向命名：`HealthCheckService`、`MetricsCollector`
- 避免使用`Manager`、`Handler`等模糊词汇

#### 方法命名
- 使用动词-名词模式：`processRequest`、`coordinateChanges`
- 避免使用`handle`、`manage`等泛化词汇

#### 策略类
- 使用具体策略名称：`RoundRobinStrategy`、`EchelonDownStrategy`
- 避免使用`Strategy`作为唯一标识

### 配置文件命名规则

#### 配置文件
- 使用连字符分隔：`fast-pool.toml`、`thinking-group.toml`
- 使用描述性名称

#### 注册表文件
- 以下划线开头：`_registry.toml`
- 表明系统级配置

## 模块依赖关系

### 依赖方向

```
Interfaces → Application → Domain ← Infrastructure
```

### 层内依赖规则

#### 领域层
- 实体可以依赖值对象
- 服务可以依赖实体和值对象
- 接口定义契约，不依赖具体实现

#### 应用层
- 服务可以依赖领域接口
- 用例协调多个领域服务
- 工厂创建领域对象

#### 基础设施层
- 仓储实现领域接口
- 配置加载器处理技术细节
- 策略实现领域定义的接口

#### 接口层
- 控制器依赖应用服务
- DTO用于数据传输
- 不包含业务逻辑

## 模块导出规则

### 索引文件

每个主要目录包含`index.ts`文件，导出公共接口：

```typescript
// domain/llm/index.ts
export * from './entities';
export * from './value-objects';
export * from './interfaces';
export * from './services';
```

### 导出原则

- 只导出必要的公共接口
- 避免导出实现细节
- 保持导出的稳定性

## 文档结构

```
docs/
└── infra/
    └── llm/
        ├── architecture-structure.md
        ├── polling-pools-and-task-groups-overview.md
        ├── implementation-guide.md
        ├── configuration-reference.md
        ├── monitoring-guide.md
        └── troubleshooting.md
```

## 总结

这个目录结构遵循以下原则：

1. **清晰的分层**：严格按照DDD架构分层
2. **功能导向**：按功能组织代码，而非技术层面
3. **命名一致**：遵循统一的命名约定
4. **依赖清晰**：明确的依赖方向和规则
5. **测试完整**：每个模块都有对应的测试

通过这种结构，可以确保代码的可维护性、可扩展性和团队协作效率。