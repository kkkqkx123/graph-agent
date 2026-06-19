# ROUTE 节点条件表达能力增强

## 背景

当前 ROUTE 节点的 Condition 类型仅支持 expression 字符串，使用简单的表达式语言。在复杂的工作流场景中，这导致两个问题：

1. **条件表达复杂**：复杂的逻辑判断需要写冗长的表达式，易出错
2. **可读性差**：特别是对非技术用户，条件语义不清晰

为应对这些场景，需要扩展支持更多的条件类型。

---

## 问题示例

### 当前方式（表达式）
```
condition.expression = "variables.status === 'pending' && variables.priority > 5 && variables.timestamp < Date.now()"
```

缺点：
- 长、复杂、难维护
- 容易写错操作符或类型
- 调试时难以理解条件的语义

### 需要支持的场景

1. **简单谓词检查**（isEmpty、isNotEmpty、isNull 等）
2. **脚本条件**（自定义 JavaScript 逻辑）
3. **数据结构验证**（JSON Schema）

---

## 提议的增强

### 扩展 Condition 类型

支持以下条件类型（现有 expression 作为默认）：

1. **Predicate（谓词）**
   - 用于单个变量的一元检查
   - 支持：isEmpty、isNotEmpty、isNull、isNotNull、isTrue、isFalse
   - 易于理解，不需要写表达式

2. **Script（脚本）**
   - 允许自定义 JavaScript 代码
   - 返回布尔值
   - 用于复杂的条件逻辑

3. **Schema（JSON Schema 验证）**
   - 用于结构化数据验证
   - 定义数据应满足的结构约束
   - 易于组合和重用

### 使用示例

**谓词条件**（更清晰）：
```
type: 'predicate'
predicateType: 'isEmpty'
variable: 'query'
```
比写 `expression: "!variables.query || variables.query.length === 0"` 清晰得多。

**脚本条件**（复杂逻辑）：
```
type: 'script'
script: |
  return variables.status === 'pending' && 
         variables.priority > 5 && 
         variables.timestamp < Date.now()
```

**Schema 条件**（数据验证）：
```
type: 'schema'
variable: 'userData'
schema: {
  type: 'object',
  required: ['name', 'email'],
  properties: {
    name: { type: 'string', minLength: 1 },
    email: { type: 'string', format: 'email' }
  }
}
```

---

## 实施计划

### Phase 1：类型定义和扩展（优先级：中等）

在 `packages/types/src/condition.ts` 中：
- 扩展 Condition 接口支持新的条件类型
- 定义 PredicateCondition、ScriptCondition、SchemaCondition
- 添加类型守卫函数（isPredicateCondition 等）

### Phase 2：条件评估器（优先级：中等）

创建统一的条件评估器：
- 支持所有条件类型的评估
- 提供清晰的错误信息（哪个变量不存在、值是什么）
- 缓存编译的脚本和 Schema 验证器以提高性能

### Phase 3：节点验证（优先级：低）

在编译时验证 ROUTE 节点：
- 检查条件语法（脚本、Schema）
- 可选：检查路由规则是否互斥
- 可选：检查是否覆盖所有情况

### Phase 4：开发体验（优先级：低）

- 为每种条件类型提供示例
- 文档说明各种条件类型的适用场景
- 可选：条件生成工具或 IDE 支持

---

## 向后兼容性

新增条件类型不影响现有的 expression 条件，默认保持原有行为。

---

## 风险与考量

1. **脚本执行安全**：Script 条件执行自定义代码，需要确保沙箱隔离
2. **性能**：Schema 验证库（如 ajv）的依赖和性能开销
3. **复杂性**：支持过多条件类型可能增加维护成本，需在表现力和简洁性间平衡

---

## 优先级与收益

**优先级**：中等（可用性改进，不影响核心功能）

**收益**：
- 条件表达更清晰易读
- 减少复杂表达式导致的错误
- 为非技术用户提供更友好的选项

