# CLI功能演示实现计划（修订版）

## 一、核心概念澄清

### 1.1 架构层次关系
```
Session（会话）- 顶层服务模块
    ↓
Thread（线程）- 会话中的执行实例
    ↓
Workflow（工作流）- 静态工作流定义（从配置文件加载）
    ↓
Node/Edge（节点/边）- 工作流图结构
```

### 1.2 关键理解
- **Session**：顶层服务模块，代表一个完整的对话或任务上下文
- **Workflow**：静态的工作流定义，通过配置文件定义，不直接通过CLI创建
- **Thread**：Session中的执行实例，实际执行Workflow
- **配置驱动**：Workflow定义从TOML配置文件加载，CLI负责创建Session和Thread来执行

## 二、Application层现状分析

### 2.1 现有结构
- [`src/application/index.ts`](src/application/index.ts:1) - 导出接口和类型定义
- [`src/application/common/application.ts`](src/application/common/application.ts:1) - 基础Application类（服务初始化部分为TODO）

### 2.2 可用服务

#### Session服务（顶层）
- [`SessionLifecycle`](src/services/sessions/session-lifecycle.ts:29) - 会话生命周期管理（创建、激活、暂停、终止）
- [`SessionManagement`](src/services/sessions/session-management.ts:19) - 会话管理（查询、列表、配置更新）

#### Thread服务
- [`ThreadLifecycle`](src/application/index.ts:20) - 线程生命周期管理
- [`ThreadManagement`](src/application/index.ts:21) - 线程管理

#### Workflow服务（静态定义）
- [`WorkflowLifecycle`](src/services/workflow/workflow-lifecycle.ts:69) - 工作流生命周期（主要用于内部管理）
- [`WorkflowManagement`](src/services/workflow/workflow-management.ts:111) - 工作流管理（查询、列表）
- [`WorkflowExecutionEngine`](src/services/workflow/workflow-execution.ts:63) - 工作流执行引擎

#### 其他服务
- [`CheckpointManagement`](src/application/index.ts:31) - 检查点管理
- [`Wrapper`](src/application/index.ts:12) - LLM包装服务

## 三、CLI功能架构设计

### 3.1 整体架构

```
CLI入口 (cli.ts)
    ↓
命令解析器 (CommandParser)
    ↓
命令处理器 (CommandHandlers)
    ↓
Session服务（顶层）
    ↓
Thread服务
    ↓
Workflow（从配置文件加载）
    ↓
WorkflowExecutionEngine
```

### 3.2 核心组件设计

#### 3.2.1 CLI入口 (`src/application/cli/cli.ts`)
- 职责：CLI程序的入口点
- 功能：
  - 解析命令行参数
  - 初始化应用容器
  - 路由到对应的命令处理器
  - 处理错误和异常

#### 3.2.2 命令解析器 (`src/application/cli/command-parser.ts`)
- 职责：解析和验证命令行参数
- 功能：
  - 定义命令结构
  - 参数验证
  - 帮助信息生成

#### 3.2.3 命令处理器 (`src/application/cli/handlers/`)
- 职责：执行具体的业务逻辑
- 包含的处理器：
  - `session-handler.ts` - Session相关命令（核心）
  - `thread-handler.ts` - Thread相关命令
  - `workflow-handler.ts` - Workflow查询命令（只读）
  - `config-handler.ts` - 配置相关命令
  - `demo-handler.ts` - 演示命令

#### 3.2.4 输出格式化器 (`src/application/cli/formatters/`)
- 职责：格式化输出结果
- 功能：
  - 表格格式输出
  - JSON格式输出
  - 彩色输出

#### 3.2.5 Workflow配置加载器 (`src/application/cli/loaders/workflow-loader.ts`)
- 职责：从配置文件加载Workflow定义
- 功能：
  - 解析TOML配置文件
  - 验证Workflow配置
  - 创建Workflow实体

### 3.3 命令结构设计

#### 3.3.1 Session命令（核心）
```bash
# Session管理
agent session create [--title <title>] [--workflow <workflow-config>]
agent session list [--status <status>]
agent session get <session-id>
agent session activate <session-id>
agent session suspend <session-id> [--reason <reason>]
agent session terminate <session-id> [--reason <reason>]
```

#### 3.3.2 Thread命令
```bash
# Thread管理
agent thread create <session-id> [--name <name>]
agent thread list <session-id>
agent thread get <thread-id>
agent thread execute <thread-id> [--input <json>]
agent thread pause <thread-id>
agent thread resume <thread-id>
```

#### 3.3.3 Workflow命令（只读）
```bash
# Workflow查询（从配置文件加载）
agent workflow list [--config-dir <dir>]
agent workflow get <workflow-config>
agent workflow validate <workflow-config>
```

