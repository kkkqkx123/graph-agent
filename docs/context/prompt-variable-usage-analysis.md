# 提示词模块变量使用分析

## 1. 当前实现分析

### 1.1 PromptContext.render() 方法

```typescript
public render(variables?: Map<string, unknown>): string {
  let rendered = this.props.template;

  if (variables) {
    // 替换 {{variable}} 格式的变量
    for (const [key, value] of variables.entries()) {
      const placeholder = `{{${key}}}`;
      const valueStr = value !== undefined && value !== null ? String(value) : '';
      rendered = rendered.replace(new RegExp(placeholder, 'g'), valueStr);
    }
  }

  return rendered;
}
```

**特点**：
- PromptContext 不再包含 variables 字段
- render() 方法接受外部传入的 variables 参数
- 使用 variables 进行模板变量替换

### 1.2 ContextProcessor 接口

```typescript
export type ContextProcessor = (
  context: PromptContext,
  variables: Map<string, unknown>,
  config?: Record<string, unknown>
) => { context: PromptContext; variables: Map<string, unknown> };
```

**特点**：
- ContextProcessor 接受外部传入的 variables 参数
- 返回处理后的 context 和 variables
- 可以对 variables 进行过滤和转换

### 1.3 prompt-builder.ts 使用方式

```typescript
// 创建 PromptContext（不包含variables）
const promptContext = PromptContext.create(content);

// 应用处理器
const processor = contextProcessors.get(contextProcessorName);
if (processor) {
  const result = processor(promptContext, processedVariables);
  // 处理器返回处理后的context和variables
  processedContext = { ...context, ...Object.fromEntries(result.variables.entries()) };
  processedVariables = result.variables;
}

// 渲染模板
return this.renderTemplate(content, processedContext);
```

**特点**：
- 创建 PromptContext 时不传入 variables
- 使用 ContextProcessor 处理 variables
- 使用处理后的 variables 渲染模板

## 2. 变量来源分析

### 2.1 变量来源

根据当前实现，提示词模块使用的变量来自：

1. **ExecutionContext.variables**（全局执行变量）
   - 这是主要的变量来源
   - 包含线程执行过程中的全局数据
   - 所有节点共享

2. **ContextProcessor 处理后的变量**
   - ContextProcessor 可以对变量进行过滤和转换
   - 例如：只保留特定前缀的变量（tool.*、system.*等）

### 2.2 变量流向

```
ExecutionContext.variables (全局变量)
    ↓
ContextProcessor (过滤和转换)
    ↓
PromptContext.render() (模板渲染)
    ↓
LLM 提示词
```

## 3. 设计合理性分析

### 3.1 优点

1. **职责清晰**
   - PromptContext 只负责模板管理和历史记录
   - 变量管理由 ExecutionContext 和 VariableManager 负责
   - 符合单一职责原则

2. **灵活性高**
   - 可以传入不同的变量集合进行渲染
   - ContextProcessor 可以灵活地过滤和转换变量
   - 支持多种变量来源

3. **可测试性好**
   - PromptContext.render() 可以独立测试
   - ContextProcessor 可以独立测试
   - 变量逻辑与模板逻辑分离

4. **可扩展性强**
   - 可以轻松添加新的变量处理逻辑
   - 可以支持多种变量来源
   - 可以支持多种变量过滤策略

### 3.2 缺点

1. **变量传递链路较长**
   - 需要从 ExecutionContext 获取变量
   - 需要通过 ContextProcessor 处理
   - 需要传递给 PromptContext.render()

2. **变量作用域不明确**
   - 提示词变量应该使用哪个作用域的变量？
   - 是否应该支持节点局部变量？
   - 是否应该支持节点执行结果？

3. **变量查找逻辑分散**
   - 变量查找逻辑在多个地方重复
   - 没有统一的变量查找入口

## 4. 改进建议

### 4.1 明确变量作用域

根据文档 `context-structure-analysis.md` 的设计，提示词变量应该使用**全局执行变量**（ExecutionContext.variables）。

**理由**：
1. 提示词是全局的，不特定于某个节点
2. 提示词需要访问全局的上下文信息
3. 提示词变量应该在所有节点间共享

