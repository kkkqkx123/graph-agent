# 配置获取代码规范

## 一、配置获取原则

### 1.1 单一职责原则
每个配置来源只负责一种类型的配置：
- **静态配置**：配置文件（configs/*.toml）
- **动态配置**：数据库（通过Repository）
- **运行时配置**：内存注册表

### 1.2 依赖倒置原则
服务依赖接口而非具体实现：
- 依赖`IConfigManager`接口而非`ConfigLoadingModule`类
- 依赖`IWorkflowRepository`接口而非具体实现

### 1.3 关注点分离
配置解析、配置管理、配置使用分别由不同的类负责：
- **配置解析**：`ConfigLoadingModule`（Infrastructure层）
- **配置管理**：`IConfigManager`接口（Infrastructure层）
- **配置使用**：各Service类（Services层）

### 1.4 一致性原则
相同类型的配置使用相同的获取方式：
- 所有静态配置通过`IConfigManager`获取
- 所有动态配置通过`Repository`获取
- 所有运行时配置通过内存注册表获取

## 二、配置获取规范

### 2.1 静态配置获取规范

**适用场景：**
- LLM配置（`configs/llms/*.toml`）
- 工具配置（`configs/tools/*.toml`）
- 函数配置（`configs/functions/*.toml`）
- 工作流配置（`configs/workflows/*.toml`）

**获取方式：**
通过`IConfigManager`接口从配置文件读取

**实现要求：**
- 必须通过构造函数注入`IConfigManager`
- 使用`@inject(TYPES.ConfigManager)`装饰器
- 配置键使用点号分隔（如：`llms.pools.default_pool`）
- 支持提供默认值

### 2.2 动态配置获取规范

**适用场景：**
- 工作流配置（通过`IWorkflowRepository`）
- 会话配置（通过`ISessionRepository`）
- 检查点配置（通过`ICheckpointRepository`）

**获取方式：**
通过`Repository`接口从数据库读取

**实现要求：**
- 必须通过构造函数注入`Repository`
- 使用`@inject('RepositoryName')`装饰器
- 使用`ID.fromString()`转换字符串ID
- 使用`findByIdOrFail()`确保配置存在

### 2.3 运行时配置获取规范

**适用场景：**
- 函数注册表（通过`FunctionManagement`）
- 轮询池注册表（通过`PollingPoolManager`）
- 任务组注册表（通过`TaskGroupManager`）

**获取方式：**
通过内存注册表管理

**实现要求：**
- 使用`Map`或`Set`存储运行时配置
- 提供增删改查方法
- 返回`null`表示配置不存在
- 返回`boolean`表示操作是否成功

## 三、禁止的配置获取方式

### 3.1 禁止通过参数传入配置
- 不允许通过方法参数传入配置
- 必须通过`IConfigManager`或`Repository`获取配置

### 3.2 禁止直接解析配置文件
- 不允许直接读取和解析配置文件
- 必须通过`IConfigManager`接口获取配置

### 3.3 禁止硬编码配置
- 不允许在代码中硬编码配置值
- 必须从配置文件或数据库读取配置

## 四、配置热更新规范

### 4.1 监听配置变更
- 在构造函数中注册配置变更监听器
- 使用通配符`*`监听多个配置
- 在回调函数中处理配置变更
- 避免在回调函数中执行耗时操作

### 4.2 手动刷新配置
- `refresh()`会刷新所有配置
- 刷新后会触发所有匹配的监听器
- 使用`getVersion()`获取配置版本
- 在刷新后重新获取配置

## 五、配置键命名规范

### 5.1 配置键格式
**格式：** `模块.子模块.配置项`

**示例：**
- `llms.pools.default_pool`
- `tools.builtin.calculator`
- `workflows.defaults.timeout`

### 5.2 配置键命名规则
1. 使用小写字母
2. 使用下划线分隔单词
3. 使用点号分隔层级
4. 使用有意义的名称

### 5.3 配置键分类
- **LLM配置**：`llms.pools.{pool_name}`, `llms.provider.{provider_name}.{model_name}`, `llms.task_groups.{group_name}`
- **工具配置**：`tools.builtin.{tool_name}`, `tools.mcp.{tool_name}`, `tools.native.{tool_name}`, `tools.rest.{tool_name}`
- **工作流配置**：`workflows.defaults.{config_name}`, `workflows.base.{workflow_name}`
- **提示配置**：`prompts.rules.{rule_name}`, `prompts.system.{prompt_name}`, `prompts.templates.{template_name}`

## 六、配置文件组织规范

### 6.1 配置文件目录结构
```
configs/
├── global.toml
├── database/
│   └── database.toml
├── environments/
│   └── development.toml
├── llms/
│   ├── retry.toml
│   ├── pools/
│   ├── provider/
│   └── task_groups/
├── prompts/
│   ├── rules/
│   ├── system/
│   ├── templates/
│   └── user_commands/
├── threads/
│   └── checkpoint.toml
├── tools/
│   ├── __registry__.toml
│   ├── builtin/
│   ├── mcp/
│   ├── native/
│   └── rest/
└── workflows/
    ├── defaults.toml
    ├── base/
    └── examples/
```

### 6.2 配置文件命名规范
1. 使用小写字母
2. 使用下划线分隔单词
3. 使用有意义的名称
4. 使用`.toml`扩展名

## 七、配置验证规范

### 7.1 配置验证时机
1. **启动时验证**：在服务初始化时验证配置
2. **运行时验证**：在配置变更时验证配置
3. **使用前验证**：在使用配置前验证配置

### 7.2 配置验证规则
1. **必需字段验证**：检查必需字段是否存在
2. **类型验证**：检查字段类型是否正确
3. **范围验证**：检查字段值是否在有效范围内
4. **格式验证**：检查字段格式是否正确
5. **依赖验证**：检查字段之间的依赖关系

## 八、配置错误处理规范

### 8.1 配置不存在
- 使用默认值或抛出错误
- 提供清晰的错误信息

### 8.2 配置格式错误
- 验证配置格式
- 抛出明确的错误信息

### 8.3 配置加载失败
- 捕获异常
- 记录错误日志
- 抛出友好的错误信息

## 九、配置测试规范

### 9.1 单元测试
- 使用mock对象测试配置获取逻辑
- 测试正常情况和异常情况
- 验证配置键的正确性

### 9.2 集成测试
- 使用真实配置管理器测试配置加载
- 测试配置文件的正确性
- 验证配置热更新功能

## 十、最佳实践

### 10.1 配置缓存
- 缓存配置以提高性能
- 监听配置变更并更新缓存
- 使用配置版本号检测变更

### 10.2 配置分层
- 全局配置：`global.*`
- 模块配置：`module.*`
- 特定配置：`module.submodule.specific`

### 10.3 配置环境隔离
- 使用环境变量区分不同环境
- 配置文件按环境组织
- 支持环境特定配置覆盖

## 十一、总结

### 配置获取规范
1. **静态配置**：通过`IConfigManager`从配置文件读取
2. **动态配置**：通过`Repository`从数据库读取
3. **运行时配置**：通过内存注册表管理
4. **禁止**：通过参数传入配置、直接解析配置文件、硬编码配置

### 配置热更新规范
1. **监听配置变更**：使用`onChange()`方法注册监听器
2. **手动刷新配置**：使用`refresh()`方法刷新配置
3. **获取配置版本**：使用`getVersion()`方法获取版本

### 配置键命名规范
1. **格式**：`模块.子模块.配置项`
2. **规则**：小写字母、下划线分隔、点号分隔层级、有意义的名称
3. **分类**：LLM配置、工具配置、工作流配置、提示配置

### 配置验证规范
1. **验证时机**：启动时、运行时、使用前
2. **验证方法**：必需字段、类型、范围、格式、依赖
3. **错误处理**：配置不存在、格式错误、加载失败

### 配置测试规范
1. **单元测试**：使用mock对象测试配置获取逻辑
2. **集成测试**：使用真实配置管理器测试配置加载
3. **测试覆盖**：正常情况、异常情况、边界情况