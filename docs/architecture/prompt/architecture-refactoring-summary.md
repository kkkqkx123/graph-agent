# 提示词系统架构重构总结

## 概述

本文档总结了提示词系统的架构重构过程，重点说明了如何通过职责分离和单一职责原则改进系统设计。

## 重构背景

### 原始架构问题

1. **PromptReferenceParser 职责过重**
   - 既负责引用格式解析
   - 又负责文件路径构建
   - 还负责文件系统查找逻辑

2. **违反单一职责原则**
   - 文件系统查找逻辑混入了引用解析器
   - Infrastructure 层的文件查找逻辑与引用解析耦合

3. **层次混乱**
   - 文件路径构建规则应该在 config loading 模块定义
   - 引用解析器应该只关注引用格式本身

## 重构目标

1. **职责分离**：每个类只负责一个明确的职责
2. **单一职责原则**：文件查找逻辑应该在 PromptRule 中定义
3. **层次清晰**：Infrastructure 层负责文件系统操作，引用解析器负责格式解析

## 重构后的架构

### 1. PromptReferenceParser（引用解析器）

**文件**: [`src/infrastructure/prompts/services/prompt-reference-parser.ts`](../../src/infrastructure/prompts/services/prompt-reference-parser.ts)

**职责**：
- 解析引用字符串（如 "system.coder" 或 "system.coder.code_style"）
- 验证引用格式的有效性
- 返回结构化的引用信息（category 和 name）

**不负责**：
- ❌ 文件路径构建
- ❌ 文件系统查找
- ❌ 文件存在性检查

**核心方法**：
```typescript
parse(reference: string): PromptReference
isValid(reference: string): boolean
getValidCategories(): string[]
```

### 2. PromptReferenceValidator（引用验证器）

**文件**: [`src/infrastructure/prompts/services/prompt-reference-validator.ts`](../../src/infrastructure/prompts/services/prompt-reference-validator.ts)

**职责**：
- 验证引用格式的有效性
- 提供详细的错误信息和错误代码
- 支持批量验证

**核心方法**：
```typescript
validate(reference: string): ValidationResult
validateBatch(references: string[]): Map<string, ValidationResult>
isValid(reference: string): boolean
```

### 3. PromptRule（配置规则）

**文件**: [`src/infrastructure/config/loading/rules/prompt-rule.ts`](../../src/infrastructure/config/loading/rules/prompt-rule.ts)

**职责**：
- 定义提示词模块的配置规则
- 定义文件匹配模式和 Schema 验证
- **提供文件路径构建规则**（新增）

**核心方法**：
```typescript
buildPossibleFilePaths(category: string, name: string): string[]
```

**路径构建规则**：
- 基本引用：`configs/prompts/{category}/{name}/index.toml` 或 `configs/prompts/{category}/{name}.toml`
- 复合引用：`configs/prompts/{category}/{composite}/{part}.toml` 或 `configs/prompts/{category}/{composite}/{序号}_{part}.toml`

### 4. PromptLoader（配置加载器）

**文件**: [`src/infrastructure/config/loading/loaders/prompt-loader.ts`](../../src/infrastructure/config/loading/loaders/prompt-loader.ts)

**职责**：
- 从 configs/prompts 目录加载提示词配置
- 支持复合提示词目录结构的智能查找
- 使用 PromptRule 的路径构建规则
- 处理文件系统操作

**核心方法**：
```typescript
findPromptByReference(category: string, name: string): Promise<Record<string, unknown> | null>
```

**改进点**：
- ✅ 使用 `buildPossibleFilePaths()` 从 PromptRule 获取可能的路径
- ✅ 按优先级尝试加载文件
- ✅ 移除了内部的路径构建逻辑

### 5. PromptService（提示词服务）

**文件**: [`src/application/prompts/services/prompt-service.ts`](../../src/application/prompts/services/prompt-service.ts)

**职责**：
- 提供提示词管理、查询功能
- 使用 PromptLoader 加载提示词内容
- 支持从已加载配置和文件系统查找

**核心方法**：
```typescript
loadPromptContent(category: string, name: string): Promise<Record<string, unknown> | string>
promptExists(category: string, name: string): Promise<boolean>
```

**改进点**：
- ✅ 注入 PromptLoader 依赖
- ✅ 优先从已加载配置查找
- ✅ 备选使用 PromptLoader 直接查找文件

### 6. TemplateProcessor（模板处理器）

**文件**: [`src/infrastructure/prompts/services/template-processor.ts`](../../src/infrastructure/prompts/services/template-processor.ts)

**职责**：
- 提示词组合（组合预定义的提示词片段）
- 变量替换（将运行时变量替换到模板占位符）

**核心方法**：
```typescript
processTemplate(category: string, name: string, variables: Record<string, unknown>): Promise<TemplateProcessResult>
```

**改进点**：
- ✅ 使用 PromptReferenceParser 解析引用
- ✅ 使用 PromptReferenceValidator 验证引用
- ✅ 使用 PromptService 加载提示词内容

## 架构层次关系

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                      │
│  ┌───────────────────────────────────────────────────┐  │
│  │              PromptService                         │  │
│  │  - 提示词管理                                     │  │
│  │  - 使用 PromptLoader 加载内容                     │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                  Infrastructure Layer                    │
│  ┌───────────────────────────────────────────────────┐  │
│  │            TemplateProcessor                       │  │
│  │  - 提示词组合                                     │  │
│  │  - 变量替换                                       │  │
│  │  - 使用 PromptReferenceParser                     │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │         PromptReferenceParser                      │  │
│  │  - 引用格式解析                                   │  │
│  │  - 引用格式验证                                   │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │         PromptReferenceValidator                   │  │
│  │  - 引用验证                                       │  │
│  │  - 错误处理                                       │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │              PromptLoader                          │  │
│  │  - 文件系统操作                                   │  │
│  │  - 使用 PromptRule 的路径构建规则                 │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │               PromptRule                           │  │
│  │  - 配置规则定义                                   │  │
│  │  - Schema 验证                                    │  │
│  │  - 文件路径构建规则（新增）                        │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 职责分离对比

