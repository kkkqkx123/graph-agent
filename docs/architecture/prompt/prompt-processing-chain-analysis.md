# 提示词处理链条分析

## 概述

本文档分析当前项目的提示词处理链条，包括配置加载、模板处理、提示词构建等关键环节。

## 整体架构

### 提示词处理流程

```
配置加载 (ConfigLoadingModule) → PromptLoader → PromptRule → ConfigManager
    ↓
模板处理 (TemplateProcessor) → PromptService → PromptRepository
    ↓
提示词构建 (PromptBuilder) → LLM消息构建 → 工作流执行
```

### 核心组件关系

- **配置层**: `PromptLoader` + `PromptRule` - 负责加载和验证提示词配置
- **应用层**: `PromptService` - 提供提示词管理功能
- **处理层**: `TemplateProcessor` + `PromptBuilder` - 负责模板处理和消息构建
- **领域层**: `Prompt`实体及相关值对象 - 定义提示词的核心概念

## 配置加载流程分析

### PromptLoader (`src/infrastructure/config/loading/loaders/prompt-loader.ts`)

**职责**:
- 从 `configs/prompts` 目录加载提示词配置
- 支持 `.md` 和 `.toml` 文件格式
- 根据文件路径调整优先级（模板 > 系统 > 规则 > 用户命令 > 上下文 > 示例）
- 按类别分组配置

**关键特性**:
- 文件优先级调整机制
- 类别自动提取（从文件路径）
- 支持复合提示词目录（index文件）

### PromptRule (`src/infrastructure/config/loading/rules/prompt-rule.ts`)

**职责**:
- 定义提示词模块的配置规则
- 指定文件匹配模式：`prompts/**/*.md`, `prompts/**/*.toml`
- 提供Schema验证

**Schema结构**:
```typescript
{
  templates: {
    name: string,
    description: string,
    template: string,
    variables: {
      type: string,
      description: string,
      required: boolean,
      default: any
    }
  },
  categories: {
    description: string,
    templates: string[]
  }
}
```

## 模板处理流程分析

### TemplateProcessor (`src/infrastructure/prompts/services/template-processor.ts`)

**职责**:
- 处理模板定义和编排逻辑
- 支持模板定义文件和具体提示词文件
- 变量验证和选项处理
- 部分加载和组合

**处理流程**:
1. **识别模板类型**: 检查是否为模板定义或具体提示词
2. **变量验证**: 验证必需变量是否提供
3. **选项处理**: 应用模板选项和默认值
4. **部分组合**: 加载和组合模板部分
5. **模板渲染**: 使用变量渲染最终内容

**支持的文件类型**:
- **模板定义文件**: 包含 `template.messages` 结构
- **具体提示词文件**: 包含 `content` 字段

## 提示词构建流程分析

### PromptBuilder (`src/infrastructure/prompts/services/prompt-builder.ts`)

**职责**:
- 在工作流执行过程中构建提示词消息
- 处理不同类型的提示词来源（直接内容 vs 模板）
- 应用上下文处理器
- 渲染模板变量

**构建流程**:
1. **来源识别**: 区分直接内容和模板
2. **内容获取**: 从PromptService加载内容
3. **上下文处理**: 应用注册的上下文处理器
4. **模板渲染**: 替换 `{{variable}}` 格式的变量
5. **消息构建**: 创建LLM消息结构

**支持的提示词来源**:
- `direct`: 直接提供的内容
- `template`: 基于模板和变量的动态构建

## Domain层定义分析

### Prompt实体 (`src/domain/prompts/entities/prompt.ts`)

**核心属性**:
- `id`: 提示词唯一标识
- `name`: 名称
- `type`: 类型（系统、规则、用户命令等）
- `content`: 内容
- `category`: 类别
- `metadata`: 元数据
- `variables`: 变量定义

**业务方法**:
- `activate()`: 激活提示词
- `deactivate()`: 禁用提示词
- `updateContent()`: 更新内容（带验证）

### PromptType枚举 (`src/domain/prompts/value-objects/prompt-type.ts`)

