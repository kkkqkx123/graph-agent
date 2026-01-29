# 变量作用域分析与重构文档

## 概述

本文档记录了对 SDK 中变量作用域机制的分析、重构过程以及后续改进建议。

## 第一部分：配置定义重构

### 问题背景

[`sdk/types/node.ts`](sdk/types/node.ts) 中定义了各种节点的配置接口，但这些配置定义在多个 handler 文件中被重复定义，且存在不一致的问题。

### 分析结论

**不应该删除** [`sdk/types/node.ts`](sdk/types/node.ts) 中的配置定义，因为它们被以下模块使用：
- [`sdk/core/validation/node-validator.ts`](sdk/core/validation/node-validator.ts) - 用于节点配置验证
- [`sdk/core/execution/thread-executor.ts`](sdk/core/execution/thread-executor.ts) - 导入并使用 `SubgraphNodeConfig`

### 发现的问题

11个 handler 文件中重复定义了配置接口，且与 [`sdk/types/node.ts`](sdk/types/node.ts) 中的定义不一致：

| Handler 文件 | 重复定义的接口 | 主要差异 |
|-------------|--------------|---------|
| [`variable-handler.ts`](sdk/core/execution/handlers/node-handlers/variable-handler.ts) | `VariableNodeConfig` | 增加了 `scope` 和 `readonly` 字段 |
| [`tool-handler.ts`](sdk/core/execution/handlers/node-handlers/tool-handler.ts) | `ToolNodeConfig` | 字段相同但都是可选的 |
| [`code-handler.ts`](sdk/core/execution/handlers/node-handlers/code-handler.ts) | `CodeNodeConfig` | 增加了 `inline` 字段，且 timeout/retries/retryDelay 是可选的 |
| [`context-processor-handler.ts`](sdk/core/execution/handlers/node-handlers/context-processor-handler.ts) | `ContextProcessorNodeConfig` | 结构完全不同（使用 processorType 和 rules） |
| [`fork-handler.ts`](sdk/core/execution/handlers/node-handlers/fork-handler.ts) | `ForkNodeConfig` | 增加了 `childNodeIds` 字段，且 forkStrategy 枚举值大小写不同 |
| [`join-handler.ts`](sdk/core/execution/handlers/node-handlers/join-handler.ts) | `JoinNodeConfig` | 增加了 `childThreadIds` 字段 |
| [`loop-start-handler.ts`](sdk/core/execution/handlers/node-handlers/loop-start-handler.ts) | `LoopStartNodeConfig` | 增加了 `variableName` 字段 |
| [`loop-end-handler.ts`](sdk/core/execution/handlers/node-handlers/loop-end-handler.ts) | `LoopEndNodeConfig` | 增加了 `loopStartNodeId` 字段，且 breakCondition 类型不同 |
| [`route-handler.ts`](sdk/core/execution/handlers/node-handlers/route-handler.ts) | `RouteNodeConfig` | 结构完全不同（使用 routes 数组） |
| [`start-handler.ts`](sdk/core/execution/handlers/node-handlers/start-handler.ts) | `StartNodeConfig` | 空接口 |
| [`end-handler.ts`](sdk/core/execution/handlers/node-handlers/end-handler.ts) | `EndNodeConfig` | 空接口 |

### 完成的重构

#### 1. 统一配置接口定义到 [`sdk/types/node.ts`](sdk/types/node.ts)

合并了 handler 中的额外字段，主要变更：

- **VariableNodeConfig**: 添加 `scope` 和 `readonly` 字段
- **ForkNodeConfig**: 添加 `childNodeIds` 字段
- **JoinNodeConfig**: 添加 `childThreadIds` 字段
- **CodeNodeConfig**: 将 `timeout`、`retries`、`retryDelay` 改为可选，添加 `inline` 字段
- **ToolNodeConfig**: 将 `timeout`、`retries` 改为可选，添加 `retryDelay` 字段
- **RouteNodeConfig**: 重构为使用 `routes` 数组结构
- **ContextProcessorNodeConfig**: 重构为使用 `processorType` 和 `rules` 结构
- **LoopStartNodeConfig**: 添加 `variableName` 字段
- **LoopEndNodeConfig**: 添加 `loopStartNodeId` 字段，`breakCondition` 类型改为 `any`

