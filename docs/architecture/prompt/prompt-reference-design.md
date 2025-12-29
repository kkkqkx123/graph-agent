# 提示词引用规范设计

## 设计目标

### 核心需求
1. **明确的文件引用** - 通过配置能够明确知道引用的是哪个具体文件
2. **统一的命名规范** - 建立清晰的命名规则和解析规则
3. **简化的解析逻辑** - 减少解析复杂度，提高可维护性

### 设计原则
- **一致性**：所有提示词引用遵循相同的命名规范
- **可读性**：命名能够直观反映文件位置和用途
- **简洁性**：避免过度复杂的解析逻辑

## 命名规范设计

### 1. 文件组织结构规范

```
configs/prompts/
├── system/           # 系统提示词
│   ├── coder.toml    # 代码相关系统提示词
│   ├── analyzer.toml # 分析相关系统提示词
│   └── assistant.toml # 助手相关系统提示词
├── rules/            # 规则提示词
│   ├── format.toml   # 格式规则
│   ├── safety.toml   # 安全规则
│   └── quality.toml  # 质量规则
├── user_commands/    # 用户指令
│   ├── code_review.toml
│   ├── code_optimization.toml
│   └── data_analysis.toml
└── templates/         # 模板定义
    ├── code_review.toml
    ├── code_fix.toml
    └── code_optimization.toml
```

### 2. 引用格式规范

#### 基本引用格式
```
{category}.{name}
```

**示例**:
- `system.coder` → 引用 `configs/prompts/system/coder.toml`
- `rules.format` → 引用 `configs/prompts/rules/format.toml`
- `user_commands.code_review` → 引用 `configs/prompts/user_commands/code_review.toml`

#### 复合提示词引用格式
对于包含多个部分的复合提示词：
```
{category}.{composite_name}.{part_name}
```

**示例**:
- `system.coder.code_style` → 引用 `configs/prompts/system/coder/01_code_style.toml`
- `system.coder.error_handling` → 引用 `configs/prompts/system/coder/02_error_handling.toml`

### 3. 模板配置中的引用规范

```toml
name = "code_review"
description = "代码审查模板"

[template]
# 使用统一的引用格式
system_prompt = "system.coder"
rules = "rules.format"
user_command = "user_commands.code_review"

content = """
{{system_prompt}}

{{rules}}

{{user_command}}

代码：
{{code}}
"""

[variables]
code = { required = true, description = "要审查的代码" }
```

## 解析规范设计

### 1. 引用解析器设计

```typescript
class PromptReferenceParser {
    /**
     * 解析提示词引用
     * @param reference 引用字符串，格式："category.name" 或 "category.composite.part"
     * @returns 解析结果
     */
    parse(reference: string): PromptReference {
        const parts = reference.split('.');
        
        if (parts.length < 2) {
            throw new Error(`无效的提示词引用格式: ${reference}`);
        }
        
        const category = parts[0];
        const name = parts.slice(1).join('.');
        
        return {
            category,
            name,
            filePath: this.buildFilePath(category, name)
        };
    }
    
    /**
     * 构建文件路径
     */
    private buildFilePath(category: string, name: string): string {
        // 处理复合提示词
        if (name.includes('.')) {
            const [compositeName, partName] = name.split('.');
            return `configs/prompts/${category}/${compositeName}/${partName}.toml`;
        }
        
        return `configs/prompts/${category}/${name}.toml`;
    }
}

interface PromptReference {
    category: string;
    name: string;
    filePath: string;
}
```

### 2. 模板处理器中的引用解析集成

```typescript
class SimplifiedTemplateProcessor {
    private referenceParser = new PromptReferenceParser();
    
    async processTemplate(
        category: string,
        name: string,
        variables: Record<string, unknown>
    ): Promise<TemplateProcessResult> {
        const templateData = await this.promptService.loadPromptContent(category, name);
        
        // 解析模板中的引用
        const combinedParts = await this.resolveReferences(templateData.template, variables);
        
        const content = this.renderTemplate(templateData.content, {
            ...combinedParts,
            ...variables
        });
        
        return { content, variables };
    }
    
    private async resolveReferences(
        templateConfig: Record<string, string>,
        variables: Record<string, unknown>
    ): Promise<Record<string, string>> {
        const parts: Record<string, string> = {};
        
        for (const [partName, reference] of Object.entries(templateConfig)) {
            try {
                const ref = this.referenceParser.parse(reference);
                const content = await this.promptService.loadPromptContent(ref.category, ref.name);
                parts[partName] = content;
            } catch (error) {
                throw new Error(`无法解析提示词引用 ${reference}: ${error.message}`);
            }
        }
        
        return parts;
    }
}
```

