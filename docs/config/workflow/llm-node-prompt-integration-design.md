# LLM 节点提示词集成设计

## 设计目标

重新设计 LLM 节点与提示词系统的集成，明确模板和具体提示词的职责划分：

1. **模板定义编排方式**：定义变量替换、组合逻辑、消息结构
2. **具体提示词提供内容**：提供简单的内容片段，不包含编排逻辑
3. **应用时指定选项**：在 LLM 节点配置中指定模板和选项

## 架构设计

### 1. 职责划分

#### 模板（templates 目录）
- **职责**：定义编排方式、变量替换规则、消息结构
- **内容**：不包含具体提示词内容，只定义结构和规则
- **格式**：TOML 格式，定义模板结构

#### 具体提示词（system/rules/user_commands 目录）
- **职责**：提供具体的提示词内容片段
- **内容**：简单的内容，不包含编排逻辑
- **格式**：TOML 或 Markdown，保持简单

### 2. 目录结构

```
configs/prompts/
├── templates/           # 模板定义（编排方式）
│   ├── system.toml     # 系统提示词模板
│   ├── composite.toml  # 复合提示词模板
│   └── code_review.toml # 代码审查模板
├── system/             # 具体系统提示词
│   ├── coder/         # 代码生成专家
│   │   ├── index.toml # 基础角色定义
│   │   ├── 01_code_style.toml
│   │   └── 02_error_handling.toml
│   └── assistant.toml # 通用助手
├── rules/             # 具体规则提示词
│   ├── format.toml
│   └── safety.toml
└── user_commands/     # 具体用户指令
    ├── code_review.toml
    └── data_analysis.toml
```

## 模板设计

### 模板定义格式

模板应该定义编排方式，而不是具体内容：

```toml
# templates/composite.toml
name = "composite_template"
description = "复合提示词模板"
category = "templates"

[template]
# 定义消息结构
messages = [
    { role = "system", content = "{{system_prompt}}" },
    { role = "user", content = "{{user_prompt}}" }
]

[parts]
# 定义需要的部分
system_prompt = { type = "prompt", category = "system", required = true }
user_prompt = { type = "prompt", category = "user_commands", required = true }

[variables]
# 定义模板级变量
system_prompt_name = { type = "string", description = "系统提示词名称", required = true }
user_prompt_name = { type = "string", description = "用户指令名称", required = true }

[metadata]
role = "template"
priority = 1
```

### 代码审查模板示例

```toml
# templates/code_review.toml
name = "code_review_template"
description = "代码审查模板"
category = "templates"

[template]
messages = [
    { role = "system", content = "{{system_prompt}}" },
    { role = "system", content = "{{rules}}" },
    { role = "user", content = "{{user_command}}\n\n代码：\n{{code}}" }
]

[parts]
system_prompt = { type = "prompt", category = "system", required = true }
rules = { type = "prompt", category = "rules", required = false }
user_command = { type = "prompt", category = "user_commands", required = true }

[variables]
system_prompt_name = { type = "string", description = "系统提示词名称", required = true }
rules_names = { type = "array", description = "规则提示词名称列表", required = false }
user_command_name = { type = "string", description = "用户指令名称", required = true }
code = { type = "string", description = "要审查的代码", required = true }

[options]
# 模板选项
include_rules = { type = "boolean", default = true, description = "是否包含规则" }
```

## LLM 节点配置

### 使用模板的配置示例

```typescript
// 使用代码审查模板
{
  wrapperName: "openai:gpt-4",
  prompt: {
    type: "template",
    category: "templates",
    name: "code_review",
    options: {
      include_rules: true
    },
    variables: {
      system_prompt_name: "coder",
      rules_names: ["format", "safety"],
      user_command_name: "code_review",
      code: "function example() { return 42; }"
    }
  }
}
```

### 使用简单模板的配置

```typescript
// 使用系统提示词模板
{
  wrapperName: "openai:gpt-4",
  prompt: {
    type: "template",
    category: "templates",
    name: "system",
    variables: {
      system_prompt_name: "assistant"
    }
  }
}
```

### 直接使用具体提示词

```typescript
// 直接使用具体提示词
{
  wrapperName: "openai:gpt-4",
  prompt: {
    type: "direct",
    category: "system",
    name: "assistant"
  }
}
```

## PromptBuilder 更新

### 新的处理逻辑

1. **模板处理**：
   - 加载模板定义
   - 根据模板结构构建消息
   - 替换变量和引用具体提示词

2. **具体提示词处理**：
   - 加载简单的内容片段
   - 不包含编排逻辑

### 更新后的 PromptSource 类型

```typescript
export type PromptSource = 
  | { type: 'direct'; category: string; name: string }
  | { 
      type: 'template'; 
      category: string; 
      name: string; 
      options?: Record<string, any>;
      variables?: Record<string, any>;
    };
```

## 实现步骤

### 第一阶段：模板定义
1. 创建真正的模板定义文件
2. 更新 PromptBuilder 处理逻辑
3. 更新 LLM 节点配置接口

### 第二阶段：具体提示词
1. 恢复目录结构（已完成）
2. 确保具体提示词内容简单
3. 更新配置加载器优先级

### 第三阶段：集成测试
1. 测试模板+具体提示词的组合
2. 测试变量替换和编排逻辑
3. 类型检查和功能验证

## 优势

1. **清晰的职责划分**：模板定义编排，具体提示词提供内容
2. **灵活的配置**：应用时指定模板和选项
3. **可重用性**：模板可以组合不同的具体提示词
4. **易于维护**：具体提示词保持简单，编排逻辑集中管理

## 下一步

1. 创建真正的模板定义文件
2. 更新 PromptBuilder 以支持新的架构
3. 测试完整的集成流程