#### 3.3.4 配置命令
```bash
# 配置管理
agent config list
agent config get <key>
agent config set <key> <value>
agent config validate
```

#### 3.3.5 演示命令
```bash
# 演示场景
agent demo <scenario-name>
agent demo list
```

#### 3.3.6 通用命令
```bash
# 帮助
agent --help
agent <command> --help

# 版本
agent --version

# 状态
agent status
```

## 四、配置驱动设计

### 4.1 Workflow配置文件结构

Workflow定义通过TOML配置文件定义，位于`configs/workflows/`目录。

#### 4.1.1 基础工作流配置 (`configs/workflows/basic.toml`)
```toml
# 基础工作流配置

[workflow]
name = "basic-workflow"
description = "基础工作流演示"
version = "1.0.0"

# 工作流配置
[workflow.config]
type = "sequential"
timeout = 300000
max_steps = 100

# 节点定义
[[workflow.nodes]]
id = "start"
type = "start"
name = "开始节点"

[[workflow.nodes]]
id = "llm-node"
type = "llm"
name = "LLM处理节点"
config = { model = "mock", prompt = "处理用户输入" }

[[workflow.nodes]]
id = "end"
type = "end"
name = "结束节点"

# 边定义
[[workflow.edges]]
from = "start"
to = "llm-node"
condition = "true"

[[workflow.edges]]
from = "llm-node"
to = "end"
condition = "true"
```

#### 4.1.2 条件路由工作流配置 (`configs/workflows/conditional.toml`)
```toml
# 条件路由工作流配置

[workflow]
name = "conditional-workflow"
description = "条件路由工作流演示"
version = "1.0.0"

[workflow.config]
type = "conditional"
timeout = 300000
max_steps = 100

[[workflow.nodes]]
id = "start"
type = "start"
name = "开始节点"

[[workflow.nodes]]
id = "check"
type = "condition"
name = "条件检查节点"
config = { expression = "input.value > 10" }

[[workflow.nodes]]
id = "branch-a"
type = "llm"
name = "分支A"
config = { model = "mock", prompt = "处理大于10的情况" }

[[workflow.nodes]]
id = "branch-b"
type = "llm"
name = "分支B"
config = { model = "mock", prompt = "处理小于等于10的情况" }

[[workflow.nodes]]
id = "end"
type = "end"
name = "结束节点"

[[workflow.edges]]
from = "start"
to = "check"
condition = "true"

[[workflow.edges]]
from = "check"
to = "branch-a"
condition = "result == true"

[[workflow.edges]]
from = "check"
to = "branch-b"
condition = "result == false"

[[workflow.edges]]
from = "branch-a"
to = "end"
condition = "true"

[[workflow.edges]]
from = "branch-b"
to = "end"
condition = "true"
```

#### 4.1.3 工具调用工作流配置 (`configs/workflows/tool-invocation.toml`)
```toml
# 工具调用工作流配置

[workflow]
name = "tool-workflow"
description = "工具调用工作流演示"
version = "1.0.0"

[workflow.config]
type = "sequential"
timeout = 300000
max_steps = 100

[[workflow.nodes]]
id = "start"
type = "start"
name = "开始节点"

[[workflow.nodes]]
id = "calculator"
type = "tool"
name = "计算器工具"
config = { tool_name = "calculator", operation = "add" }

[[workflow.nodes]]
id = "end"
type = "end"
name = "结束节点"

[[workflow.edges]]
from = "start"
to = "calculator"
condition = "true"

[[workflow.edges]]
from = "calculator"
to = "end"
condition = "true"
```

### 4.2 演示场景配置 (`configs/cli/scenarios/`)

演示场景配置定义了如何使用预定义的Workflow配置进行演示。

#### 4.2.1 基础演示场景 (`configs/cli/scenarios/basic-demo.toml`)
```toml
# 基础演示场景

[scenario]
name = "基础演示"
description = "演示Session创建和Thread执行基础流程"
workflow_config = "basic"

[steps]
[[steps]]
name = "创建Session"
action = "create_session"
params = { title = "基础演示会话", workflow = "basic" }

[[steps]]
name = "创建Thread"
action = "create_thread"
depends_on = "创建Session"
params = { name = "演示线程" }

[[steps]]
name = "执行Thread"
action = "execute_thread"
depends_on = "创建Thread"
params = { input = '{"message": "Hello, World!"}' }
```

