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

# 注册工作流（即将实现）
modular-agent workflow register <file>

# 列出所有工作流（即将实现）
modular-agent workflow list

# 查看工作流详情（即将实现）
modular-agent workflow show <id>

# 删除工作流（即将实现）
modular-agent workflow delete <id>
```

### 线程管理

```bash
# 管理线程
modular-agent thread

# 执行工作流线程（即将实现）
modular-agent thread run <workflow-id>

# 暂停线程（即将实现）
modular-agent thread pause <thread-id>

# 恢复线程（即将实现）
modular-agent thread resume <thread-id>

# 停止线程（即将实现）
modular-agent thread stop <thread-id>
```

### 检查点管理

```bash
# 管理检查点
modular-agent checkpoint

# 创建检查点（即将实现）
modular-agent checkpoint create <thread-id>

# 载入检查点（即将实现）
modular-agent checkpoint load <checkpoint-id>

# 列出检查点（即将实现）
modular-agent checkpoint list
```

### 模板管理

```bash
# 管理模板
modular-agent template

# 注册模板（即将实现）
modular-agent template register <file>

# 列出模板（即将实现）
modular-agent template list

# 查看模板详情（即将实现）
modular-agent template show <id>
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
│   ├── utils/              # 工具函数
│   │   ├── logger.ts       # 日志工具
│   │   └── formatter.ts    # 格式化工具
│   ├── types/              # 类型定义
│   ├── config/             # 配置管理
│   └── index.ts            # 入口文件
├── bin/
│   └── modular-agent       # 可执行文件
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
- `winston` - 日志记录
- `chalk` - 终端颜色输出
- `ora` - 加载动画
- `inquirer` - 交互式输入

## 贡献

欢迎贡献！请遵循项目的贡献指南。

## 许可证

MIT

## 联系方式

- 项目主页: [Modular Agent Framework](https://github.com/your-org/modular-agent-framework)
- 问题反馈: [GitHub Issues](https://github.com/your-org/modular-agent-framework/issues)