# Modular Agent Framework - TypeScript版本

## 项目概述

Modular Agent Framework是一个基于TypeScript的模块化智能体框架，采用配置驱动的架构设计，支持多模型LLM集成、灵活的工具系统和图工作流执行。

## 架构特点

- **配置驱动**：支持多源配置加载和热更新
- **分层架构**：Domain + Application + Infrastructure三层架构
- **类型安全**：充分利用TypeScript的类型系统
- **模块化设计**：松耦合的模块设计，易于扩展
- **依赖注入**：轻量级依赖注入容器

## 项目结构

```
src/
├── domain/                 # 领域层
│   ├── workflow/          # 工作流领域
│   ├── session/           # 会话领域
│   ├── tool/              # 工具领域
│   ├── state/             # 状态领域
│   ├── llm/               # LLM领域
│   ├── history/           # 历史领域
│   └── common/            # 通用领域
├── application/           # 应用层
│   ├── workflow/          # 工作流应用
│   ├── session/           # 会话应用
│   ├── tool/              # 工具应用
│   ├── state/             # 状态应用
│   ├── llm/               # LLM应用
│   ├── history/           # 历史应用
│   └── common/            # 通用应用
├── infrastructure/        # 基础设施层
│   ├── config/            # 配置管理
│   ├── database/          # 数据库
│   ├── messaging/         # 消息队列
│   ├── external/          # 外部服务
│   ├── monitoring/        # 监控日志
│   └── common/            # 通用基础设施
├── interfaces/            # 接口层
│   ├── http/              # HTTP接口
│   ├── cli/               # 命令行接口
│   └── graphql/           # GraphQL接口
├── shared/                # 共享代码
│   ├── types/             # 类型定义
│   ├── utils/             # 工具函数
│   └── constants/         # 常量定义
└── tests/                 # 测试代码
    ├── unit/              # 单元测试
    ├── integration/       # 集成测试
    └── e2e/               # 端到端测试
```

## 已完成功能

### ✅ 项目初始化
- [x] 创建TypeScript项目结构
- [x] 配置开发环境和构建工具
- [x] 设置代码规范和质量检查
- [ ] 建立CI/CD流水线

### ✅ 配置系统实现
- [x] 实现配置管理器
- [ ] 实现多源配置加载
- [ ] 实现配置处理器链
- [ ] 实现配置验证器
- [ ] 实现配置缓存和热更新

### ✅ 依赖注入容器
- [x] 实现轻量级依赖注入容器
- [ ] 配置服务注册和解析
- [ ] 实现生命周期管理

### ✅ 测试框架搭建
- [x] 配置单元测试框架
- [ ] 配置集成测试框架
- [ ] 建立测试数据和Mock

## 开发环境要求

- Node.js >= 18.0.0
- TypeScript >= 5.1.6
- npm >= 8.0.0

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建

```bash
npm run build
```

### 测试

```bash
npm test
```

### 代码检查

```bash
npm run lint
```

### 格式化代码

```bash
npm run format
```

## 配置

项目支持多种配置方式：

1. **环境变量**：通过`.env`文件配置
2. **配置文件**：支持JSON、YAML、TOML格式
3. **远程配置**：支持从远程服务加载配置

## 开发指南

### 代码规范

- 使用TypeScript严格模式
- 遵循ESLint规则
- 使用Prettier格式化代码
- 编写单元测试，保持测试覆盖率>80%

### 提交规范

使用语义化提交信息：

- `feat:` 新功能
- `fix:` 修复bug
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建过程或辅助工具的变动

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！

## 联系方式

如有问题，请通过Issue联系我们。