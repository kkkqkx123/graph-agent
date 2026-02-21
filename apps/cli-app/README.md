# Modular Agent CLI Application

模块化智能体框架命令行应用

## 概述

Modular Agent CLI 是模块化智能体框架的命令行工具，提供了完整的工作流管理、线程执行、检查点管理和模板管理功能。

## 安装

```bash
# 在项目根目录安装依赖
pnpm install

# 构建 CLI 应用
pnpm --filter @modular-agent/cli-app build
```

## 使用方法

### 基本命令

```bash
# 显示帮助信息
modular-agent --help

# 显示版本信息
modular-agent --version

# 启用详细输出模式
modular-agent --verbose <command>

# 启用调试模式
modular-agent --debug <command>
```

### 工作流管理

```bash
# 管理工作流
modular-agent workflow

# 从文件注册工作流
modular-agent workflow register <file>

# 从目录批量注册工作流
modular-agent workflow register-batch <directory> [options]
  -r, --recursive          递归加载子目录
  -p, --pattern <pattern>  文件模式 (正则表达式)
  --params <params>        运行时参数 (JSON 格式)

# 列出所有工作流
modular-agent workflow list [options]
  -t, --table              以表格格式输出
  -v, --verbose            详细输出

# 查看工作流详情
modular-agent workflow show <id> [options]
  -v, --verbose            详细输出

# 删除工作流
modular-agent workflow delete <id> [options]
  -f, --force              强制删除，不提示确认
```

### 线程管理

```bash
# 管理线程
modular-agent thread

# 执行工作流线程
modular-agent thread run <workflow-id> [options]
  -i, --input <json>       输入数据(JSON格式)
  -v, --verbose            详细输出

# 暂停线程
modular-agent thread pause <thread-id>

# 恢复线程
modular-agent thread resume <thread-id>

# 停止线程
modular-agent thread stop <thread-id>

# 列出所有线程
modular-agent thread list [options]
  -t, --table              以表格格式输出
  -v, --verbose            详细输出

# 查看线程详情
modular-agent thread show <thread-id> [options]
  -v, --verbose            详细输出

# 删除线程
modular-agent thread delete <thread-id> [options]
  -f, --force              强制删除，不提示确认
```

### 检查点管理

```bash
# 管理检查点
modular-agent checkpoint

# 创建检查点
modular-agent checkpoint create <thread-id> [options]
  -n, --name <name>        检查点名称
  -v, --verbose            详细输出

# 载入检查点
modular-agent checkpoint load <checkpoint-id>

# 列出所有检查点
modular-agent checkpoint list [options]
  -t, --table              以表格格式输出
  -v, --verbose            详细输出

# 查看检查点详情
modular-agent checkpoint show <checkpoint-id> [options]
  -v, --verbose            详细输出

# 删除检查点
modular-agent checkpoint delete <checkpoint-id> [options]
  -f, --force              强制删除，不提示确认
```

### 模板管理

```bash
# 管理模板
modular-agent template

# 注册节点模板
modular-agent template register-node <file> [options]
  -v, --verbose            详细输出

# 批量注册节点模板
modular-agent template register-nodes-batch <directory> [options]
  -r, --recursive          递归加载子目录
  -p, --pattern <pattern>  文件模式 (正则表达式)

# 注册触发器模板
modular-agent template register-trigger <file> [options]
  -v, --verbose            详细输出

# 批量注册触发器模板
modular-agent template register-triggers-batch <directory> [options]
  -r, --recursive          递归加载子目录
  -p, --pattern <pattern>  文件模式 (正则表达式)

# 列出所有节点模板
modular-agent template list-nodes [options]
  -t, --table              以表格格式输出
  -v, --verbose            详细输出

# 列出所有触发器模板
modular-agent template list-triggers [options]
  -t, --table              以表格格式输出
  -v, --verbose            详细输出

# 查看节点模板详情
modular-agent template show-node <id> [options]
  -v, --verbose            详细输出

# 查看触发器模板详情
modular-agent template show-trigger <id> [options]
  -v, --verbose            详细输出

# 删除节点模板
modular-agent template delete-node <id> [options]
  -f, --force              强制删除，不提示确认

# 删除触发器模板
modular-agent template delete-trigger <id> [options]
  -f, --force              强制删除，不提示确认
```

