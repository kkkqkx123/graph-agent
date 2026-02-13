# RuntimeValidationError 使用问题分析与改进方案

## 一、问题概述

当前项目中大量使用 `RuntimeValidationError` 时存在参数使用混乱、大量无意义字段的问题。以 `packages/tool-executors/src/rest/RestExecutor.ts:145-152` 为例：

```typescript
throw new RuntimeValidationError(
  `Unsupported HTTP method: ${method}`,
  undefined,  // runtimeContext - 无意义
  'execute',  // operation
  'method',   // field
  method,     // value
  { toolName: tool.name }  // context
);
```

## 二、当前构造函数签名

```typescript
export class RuntimeValidationError extends ValidationError {
  constructor(
    message: string,
    public readonly runtimeContext?: string,
    public readonly operation?: string,
    field?: string,
    value?: any,
    context?: Record<string, any>,
    severity?: ErrorSeverity
  ) {
    super(message, field, value, { ...context, runtimeContext, operation }, severity);
  }
}
```

## 三、使用模式分析

### 3.1 典型使用场景

#### 场景1：工具执行验证（RestExecutor）
```typescript
throw new RuntimeValidationError(
  `Unsupported HTTP method: ${method}`,
  undefined,  // runtimeContext
  'execute',  // operation
  'method',   // field
  method,     // value
  { toolName: tool.name }  // context
);
```

#### 场景2：变量操作验证（variable-coordinator）
```typescript
throw new RuntimeValidationError(
  `Variable '${name}' is not defined in workflow. Variables must be defined in WorkflowDefinition.`,
  undefined,  // runtimeContext
  'setVariable',  // operation
  'variableName',  // field
  name,  // value
  { threadId: this.threadId, workflowId: this.workflowId }  // context
);
```

#### 场景3：表达式验证（security-validator）
```typescript
throw new RuntimeValidationError(
  message,
  undefined,  // runtimeContext
  'validateExpression',  // operation
  'expression',  // field
  expression  // value
);
```

#### 场景4：简单参数验证（event-manager）
```typescript
throw new RuntimeValidationError('EventType is required', 'eventType');
// 只传了 message 和 field，其他都是 undefined
```

### 3.2 参数使用统计

通过搜索发现 58 处 `RuntimeValidationError` 使用，参数使用模式如下：

| 参数 | 使用频率 | 说明 |
|------|---------|------|
| `message` | 100% | 必需，错误描述 |
| `runtimeContext` | ~5% | 几乎总是 `undefined`，设计意图不明确 |
| `operation` | ~60% | 操作名称，如 'execute', 'validate', 'setVariable' |
| `field` | ~70% | 字段名称，如 'method', 'variableName', 'expression' |
| `value` | ~50% | 字段值，有时不需要 |
| `context` | ~40% | 额外上下文信息，如 threadId, workflowId, toolName |
| `severity` | <5% | 几乎不使用 |

## 四、核心问题

### 4.1 参数设计问题

1. **`runtimeContext` 参数无意义**
   - 设计意图不明确，实际使用中几乎总是 `undefined`
   - 与 `context` 参数功能重叠

2. **参数顺序不合理**
   - 必需参数和可选参数混在一起
   - 导致大量 `undefined` 占位符，代码可读性差

3. **参数职责不清**
   - `field` 和 `value` 有时有用，有时不需要
   - `context` 可以包含所有额外信息，但使用不一致

4. **与父类 ValidationError 的关系**
   - `RuntimeValidationError` 继承自 `ValidationError`
   - 但参数设计不一致，增加了使用复杂度

### 4.2 实际使用问题

1. **代码可读性差**
   ```typescript
   throw new RuntimeValidationError(
     'URL is required for REST tool',
     undefined,  // 读者需要查看构造函数定义才能理解这是什么
     'execute',
     'url',
     url,
     { toolName: tool.name, parameters }
   );
   ```

2. **维护困难**
   - 修改参数顺序需要修改所有调用点
   - 新增参数需要考虑向后兼容性

3. **类型安全性不足**
   - 可选参数过多，容易传错位置
   - TypeScript 无法有效检查参数的正确性

## 五、改进方案

### 5.1 方案一：简化参数（推荐）

**设计思路**：
- 移除 `runtimeContext` 参数（无意义）
- 将 `operation`、`field`、`value` 合并到 `context` 中
- 只保留 `message`、`context`、`severity` 三个参数

**新构造函数签名**：
```typescript
export class RuntimeValidationError extends ValidationError {
  constructor(
    message: string,
    context?: {
      operation?: string;
      field?: string;
      value?: any;
      [key: string]: any;
    },
    severity?: ErrorSeverity
  ) {
    super(message, context?.field, context?.value, context, severity);
  }
}
```

**使用示例**：
```typescript
// 之前
throw new RuntimeValidationError(
  `Unsupported HTTP method: ${method}`,
  undefined,
  'execute',
  'method',
  method,
  { toolName: tool.name }
);

// 之后
throw new RuntimeValidationError(
  `Unsupported HTTP method: ${method}`,
  {
    operation: 'execute',
    field: 'method',
    value: method,
    toolName: tool.name
  }
);
```

**优点**：
- 参数清晰，易于理解
- 无需 `undefined` 占位符
- 扩展性好，可以添加任意上下文信息
- 向后兼容（可以通过重载实现）

