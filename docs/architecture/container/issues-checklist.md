# 依赖注入容器架构问题清单

## 问题分类概览

| 问题类别 | 问题数量 | 严重程度 |
|---------|---------|---------|
| 分层依赖违反 | 2 | 严重 |
| 服务注册混乱 | 2 | 中等 |
| 功能不完整 | 2 | 中等 |
| 代码规范 | 2 | 轻微 |

---

## 一、分层依赖违反问题（严重）

### 问题1.1: Application层注册Infrastructure层服务

**位置**: `src/application/container/bindings/application-workflow-bindings.ts:26-37`

**问题描述**:
Application层的绑定类中注册了Infrastructure层的服务实现，违反了分层架构原则。

**具体代码**:
```typescript
// 注册图算法服务（基础设施层服务）
container.registerFactory<GraphAlgorithmService>(
  'GraphAlgorithmService',
  () => new GraphAlgorithmServiceImpl(),
  { lifetime: ServiceLifetime.SINGLETON }
);

// 注册图验证服务（基础设施层服务）
container.registerFactory<GraphValidationServiceImpl>(
  'GraphValidationService',
  () => new GraphValidationServiceImpl(),
  { lifetime: ServiceLifetime.SINGLETON }
);
```

**修改方案**:
1. 将 `GraphAlgorithmService` 和 `GraphValidationService` 的注册移到 `InfrastructureContainer`
2. 在 `infrastructure-workflow-bindings.ts` 中添加这两个服务的注册
3. 从 `ApplicationWorkflowBindings` 中删除这些注册代码

---

### 问题1.2: Application层注册Infrastructure层执行器

**位置**: `src/application/container/bindings/application-workflow-bindings.ts:50-65`

**问题描述**:
Application层的 `ThreadCoordinatorInfrastructureService` 依赖了Infrastructure层的执行器组件，这些组件已经在Infrastructure层注册。

**具体代码**:
```typescript
container.registerFactory<ThreadCoordinatorInfrastructureService>(
  'ThreadCoordinatorService',
  () => new ThreadCoordinatorInfrastructureService(
    container.get('ThreadRepository'),
    container.get('ThreadLifecycleService'),
    container.get('ThreadDefinitionRepository'),
    container.get('ThreadExecutionRepository'),
    container.get('NodeExecutor'),      // Infrastructure层
    container.get('EdgeExecutor'),      // Infrastructure层
    container.get('EdgeEvaluator'),     // Infrastructure层
    container.get('NodeRouter'),        // Infrastructure层
    container.get('HookExecutor'),      // Infrastructure层
    container.get('Logger')
  ),
  { lifetime: ServiceLifetime.SINGLETON }
);
```

**修改方案**:
1. 将 `ThreadCoordinatorInfrastructureService` 的注册移到 `InfrastructureContainer`
2. 确保所有依赖的执行器在Infrastructure层已正确注册
3. 从 `ApplicationWorkflowBindings` 中删除此注册代码

---

## 二、服务注册混乱问题（中等）

### 问题2.1: 服务注册位置不统一

**位置**: 多个绑定文件

**问题描述**:
Infrastructure层的服务分散在Application层和Infrastructure层注册，导致维护困难。

**当前状态**:
- `GraphAlgorithmService` - 注册在Application层 ❌
- `GraphValidationService` - 注册在Application层 ❌
- `ThreadCoordinatorInfrastructureService` - 注册在Application层 ❌
- `NodeExecutor`, `EdgeExecutor` 等 - 注册在Infrastructure层 ✅

**修改方案**:
1. 制定服务注册位置规则：
   - Infrastructure层实现 → InfrastructureContainer
   - Application层服务 → ApplicationContainer
   - Interface层适配器 → InterfaceContainer
2. 将所有Infrastructure层服务统一移到InfrastructureContainer
3. 更新相关文档和注释

---

### 问题2.2: ApplicationContainer未实现服务绑定

**位置**: `src/application/container/application-container.ts:23-26`

**问题描述**:
ApplicationContainer的 `registerApplicationServices()` 方法为空，应用层服务没有被注册。

**具体代码**:
```typescript
private registerApplicationServices(): void {
  // 注册应用层服务
  // TODO: 实现具体的服务绑定
}
```

**修改方案**:
1. 实现 `registerApplicationServices()` 方法
2. 调用应用层的服务绑定类：
   - `WorkflowServiceBindings`
   - `SessionServiceBindings`
   - `PromptServiceBindings`
3. 确保所有应用层服务都被正确注册

---