### 3. 错误处理和验证

```typescript
class PromptReferenceValidator {
    private validCategories = ['system', 'rules', 'user_commands', 'templates'];
    
    /**
     * 验证引用格式
     */
    validate(reference: string): ValidationResult {
        const parts = reference.split('.');
        
        // 基本格式验证
        if (parts.length < 2) {
            return { valid: false, error: '引用格式必须包含类别和名称' };
        }
        
        const category = parts[0];
        
        // 类别验证
        if (!this.validCategories.includes(category)) {
            return { 
                valid: false, 
                error: `无效的类别: ${category}，有效类别: ${this.validCategories.join(', ')}` 
            };
        }
        
        // 名称验证（不能包含特殊字符）
        const nameParts = parts.slice(1);
        for (const part of nameParts) {
            if (!/^[a-zA-Z0-9_-]+$/.test(part)) {
                return { 
                    valid: false, 
                    error: `名称包含无效字符: ${part}` 
                };
            }
        }
        
        return { valid: true };
    }
}

interface ValidationResult {
    valid: boolean;
    error?: string;
}
```

## 配置示例

### 1. 系统提示词配置

```toml
# configs/prompts/system/coder.toml
name = "coder"
description = "代码生成专家系统提示词"

content = """
你是一个代码生成专家，负责生成高质量、可维护的代码。
请遵循以下原则：
1. 代码简洁明了
2. 遵循最佳实践
3. 考虑性能和安全性
"""

[metadata]
role = "system"
priority = 1
```

### 2. 规则提示词配置

```toml
# configs/prompts/rules/format.toml
name = "format"
description = "输出格式规则"

content = """
请遵循以下输出格式规则：
- 使用清晰的段落结构
- 适当使用列表和标题组织内容
- 代码示例使用代码块格式
- 确保回答简洁明了，重点突出
"""

[metadata]
role = "system"
priority = 2
```

### 3. 用户指令配置

```toml
# configs/prompts/user_commands/code_review.toml
name = "code_review"
description = "代码审查用户指令"

content = """
请对提供的代码进行审查，并给出以下内容：
1. 代码质量评估
2. 潜在问题和改进建议
3. 最佳实践建议
4. 安全性检查结果
"""

[metadata]
role = "user"
priority = 3
```

### 4. 模板配置

```toml
# configs/prompts/templates/code_review.toml
name = "code_review"
description = "代码审查模板"

[template]
# 使用统一的引用格式
system_prompt = "system.coder"
rules = "rules.format"
user_command = "user_commands.code_review"

content = """
{{system_prompt}}

{{rules}}

{{user_command}}

代码：
{{code}}
"""

[variables]
code = { required = true, description = "要审查的代码" }
```

## 实施指南

### 1. 第一阶段：建立规范
1. **制定命名规范** - 明确文件命名规则和引用格式
2. **创建解析器** - 实现统一的引用解析逻辑
3. **更新现有配置** - 将现有配置转换为新规范

### 2. 第二阶段：集成验证
1. **集成验证逻辑** - 在模板处理器中集成引用验证
2. **错误处理优化** - 提供清晰的错误信息和调试信息
3. **测试覆盖** - 确保所有引用格式都能正确解析

### 3. 第三阶段：优化和文档
1. **性能优化** - 实现引用缓存和预加载
2. **文档完善** - 编写详细的配置指南和示例
3. **工具支持** - 提供配置验证工具和模板生成工具

## 优势分析

### 1. 明确性
- 通过引用格式能够明确知道具体引用哪个文件
- 减少了配置的歧义性

### 2. 可维护性
- 统一的命名规范便于理解和维护
- 清晰的解析逻辑降低了调试难度

### 3. 扩展性
- 支持复合提示词引用
- 便于添加新的类别和类型

### 4. 错误处理
- 提供详细的错误信息和验证
- 便于快速定位配置问题

## 总结

通过设计统一的命名规范和解析规范，可以显著提高提示词系统的可维护性和可扩展性。这种设计不仅明确了文件引用关系，还简化了配置的复杂度，为后续的系统优化奠定了良好的基础。

**核心价值**：统一的规范 + 清晰的解析 = 可维护的配置系统