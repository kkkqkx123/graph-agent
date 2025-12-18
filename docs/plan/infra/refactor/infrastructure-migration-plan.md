# 基础设施层重构迁移方案

## 迁移概述

本文档详细描述了基础设施层重构的具体迁移方案，包括功能迁移清单、新目录结构设计和分阶段执行计划。

## 功能迁移清单

### 1. 需要从 Infrastructure 迁移到 Application 的功能

#### 1.1 Workflow 模块业务逻辑
- **工作流函数实现**: 所有 `workflow/functions/builtin/` 目录下的具体函数实现
- **节点执行逻辑**: `workflow/nodes/executors/` 目录下的业务执行逻辑
- **条件评估逻辑**: `workflow/edges/evaluators/` 目录下的业务规则实现
- **执行策略**: `workflow/strategies/` 目录下的业务策略

#### 1.2 Tools 模块业务逻辑
- **工具管理逻辑**: 工具的生命周期管理、权限验证
- **工具执行协调**: 工具调用的事务管理和错误处理
- **工具依赖解析**: 工具间依赖关系的分析和解析

#### 1.3 Checkpoints 模块业务逻辑
- **检查点策略**: 检查点创建时机、频率策略
- **备份策略**: 备份触发条件、保留策略
- **恢复逻辑**: 检查点恢复的业务规则

### 2. 需要在 Infrastructure 层重构的功能

#### 2.1 执行引擎统一
- **函数注册表**: 合并 tools 和 workflow 的注册表功能
- **执行器管理**: 统一各类执行器的管理接口
- **执行上下文**: 标准化执行上下文的传递机制

#### 2.2 持久化抽象
- **存储接口**: 统一的存储抽象接口
- **索引管理**: 标准化的索引创建和维护
- **事务管理**: 跨存储的事务一致性保证

#### 2.3 配置管理
- **加载器统一**: 合并各类配置加载逻辑
- **依赖注入**: 标准化的依赖注入机制
- **环境适配**: 多环境配置的适配逻辑

## 新目录结构设计

### 1. Application 层新结构

```
src/application/
├── workflow/
│   ├── functions/
│   │   ├── builtin/           # 从 infrastructure 迁移
│   │   │   ├── conditions/
│   │   │   ├── nodes/
│   │   │   ├── routing/
│   │   │   └── triggers/
│   │   ├── factories/         # 函数工厂
│   │   └── collections/       # 函数集合管理
│   ├── execution/
│   │   ├── executors/         # 从 infrastructure 迁移
│   │   ├── strategies/        # 从 infrastructure 迁移
│   │   └── coordinators/      # 执行协调逻辑
│   ├── edges/
│   │   └── evaluators/        # 从 infrastructure 迁移
│   └── services/
│       ├── workflow-service.ts
│       ├── execution-service.ts
│       └── validation-service.ts
├── tools/
│   ├── management/
│   │   ├── tool-manager.ts    # 工具生命周期管理
│   │   ├── permission-service.ts
│   │   └── dependency-resolver.ts
│   ├── execution/
│   │   ├── coordinator.ts     # 工具执行协调
│   │   ├── transaction-manager.ts
│   │   └── error-handler.ts
│   └── services/
│       ├── tool-service.ts
│       └── registry-service.ts
├── checkpoints/
│   ├── management/
│   │   ├── checkpoint-manager.ts
│   │   ├── backup-strategy.ts
│   │   └── restoration-service.ts
│   ├── policies/
│   │   ├── creation-policy.ts
│   │   ├── retention-policy.ts
│   │   └── cleanup-policy.ts
│   └── services/
│       ├── checkpoint-service.ts
│       └── backup-service.ts
└── prompts/
    ├── management/
    │   ├── prompt-manager.ts
    │   └── template-service.ts
    └── services/
        └── prompt-service.ts
```

### 2. Infrastructure 层新结构

```
src/infrastructure/
├── execution/
│   ├── engine/
│   │   ├── execution-engine.ts
│   │   ├── execution-context.ts
│   │   └── execution-result.ts
│   ├── registry/
│   │   ├── function-registry.ts
│   │   ├── executor-registry.ts
│   │   └── type-registry.ts
│   ├── executors/
│   │   ├── base-executor.ts
│   │   ├── builtin-executor.ts
│   │   ├── mcp-executor.ts
│   │   ├── native-executor.ts
│   │   └── rest-executor.ts
│   └── adapters/
│       ├── parameter-adapter.ts
│       ├── result-adapter.ts
│       └── context-adapter.ts
├── persistence/
│   ├── interfaces/
│   │   ├── repository.ts
│   │   ├── storage.ts
│   │   ├── indexing.ts
│   │   └── transaction.ts
│   ├── repositories/
│   │   ├── base-repository.ts
│   │   ├── workflow-repository.ts
│   │   ├── tool-repository.ts
│   │   ├── checkpoint-repository.ts
│   │   └── prompt-repository.ts
│   ├── storage/
│   │   ├── memory-storage.ts
│   │   ├── file-storage.ts
│   │   ├── database-storage.ts
│   │   └── cache-storage.ts
│   ├── indexing/
│   │   ├── memory-index.ts
│   │   ├── database-index.ts
│   │   └── search-index.ts
│   └── transactions/
│       ├── transaction-manager.ts
│       └── unit-of-work.ts
├── configuration/
│   ├── loaders/
│   │   ├── config-loader.ts
│   │   ├── file-loader.ts
│   │   ├── env-loader.ts
│   │   └── remote-loader.ts
│   ├── injectors/
│   │   ├── dependency-injector.ts
│   │   ├── service-locator.ts
│   │   └── container.ts
│   └── adapters/
│       ├── environment-adapter.ts
│       └── feature-flag-adapter.ts
└── common/
    ├── logging/
    │   ├── logger.ts
    │   └── log-formatter.ts
    ├── monitoring/
    │   ├── metrics.ts
    │   └── health-check.ts
    └── utilities/
        ├── serializer.ts
        ├── validator.ts
        └── mapper.ts
```