#### 4.2.2 条件路由演示场景 (`configs/cli/scenarios/conditional-demo.toml`)
```toml
# 条件路由演示场景

[scenario]
name = "条件路由演示"
description = "演示条件路由功能"
workflow_config = "conditional"

[steps]
[[steps]]
name = "创建Session"
action = "create_session"
params = { title = "条件路由演示", workflow = "conditional" }

[[steps]]
name = "创建Thread（小值）"
action = "create_thread"
depends_on = "创建Session"
params = { name = "小值测试" }

[[steps]]
name = "执行Thread（小值）"
action = "execute_thread"
depends_on = "创建Thread（小值）"
params = { input = '{"value": 5}' }

[[steps]]
name = "创建Thread（大值）"
action = "create_thread"
depends_on = "创建Session"
params = { name = "大值测试" }

[[steps]]
name = "执行Thread（大值）"
action = "execute_thread"
depends_on = "创建Thread（大值）"
params = { input = '{"value": 15}' }
```

### 4.3 CLI配置 (`configs/cli/cli.toml`)
```toml
# CLI配置文件

[cli]
# 默认输出格式 (table, json, yaml)
default_output_format = "table"

# 是否启用彩色输出
enable_colors = true

# 是否显示详细日志
verbose = false

# Workflow配置目录
workflow_config_dir = "configs/workflows/"

# 演示场景配置目录
scenarios_dir = "configs/cli/scenarios/"

# 命令历史记录
[cli.history]
enabled = true
max_size = 100
file = ".agent_history"
```

### 4.4 Application层配置 (`configs/application/application.toml`)
```toml
# Application层配置

[application]
# 应用名称
name = "Modular Agent Framework"

# 应用版本
version = "1.0.0"

# Session配置
[application.session]
max_sessions = 100
default_timeout = 3600

# Thread配置
[application.thread]
max_threads_per_session = 50
default_timeout = 1800

# Workflow配置
[application.workflow]
config_dir = "configs/workflows/"
default_execution_timeout = 300000
```

## 五、实现步骤

### 5.1 第一阶段：基础框架搭建
1. 创建CLI入口文件
2. 实现命令解析器
3. 实现基础命令处理器
4. 实现输出格式化器
5. 更新Application类的服务初始化逻辑

### 5.2 第二阶段：Workflow配置加载器
1. 实现Workflow配置加载器
2. 实现Workflow配置验证
3. 实现Workflow实体创建
4. 创建示例Workflow配置文件

### 5.3 第三阶段：Session命令实现
1. 实现Session创建命令（加载Workflow配置）
2. 实现Session列表命令
3. 实现Session查询命令
4. 实现Session激活/暂停/终止命令

### 5.4 第四阶段：Thread命令实现
1. 实现Thread创建命令
2. 实现Thread列表命令
3. 实现Thread查询命令
4. 实现Thread执行命令
5. 实现Thread暂停/恢复命令

### 5.5 第五阶段：演示功能
1. 实现演示场景加载器
2. 实现演示命令
3. 创建演示场景配置文件
4. 实现演示步骤执行器

### 5.6 第六阶段：完善和优化
1. 添加命令历史记录
2. 实现自动补全功能
3. 添加详细的帮助文档
4. 优化错误处理和提示
5. 添加单元测试

## 六、技术选型

### 6.1 命令行解析
- **选择**：使用Node.js原生`process.argv`进行简单解析
- **原因**：
  - 避免引入额外依赖
  - 满足基本需求
  - 保持项目轻量

### 6.2 配置文件解析
- **选择**：使用项目已有的`toml`库
- **原因**：
  - 项目已依赖
  - 与现有配置系统一致
  - 支持TOML格式

### 6.3 输出格式化
- **选择**：自定义格式化器
- **原因**：
  - 灵活控制输出格式
  - 支持表格、JSON、YAML等多种格式
  - 易于扩展

### 6.4 颜色输出
- **选择**：使用ANSI转义码
- **原因**：
  - 无需额外依赖
  - 跨平台支持
  - 简单易用

## 七、文件结构