## 配置

CLI 应用支持多种配置文件格式：

- `.modular-agentrc`
- `.modular-agentrc.json`
- `.modular-agentrc.yaml`
- `.modular-agentrc.yml`
- `modular-agent.config.js`
- `modular-agent.config.ts`

### 配置选项

```json
{
  "apiUrl": "https://api.example.com",
  "apiKey": "your-api-key",
  "defaultTimeout": 30000,
  "verbose": false,
  "debug": false,
  "logLevel": "warn",
  "outputFormat": "table",
  "maxConcurrentThreads": 5
}
```

## 开发

### 项目结构

```
apps/cli-app/
├── src/
│   ├── commands/           # 命令实现
│   │   ├── workflow/       # 工作流命令
│   │   ├── thread/         # 线程命令
│   │   ├── checkpoint/     # 检查点命令
│   │   └── template/       # 模板命令
│   ├── adapters/           # 适配器层
│   │   ├── base-adapter.ts       # 基础适配器类
│   │   ├── workflow-adapter.ts
│   │   ├── thread-adapter.ts
│   │   ├── checkpoint-adapter.ts
│   │   └── template-adapter.ts
│   ├── utils/              # 工具函数
│   │   ├── logger.ts       # 日志工具
│   │   ├── validator.ts    # 输入验证工具
│   │   ├── error-handler.ts # 错误处理工具
│   │   └── formatter.ts    # 格式化工具
│   ├── types/              # 类型定义
│   │   └── cli-types.ts
│   ├── config/             # 配置管理
│   │   ├── config-loader.ts
│   │   └── config-manager.ts
│   └── index.ts            # 入口文件
├── scripts/
│   └── modular-agent.js    # 可执行脚本入口
├── package.json
├── tsconfig.json
└── README.md
```

### 开发脚本

```bash
# 构建项目
pnpm --filter @modular-agent/cli-app build

# 监听模式构建
pnpm --filter @modular-agent/cli-app dev

# 运行 CLI
pnpm --filter @modular-agent/cli-app start

# 类型检查
pnpm --filter @modular-agent/cli-app typecheck

# 清理构建文件
pnpm --filter @modular-agent/cli-app clean
```

### 添加新命令

1. 在 `src/commands/` 下创建命令文件
2. 实现命令逻辑
3. 在 `src/index.ts` 中注册命令
4. 添加相应的适配器（如果需要）

## 依赖项

### 核心依赖
- `commander` - CLI 框架
- `@modular-agent/sdk` - 核心 SDK
- `@modular-agent/common-utils` - 公共工具

### 工具依赖
- `cosmiconfig` - 配置文件加载
- `zod` - 运行时验证
- `chalk` - 终端颜色输出
- `ora` - 加载动画
- `inquirer` - 交互式输入
- `yaml` - YAML 解析
- `@iarna/toml` - TOML 解析
- `fs-extra` - 增强版文件系统操作
- `p-map` - 并发数组映射
- `p-limit` - 并发限制
- `cli-progress` - 进度条组件

## 架构设计

CLI 应用采用分层架构：

1. **CLI Layer**: 使用 Commander.js 处理命令行参数解析
2. **Adapter Layer**: 将 CLI 参数转换为 SDK API 调用
3. **SDK Layer**: 调用核心 SDK 功能

所有适配器统一继承 `BaseAdapter`，提供统一的错误处理和 SDK 访问。

详细的架构设计请参考 [架构文档](../../docs/apps/cli-app/architecture.md)。

## 分阶段实施

CLI 应用的开发分为四个阶段：

1. **第一阶段**: 项目初始化和基础设置 ✅
2. **第二阶段**: 核心功能实现 ✅
3. **第三阶段**: 用户体验优化 🔄
4. **第四阶段**: 高级功能和扩展 ⏳

详细的阶段规划请参考 [阶段文档](../../docs/apps/cli-app/phases.md)。

## 贡献

欢迎贡献！请遵循项目的贡献指南。

## 许可证

MIT

## 联系方式

- 项目主页: [Modular Agent Framework](https://github.com/your-org/modular-agent-framework)
- 问题反馈: [GitHub Issues](https://github.com/your-org/modular-agent-framework/issues)