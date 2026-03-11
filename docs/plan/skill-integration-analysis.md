# Skill 功能集成分析

## 1. 概述

本文档分析如何为 Modular Agent Framework 引入 Skill 功能，参考 Claude Code 的 Skill 规范和 Mini-Agent 的实现。

## 2. Skill 规范分析

### 2.1 Claude Code Skill 规范

根据 Context7 文档和 Mini-Agent 的 `agent_skills_spec.md`，Skill 的核心特征：

#### 2.1.1 基本定义

**Skill 是一个包含指令、脚本和资源的文件夹**，Agent 可以动态发现和加载以更好地执行特定任务。

#### 2.1.2 目录结构

```
my-skill/
  - SKILL.md          # 必需：入口文件
  - references/       # 可选：参考文档
  - examples/         # 可选：示例代码
  - scripts/          # 可选：工具脚本
  - assets/           # 可选：资源文件
```

#### 2.1.3 SKILL.md 文件格式

**YAML Frontmatter（必需字段）：**
- `name`: Skill 名称（hyphen-case，小写字母+连字符）
- `description`: Skill 描述和使用场景

**可选字段：**
- `version`: 版本号
- `license`: 许可证
- `allowed-tools`: 预批准的工具列表
- `metadata`: 自定义元数据

**Markdown Body：**
- 核心概念说明
- 代码示例
- 最佳实践
- 使用场景

#### 2.1.4 自动发现机制

Claude Code 通过扫描 `skills/` 目录自动发现 Skill：
1. 识别包含 `SKILL.md` 文件的子目录
2. 立即加载元数据（name 和 description）
3. 根据用户查询触发时加载 SKILL.md 主体内容
4. 按需加载 references 和 examples

### 2.2 Mini-Agent Skill 规范

Mini-Agent 的规范更简洁，强调：
- 最小化 Skill 只需要 `SKILL.md` 文件
- 目录名必须与 `name` 字段匹配
- 支持扩展目录和文件

## 3. 当前项目架构分析

### 3.1 项目结构

```
modular-agent-framework/
├── apps/              # 应用层
├── packages/          # 共享包层
├── sdk/               # SDK 核心层
│   ├── core/         # 核心执行逻辑
│   ├── api/          # 外部 API 接口
│   ├── graph/        # 图执行引擎
│   └── agent/        # Agent 循环管理
└── ref/              # 参考实现
```

### 3.2 现有扩展机制

#### 3.2.1 依赖注入（DI）系统

**位置：** `sdk/core/di/container-config.ts`

**特点：**
- 使用 InversifyJS 风格的容器
- 分层配置服务绑定
- 支持单例和工厂模式
- 服务标识符统一管理

**扩展点：**
- 可以注册新的服务到容器
- 支持动态值绑定
- 允许应用层覆盖服务实现

#### 3.2.2 Hook 系统

**位置：** `sdk/core/hooks/`

**特点：**
- 通用 Hook 类型定义
- 支持条件触发
- 支持权重排序
- 支持并行/串行执行

**扩展点：**
- `BaseHookDefinition` 可扩展
- `BaseHookContext` 可扩展
- 支持自定义 HookHandler

#### 3.2.3 服务注册表

**现有注册表：**
- `GraphRegistry`: 图定义注册
- `ThreadRegistry`: 线程注册
- `WorkflowRegistry`: 工作流注册
- `NodeTemplateRegistry`: 节点模板注册
- `TriggerTemplateRegistry`: 触发器模板注册
- `ToolService`: 工具管理
- `ScriptService`: 脚本管理

**扩展点：**
- 可以添加新的注册表服务
- 支持动态注册和发现

#### 3.2.4 事件系统

**位置：** `sdk/core/services/event-manager.ts`

**特点：**
- 事件驱动架构
- 支持异步事件发射
- 支持事件订阅

**扩展点：**
- 可以定义新的事件类型
- 支持事件过滤和处理

### 3.3 Agent Loop 架构

**位置：** `sdk/agent/`

**核心组件：**
- `AgentLoopExecutor`: Agent 循环执行器
- `AgentLoopRegistry`: Agent 循环注册表
- `AgentLoopCoordinator`: Agent 循环协调器

**执行流程：**
1. 接收用户输入
2. 调用 LLM 生成响应
3. 执行工具调用
4. 循环迭代直到完成

**扩展点：**
- 可以在 Agent Loop 中注入 Skill 逻辑
- 支持自定义执行策略

## 4. Skill 功能集成方案

### 4.1 设计目标

