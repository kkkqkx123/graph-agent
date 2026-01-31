# 变量系统作用域处理机制分析

## 概述

本文档详细分析了当前项目中变量系统的作用域处理机制，包括数据结构设计、访问控制、Fork/Join操作中的处理逻辑以及表达式解析中的作用域规则。

## 1. 作用域类型

项目中的变量系统支持两种主要作用域：

### 1.1 Local（局部作用域）
- **特性**：每个线程独立拥有，不与其他线程共享
- **用途**：存储线程特定的数据，确保线程间的数据隔离
- **存储位置**：`thread.variableValues`

### 1.2 Global（全局作用域）  
- **特性**：在Fork/Join操作中通过引用共享，实现跨线程数据共享
- **用途**：存储需要在多个子线程间共享的配置或状态数据
- **存储位置**：`thread.globalVariableValues`

## 2. 数据结构设计

### 2.1 Thread 结构

```typescript
interface Thread {
  // 变量数组（用于持久化和元数据）
  variables: ThreadVariable[];
  
  // 变量值映射（仅包含 local 变量，用于快速访问）
  variableValues: Record<string, any>;
  
  // 全局变量值映射（指向父线程或工作流级别的全局变量）
  globalVariableValues?: Record<string, any>;
}
```

### 2.2 变量定义结构

```typescript
interface ThreadVariable {
  name: string;        // 变量名称
  value: any;          // 变量值
  type: string;        // 变量类型 ('number' | 'string' | 'boolean' | 'array' | 'object')
  scope: 'local' | 'global'; // 作用域
  readonly: boolean;   // 是否只读
  metadata?: Metadata; // 元数据
}
```

### 2.3 Workflow 变量定义

```typescript
interface WorkflowVariable {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'array' | 'object';
  defaultValue?: any;
  description?: string;
  required?: boolean;
  readonly?: boolean;
  scope?: 'local' | 'global'; // 默认为 'local'
}
```

## 3. 核心组件分析

### 3.1 VariableManager（变量管理器）

**主要职责**：
- 从WorkflowDefinition初始化Thread变量
- 更新已定义变量的值
- 提供变量查询接口
- 处理Fork/Join操作中的变量复制

**关键方法**：
- `initializeFromWorkflow(thread, workflow)`：初始化变量
- `updateVariable(threadContext, name, value)`：更新变量值
- `getVariable(threadContext, name)`：获取变量值
- `copyVariables(sourceThread, targetThread)`：复制变量
- `initializeGlobalVariables(thread, parentGlobalVariables)`：初始化全局变量

### 3.2 VariableAccessor（变量访问器）

**主要职责**：
- 提供统一的变量访问接口
- 支持嵌套路径解析
- 处理不同命名空间的变量访问

**支持的命名空间**：
- `input.xxx`：访问输入数据
- `output.xxx`：访问输出数据  
- `variables.xxx`：显式访问变量
- `global.xxx`：访问全局变量
- 简单变量名：默认从 variables 中查找

**路径格式支持**：
- 简单变量：`userName`
- 嵌套对象：`user.profile.name`
- 数组索引：`items[0].name`
- 组合访问：`output.data.items[0].name`

### 3.3 ThreadContext（线程上下文）

**主要职责**：
- 封装Thread实例的数据访问操作
- 提供统一的访问接口
- 避免直接访问thread对象

**关键方法**：
- `getVariable(name)`：获取变量值
- `updateVariable(name, value)`：更新变量值
- `getAllVariables()`：获取所有变量
- `hasVariable(name)`：检查变量是否存在

## 4. Fork/Join 操作中的作用域处理

### 4.1 Fork 操作流程

1. **验证Fork配置**：检查forkId和forkStrategy的有效性
2. **创建子线程**：调用ThreadBuilder.createFork()
3. **注册子线程**：将子线程注册到ThreadRegistry
4. **触发事件**：发布THREAD_FORKED事件

### 4.2 Fork 变量处理策略

在 `ThreadBuilder.createFork()` 方法中：

```typescript
// 分离 local 和 global 变量
const localVariables: any[] = [];
const localVariableValues: Record<string, any> = {};

for (const variable of parentThread.variables) {
  if (variable.scope === 'local') {
    localVariables.push({ ...variable });
    localVariableValues[variable.name] = variable.value;
  }
  // global 变量不复制到子线程，而是通过引用共享
}

const forkThread: Partial<Thread> = {
  // ...
  variables: localVariables,
  variableValues: localVariableValues,
  // global 变量使用引用（共享父线程的全局变量）
  globalVariableValues: parentThread.globalVariableValues,
};
```

**处理策略**：
- **Local 变量**：深拷贝到子线程，确保数据隔离
- **Global 变量**：通过引用共享，实现数据同步

### 4.3 Join 操作流程

1. **验证Join配置**：检查joinStrategy和timeout的有效性
2. **等待子线程完成**：监控子线程状态
3. **验证Join策略**：根据策略判断是否满足条件
4. **合并结果**：收集并合并子线程的输出
5. **返回结果**：返回Join操作结果

## 5. 表达式解析中的作用域处理

### 5.1 数据源访问规则