### 4.2 统一变量查找入口

建议在 ExecutionContext 中添加一个专门的方法来获取提示词变量：

```typescript
/**
 * 获取提示词变量（用于模板渲染）
 * @returns 提示词变量映射
 */
public getPromptVariables(): Map<string, unknown> {
  return new Map(this.props.variables);
}
```

### 4.3 优化变量传递链路

建议在 prompt-builder.ts 中使用 ExecutionContext.getPromptVariables()：

```typescript
// 从 ExecutionContext 获取提示词变量
const promptVariables = executionContext.getPromptVariables();

// 创建 PromptContext
const promptContext = PromptContext.create(content);

// 应用处理器
const processor = contextProcessors.get(contextProcessorName);
if (processor) {
  const result = processor(promptContext, promptVariables);
  promptVariables = result.variables;
}

// 渲染模板
return promptContext.render(promptVariables);
```

### 4.4 支持变量作用域选择

如果需要支持不同的变量作用域，可以添加参数：

```typescript
/**
 * 获取提示词变量（用于模板渲染）
 * @param scope 变量作用域（默认为全局）
 * @param nodeId 节点ID（当scope为LOCAL时需要）
 * @returns 提示词变量映射
 */
public getPromptVariables(
  scope: VariableScope = VariableScope.GLOBAL,
  nodeId?: NodeId
): Map<string, unknown> {
  switch (scope) {
    case VariableScope.LOCAL:
      if (!nodeId) {
        throw new Error('LOCAL作用域需要指定nodeId');
      }
      const nodeContext = this.props.nodeContexts.get(nodeId.toString());
      return nodeContext ? new Map(nodeContext.localVariables) : new Map();
    case VariableScope.GLOBAL:
      return new Map(this.props.globalVariables);
    case VariableScope.NODE_RESULT:
      return new Map(this.props.nodeResults);
  }
}
```

## 5. 实施建议

### 5.1 当前设计评估

**当前设计是合理的**，理由如下：

1. **符合文档设计**
   - PromptContext 不包含 variables 字段
   - 变量从外部传入
   - 变量管理由 ExecutionContext 负责

2. **职责清晰**
   - PromptContext 只负责模板管理
   - 变量管理由 VariableManager 负责
   - 符合单一职责原则

3. **灵活性高**
   - 可以传入不同的变量集合
   - ContextProcessor 可以灵活处理变量
   - 支持多种变量来源

### 5.2 可选改进

如果需要进一步优化，可以考虑以下改进：

1. **添加 getPromptVariables() 方法**
   - 提供统一的变量获取入口
   - 明确变量作用域
   - 简化变量传递链路

2. **支持变量作用域选择**
   - 允许选择不同的变量作用域
   - 支持节点局部变量
   - 支持节点执行结果

3. **优化变量查找逻辑**
   - 使用 VariableManager 进行变量查找
   - 统一变量查找逻辑
   - 提高代码复用性

### 5.3 实施优先级

**低优先级**：
1. 当前设计已经合理，不需要立即修改
2. 可以在后续优化中考虑添加 getPromptVariables() 方法
3. 可以根据实际需求决定是否支持变量作用域选择

## 6. 总结

### 6.1 当前状态

提示词模块当前使用的变量是**全局执行变量**（ExecutionContext.variables），通过以下方式传递：

1. 从 ExecutionContext 获取全局变量
2. 通过 ContextProcessor 处理变量
3. 传递给 PromptContext.render() 进行模板渲染

### 6.2 设计评估

**当前设计是合理的**，符合文档 `context-structure-analysis.md` 的设计要求：

- PromptContext 不包含 variables 字段
- 变量从外部传入
- 变量管理由 ExecutionContext 和 VariableManager 负责
- 职责清晰，符合单一职责原则

### 6.3 建议

**不需要立即修改**，当前设计已经满足需求。如果需要进一步优化，可以考虑：

1. 添加 getPromptVariables() 方法提供统一的变量获取入口
2. 支持变量作用域选择（如果需要）
3. 优化变量查找逻辑（如果需要）

这些改进可以在后续优化中根据实际需求进行。