```
src/application/
├── cli/
│   ├── cli.ts                        # CLI入口
│   ├── command-parser.ts             # 命令解析器
│   ├── loaders/                      # 配置加载器
│   │   └── workflow-loader.ts        # Workflow配置加载器
│   ├── handlers/                     # 命令处理器
│   │   ├── session-handler.ts        # Session命令处理器（核心）
│   │   ├── thread-handler.ts         # Thread命令处理器
│   │   ├── workflow-handler.ts       # Workflow查询命令处理器
│   │   ├── config-handler.ts         # 配置命令处理器
│   │   └── demo-handler.ts           # 演示命令处理器
│   ├── formatters/                   # 输出格式化器
│   │   ├── table-formatter.ts        # 表格格式化器
│   │   ├── json-formatter.ts         # JSON格式化器
│   │   └── color-formatter.ts        # 颜色格式化器
│   └── utils/                        # CLI工具函数
│       ├── logger.ts                 # CLI日志工具
│       └── validator.ts              # 参数验证工具
├── common/
│   └── application.ts                # Application类（需更新）
└── index.ts                          # 导出文件

configs/
├── workflows/                        # Workflow配置文件
│   ├── basic.toml                    # 基础工作流
│   ├── conditional.toml              # 条件路由工作流
│   └── tool-invocation.toml          # 工具调用工作流
├── cli/
│   ├── cli.toml                      # CLI配置
│   └── scenarios/                    # 演示场景配置
│       ├── basic-demo.toml           # 基础演示场景
│       └── conditional-demo.toml     # 条件路由演示场景
└── application/
    └── application.toml              # Application层配置
```

## 八、使用示例

### 8.1 基础工作流演示
```bash
# 方式1：使用演示命令
agent demo basic-demo

# 方式2：手动执行
# 创建Session（加载basic工作流配置）
agent session create --title "基础演示" --workflow basic

# 查看Session列表
agent session list

# 激活Session
agent session activate <session-id>

# 创建Thread
agent thread create <session-id> --name "演示线程"

# 执行Thread
agent thread execute <thread-id> --input '{"message": "Hello, World!"}'
```

### 8.2 条件路由演示
```bash
# 使用演示命令
agent demo conditional-demo

# 手动执行
# 创建Session（加载conditional工作流配置）
agent session create --title "条件路由演示" --workflow conditional

# 创建Thread并执行（小值）
agent thread create <session-id> --name "小值测试"
agent thread execute <thread-id> --input '{"value": 5}'

# 创建Thread并执行（大值）
agent thread create <session-id> --name "大值测试"
agent thread execute <thread-id> --input '{"value": 15}'
```

### 8.3 查询Workflow配置
```bash
# 列出所有Workflow配置
agent workflow list

# 查看特定Workflow配置
agent workflow get basic

# 验证Workflow配置
agent workflow validate conditional
```

### 8.4 Session和Thread管理
```bash
# 查看所有Session
agent session list

# 查看特定Session
agent session get <session-id>

# 暂停Session
agent session suspend <session-id> --reason "临时暂停"

# 终止Session
agent session terminate <session-id> --reason "任务完成"

# 查看Session中的所有Thread
agent thread list <session-id>

# 查看特定Thread
agent thread get <thread-id>
```

## 九、配置驱动流程

### 9.1 Session创建流程
```
1. 用户执行: agent session create --workflow basic
2. CLI解析命令，获取workflow配置名称
3. WorkflowLoader加载configs/workflows/basic.toml
4. 验证Workflow配置
5. 创建Workflow实体
6. 调用SessionLifecycle.createSession()
7. Session关联Workflow配置
8. 返回Session ID
```

### 9.2 Thread执行流程
```
1. 用户执行: agent thread execute <thread-id> --input '{"value": 10}'
2. CLI解析命令，获取thread-id和输入数据
3. 调用ThreadManagement获取Thread
4. 获取Thread关联的Session
5. 从Session获取Workflow配置
6. 创建ExecutionContext
7. 调用WorkflowExecutionEngine.execute()
8. 执行Workflow中的节点
9. 返回执行结果
```

### 9.3 演示场景执行流程
```
1. 用户执行: agent demo basic-demo
2. CLI解析命令，获取场景名称
3. ScenarioLoader加载configs/cli/scenarios/basic-demo.toml
4. 按顺序执行场景中的步骤
5. 每个步骤调用相应的命令处理器
6. 显示执行结果
7. 完成演示
```

## 十、注意事项

1. **Session为核心**：所有操作围绕Session展开，Workflow只是配置
2. **配置驱动**：Workflow定义从配置文件加载，不通过CLI创建
3. **依赖注入**：所有服务通过`AppContainer`获取，确保依赖注入的一致性
4. **错误处理**：统一的错误处理机制，提供友好的错误提示
5. **日志记录**：使用现有的Logger服务，记录CLI操作日志
6. **配置管理**：使用现有的ConfigManager，加载CLI配置
7. **向后兼容**：不影响现有的Application层架构
8. **可扩展性**：设计易于扩展，方便添加新命令和功能

## 十一、后续优化方向

1. 添加交互式模式（REPL）
2. 支持命令别名
3. 实现命令自动补全
4. 添加性能监控和分析
5. 支持Workflow配置的热重载
6. 添加更多的演示场景
7. 支持Workflow配置的版本管理
8. 添加Session和Thread的导出/导入功能