## 分阶段执行方案

### 第一阶段：基础架构搭建（2-3周）

#### 目标
建立新的基础设施层核心抽象和接口

#### 具体任务
1. **创建执行引擎框架**
   - 定义 IExecutionEngine 接口
   - 实现 ExecutionEngine 基础框架
   - 创建 ExecutionContext 和 ExecutionResult 类型

2. **建立持久化抽象**
   - 定义 IRepository、IStorage、IIndexing 接口
   - 实现基础存储抽象
   - 创建事务管理框架

3. **设计配置管理系统**
   - 统一配置加载接口
   - 实现依赖注入容器
   - 建立环境适配机制

#### 交付物
- 新的基础设施层目录结构
- 核心接口和抽象类定义
- 基础框架实现

### 第二阶段：执行引擎统一（3-4周）

#### 目标
合并和重构现有的执行相关功能

#### 具体任务
1. **统一函数注册表**
   - 合并 tools 和 workflow 的 FunctionRegistry
   - 实现新的统一注册机制
   - 迁移现有函数注册逻辑

2. **重构执行器管理**
   - 标准化执行器接口
   - 统一执行器注册和发现机制
   - 实现执行器生命周期管理

3. **优化执行上下文**
   - 标准化执行上下文传递
   - 实现上下文隔离和安全机制
   - 优化性能和资源管理

#### 交付物
- 统一的执行引擎实现
- 重构后的注册表和执行器
- 标准化的执行上下文机制

### 第三阶段：业务逻辑迁移（4-5周）

#### 目标
将业务逻辑从 Infrastructure 层迁移到 Application 层

#### 具体任务
1. **迁移 Workflow 业务逻辑**
   - 迁移 builtin 函数到 application/workflow/functions
   - 迁移执行器到 application/workflow/execution
   - 迁移评估器到 application/workflow/edges
   - 更新相关服务和依赖

2. **迁移 Tools 业务逻辑**
   - 创建工具管理服务
   - 实现工具执行协调逻辑
   - 建立依赖解析机制

3. **迁移 Checkpoints 业务逻辑**
   - 实现检查点管理服务
   - 建立备份和恢复策略
   - 创建策略管理框架

#### 交付物
- 完整的 Application 层业务逻辑
- 更新的服务接口和实现
- 业务逻辑与基础设施的清晰分离

### 第四阶段：持久化重构（2-3周）

#### 目标
重构现有的持久化实现，使用新的抽象框架

#### 具体任务
1. **重构 Repository 实现**
   - 使用新的 IRepository 接口重构现有实现
   - 优化查询和索引性能
   - 统一事务处理机制

2. **优化存储实现**
   - 实现多种存储后端支持
   - 优化缓存策略
   - 建立数据一致性保证

3. **完善索引系统**
   - 实现高效的数据索引
   - 优化搜索性能
   - 建立索引维护机制

#### 交付物
- 重构后的持久化层实现
- 优化的存储和索引系统
- 完善的事务管理机制

### 第五阶段：配置和工具完善（2-3周）

#### 目标
完善配置管理和工具支持

#### 具体任务
1. **完善配置管理**
   - 实现多环境配置支持
   - 建立配置验证机制
   - 优化配置加载性能

2. **优化工具支持**
   - 完善开发工具集成
   - 建立调试和监控机制
   - 优化错误处理和日志

3. **性能优化**
   - 识别和解决性能瓶颈
   - 优化内存使用
   - 建立性能监控机制

#### 交付物
- 完善的配置管理系统
- 优化的开发工具支持
- 性能优化和监控机制

### 第六阶段：测试和文档（2-3周）

#### 目标
确保重构质量和可维护性

#### 具体任务
1. **完善测试覆盖**
   - 为新架构编写单元测试
   - 建立集成测试框架
   - 实现端到端测试

2. **更新文档**
   - 更新架构文档
   - 编写迁移指南
   - 创建最佳实践文档

3. **性能验证**
   - 进行性能基准测试
   - 验证系统稳定性
   - 优化关键路径

#### 交付物
- 完整的测试套件
- 更新的文档和指南
- 性能验证报告

## 风险管控

### 技术风险
1. **兼容性风险**: 通过渐进式迁移和适配器模式降低风险
2. **性能风险**: 通过基准测试和性能监控及时发现和解决问题
3. **稳定性风险**: 通过分阶段部署和回滚机制保证系统稳定

### 项目风险
1. **时间风险**: 预留缓冲时间，关键路径并行处理
2. **资源风险**: 合理分配开发资源，关键模块优先
3. **沟通风险**: 建立定期沟通机制，确保信息同步

## 成功标准

1. **架构质量**: 清晰的分层架构，职责明确，依赖关系清晰
2. **代码质量**: 减少代码重复，提高可维护性和可扩展性
3. **性能指标**: 不低于现有性能，关键指标有所提升
4. **开发效率**: 提高开发效率，降低维护成本

这个迁移方案将确保基础设施层重构的顺利进行，同时最小化对现有系统的影响。