**支持的提示词类型**:
- `SYSTEM`: 系统提示词
- `RULES`: 规则提示词
- `USER_COMMAND`: 用户指令
- `CONTEXT`: 上下文
- `EXAMPLES`: 示例
- `CONSTRAINTS`: 约束
- `FORMAT`: 格式
- `CUSTOM`: 自定义

## 配置结构分析

### 配置文件组织

```
configs/prompts/
├── rules/           # 规则提示词
│   ├── format.toml
│   └── safety.toml
├── system/           # 系统提示词
│   ├── assistant.toml
│   └── coder/
│       ├── index.toml
│       ├── 01_code_style.toml
│       └── 02_error_handling.toml
├── templates/        # 模板定义
│   ├── code_review.toml
│   └── composite.toml
└── user_commands/   # 用户指令
    ├── code_review.toml
    └── data_analysis.toml
```

### 模板定义示例 (`configs/prompts/templates/code_review.toml`)

```toml
name = "code_review_template"
description = "代码审查模板"
category = "templates"

[template]
messages = [
    { role = "system", content = "{{system_prompt}}" },
    { role = "system", content = "{{rules}}" },
    { role = "user", content = "{{user_command}}\n\n代码：\n{{code}}" },
]

[parts]
system_prompt = { type = "prompt", category = "system", required = true }
rules = { type = "prompt", category = "rules", required = false }
user_command = { type = "prompt", category = "user_commands", required = true }

[variables]
code = { type = "string", description = "要审查的代码", required = true }

[options]
include_rules = { type = "boolean", default = true, description = "是否包含规则" }
```

## 当前实现存在的问题分析

### 1. 模板选项和变量逻辑限制

**问题描述**:
- 模板中的 `options` 和 `variables` 逻辑过于复杂
- 选项和变量的边界不清晰
- 缺乏统一的变量处理策略

**具体表现**:
- `TemplateProcessor` 中同时处理模板选项和变量
- 选项配置与变量定义存在重叠
- 缺乏清晰的变量作用域管理

### 2. 模板组合能力有限

**问题描述**:
- 当前模板只能通过 `parts` 机制组合其他提示词
- 缺乏动态模板嵌套和条件组合能力
- 模板复用性受限

**具体表现**:
- 模板组合是静态的，无法根据运行时条件动态调整
- 缺乏模板继承和扩展机制
- 复杂的多步骤提示词需要多个模板文件

### 3. 变量替换机制简单

**问题描述**:
- 当前使用简单的 `{{variable}}` 替换
- 缺乏类型检查和格式验证
- 不支持复杂的变量表达式

**具体表现**:
- 变量替换是纯文本替换，无类型安全
- 不支持条件变量、循环变量等高级特性
- 变量错误处理机制不完善

### 4. 预置提示词+变量替换的潜力未充分利用

**问题描述**:
- 当前实现没有充分利用预置提示词+变量替换的模式
- 缺乏针对特定场景（如代码修复）的优化模板

**改进方向**:
- 设计专门的修复问题模板，支持代码段作为变量
- 实现更灵活的模板变量系统
- 支持模板片段和组合

## 改进建议

### 1. 简化模板选项和变量逻辑

**建议**:
- 统一变量处理接口
- 明确选项和变量的职责边界
- 提供更简洁的模板定义语法

### 2. 增强模板组合能力

**建议**:
- 支持动态模板选择和条件组合
- 实现模板继承机制
- 提供模板片段复用功能

### 3. 改进变量替换机制

**建议**:
- 增加变量类型检查和验证
- 支持复杂的变量表达式
- 提供更好的错误处理和调试信息

### 4. 优化预置提示词模式

**建议**:
- 设计专门的场景模板（如代码修复、数据分析等）
- 支持代码段作为变量的特殊处理
- 提供模板性能优化机制

## 总结

当前提示词处理链条设计合理，分层清晰，但在模板灵活性、变量处理和组合能力方面还有改进空间。建议重点关注模板系统的简化和增强，以支持更复杂的提示词场景。