# CLI应用目录结构设计

## 一、设计原则

### 1.1 分层架构约束
- **Application层**：只包含应用模块，负责协调服务、处理用户交互
- **Infrastructure层**：提供技术实现（配置加载、命令行解析等）
- **Domain层**：提供领域定义和业务规则
- **Services层**：提供业务逻辑实现

### 1.2 CLI应用职责
- 命令行参数解析（委托给Infrastructure层）
- 命令路由和分发
- 调用Services层服务
- 输出执行结果
- 错误处理和用户提示

### 1.3 禁止事项
- ❌ 在Application层实现配置加载（应使用Infrastructure层的ConfigLoadingModule）
- ❌ 在Application层实现文件IO（应使用Infrastructure层的工具）
- ❌ 在Application层实现命令行解析库（应使用Infrastructure层或原生API）
- ❌ 在Application层实现技术细节

## 二、CLI应用目录结构

### 2.1 完整目录结构

```
src/
├── application/
│   ├── cli/                                    # CLI应用模块
│   │   ├── index.ts                            # CLI入口
│   │   ├── cli-application.ts                  # CLI应用主类
│   │   ├── command-router.ts                   # 命令路由器
│   │   ├── handlers/                           # 命令处理器
│   │   │   ├── index.ts                        # 处理器导出
│   │   │   ├── session-handler.ts              # Session命令处理器
│   │   │   ├── thread-handler.ts               # Thread命令处理器
│   │   │   ├── workflow-handler.ts             # Workflow命令处理器
│   │   │   ├── config-handler.ts               # 配置命令处理器
│   │   │   └── demo-handler.ts                 # 演示命令处理器
│   │   └── dto/                                # 数据传输对象
│   │       ├── index.ts                        # DTO导出
│   │       ├── command-result.ts               # 命令结果DTO
│   │       ├── session-dto.ts                  # Session DTO
│   │       ├── thread-dto.ts                   # Thread DTO
│   │       └── workflow-dto.ts                 # Workflow DTO
│   ├── common/
│   │   └── application.ts                      # Application类（需更新）
│   └── index.ts                                # Application层导出
│
├── infrastructure/
│   ├── cli/                                    # CLI基础设施（新增）
│   │   ├── index.ts                            # CLI基础设施导出
│   │   ├── command-parser.ts                   # 命令行参数解析器
│   │   ├── command-validator.ts                # 命令参数验证器
│   │   ├── scenario-loader.ts                  # 演示场景加载器
│   │   └── scenario-executor.ts                # 演示场景执行器
│   │
│   ├── workflow/                               # Workflow基础设施（新增）
│   │   ├── index.ts                            # Workflow基础设施导出
│   │   ├── workflow-config-loader.ts           # Workflow配置加载器
│   │   └── workflow-config-validator.ts        # Workflow配置验证器
│   │
│   ├── config/                                 # 配置基础设施（已有）
│   ├── common/                                 # 通用基础设施（已有）
│   ├── logging/                                # 日志基础设施（已有）
│   ├── persistence/                            # 持久化基础设施（已有）
│   └── llm/                                    # LLM基础设施（已有）
│
├── services/
│   ├── workflow/                               # 工作流服务（已有）
│   │   ├── workflow-lifecycle.ts
│   │   ├── workflow-management.ts
│   │   ├── workflow-execution.ts
│   │   └── workflow-config-management.ts       # 新增：Workflow配置管理服务
│   ├── sessions/                               # 会话服务（已有）
│   ├── threads/                                # 线程服务（已有）
│   ├── checkpoints/                            # 检查点服务（已有）
│   ├── llm/                                    # LLM服务（已有）
│   ├── tools/                                  # 工具服务（已有）
│   └── state/                                  # 状态服务（已有）
│
└── domain/                                     # 领域层（已有）
    ├── common/
    ├── workflow/
    ├── sessions/
    ├── threads/
    ├── tools/
    ├── llm/
    ├── prompts/
    └── state/
```

### 2.2 CLI应用模块详细说明

