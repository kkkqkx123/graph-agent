# 模板系统简化指南

## 核心职责重新定义

### 模板的核心职责
1. **提示词组合** - 将预定义的提示词片段（系统提示词、规则、用户指令）组合成完整提示词
2. **变量替换** - 将运行时变量（如代码段）替换到模板中的占位符

### 需要移除的功能
1. **复杂的选项系统** - 通过创建新模板来实现不同选项，而非在模板内配置
2. **过度复杂的验证逻辑** - 简化变量验证，只保留基本的必需性检查
3. **不必要的抽象层** - 减少处理层级

## 简化方案

### 1. 简化TemplateProcessor职责

**当前复杂职责**:
- 支持两种模板类型（模板定义 vs 具体提示词）
- 复杂的变量验证和选项处理
- 多层级的模板组合机制

**简化后职责**:
- 单一职责：组合提示词片段和变量替换
- 移除模板类型区分
- 简化变量处理逻辑

### 2. 简化配置格式

**当前复杂的模板定义**:
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

[options]  # ← 需要移除
include_rules = { type = "boolean", default = true, description = "是否包含规则" }
```

**简化后的模板定义**:
```toml
# 核心模板定义
name = "code_review"
description = "代码审查模板"

# 简化的消息结构
[template]
# 直接定义要组合的提示词片段
system_prompt = "system.coder"        # 引用系统提示词
rules = "rules.format"                  # 引用规则提示词（可选）
user_command = "user_commands.code_review"  # 引用用户指令

# 模板内容，使用变量占位符
content = """
{{system_prompt}}

{{rules}}

{{user_command}}

代码：
{{code}}
"""

# 简化的变量定义
[variables]
code = { required = true, description = "要审查的代码" }
```

### 3. 移除选项系统，通过新模板实现

**当前使用选项的方式**:
```toml
[options]
include_rules = { type = "boolean", default = true }
```

**简化后的方式**（创建新模板）:
```toml
# 包含规则的版本
name = "code_review_with_rules"

[template]
system_prompt = "system.coder"
rules = "rules.format"  # 包含规则
user_command = "user_commands.code_review"

content = """
{{system_prompt}}

{{rules}}

{{user_command}}

代码：
{{code}}
"""

[variables]
code = { required = true }
```

```toml
# 不包含规则的版本
name = "code_review_without_rules"

[template]
system_prompt = "system.coder"
# 不包含rules字段
user_command = "user_commands.code_review"

content = """
{{system_prompt}}

{{user_command}}

代码：
{{code}}
"""

[variables]
code = { required = true }
```

## 简化后的TemplateProcessor实现

### 核心逻辑简化

```typescript
class SimplifiedTemplateProcessor {
    async processTemplate(
        category: string,
        name: string,
        variables: Record<string, unknown>
    ): Promise<TemplateProcessResult> {
        // 1. 加载模板定义
        const templateData = await this.promptService.loadPromptContent(category, name);
        
        // 2. 组合提示词片段
        const combinedParts = await this.combinePromptParts(templateData.template, variables);
        
        // 3. 变量替换
        const content = this.renderTemplate(templateData.content, {
            ...combinedParts,
            ...variables
        });
        
        return { content, variables };
    }
    
    private async combinePromptParts(
        templateConfig: any,
        variables: Record<string, unknown>
    ): Promise<Record<string, string>> {
        const parts: Record<string, string> = {};
        
        // 遍历模板配置，加载引用的提示词
        for (const [partName, promptRef] of Object.entries(templateConfig)) {
            if (typeof promptRef === 'string') {
                // 解析提示词引用格式："category.name"
                const [refCategory, refName] = promptRef.split('.');
                const partContent = await this.promptService.loadPromptContent(refCategory, refName);
                parts[partName] = partContent;
            }
        }
        
        return parts;
    }
    
    private renderTemplate(template: string, variables: Record<string, unknown>): string {
        let rendered = template;
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{{${key}}}`;
            const valueStr = value !== undefined && value !== null ? String(value) : '';
            rendered = rendered.replace(new RegExp(placeholder, 'g'), valueStr);
        }
        return rendered;
    }
}
```

## 具体使用场景示例

### 代码优化工作模板

```toml
name = "code_optimization"
description = "代码优化工作模板"

[template]
system_prompt = "system.code_optimizer"
optimization_rules = "rules.code_optimization"
user_command = "user_commands.optimize_code"

content = """
{{system_prompt}}

优化规则：
{{optimization_rules}}

{{user_command}}

需要优化的代码：
{{code}}

优化目标：
{{optimization_goal}}
"""

[variables]
code = { required = true, description = "需要优化的代码" }
optimization_goal = { required = false, description = "优化目标（性能、可读性等）" }
```

### 代码修复模板

```toml
name = "code_fix"
description = "代码修复模板"

[template]
system_prompt = "system.code_fixer"
fix_rules = "rules.code_fixing"
user_command = "user_commands.fix_code"

content = """
{{system_prompt}}

修复规则：
{{fix_rules}}

{{user_command}}

有问题的代码：
{{problematic_code}}

问题描述：
{{issue_description}}
"""

[variables]
problematic_code = { required = true, description = "有问题的代码" }
issue_description = { required = true, description = "问题描述" }
```

## 实施步骤

### 第一阶段：核心逻辑简化
1. **重构TemplateProcessor**
   - 移除模板类型区分逻辑
   - 简化变量验证，只保留必需性检查
   - 移除选项处理逻辑

2. **简化配置格式**
   - 移除options字段
   - 简化parts定义
   - 统一模板结构

### 第二阶段：模板迁移
1. **更新现有模板**
   - 将复杂模板拆分为多个简单模板
   - 移除选项配置
   - 统一使用新的简化格式

2. **创建专用模板**
   - 为常见场景创建专用模板
   - 优化变量定义
   - 确保模板的可复用性

### 第三阶段：优化和清理
1. **性能优化**
   - 实现模板缓存
   - 优化变量替换性能
   - 简化错误处理

2. **代码清理**
   - 移除无用代码
   - 简化接口定义
   - 更新测试用例

## 简化后的优势

### 1. 职责清晰
- 模板只负责组合提示词和变量替换
- 移除复杂的选项和验证逻辑

### 2. 配置简洁
- 模板定义更加直观
- 减少配置字段数量
- 提高可维护性

### 3. 扩展性增强
- 通过创建新模板实现不同变体
- 支持更灵活的场景适配
- 降低模板复杂度

### 4. 性能提升
- 减少不必要的处理逻辑
- 简化模板渲染流程
- 提高系统响应速度

## 总结

通过重新定义模板的核心职责为"提示词组合"和"变量替换"，并移除复杂的选项系统，可以显著简化模板系统的实现。这种简化不仅提高了系统的可维护性，还增强了模板的实用性和扩展性。

**核心原则**：模板应该专注于组合预定义的提示词片段和处理变量替换，复杂的配置选项应该通过创建新的专用模板来实现。