1. **兼容性**：遵循 Claude Code Skill 规范
2. **可扩展性**：支持自定义 Skill 类型
3. **可发现性**：自动发现和加载 Skill
4. **隔离性**：Skill 之间相互独立
5. **安全性**：控制 Skill 的权限和资源访问

### 4.2 架构设计

#### 4.2.1 Skill 管理服务

**新增服务：** `SkillRegistry`

**职责：**
- 扫描和发现 Skill 目录
- 解析 SKILL.md 文件
- 管理 Skill 元数据
- 提供 Skill 查询接口

**位置：** `sdk/core/services/skill-registry.ts`

**接口设计：**

```typescript
interface SkillMetadata {
  name: string;
  description: string;
  version?: string;
  license?: string;
  allowedTools?: string[];
  metadata?: Record<string, string>;
}

interface Skill {
  metadata: SkillMetadata;
  path: string;
  content?: string;  // SKILL.md 主体内容
  references?: Map<string, string>;
  examples?: Map<string, string>;
  scripts?: Map<string, string>;
}

class SkillRegistry {
  // 扫描 Skill 目录
  async scanSkills(skillsPath: string): Promise<void>;

  // 获取所有 Skill 元数据
  getAllSkills(): SkillMetadata[];

  // 根据 name 获取 Skill
  getSkill(name: string): Skill | undefined;

  // 根据描述匹配 Skill
  matchSkills(query: string): SkillMetadata[];

  // 加载 Skill 完整内容
  async loadSkillContent(name: string): Promise<string>;

  // 加载 Skill 资源
  async loadSkillResource(name: string, resourcePath: string): Promise<string>;
}
```

#### 4.2.2 Skill 执行器

**新增服务：** `SkillExecutor`

**职责：**
- 执行 Skill 指令
- 管理 Skill 上下文
- 处理 Skill 资源访问
- 控制 Skill 权限

**位置：** `sdk/core/executors/skill-executor.ts`

**接口设计：**

```typescript
interface SkillExecutionContext {
  skill: Skill;
  agentContext: BaseHookContext;
  variables: Record<string, any>;
  tools: string[];
}

interface SkillExecutionResult {
  success: boolean;
  data?: any;
  error?: Error;
}

class SkillExecutor {
  constructor(
    private skillRegistry: SkillRegistry,
    private toolService: ToolService,
    private eventManager: EventManager
  ) {}

  // 执行 Skill
  async execute(skillName: string, context: SkillExecutionContext): Promise<SkillExecutionResult>;

  // 验证 Skill 权限
  validatePermissions(skill: Skill, tools: string[]): boolean;

  // 构建 Skill 上下文
  buildContext(skill: Skill, agentContext: BaseHookContext): SkillExecutionContext;
}
```

#### 4.2.3 Skill 集成到 Agent Loop

**修改点：** `AgentLoopExecutor`

**集成方式：**

1. **Skill 发现阶段**
   - 在 Agent Loop 初始化时，扫描 Skill 目录
   - 加载所有 Skill 元数据
   - 构建 Skill 索引

2. **Skill 匹配阶段**
   - 分析用户输入
   - 匹配相关 Skill
   - 选择最佳 Skill

3. **Skill 执行阶段**
   - 加载 Skill 完整内容
   - 注入 Skill 指令到 Prompt
   - 执行 Skill 定义的操作
   - 处理 Skill 结果

**代码示例：**

```typescript
class AgentLoopExecutor {
  constructor(
    private llmExecutor: LLMExecutor,
    private toolService: ToolService,
    private skillRegistry: SkillRegistry,  // 新增
    private skillExecutor: SkillExecutor   // 新增
  ) {}

  async execute(input: string): Promise<void> {
    // 1. 匹配相关 Skill
    const matchedSkills = this.skillRegistry.matchSkills(input);

    // 2. 构建 Prompt，包含 Skill 指令
    const prompt = await this.buildPromptWithSkills(input, matchedSkills);

    // 3. 调用 LLM
    const response = await this.llmExecutor.execute(prompt);

    // 4. 执行工具调用
    // ...

    // 5. 如果需要，执行 Skill 特定逻辑
    if (response.requiresSkillExecution) {
      await this.skillExecutor.execute(response.skillName, context);
    }
  }

  private async buildPromptWithSkills(
    input: string,
    skills: SkillMetadata[]
  ): Promise<string> {
    let prompt = input;

    for (const skill of skills) {
      const content = await this.skillRegistry.loadSkillContent(skill.name);
      prompt += `\n\n## Skill: ${skill.name}\n${content}`;
    }

    return prompt;
  }
}
```

### 4.3 DI 容器集成

**修改文件：** `sdk/core/di/container-config.ts`

**新增绑定：**

```typescript
// Skill 服务层
container.bind(Identifiers.SkillRegistry)
  .to(SkillRegistry)
  .inSingletonScope();