#### 2. 删除重复定义并更新导入

更新了所有 11 个 handler 文件，删除重复的接口定义，改为从 [`sdk/types/node.ts`](sdk/types/node.ts) 导入。

#### 3. 更新验证逻辑

更新了 [`sdk/core/validation/node-validator.ts`](sdk/core/validation/node-validator.ts) 中的 Zod schema 以匹配新的配置接口。

#### 4. 更新测试用例

更新了 [`sdk/core/validation/__tests__/node-validator.test.ts`](sdk/core/validation/__tests__/node-validator.test.ts) 中的测试用例以匹配新的配置结构。

### 验证结果

✅ TypeScript 类型检查通过  
✅ 所有 49 个测试用例通过

## 第二部分：变量作用域初步实现

### 问题背景

[`VariableNodeConfig`](sdk/types/node.ts:108) 中定义了 `scope` 字段（`'local' | 'global'`），但在实际代码中从未被使用，导致：
- 全局变量和局部变量无法区分
- Fork/Join 时无法正确处理变量作用域
- 变量共享机制缺失

### 实现的功能

#### 1. 扩展 Thread 类型

在 [`sdk/types/thread.ts`](sdk/types/thread.ts) 中添加了 `globalVariableValues` 字段：

```typescript
export interface Thread {
  // ... 其他字段
  /** 变量值映射（用于快速访问，仅包含 local 变量） */
  variableValues: Record<string, any>;
  /** 全局变量值映射（用于快速访问，指向父线程或工作流级别的全局变量） */
  globalVariableValues?: Record<string, any>;
}
```

#### 2. 修改 VariableManager

在 [`sdk/core/execution/managers/variable-manager.ts`](sdk/core/execution/managers/variable-manager.ts) 中实现了作用域区分：

**initializeFromWorkflow()**
- 根据 `scope` 字段分离 local 和 global 变量
- local 变量存储在 `variableValues` 中
- global 变量存储在 `globalVariableValues` 中

**updateVariable()**
- 根据 `scope` 更新到对应的存储
- local 变量更新到 `variableValues`
- global 变量更新到 `globalVariableValues`

**getVariable()**
- 优先查找 local 变量
- 如果 local 中不存在，再查找 global 变量

**getAllVariables()**
- 合并 local 和 global 变量
- 返回所有变量的键值对

**getVariablesByScope()**
- 获取指定作用域的变量
- 支持按作用域过滤

**initializeGlobalVariables()**
- 初始化全局变量引用
- 用于 fork 时共享父线程的全局变量

**copyVariables()**
- 仅复制 local 变量
- global 变量使用引用（共享）

**clearVariables()**
- 清除 local 变量
- 不清除 global 变量（因为它们可能被其他线程共享）

#### 3. 更新 ThreadBuilder

在 [`sdk/core/execution/thread-builder.ts`](sdk/core/execution/thread-builder.ts) 中更新了 fork/copy 逻辑：

**createFork()**
- 仅复制 local 变量到子线程
- global 变量使用引用（共享父线程的全局变量）
- 子线程可以修改 global 变量，影响父线程和其他子线程

**createCopy()**
- 深拷贝所有变量（包括 local 和 global）
- 创建完全独立的副本

**buildFromProcessedDefinition() / buildFromDefinition()**
- 初始化 `globalVariableValues` 为空对象
- 通过 `VariableManager.initializeFromWorkflow()` 填充变量

#### 4. 更新变量解析

在 handler 文件中更新了变量解析逻辑：

**variable-handler.ts**
- `resolveVariableReferences()` 函数支持从 global 变量中查找
- 优先查找 local 变量，如果不存在则查找 global 变量

**tool-handler.ts**
- `resolveStringVariables()` 函数支持从 global 变量中查找
- 优先查找 local 变量，如果不存在则查找 global 变量

### 当前存在的问题

您指出的问题非常准确，当前实现存在以下严重缺陷：