#### 2.2.1 CLI入口（`src/application/cli/index.ts`）
```typescript
/**
 * CLI应用入口
 *
 * 职责：
 * - 解析命令行参数（委托给Infrastructure层的CommandParser）
 * - 初始化CLI应用
 * - 路由到对应的命令处理器
 * - 处理错误和异常
 */
```

#### 2.2.2 CLI应用主类（`src/application/cli/cli-application.ts`）
```typescript
/**
 * CLI应用主类
 *
 * 职责：
 * - 管理CLI应用生命周期
 * - 初始化命令路由器
 * - 协调命令处理器
 * - 处理应用级错误
 */
```

#### 2.2.3 命令路由器（`src/application/cli/command-router.ts`）
```typescript
/**
 * 命令路由器
 *
 * 职责：
 * - 根据命令名称路由到对应的处理器
 * - 管理命令处理器注册
 * - 提供命令帮助信息
 */
```

#### 2.2.4 命令处理器（`src/application/cli/handlers/`）

**SessionHandler**（`session-handler.ts`）
```typescript
/**
 * Session命令处理器
 *
 * 职责：
 * - 处理Session相关命令
 * - 调用SessionLifecycle和SessionManagement服务
 * - 输出执行结果
 *
 * 命令：
 * - session create
 * - session list
 * - session get
 * - session activate
 * - session suspend
 * - session terminate
 */
```

**ThreadHandler**（`thread-handler.ts`）
```typescript
/**
 * Thread命令处理器
 *
 * 职责：
 * - 处理Thread相关命令
 * - 调用ThreadLifecycle和ThreadManagement服务
 * - 输出执行结果
 *
 * 命令：
 * - thread create
 * - thread list
 * - thread get
 * - thread execute
 * - thread pause
 * - thread resume
 */
```

**WorkflowHandler**（`workflow-handler.ts`）
```typescript
/**
 * Workflow命令处理器
 *
 * 职责：
 * - 处理Workflow查询命令（只读）
 * - 调用WorkflowConfigManagement服务
 * - 输出执行结果
 *
 * 命令：
 * - workflow list
 * - workflow get
 * - workflow validate
 */
```

**ConfigHandler**（`config-handler.ts`）
```typescript
/**
 * 配置命令处理器
 *
 * 职责：
 * - 处理配置相关命令
 * - 调用ConfigManager服务
 * - 输出执行结果
 *
 * 命令：
 * - config list
 * - config get
 * - config set
 * - config validate
 */
```

**DemoHandler**（`demo-handler.ts`）
```typescript
/**
 * 演示命令处理器
 *
 * 职责：
 * - 处理演示场景命令
 * - 调用ScenarioExecutor服务
 * - 输出执行结果
 *
 * 命令：
 * - demo <scenario-name>
 * - demo list
 */
```

#### 2.2.5 DTO（`src/application/cli/dto/`）

**CommandResult**（`command-result.ts`）
```typescript
/**
 * 命令结果DTO
 *
 * 职责：
 * - 封装命令执行结果
 * - 包含成功/失败状态
 * - 包含输出数据
 * - 包含错误信息
 */
```

**SessionDTO**（`session-dto.ts`）
```typescript
/**
 * Session数据传输对象
 *
 * 职责：
 * - 封装Session信息
 * - 用于CLI输出
 */
```

**ThreadDTO**（`thread-dto.ts`）
```typescript
/**
 * Thread数据传输对象
 *
 * 职责：
 * - 封装Thread信息
 * - 用于CLI输出
 */
```

**WorkflowDTO**（`workflow-dto.ts`）
```typescript
/**
 * Workflow数据传输对象
 *
 * 职责：
 * - 封装Workflow配置信息
 * - 用于CLI输出
 */
```

### 2.3 Infrastructure层新增模块详细说明

#### 2.3.1 CLI基础设施（`src/infrastructure/cli/`）