container.bind(Identifiers.SkillExecutor)
  .toDynamicValue((c: any) => {
    return new SkillExecutor(
      c.get(Identifiers.SkillRegistry),
      c.get(Identifiers.ToolService),
      c.get(Identifiers.EventManager)
    );
  })
  .inSingletonScope();

// 修改 AgentLoopExecutor 绑定
container.bind(Identifiers.AgentLoopExecutor)
  .toDynamicValue((c: any) => {
    return {
      create: () => {
        const llmExecutor = c.get(Identifiers.LLMExecutor);
        const toolService = c.get(Identifiers.ToolService);
        const skillRegistry = c.get(Identifiers.SkillRegistry);  // 新增
        const skillExecutor = c.get(Identifiers.SkillExecutor);  // 新增
        return new AgentLoopExecutor(llmExecutor, toolService, skillRegistry, skillExecutor);
      }
    };
  })
  .inSingletonScope();
```

### 4.4 Skill 目录组织

**推荐目录结构：**

```
modular-agent-framework/
├── skills/                    # Skill 根目录
│   ├── coding-patterns/      # 编码模式 Skill
│   │   ├── SKILL.md
│   │   ├── references/
│   │   └── examples/
│   ├── workflow-design/      # 工作流设计 Skill
│   │   ├── SKILL.md
│   │   └── examples/
│   └── testing-strategies/   # 测试策略 Skill
│       ├── SKILL.md
│       └── scripts/
└── apps/
    └── cli-app/
        └── skills/           # 应用级 Skill
            └── custom-skill/
                └── SKILL.md
```

**Skill 配置：**

在应用配置中指定 Skill 目录：

```typescript
interface AppConfig {
  skills: {
    paths: string[];          // Skill 目录路径列表
    autoScan: boolean;        // 是否自动扫描
    cacheEnabled: boolean;    // 是否启用缓存
  };
}
```

### 4.5 Skill 示例

#### 4.5.1 编码模式 Skill

**文件：** `skills/coding-patterns/SKILL.md`

```markdown
---
name: coding-patterns
description: This skill should be used when the user asks about "coding patterns", "best practices", "code architecture", or mentions specific design patterns.
version: 1.0.0
---

# Coding Patterns

## Core Concepts

This skill provides guidance on coding patterns and best practices for the Modular Agent Framework.

## Code Architecture

```
sdk/
├── core/          # Core execution logic
├── api/           # External API interfaces
├── graph/         # Graph execution engine
└── agent/         # Agent loop management
```

## Best Practices

- Use dependency injection for all services
- Follow the layered architecture pattern
- Implement proper error handling
- Write comprehensive tests

## When to Use

Use this skill when:
- Designing new features
- Refactoring existing code
- Reviewing code architecture
- Implementing design patterns
```

#### 4.5.2 工作流设计 Skill

**文件：** `skills/workflow-design/SKILL.md`

```markdown
---
name: workflow-design
description: This skill should be used when the user asks to "create a workflow", "design a workflow", "implement a workflow", or mentions workflow nodes and triggers.
version: 1.0.0
---

# Workflow Design

## Core Concepts

Workflows in the Modular Agent Framework are directed graphs that define execution flow.

## Workflow Components

- **Nodes**: Execution units (LLM, Tool, Script, etc.)
- **Edges**: Connections between nodes
- **Triggers**: Event-based workflow activation
- **Variables**: State management

## Design Patterns

### Sequential Workflow
```
Start -> Node1 -> Node2 -> Node3 -> End
```

### Parallel Workflow
```
Start -> Fork -> [Node1, Node2, Node3] -> Join -> End
```

## When to Use