#### 1. 变量访问不明确

**问题**：当前实现允许在 local 变量不存在时自动访问 global 变量

**影响**：
- 命名冲突和意外覆盖
- 难以调试和维护
- 违反了最小权限原则
- 可能导致不可预期的行为

**示例**：
```typescript
// 假设有以下变量定义
variables: [
  { name: 'count', scope: 'local', defaultValue: 0 },
  { name: 'count', scope: 'global', defaultValue: 100 }
]

// 表达式 {{count}} 会访问哪个变量？
// 当前实现：优先 local，如果不存在则访问 global
// 问题：如果 local 变量被删除，会意外访问 global 变量
```

#### 2. 缺少作用域前缀

**问题**：无法明确指定访问哪个作用域的变量

**影响**：
- 无法明确表达意图
- 代码可读性差
- 容易产生歧义

#### 3. GraphData 缺少变量信息

**问题**：图遍历时无法访问变量定义

**影响**：
- 图验证时无法检查变量作用域
- 无法在编译时进行变量作用域检查
- 运行时才发现变量作用域错误

#### 4. 错误处理不清晰

**问题**：变量不存在时的行为不明确

**影响**：
- 调试困难
- 错误消息不明确
- 难以定位问题

## 第三部分：改进建议

### 1. 变量访问语法

建议引入明确的作用域前缀语法：

| 语法 | 含义 | 行为 |
|-----|------|------|
| `{{variableName}}` | 默认访问 local 变量 | 如果不存在，抛出错误 |
| `{{local.variableName}}` | 明确访问 local 变量 | 如果不存在，抛出错误 |
| `{{global.variableName}}` | 明确访问 global 变量 | 如果不存在，抛出错误 |

**优点**：
- 明确表达访问意图
- 避免歧义
- 提高代码可读性
- 便于静态分析

**向后兼容**：
- 保留 `{{variableName}}` 语法，但明确其行为（仅访问 local 变量）

### 2. 扩展 GraphData

在 [`sdk/core/graph/graph-data.ts`](sdk/core/graph/graph-data.ts) 中添加变量定义信息：

```typescript
export class GraphData implements DAG {
  // ... 现有字段
  
  /** 变量定义映射 */
  public variables: Map<string, WorkflowVariable>;
  
  /** 获取变量定义 */
  getVariable(name: string): WorkflowVariable | undefined {
    return this.variables.get(name);
  }
  
  /** 检查变量是否存在 */
  hasVariable(name: string): boolean {
    return this.variables.has(name);
  }
  
  /** 获取指定作用域的变量 */
  getVariablesByScope(scope: 'local' | 'global'): WorkflowVariable[] {
    return Array.from(this.variables.values()).filter(v => v.scope === scope);
  }
}
```

**优点**：
- 图遍历时可以访问变量定义
- 支持编译时变量作用域检查
- 提供更好的错误提示

### 3. 严格的变量访问规则

**规则**：
1. 使用作用域前缀时，必须明确指定作用域
2. 不使用作用域前缀时，默认访问 local 变量
3. 禁止自动回退到其他作用域
4. 变量不存在时，抛出明确的错误

**错误消息示例**：
```
Error: Variable 'count' not found in local scope. 
Available local variables: ['userName', 'userAge']
Available global variables: ['count', 'totalCount']
Use 'global.count' to access the global variable.
```

### 4. 变量命名规范

建议采用以下命名规范之一：

#### 方案 A：前缀规范
- 全局变量使用 `g_` 前缀：`g_count`, `g_totalCount`
- 局部变量使用 `l_` 前缀：`l_count`, `l_userName`

#### 方案 B：作用域前缀（推荐）
- 在工作流定义中强制使用作用域前缀
- 表达式中必须使用 `{{local.variableName}}` 或 `{{global.variableName}}`
- 禁止使用 `{{variableName}}` 语法

#### 方案 C：混合方案
- 允许使用 `{{variableName}}` 语法，但默认访问 local 变量
- 鼓励使用作用域前缀以提高代码可读性
- 在文档中明确说明默认行为

### 5. 变量作用域验证

