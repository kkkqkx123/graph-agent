# 日志系统架构设计

## 概述

本文档描述了Modular Agent Framework的新日志系统架构设计，该系统基于Winston实现，提供统一的日志记录、格式化和输出功能。

## 当前问题分析

### 1. 日志使用分散且不一致
- **直接console调用**：在57个位置直接使用console.log/error/warn，分布在各个层级
- **ILogger接口使用**：在198个位置使用ILogger，主要集中在配置系统
- **混合使用**：同一模块中可能同时存在两种日志方式

### 2. 缺乏统一的日志实现
- 虽然定义了ILogger接口，但没有找到具体的Winston实现类
- 依赖注入容器中的日志服务绑定被注释掉
- 导致许多模块无法获取标准化的日志实例

### 3. 架构层级混乱
- Domain层（业务逻辑）直接使用console，违反了DDD原则
- Infrastructure层（基础设施）混合使用两种日志方式
- Application层（应用服务）正确使用ILogger，但依赖不完整

## 新架构设计

### 1. 目录结构

```
src/infrastructure/logging/
├── index.ts                    # 导出所有日志相关组件
├── logger.ts                   # Winston日志记录器实现
├── logger-factory.ts           # 日志工厂
├── logger-config.ts            # 日志配置
├── interfaces/                 # 接口定义
│   ├── index.ts
│   ├── logger-config.interface.ts
│   └── logger-transport.interface.ts
├── formatters/                 # 格式化器
│   ├── index.ts
│   ├── base-formatter.ts
│   ├── json-formatter.ts
│   └── text-formatter.ts
├── transports/                 # 传输器
│   ├── index.ts
│   ├── base-transport.ts
│   ├── console-transport.ts
│   └── file-transport.ts
└── utils/                      # 工具类
    ├── index.ts
    ├── log-level.utils.ts
    └── sensitive-data.utils.ts
```

### 2. 核心组件设计

#### 2.1 日志记录器 (Logger)

基于Winston的ILogger接口实现，提供：
- 多级别日志记录（trace, debug, info, warn, error, fatal）
- 上下文支持和子日志记录器
- 敏感信息脱敏
- 性能优化的异步日志记录

#### 2.2 日志工厂 (LoggerFactory)

负责创建和配置日志记录器实例：
- 单例模式确保配置一致性
- 支持多种传输器组合
- 动态配置更新
- 依赖注入集成

#### 2.3 日志配置 (LoggerConfig)

集中管理日志系统配置：
- 支持从global.toml加载配置
- 环境变量覆盖
- 多环境配置支持
- 运行时配置更新

#### 2.4 格式化器 (Formatters)

提供多种日志格式：
- JSON格式：结构化日志，便于分析
- 文本格式：人类可读的日志
- 自定义格式：支持扩展

#### 2.5 传输器 (Transports)

支持多种日志输出方式：
- 控制台输出：开发环境使用
- 文件输出：生产环境持久化
- 远程日志：未来扩展支持

### 3. 分层日志策略

#### 3.1 Infrastructure层
- 记录技术细节（HTTP请求、数据库操作、配置加载）
- 使用DEBUG级别记录详细技术信息
- 记录系统启动、关闭等生命周期事件

#### 3.2 Application层
- 记录业务流程（服务初始化、用例执行）
- 使用INFO级别记录业务操作
- 记录服务间调用和依赖关系

#### 3.3 Domain层
- 仅记录关键业务事件（通过依赖注入获取ILogger）
- 使用WARN及以上级别记录异常情况
- 避免记录技术实现细节

### 4. 配置驱动设计

#### 4.1 配置结构

```toml
# 日志输出配置
[[log_outputs]]
type = "console"
level = "DEBUG"
format = "text"

[[log_outputs]]
type = "file"
level = "INFO"
format = "json"
path = "logs/agent.log"
rotation = "daily"
max_size = "10MB"
```

#### 4.2 环境变量支持

- `AGENT_LOG_LEVEL`: 覆盖全局日志级别
- `AGENT_LOG_FORMAT`: 覆盖日志格式
- `AGENT_LOG_FILE`: 覆盖日志文件路径

### 5. 依赖注入集成

#### 5.1 服务绑定

```typescript
export class LoggerServiceBindings extends ServiceBindings {
  registerServices(container: IContainer, config: ContainerConfiguration): void {
    container.registerFactory<ILogger>(
      'ILogger',
      () => LoggerFactory.createLogger(config.logger),
      { lifetime: ServiceLifetime.SINGLETON }
    );
  }
}
```

#### 5.2 使用方式

```typescript
// 在构造函数中注入
constructor(@inject('ILogger') private logger: ILogger) {}

// 使用日志记录器
this.logger.info('服务初始化完成', { service: 'WorkflowService' });
```

## 实施计划

### 阶段1：基础框架实现
1. 创建日志接口和配置
2. 实现Winston日志记录器
3. 创建日志工厂和格式化器
4. 实现基础传输器

### 阶段2：依赖注入集成
1. 更新容器绑定
2. 集成配置系统
3. 实现动态配置更新

### 阶段3：迁移现有日志
1. 识别所有console调用
2. 逐步替换为ILogger
3. 更新各层级的日志策略

### 阶段4：高级功能
1. 实现日志轮转
2. 添加敏感信息脱敏
3. 支持远程日志传输

## 预期收益

### 1. 架构一致性
- 符合DDD分层架构原则
- Infrastructure层负责所有技术基础设施
- 清晰的依赖关系：Domain → Application → Infrastructure

### 2. 维护性提升
- 单一位置管理日志配置和实现
- 统一的日志格式和输出方式
- 便于添加新的日志功能

### 3. 测试友好
- 可以轻松模拟日志接口进行单元测试
- 避免测试中的console输出问题
- 支持日志断言验证

### 4. 性能优化
- 集中的日志级别控制
- 异步日志写入
- 智能日志采样和聚合

## 总结

新的日志系统架构将解决当前日志使用混乱的问题，提供统一、可配置、高性能的日志记录功能。通过集中管理和分层策略，确保日志系统符合项目的架构原则，并为未来的扩展提供良好的基础。