在 `ExpressionParser.getVariableValue()` 方法中定义了明确的访问规则：

- **显式前缀**（推荐）：
  - `input.xxx`：从输入数据获取
  - `output.xxx`：从输出数据获取  
  - `variables.xxx`：从变量获取
- **简单变量名**：`xxx` - 仅从 variables 获取（语法糖）
- **嵌套路径**：`user.name` - 从 variables 获取（等价于 `variables.user.name`）

### 5.2 路径解析流程

1. **安全性验证**：通过 `SecurityValidator` 验证路径安全性
2. **命名空间识别**：检查是否以特定前缀开头
3. **路径解析**：使用 `PathResolver.resolvePath()` 解析嵌套路径
4. **值返回**：返回解析后的变量值

### 5.3 支持的表达式格式

- **等于**：`user.age == 18`
- **不等于**：`status != 'active'`
- **大于/小于**：`score > 60`
- **包含**：`name contains 'admin'`
- **在数组中**：`role in ['admin', 'user']`
- **逻辑运算**：`age >= 18 && age <= 65`

## 6. 安全性和验证机制

### 6.1 类型安全
- 变量更新时进行类型验证
- 支持基本类型（number, string, boolean）和复合类型（array, object）
- 类型不匹配时抛出 ValidationError

### 6.2 只读保护
- 检查变量的 readonly 属性
- 尝试修改只读变量时抛出 ValidationError

### 6.3 路径安全
- 通过 `SecurityValidator.validatePath()` 防止恶意路径访问
- 验证路径格式的合法性
- 防止原型污染等安全问题

### 6.4 存在性检查
- 确保访问的变量已在Workflow中定义
- 未定义变量访问时返回 undefined 或抛出错误

## 7. 使用示例

### 7.1 工作流变量定义

```typescript
const workflow: WorkflowDefinition = {
  id: 'example-workflow',
  name: 'Example Workflow',
  variables: [
    { 
      name: 'localCounter', 
      type: 'number', 
      defaultValue: 0, 
      scope: 'local' 
    },
    { 
      name: 'sharedConfig', 
      type: 'object', 
      defaultValue: { apiKey: 'secret' }, 
      scope: 'global' 
    },
    { 
      name: 'readOnlyData', 
      type: 'string', 
      defaultValue: 'immutable', 
      readonly: true,
      scope: 'local'
    }
  ],
  nodes: [...],
  edges: [...]
};
```

### 7.2 表达式使用

```typescript
// 访问局部变量
const expr1 = "localCounter > 10";

// 访问全局变量
const expr2 = "sharedConfig.apiKey == 'secret'";

// 访问输入数据
const expr3 = "input.userName == 'admin'";

// 访问输出数据
const expr4 = "output.success == true";

// 嵌套路径访问
const expr5 = "sharedConfig.endpoints[0].url contains 'api'";
```

### 7.3 Fork/Join 场景

```typescript
// 父线程设置全局变量
await threadCoordinator.setVariables(parentThreadId, {
  sharedConfig: { mode: 'parallel', timeout: 5000 }
});

// Fork子线程
const childThreadIds = await threadCoordinator.fork(parentThreadId, {
  forkId: 'parallel-processing',
  forkStrategy: 'parallel'
});

// 子线程可以访问和修改相同的全局变量
// 所有子线程共享 sharedConfig 变量

// Join等待所有子线程完成
const joinResult = await threadCoordinator.join(
  parentThreadId, 
  childThreadIds, 
  'ALL_COMPLETED', 
  60
);
```

## 8. 设计优势

### 8.1 清晰的作用域分离
- Local 和 Global 作用域明确区分
- 避免了作用域混淆和意外的数据共享

### 8.2 高效的内存使用
- Global 变量通过引用共享，避免不必要的内存复制
- Local 变量独立存储，保证线程安全

### 8.3 灵活的访问方式
- 支持多种命名空间和路径格式
- 向后兼容的简单变量名语法

### 8.4 线程安全
- 在并行执行场景下保证数据一致性
- Fork/Join操作中的正确作用域处理

### 8.5 强类型安全
- 编译时和运行时的类型检查
- 防止类型相关的运行时错误

## 9. 最佳实践建议

### 9.1 变量命名
- 使用有意义的变量名
- 避免使用保留字作为变量名
- 保持命名一致性

### 9.2 作用域选择
- **Local 作用域**：用于线程特定的状态和临时数据
- **Global 作用域**：用于需要跨线程共享的配置和状态

### 9.3 表达式编写
- 优先使用显式前缀（`input.`、`output.`、`variables.`）
- 避免复杂的嵌套表达式
- 使用适当的类型转换

### 9.4 错误处理
- 始终验证变量存在性
- 处理类型不匹配的情况
- 记录详细的错误信息用于调试

## 10. 总结

当前项目的变量系统作用域处理机制提供了一个强大而灵活的数据管理解决方案。通过清晰的Local/Global作用域分离、高效的内存使用策略、安全的访问控制机制以及对复杂场景（如Fork/Join）的良好支持，该系统能够满足各种工作流执行需求。

这种设计既保证了数据的安全性和一致性，又提供了足够的灵活性来处理复杂的业务场景，是项目架构中的一个重要组成部分。