在 [`sdk/core/validation/node-validator.ts`](sdk/core/validation/node-validator.ts) 中添加变量作用域验证：

```typescript
/**
 * 验证变量作用域
 */
validateVariableScope(node: Node, graphData: GraphData): ValidationResult {
  // 检查节点中使用的变量是否在对应的作用域中定义
  // 检查变量命名是否符合规范
  // 检查是否有命名冲突
}
```

### 6. Fork/Join 时的变量处理

**Fork 时的变量处理**：
- Local 变量：深拷贝到子线程
- Global 变量：使用引用（共享）
- 子线程可以修改 global 变量，影响父线程和其他子线程

**Join 时的变量处理**：
- Local 变量：每个子线程独立，不合并
- Global 变量：所有子线程共享，自动同步
- 可以选择性地合并某些 local 变量到父线程

## 第四部分：实施计划

### 阶段 1：基础改进（高优先级）

1. **实现作用域前缀语法**
   - 更新表达式解析器
   - 支持 `{{local.variableName}}` 和 `{{global.variableName}}`
   - 更新错误消息

2. **扩展 GraphData**
   - 添加变量定义存储
   - 提供变量查询方法

3. **严格的变量访问规则**
   - 禁止自动回退
   - 明确的错误消息

### 阶段 2：验证和测试（中优先级）

1. **变量作用域验证**
   - 编译时检查
   - 运行时检查

2. **测试用例**
   - Fork/Join 场景测试
   - 变量作用域测试
   - 错误处理测试

### 阶段 3：文档和规范（低优先级）

1. **编写文档**
   - 变量作用域使用指南
   - 最佳实践
   - 常见问题

2. **制定规范**
   - 变量命名规范
   - 作用域使用规范

## 第五部分：总结

### 已完成的工作

1. ✅ 统一了节点配置接口定义
2. ✅ 消除了代码重复
3. ✅ 实现了基本的变量作用域机制
4. ✅ 更新了 Fork/Join 逻辑
5. ✅ 通过了所有测试

### 待完成的工作

1. ⏳ 实现明确的作用域前缀语法
2. ⏳ 扩展 GraphData 以包含变量信息
3. ⏳ 实现严格的变量访问规则
4. ⏳ 添加变量作用域验证
5. ⏳ 编写完整的测试用例
6. ⏳ 编写使用文档

### 关键决策

1. **保留 `{{variableName}}` 语法**：向后兼容，但明确其行为（仅访问 local 变量）
2. **引入作用域前缀**：提供明确的访问方式
3. **禁止自动回退**：避免歧义和意外行为
4. **Global 变量共享**：Fork 时使用引用，实现真正的全局共享

### 风险和注意事项

1. **向后兼容性**：需要确保现有工作流不受影响
2. **性能影响**：变量解析可能需要额外的查找
3. **复杂性增加**：作用域机制增加了系统复杂性
4. **测试覆盖**：需要全面的测试用例

## 附录

### 相关文件

- [`sdk/types/node.ts`](sdk/types/node.ts) - 节点配置定义
- [`sdk/types/thread.ts`](sdk/types/thread.ts) - Thread 类型定义
- [`sdk/types/workflow.ts`](sdk/types/workflow.ts) - Workflow 类型定义
- [`sdk/core/execution/managers/variable-manager.ts`](sdk/core/execution/managers/variable-manager.ts) - 变量管理器
- [`sdk/core/execution/thread-builder.ts`](sdk/core/execution/thread-builder.ts) - Thread 构建器
- [`sdk/core/execution/utils/thread-operations.ts`](sdk/core/execution/utils/thread-operations.ts) - Thread 操作工具
- [`sdk/core/validation/node-validator.ts`](sdk/core/validation/node-validator.ts) - 节点验证器
- [`sdk/core/graph/graph-data.ts`](sdk/core/graph/graph-data.ts) - 图数据结构

### 参考资料

- [SDK Architecture](../sdk/sdk-architecture.md)
- [SDK Implementation Plan](../sdk/sdk-implementation-plan.md)
- [Types Layer Design](../sdk/types/)
- [Core Layer Design](../sdk/core/)