**CommandParser**（`command-parser.ts`）
```typescript
/**
 * 命令行参数解析器
 *
 * 职责：
 * - 解析命令行参数
 * - 验证参数格式
 * - 提取命令和参数
 *
 * 技术实现：
 * - 使用Node.js原生process.argv
 * - 不引入额外依赖
 */
```

**CommandValidator**（`command-validator.ts`）
```typescript
/**
 * 命令参数验证器
 *
 * 职责：
 * - 验证命令参数
 * - 检查参数类型
 * - 提供验证错误信息
 */
```

**ScenarioLoader**（`scenario-loader.ts`）
```typescript
/**
 * 演示场景加载器
 *
 * 职责：
 * - 从TOML配置文件加载演示场景
 * - 解析场景步骤
 * - 验证场景配置
 *
 * 技术实现：
 * - 基于ConfigLoadingModule
 * - 使用ScenarioSchema
 */
```

**ScenarioExecutor**（`scenario-executor.ts`）
```typescript
/**
 * 演示场景执行器
 *
 * 职责：
 * - 按顺序执行场景步骤
 * - 处理步骤依赖关系
 * - 收集执行结果
 *
 * 技术实现：
 * - 依赖命令处理器
 * - 支持步骤并行执行
 */
```

#### 2.3.2 Workflow基础设施（`src/infrastructure/workflow/`）

**WorkflowConfigLoader**（`workflow-config-loader.ts`）
```typescript
/**
 * Workflow配置加载器
 *
 * 职责：
 * - 从TOML配置文件加载Workflow定义
 * - 解析Workflow配置
 * - 转换为Workflow实体
 *
 * 技术实现：
 * - 基于ConfigLoadingModule
 * - 使用WorkflowConfigSchema
 */
```

**WorkflowConfigValidator**（`workflow-config-validator.ts`）
```typescript
/**
 * Workflow配置验证器
 *
 * 职责：
 * - 验证Workflow配置
 * - 检查配置完整性
 * - 提供验证错误信息
 *
 * 技术实现：
 * - 使用SchemaRegistry
 * - 使用ValidationUtils
 */
```

### 2.4 Services层新增模块详细说明

#### 2.4.1 Workflow配置管理服务（`src/services/workflow/workflow-config-management.ts`）

```typescript
/**
 * Workflow配置管理服务
 *
 * 职责：
 * - 管理Workflow配置的生命周期
 * - 从配置文件加载Workflow定义
 * - 验证Workflow配置
 * - 缓存已加载的配置
 * - 提供配置查询接口
 *
 * 依赖：
 * - WorkflowConfigLoader（Infrastructure层）
 * - WorkflowConfigValidator（Infrastructure层）
 * - IWorkflowRepository（Domain层）
 */
```

## 三、依赖关系图

```
CLI Application (Application层)
    ↓ 依赖
CommandRouter
    ↓ 依赖
CommandHandlers (SessionHandler, ThreadHandler, etc.)
    ↓ 依赖
Services层 (SessionLifecycle, ThreadManagement, etc.)
    ↓ 依赖
Domain层 (Session, Thread, Workflow, etc.)
    ↓ 依赖
Infrastructure层 (WorkflowConfigLoader, CommandParser, etc.)
```

## 四、配置文件结构

```
configs/
├── workflows/                           # Workflow配置文件
│   ├── basic.toml
│   ├── conditional.toml
│   └── tool-invocation.toml
├── cli/                                 # CLI配置
│   ├── cli.toml
│   └── scenarios/                       # 演示场景配置
│       ├── basic.toml
│       └── conditional.toml
└── application/                         # Application配置
    └── application.toml
```

## 五、注意事项

1. **严格分层**：Application层不能包含技术实现，所有技术实现必须在Infrastructure层
2. **依赖注入**：所有服务通过AppContainer获取
3. **配置驱动**：Workflow定义从配置文件加载，不通过CLI创建
4. **错误处理**：统一的错误处理机制
5. **日志记录**：使用现有的Logger服务
6. **向后兼容**：不影响现有架构
7. **可扩展性**：易于添加新命令和功能
8. **测试覆盖**：确保代码质量