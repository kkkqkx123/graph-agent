# 提示词配置说明

本目录包含工作流中使用的提示词模板和配置。

## 目录结构

```
prompts/
├── templates/          # TOML 格式的模板配置
│   ├── code_review.toml
│   └── assistant.toml
├── system/            # 系统提示词（Markdown 格式）
│   └── assistant.md
├── rules/             # 规则提示词（Markdown 格式）
│   ├── format.md
│   └── safety.md
└── user_commands/     # 用户指令提示词（Markdown 格式）
    ├── code_review.md
    └── data_analysis.md
```

## 模板格式

### TOML 模板（推荐）

TOML 模板提供结构化的配置，支持变量定义和元数据。

```toml
name = "template_name"
description = "模板描述"
category = "category_name"

[template]
content = """
这是提示词内容，支持变量替换：
{{variable1}}
{{variable2}}
"""

[variables]
variable1 = { type = "string", description = "变量1描述", required = true }
variable2 = { type = "string", description = "变量2描述", required = false, default = "默认值" }
```

### Markdown 模板

Markdown 模板用于简单的提示词内容。

```markdown
---
description: 模板描述
---

这是提示词内容，支持变量替换：
{{variable}}
```

## 在 LLM 节点中使用

### 使用 TOML 模板

```typescript
{
  wrapperName: "openai:gpt-4",
  prompt: {
    type: "template",
    category: "templates",
    name: "code_review"
  },
  variables: {
    code: "function example() { return 42; }",
    language: "javascript"
  }
}
```

### 使用 Markdown 模板

```typescript
{
  wrapperName: "openai:gpt-4",
  prompt: {
    type: "template",
    category: "system",
    name: "assistant"
  }
}
```

### 使用直接内容

```typescript
{
  wrapperName: "openai:gpt-4",
  prompt: {
    type: "direct",
    content: "请帮我分析这段代码：{{code}}"
  },
  variables: {
    code: "function example() { return 42; }"
  }
}
```

## 上下文处理器

LLM 节点支持上下文处理器来过滤和转换变量：

```typescript
{
  wrapperName: "openai:gpt-4",
  prompt: {
    type: "template",
    category: "templates",
    name: "code_review"
  },
  contextProcessor: "llm",  // 使用 llm 上下文处理器
  variables: {
    code: "..."
  }
}
```

内置的上下文处理器：
- `llm` - 过滤 LLM 相关变量（llm.*, prompt.*, model.*）
- `system` - 保留系统级变量（system.*, config.*, env.*）
- `tool` - 过滤工具相关变量
- `human` - 过滤人工交互相关变量
- `pass-through` - 不做任何过滤
- `isolate` - 隔离模式，不传递任何变量

## 变量替换

模板支持 `{{variable}}` 格式的变量替换。变量来源：
1. 节点配置中的 `variables` 字段
2. 工作流执行上下文中的变量
3. 上下文处理器过滤后的变量

## 最佳实践

1. **使用 TOML 模板**：结构化配置更易于维护
2. **定义变量类型**：在 TOML 模板中明确定义变量类型和描述
3. **使用上下文处理器**：过滤敏感或不必要的变量
4. **分类管理**：按功能分类组织模板（system, rules, user_commands 等）
5. **添加描述**：为模板添加清晰的描述信息