### 重构前

```
PromptReferenceParser
├── 引用格式解析 ✅
├── 引用格式验证 ✅
├── 文件路径构建 ❌（不应该在这里）
└── 文件系统查找 ❌（不应该在这里）
```

### 重构后

```
PromptReferenceParser
├── 引用格式解析 ✅
└── 引用格式验证 ✅

PromptRule
├── 配置规则定义 ✅
├── Schema 验证 ✅
└── 文件路径构建规则 ✅（新增）

PromptLoader
├── 文件系统操作 ✅
└── 使用 PromptRule 的路径构建规则 ✅
```

## 依赖注入配置

### 新增依赖

```typescript
// src/di/bindings/application-bindings.ts
bind(TYPES.PromptLoader)
  .to(PromptLoader)
  .inSingletonScope();

// src/di/bindings/infrastructure-bindings.ts
bind(TYPES.PromptReferenceParser)
  .to(PromptReferenceParser)
  .inSingletonScope();

bind(TYPES.PromptReferenceValidator)
  .to(PromptReferenceValidator)
  .inSingletonScope();
```

### PromptService 依赖更新

```typescript
constructor(
  private readonly promptRepository: PromptRepository,
  private readonly promptLoader: PromptLoader  // 新增依赖
)
```

## 使用示例

### 1. 引用解析

```typescript
const parser = new PromptReferenceParser(logger);
const ref = parser.parse('system.coder.code_style');

console.log(ref.category); // 'system'
console.log(ref.name); // 'coder.code_style'
```

### 2. 引用验证

```typescript
const validator = new PromptReferenceValidator(logger);
const result = validator.validate('system.coder');

if (result.valid) {
  console.log('引用格式正确');
} else {
  console.error('引用格式错误:', result.error);
}
```

### 3. 文件路径构建

```typescript
import { buildPossibleFilePaths } from '../rules/prompt-rule';

const paths = buildPossibleFilePaths('system', 'coder.code_style');
// 返回: [
//   'configs/prompts/system/coder/code_style.toml',
//   'configs/prompts/system/coder/01_code_style.toml',
//   'configs/prompts/system/coder/02_code_style.toml',
//   ...
// ]
```

### 4. 文件查找

```typescript
const loader = new PromptLoader(logger);
const content = await loader.findPromptByReference('system', 'coder.code_style');

if (content) {
  console.log('找到提示词:', content);
} else {
  console.log('未找到提示词');
}
```

## 优势分析

### 1. 单一职责原则

- **PromptReferenceParser**: 只负责引用格式解析
- **PromptRule**: 只负责配置规则和路径构建规则
- **PromptLoader**: 只负责文件系统操作

### 2. 可维护性提升

- 每个类的职责清晰明确
- 修改文件查找逻辑只需修改 PromptRule
- 修改引用解析逻辑只需修改 PromptReferenceParser

### 3. 可测试性增强

- 可以独立测试引用解析逻辑
- 可以独立测试文件查找逻辑
- 可以独立测试路径构建规则

### 4. 扩展性改善

- 添加新的文件路径规则只需修改 PromptRule
- 添加新的引用格式只需修改 PromptReferenceParser
- 各组件可以独立演进

## 迁移指南

### 从旧架构迁移到新架构

1. **更新 PromptReferenceParser 使用**
   ```typescript
   // 旧代码
   const parser = new PromptReferenceParser(logger);
   const filePath = parser.parse('system.coder').filePath;
   
   // 新代码
   const parser = new PromptReferenceParser(logger);
   const ref = parser.parse('system.coder');
   const paths = buildPossibleFilePaths(ref.category, ref.name);
   ```

2. **更新 PromptLoader 使用**
   ```typescript
   // 旧代码（如果有）
   const loader = new PromptLoader(logger);
   const paths = loader.buildPossibleFilePaths(category, name);
   
   // 新代码
   import { buildPossibleFilePaths } from '../rules/prompt-rule';
   const paths = buildPossibleFilePaths(category, name);
   ```

3. **更新 PromptService 依赖注入**
   ```typescript
   // 旧代码
   const service = new PromptService(promptRepository);
   
   // 新代码
   const service = new PromptService(promptRepository, promptLoader);
   ```

## 总结

通过本次架构重构，我们实现了以下目标：

1. ✅ **职责分离**：每个类都有明确的单一职责
2. ✅ **单一职责原则**：文件查找逻辑在 PromptRule 中定义
3. ✅ **层次清晰**：Infrastructure 层负责文件系统操作，引用解析器负责格式解析
4. ✅ **可维护性提升**：代码结构更清晰，易于理解和修改
5. ✅ **可测试性增强**：各组件可以独立测试
6. ✅ **扩展性改善**：各组件可以独立演进

**核心原则**：
- 引用解析器只关注引用格式本身
- 文件路径构建规则在配置规则中定义
- 文件系统操作由加载器负责
- 各组件通过依赖注入协作

## 后续优化建议

1. **性能优化**
   - 实现文件路径缓存
   - 实现提示词内容缓存
   - 优化文件系统访问

2. **功能增强**
   - 支持更多文件格式（JSON、YAML）
   - 支持动态提示词加载
   - 支持提示词版本管理

3. **工具支持**
   - 提供配置验证工具
   - 提供引用自动补全
   - 提供文档生成工具