Use this skill when:
- Creating new workflows
- Designing complex execution flows
- Implementing event-driven logic
- Managing workflow state
```

## 5. 实施计划

### 5.1 阶段一：基础架构（1-2 周）

**任务：**
1. 实现 `SkillRegistry` 服务
   - SKILL.md 解析器
   - 元数据管理
   - 目录扫描逻辑

2. 实现 `SkillExecutor` 服务
   - 执行上下文构建
   - 权限验证
   - 资源访问控制

3. 集成到 DI 容器
   - 添加服务标识符
   - 配置服务绑定
   - 编写单元测试

### 5.2 阶段二：Agent Loop 集成（1-2 周）

**任务：**
1. 修改 `AgentLoopExecutor`
   - 添加 Skill 匹配逻辑
   - 实现 Prompt 增强
   - 集成 Skill 执行

2. 实现 Skill 匹配算法
   - 基于描述的文本匹配
   - 基于关键词的匹配
   - 基于语义的匹配（可选）

3. 编写集成测试
   - 测试 Skill 发现
   - 测试 Skill 执行
   - 测试 Agent Loop 集成

### 5.3 阶段三：示例和文档（1 周）

**任务：**
1. 创建示例 Skill
   - 编码模式 Skill
   - 工作流设计 Skill
   - 测试策略 Skill

2. 编写用户文档
   - Skill 开发指南
   - Skill API 文档
   - 最佳实践

3. 编写开发者文档
   - 架构设计文档
   - 扩展指南
   - 贡献指南

### 5.4 阶段四：高级功能（可选）

**任务：**
1. Skill 缓存机制
   - 元数据缓存
   - 内容缓存
   - 资源缓存

2. Skill 版本管理
   - 版本兼容性检查
   - 版本升级策略
   - 依赖管理

3. Skill 市场（长期）
   - Skill 发布
   - Skill 发现
   - Skill 评分

## 6. 技术挑战和解决方案

### 6.1 Skill 发现性能

**挑战：**
- 大量 Skill 时扫描性能
- 频繁访问 SKILL.md 文件

**解决方案：**
- 实现元数据缓存
- 使用文件监听器（File Watcher）检测变更
- 懒加载 Skill 内容

### 6.2 Skill 匹配准确性

**挑战：**
- 如何准确匹配用户意图和 Skill
- 避免误匹配和漏匹配

**解决方案：**
- 使用多种匹配策略（关键词、语义、规则）
- 实现匹配评分机制
- 支持用户反馈优化

### 6.3 Skill 隔离性

**挑战：**
- 防止 Skill 之间相互干扰
- 控制 Skill 的资源访问

**解决方案：**
- 实现严格的权限控制
- 使用沙箱环境执行 Skill 脚本
- 限制 Skill 的工具访问

### 6.4 Skill 安全性

**挑战：**
- 防止恶意 Skill
- 保护敏感数据

**解决方案：**
- 实现 Skill 签名验证
- 限制 Skill 的文件系统访问
- 审计 Skill 执行日志

## 7. 兼容性考虑

### 7.1 Claude Code 兼容性

**遵循规范：**
- SKILL.md 格式完全兼容
- 目录结构兼容
- 自动发现机制兼容

**扩展功能：**
- 支持更多元数据字段
- 支持自定义资源类型
- 支持 Skill 依赖

### 7.2 Mini-Agent 兼容性

**遵循规范：**
- 最小化 Skill 支持
- 目录名匹配规则

**扩展功能：**
- 支持更丰富的资源类型
- 支持更复杂的执行逻辑

## 8. 测试策略

### 8.1 单元测试

**测试范围：**
- SKILL.md 解析器
- SkillRegistry 服务
- SkillExecutor 服务
- Skill 匹配算法

**测试工具：**
- Vitest
- Mock 文件系统

### 8.2 集成测试

**测试范围：**
- Agent Loop 集成
- DI 容器集成
- 事件系统集成

**测试工具：**
- Vitest
- 测试 fixtures

### 8.3 端到端测试

**测试范围：**
- 完整的 Skill 执行流程
- 多 Skill 协同
- 错误处理和恢复

**测试工具：**
- Vitest
- 测试 Skill 示例

## 9. 总结

### 9.1 核心价值

1. **增强 Agent 能力**：通过 Skill 提供 specialized 知识和操作
2. **提高开发效率**：复用 Skill 减少重复工作
3. **促进生态发展**：支持社区贡献和分享 Skill

### 9.2 实施建议

1. **渐进式实施**：先实现核心功能，再逐步完善
2. **保持兼容性**：严格遵循 Claude Code Skill 规范
3. **注重测试**：确保 Skill 系统的稳定性和可靠性
4. **完善文档**：降低 Skill 开发和使用门槛

### 9.3 后续工作

1. 实现基础架构（SkillRegistry、SkillExecutor）
2. 集成到 Agent Loop
3. 创建示例 Skill
4. 编写用户和开发者文档
5. 探索高级功能（缓存、版本管理、市场）

## 10. 参考资料

- [Claude Code Skill 规范](https://github.com/anthropics/claude-code)
- [Mini-Agent Skill 规范](ref/Mini-Agent/mini_agent/skills/agent_skills_spec.md)
- [Modular Agent Framework 架构文档](../architecture/)
- [DI 容器设计](../architecture/di-container-design.md)