**缺点**：
- 需要修改所有调用点（58处）
- 需要提供迁移工具或过渡期

### 5.2 方案二：使用对象参数（更推荐）

**设计思路**：
- 使用单个对象参数，包含所有可选字段
- 提供更好的类型提示和 IDE 支持

**新构造函数签名**：
```typescript
export interface RuntimeValidationErrorOptions {
  operation?: string;
  field?: string;
  value?: any;
  context?: Record<string, any>;
  severity?: ErrorSeverity;
}

export class RuntimeValidationError extends ValidationError {
  constructor(
    message: string,
    options?: RuntimeValidationErrorOptions
  ) {
    const { operation, field, value, context, severity } = options || {};
    super(
      message,
      field,
      value,
      { ...context, operation },
      severity
    );
  }
}
```

**使用示例**：
```typescript
// 之前
throw new RuntimeValidationError(
  `Unsupported HTTP method: ${method}`,
  undefined,
  'execute',
  'method',
  method,
  { toolName: tool.name }
);

// 之后
throw new RuntimeValidationError(
  `Unsupported HTTP method: ${method}`,
  {
    operation: 'execute',
    field: 'method',
    value: method,
    context: { toolName: tool.name }
  }
);
```

**优点**：
- 参数最清晰，易于理解
- 完全消除 `undefined` 占位符
- 最佳的类型提示和 IDE 支持
- 扩展性最好
- 可以提供默认值

**缺点**：
- 需要修改所有调用点（58处）
- 代码行数略有增加

### 5.3 方案三：保持向后兼容（过渡方案）

**设计思路**：
- 保留原有构造函数
- 添加新的重载构造函数
- 逐步迁移到新 API

**实现**：
```typescript
export class RuntimeValidationError extends ValidationError {
  // 新的构造函数（推荐使用）
  constructor(
    message: string,
    options?: RuntimeValidationErrorOptions
  );

  // 旧的构造函数（保持向后兼容，标记为 deprecated）
  @deprecated('Use constructor with options object instead')
  constructor(
    message: string,
    runtimeContext: string | undefined,
    operation: string | undefined,
    field?: string,
    value?: any,
    context?: Record<string, any>,
    severity?: ErrorSeverity
  );

  // 实际实现
  constructor(
    message: string,
    arg2?: string | RuntimeValidationErrorOptions | undefined,
    arg3?: string | undefined,
    arg4?: string | undefined,
    arg5?: any,
    arg6?: Record<string, any>,
    arg7?: ErrorSeverity
  ) {
    // 判断是旧 API 还是新 API
    if (typeof arg2 === 'object') {
      // 新 API
      const options = arg2 as RuntimeValidationErrorOptions;
      super(
        message,
        options.field,
        options.value,
        { ...options.context, operation: options.operation },
        options.severity
      );
    } else {
      // 旧 API
      super(
        message,
        arg4,
        arg5,
        { ...arg6, runtimeContext: arg2, operation: arg3 },
        arg7
      );
    }
  }
}
```

**优点**：
- 完全向后兼容
- 可以逐步迁移
- 不影响现有代码

**缺点**：
- 实现复杂
- 维护成本高
- 长期来看需要清理旧 API

## 六、推荐方案

### 6.1 短期方案（立即实施）

采用**方案三（保持向后兼容）**，提供平滑过渡：

1. 添加新的对象参数构造函数
2. 标记旧构造函数为 `@deprecated`
3. 在文档中推荐使用新 API
4. 逐步迁移现有代码

### 6.2 长期方案（下个版本）

采用**方案二（使用对象参数）**，彻底重构：

1. 移除旧构造函数
2. 统一所有错误类型的参数设计
3. 提供迁移工具
4. 更新所有文档和示例

## 七、实施步骤

### 阶段一：准备（1-2天）
1. 创建新的错误类型定义
2. 编写单元测试
3. 准备迁移工具

### 阶段二：实施（3-5天）
1. 修改 `RuntimeValidationError` 构造函数
2. 添加向后兼容支持
3. 更新文档和注释

### 阶段三：迁移（5-7天）
1. 优先迁移高频使用的文件
2. 逐步迁移所有调用点
3. 运行测试确保兼容性

### 阶段四：清理（1-2天）
1. 移除旧构造函数（如果采用方案二）
2. 更新所有文档
3. 代码审查

## 八、其他错误类型的改进建议

同样的问题也存在于其他错误类型，建议一并改进：

1. **ConfigurationValidationError**
   - 当前参数：`message, configPath, configType, field, value, context, severity`
   - 建议改为对象参数

2. **SchemaValidationError**
   - 当前参数：`message, schemaPath, validationErrors, field, value, context, severity`
   - 建议改为对象参数

3. **ValidationError**（基类）
   - 当前参数：`message, field, value, context, severity`
   - 建议改为对象参数

## 九、总结

当前 `RuntimeValidationError` 的使用存在严重的参数设计问题，导致代码可读性差、维护困难。建议采用对象参数的方式重构，提供更好的类型提示和 IDE 支持。为了平滑过渡，可以先提供向后兼容的版本，逐步迁移现有代码。

**关键改进点**：
1. 移除无意义的 `runtimeContext` 参数
2. 使用对象参数替代位置参数
3. 提供更好的类型提示和 IDE 支持
4. 统一所有错误类型的参数设计
5. 提供平滑的迁移路径