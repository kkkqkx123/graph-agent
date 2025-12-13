# 依赖注入容器架构

## 概述

本目录包含了Modular Agent Framework的分层依赖注入容器实现，支持基础设施层、应用层和接口层的分层容器架构。

## 架构设计

### 分层容器结构

```
InterfaceContainer (接口层容器)
    ↓
ApplicationContainer (应用层容器)
    ↓
InfrastructureContainer (基础设施层容器)
```

### 核心组件

1. **容器接口** (`IContainer`): 定义容器的基本操作
2. **基础容器** (`BaseContainer`): 提供容器的基础实现
3. **分层容器**:
   - `InfrastructureContainer`: 管理基础设施层服务
   - `ApplicationContainer`: 管理应用层服务
   - `InterfaceContainer`: 管理接口层服务
4. **服务绑定**: 每个层次有独立的服务绑定类
5. **容器引导器** (`ContainerBootstrap`): 负责创建和初始化分层容器

## 生命周期管理

支持三种服务生命周期：

- **SINGLETON**: 整个应用程序生命周期内只有一个实例
- **TRANSIENT**: 每次请求都创建新实例
- **SCOPED**: 每个作用域内一个实例

## 使用方法

### 创建分层容器

```typescript
import { ContainerBootstrap } from './container';

// 创建分层容器
const containers = ContainerBootstrap.createContainers(config);
const { infrastructure, application, interface: interfaceContainer } = containers;

// 使用接口层容器获取服务
const app = interfaceContainer.get<Application>('Application');
```

### 向后兼容

```typescript
import { Container } from './container';

// 使用传统方式创建容器
const container = new Container();
container.register('Service', ServiceClass);
const service = container.get<Service>('Service');
```

## 服务绑定

### 基础设施层服务绑定

位于 `./bindings/infrastructure-bindings.ts`，包含：
- LoggerServiceBindings: 日志服务
- ConfigServiceBindings: 配置管理服务
- DatabaseServiceBindings: 数据库服务
- CacheServiceBindings: 缓存服务
- LLMServiceBindings: LLM服务

### 应用层服务绑定

位于 `./bindings/application-bindings.ts`，包含：
- WorkflowServiceBindings: 工作流服务
- SessionServiceBindings: 会话服务
- ToolServiceBindings: 工具服务
- StateServiceBindings: 状态管理服务
- HistoryServiceBindings: 历史记录服务
- WorkflowExecutorBindings: 工作流执行器

### 接口层服务绑定

位于 `./bindings/interface-bindings.ts`，包含：
- HTTPServiceBindings: HTTP服务
- CLIServiceBindings: CLI服务
- RequestContextBindings: 请求上下文
- ApiControllerBindings: API控制器

## 扩展指南

### 添加新的服务绑定

1. 创建继承自 `ServiceBindings` 的绑定类
2. 实现 `registerServices` 方法
3. 在相应的容器中调用绑定类

```typescript
export class MyServiceBindings extends ServiceBindings {
  registerServices(container: IContainer, config: ContainerConfiguration): void {
    container.registerFactory<IMyService>(
      'IMyService',
      () => new MyService(config.myService),
      { lifetime: ServiceLifetime.SINGLETON }
    );
  }
}
```

### 添加新的生命周期

1. 在 `ServiceLifetime` 枚举中添加新的生命周期类型
2. 在 `BaseContainer.resolveInstance` 方法中添加处理逻辑
3. 在相应的容器类中实现生命周期管理

## 注意事项

1. 所有服务绑定目前都是TODO状态，需要根据实际需求实现
2. 自动依赖解析功能尚未实现，需要手动解析依赖
3. 循环依赖检测功能尚未实现
4. 配置驱动的服务绑定功能尚未实现

## 迁移指南

从旧容器迁移到新分层容器：

1. 将服务注册代码移到相应的服务绑定类中
2. 使用 `ContainerBootstrap.createContainers()` 创建分层容器
3. 根据服务所在的层次选择合适的容器进行服务注册和获取

## 性能考虑

1. 单例服务在首次创建后会被缓存，后续获取直接返回缓存实例
2. 瞬态服务每次都会创建新实例，需要注意性能影响
3. 作用域服务在作用域内会被缓存，作用域结束时会被清理
4. 容器层次查找可能会有一定的性能开销，建议在合适的层次注册服务