## 三、功能不完整问题（中等）

### 问题3.1: ContainerBootstrap临时解决方案

**位置**: `src/infrastructure/container/container.ts:329-334`

**问题描述**:
InterfaceContainer的实现存在问题，使用了临时的null解决方案，导致接口层无法正常使用。

**具体代码**:
```typescript
// 创建接口容器
// TODO: 修复ApplicationContainer实现IContainer接口
// const interfaceContainer = new InterfaceContainer(
//   applicationContainer,
//   config
// );
const interfaceContainer = null as any;
```

**修改方案**:
1. 确保 `ApplicationContainer` 正确实现了 `IContainer` 接口
2. 移除临时解决方案，正确创建 `InterfaceContainer`
3. 测试InterfaceContainer的功能完整性

---

### 问题3.2: 自动依赖解析未实现

**位置**: `src/infrastructure/container/container.ts:225-229`

**问题描述**:
自动依赖解析功能未实现，导致无法自动注入构造函数依赖。

**具体代码**:
```typescript
if (registration.implementation) {
  // TODO: 实现自动依赖解析
  // const dependencies = this.resolveDependencies(registration.implementation);
  // return new registration.implementation(...dependencies);
  return new registration.implementation();
}
```

**修改方案**:
1. 实现 `resolveDependencies()` 方法
2. 使用TypeScript反射获取构造函数参数类型
3. 根据参数类型从容器中解析依赖
4. 更新文档说明使用方法

---

## 四、代码规范问题（轻微）

### 问题4.1: 服务键命名不一致

**位置**: 多个绑定文件

**问题描述**:
服务键的命名方式不统一，有的使用接口名称，有的使用类名，有的使用服务名称。

**示例**:
```typescript
// 接口名称
'ILogger', 'IConfigManager'

// 类名
'Logger', 'GraphAlgorithmService'

// 服务名称
'SessionOrchestrationService'
```

**修改方案**:
1. 制定统一的命名规范：
   - 接口类型: `I{ServiceName}`
   - 服务类型: `{ServiceName}`
2. 定义服务键常量，避免硬编码
3. 重构所有服务键，统一命名风格

---

### 问题4.2: 缺少服务注册验证

**位置**: 所有绑定文件

**问题描述**:
在注册服务时没有验证依赖是否已注册，可能导致运行时错误。

**修改方案**:
1. 在注册服务前验证依赖是否已注册
2. 提供清晰的错误信息
3. 在容器初始化时进行完整性检查

---

## 修改优先级

### 高优先级（立即修复）
1. 问题1.1: Application层注册Infrastructure层服务
2. 问题1.2: Application层注册Infrastructure层执行器
3. 问题3.1: ContainerBootstrap临时解决方案

### 中优先级（近期修复）
4. 问题2.1: 服务注册位置不统一
5. 问题2.2: ApplicationContainer未实现服务绑定
6. 问题3.2: 自动依赖解析未实现

### 低优先级（逐步改进）
7. 问题4.1: 服务键命名不一致
8. 问题4.2: 缺少服务注册验证

---

## 修改步骤建议

### 第一阶段：修复严重问题
1. 将 `GraphAlgorithmService` 和 `GraphValidationService` 移到InfrastructureContainer
2. 将 `ThreadCoordinatorInfrastructureService` 移到InfrastructureContainer
3. 修复ContainerBootstrap，正确创建InterfaceContainer

### 第二阶段：统一服务注册
1. 实现ApplicationContainer的服务绑定
2. 确保所有服务注册在正确的容器中
3. 更新相关文档

### 第三阶段：完善功能
1. 实现自动依赖解析
2. 添加服务注册验证
3. 完善错误处理

### 第四阶段：代码规范
1. 统一服务键命名
2. 定义服务键常量
3. 更新代码规范文档

---

## 验证清单

修改完成后，请验证：

- [ ] 所有Infrastructure层服务都在InfrastructureContainer中注册
- [ ] 所有Application层服务都在ApplicationContainer中注册
- [ ] 所有Interface层适配器都在InterfaceContainer中注册
- [ ] 没有跨层注册的情况
- [ ] InterfaceContainer能够正常创建和使用
- [ ] 服务键命名统一规范
- [ ] 没有循环依赖
- [ ] 所有依赖都能正确解析
- [ ] 容器初始化没有错误
- [ ] 单元测试通过

---

## 相关文档

- [依赖注入容器架构分析](./dependency-injection-container-analysis.md)
- [依赖注入容器代码规范](./dependency-injection-container-specification.md)