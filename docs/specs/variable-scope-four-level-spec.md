# 变量系统四级作用域技术规格

## 1. 概述

### 1.1 背景
当前的变量系统仅支持两级作用域（`local`/`global`），在复杂的并行执行、子图嵌套和循环场景下存在局限性。为了提供更精细的变量控制能力，需要引入四级作用域系统。

### 1.2 目标
- 提供更精细的变量作用域控制
- 支持复杂的嵌套执行场景
- 保持向后兼容性
- 维持良好的性能表现

### 1.3 作用域定义

| 作用域 | 语义 | 生命周期 | 典型用途 |
|--------|------|----------|----------|
| `global` | 多个线程共享 | 整个工作流执行期间 | 全局配置、共享状态 |
| `thread` | 单个线程内部 | 线程创建到销毁 | 线程特定的状态和数据 |
| `subgraph` | 子图/触发器子图内部 | 子图进入到退出 | 子图内部的临时数据 |
| `loop` | 循环内部 | 循环开始到结束 | 循环迭代的临时变量 |

## 2. 架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    Variable System                      │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   API Layer │  │  Core Layer │  │ Types Layer │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### 2.2 数据流

```
Variable Declaration → Variable Initialization → Variable Access → Variable Update
     ↓                       ↓                       ↓                ↓
WorkflowDefinition → Thread.variableScopes → VariableAccessor → VariableManager
```

### 2.3 作用域查找优先级

当访问变量时，按以下优先级顺序查找：

1. **Loop 作用域**（最高优先级）
2. **Subgraph 作用域**
3. **Thread 作用域**
4. **Global 作用域**（最低优先级）

## 3. 详细设计

### 3.1 类型定义

#### 3.1.1 作用域类型枚举
```typescript
export type VariableScope = 'global' | 'thread' | 'subgraph' | 'loop';
```

#### 3.1.2 ThreadVariable 接口
```typescript
export interface ThreadVariable {
  /** 变量名称 */
  name: string;
  /** 变量值 */
  value: any;
  /** 变量类型 */
  type: string;
  /** 变量作用域 */
  scope: VariableScope;
  /** 是否只读 */
  readonly: boolean;
  /** 变量元数据 */
  metadata?: Metadata;
}
```

#### 3.1.3 Thread 接口扩展
```typescript
export interface Thread {
  // ... 其他字段 ...
  
  /** 
   * 变量值映射（向后兼容，仅包含 thread 作用域变量）
   */
  variableValues: Record<string, any>;
  
  /**
   * 四级作用域变量存储
   */
  variableScopes: {
    /** 全局作用域 - 多线程共享 */
    global: Record<string, any>;
    /** 线程作用域 - 单线程内部 */
    thread: Record<string, any>;
    /** 子图作用域栈 - 支持嵌套子图 */
    subgraph: Record<string, any>[];
    /** 循环作用域栈 - 支持嵌套循环 */
    loop: Record<string, any>[];
  };
}
```

### 3.2 核心组件

#### 3.2.1 VariableManager

**职责**：
- 变量初始化
- 变量访问和更新
- 作用域管理
- 类型验证

**关键方法**：
```typescript
class VariableManager {
  // 初始化变量
  initializeFromWorkflow(thread: Thread, workflow: WorkflowDefinition): void;
  
  // 获取变量值（按作用域优先级）
  getVariable(threadContext: ThreadContext, name: string): any;
  
  // 更新变量值
  updateVariable(threadContext: ThreadContext, name: string, value: any, explicitScope?: VariableScope): void;
  
  // 作用域管理
  enterSubgraphScope(threadContext: ThreadContext): void;
  exitSubgraphScope(threadContext: ThreadContext): void;
  enterLoopScope(threadContext: ThreadContext): void;
  exitLoopScope(threadContext: ThreadContext): void;
  
  // 类型验证
  validateType(value: any, expectedType: string): boolean;
}
```

#### 3.2.2 VariableAccessor

**职责**：
- 提供统一的变量访问接口
- 支持命名空间前缀
- 处理嵌套路径解析

**命名空间支持**：
- `input.xxx`：输入数据
- `output.xxx`：输出数据
- `global.xxx`：全局作用域变量
- `thread.xxx`：线程作用域变量
- `subgraph.xxx`：子图作用域变量
- `loop.xxx`：循环作用域变量
- `xxx`（无前缀）：按作用域优先级查找

**关键方法**：
```typescript
class VariableAccessor {
  get(path: string): any;
  has(path: string): boolean;
}
```

#### 3.2.3 ThreadContext

**职责**：
- 封装 Thread 数据访问
- 集成作用域管理
- 提供执行上下文

**新增方法**：
```typescript
class ThreadContext {
  // 作用域管理
  enterSubgraph(workflowId: ID, parentWorkflowId: ID, input: any): void;
  exitSubgraph(): void;
  enterLoop(): void;
  exitLoop(): void;
  
  // 变量操作
  getVariable(name: string): any;
  updateVariable(name: string, value: any, scope?: VariableScope): void;
}
```

### 3.3 执行流程集成

#### 3.3.1 Subgraph 执行流程

```
Subgraph Start → enterSubgraph() → Execute Subgraph Nodes → exitSubgraph() → Subgraph End
                   ↓                          ↓
           Create subgraph scope      Destroy subgraph scope
```

#### 3.3.2 Loop 执行流程

```
Loop Start → enterLoop() → Set Loop Variables → Execute Loop Body → exitLoop() → Loop End
               ↓                                ↓                    ↓
       Create loop scope                  Update loop vars     Destroy loop scope
```

#### 3.3.3 Fork/Join 流程

```
Parent Thread → Fork → Child Thread 1 → Join → Parent Thread
                   ↘→ Child Thread 2 ↗
                   
Global Scope: Shared by reference
Thread Scope: Copied independently
Subgraph/Loop Scope: Empty in new threads
```

### 3.4 表达式解析

#### 3.4.1 路径解析规则

| 路径格式 | 解析规则 | 示例 |
|----------|----------|------|
| `xxx` | 按作用域优先级查找 | `counter` |
| `global.xxx` | 从全局作用域查找 | `global.config` |
| `thread.xxx` | 从线程作用域查找 | `thread.state` |
| `subgraph.xxx` | 从当前子图作用域查找 | `subgraph.temp` |
| `loop.xxx` | 从当前循环作用域查找 | `loop.item` |
| `input.xxx` | 从输入数据查找 | `input.userId` |
| `output.xxx` | 从输出数据查找 | `output.result` |

#### 3.4.2 嵌套路径支持

所有命名空间都支持嵌套路径：
- `global.config.apiKey`
- `thread.user.profile.name`
- `loop.item.metadata.tags[0]`

## 4. 向后兼容性

### 4.1 作用域映射

| 旧作用域 | 新作用域 | 说明 |
|----------|----------|------|
| `local` | `thread` | 完全等价 |
| `global` | `global` | 保持不变 |

### 4.2 API 兼容性

- **现有 API**：继续工作，内部自动转换
- **新 API**：提供增强功能
- **混合使用**：支持新旧代码混合

### 4.3 数据兼容性

- **序列化格式**：保持兼容
- **存储格式**：新增字段，不影响旧数据
- **迁移工具**：提供自动迁移脚本

## 5. 性能考虑

### 5.1 内存使用

- **Global 作用域**：通过引用共享，避免复制
- **Thread 作用域**：深拷贝，保证隔离
- **Subgraph/Loop 作用域**：按需创建，及时销毁

### 5.2 查找性能

- **作用域栈**：使用数组实现，O(1) 访问
- **变量查找**：按优先级顺序，平均 O(1)
- **缓存机制**：可选的查找结果缓存

### 5.3 基准测试目标

- **查找延迟**：< 1μs
- **内存开销**：< 10% 增加
- **CPU 开销**：< 5% 增加

## 6. 错误处理

### 6.1 常见错误

| 错误类型 | 错误消息 | 解决方案 |
|----------|----------|----------|
| 未定义变量 | `Variable 'xxx' is not defined` | 在工作流中声明变量 |
| 只读变量 | `Variable 'xxx' is readonly` | 使用可写变量或修改声明 |
| 作用域错误 | `Cannot set loop variable outside of loop context` | 在正确的上下文中使用变量 |
| 类型不匹配 | `Type mismatch for variable 'xxx'` | 确保值类型匹配 |

### 6.2 调试支持

- **作用域可视化**：显示当前作用域栈
- **变量追踪**：记录变量访问和修改历史
- **详细错误信息**：包含作用域上下文信息

## 7. 使用示例

### 7.1 工作流变量声明

```typescript
const workflow: WorkflowDefinition = {
  variables: [
    // 全局配置（多线程共享）
    { name: 'apiConfig', type: 'object', defaultValue: {}, scope: 'global' },
    
    // 线程状态（线程内部）
    { name: 'processingState', type: 'string', defaultValue: 'idle', scope: 'thread' },
    
    // 子图临时数据（子图内部）
    { name: 'tempResult', type: 'object', defaultValue: null, scope: 'subgraph' },
    
    // 循环变量（循环内部）
    { name: 'currentItem', type: 'object', defaultValue: null, scope: 'loop' }
  ]
};
```

### 7.2 表达式使用

```typescript
// 全局配置
const expr1 = "global.apiConfig.timeout > 1000";

// 线程状态
const expr2 = "thread.processingState == 'active'";

// 子图临时数据
const expr3 = "subgraph.tempResult.success == true";

// 循环变量
const expr4 = "loop.currentItem.id != null";

// 混合使用
const expr5 = "global.apiConfig.enabled && thread.processingState == 'ready'";
```

### 7.3 Fork/Join 场景

```typescript
// 父线程设置全局配置
await threadCoordinator.setVariables(parentThreadId, {
  'apiConfig': { timeout: 5000, retries: 3 }
}, 'global');

// Fork子线程
const childIds = await threadCoordinator.fork(parentThreadId, { forkId: 'parallel' });

// 所有子线程共享相同的全局配置
// 每个子线程有独立的线程作用域变量
```

### 7.4 Subgraph 场景

```typescript
// 主工作流
const mainWorkflow = {
  variables: [
    { name: 'sharedData', scope: 'global' },
    { name: 'mainState', scope: 'thread' }
  ]
};

// 子工作流
const subWorkflow = {
  variables: [
    { name: 'subTemp', scope: 'thread' }, // 在子图中实际是 subgraph 作用域
    { name: 'subResult', scope: 'thread' }
  ]
};

// 在子图中：
// - sharedData: 从 global 作用域访问
// - mainState: 从父线程的 thread 作用域访问（通过作用域继承）
// - subTemp, subResult: 在 subgraph 作用域中
```

### 7.5 Loop 场景

```typescript
// Loop Start 节点配置
const loopStartConfig = {
  loopId: 'processItems',
  iterable: 'items',
  variableName: 'currentItem',
  maxIterations: 100
};

// 在循环体中：
// - currentItem: 在 loop 作用域中
// - items: 从 thread 作用域访问
// - globalConfig: 从 global 作用域访问

// Loop End 节点会自动清理 loop 作用域
```

## 8. 测试策略

### 8.1 单元测试

- **作用域隔离**：验证不同作用域变量不相互干扰
- **作用域继承**：验证作用域查找优先级正确
- **边界条件**：空作用域、嵌套作用域等

### 8.2 集成测试

- **Fork/Join**：验证全局作用域共享
- **Subgraph 嵌套**：验证多层子图作用域
- **Loop 嵌套**：验证多层循环作用域
- **混合场景**：同时使用多种作用域

### 8.3 性能测试

- **基准测试**：对比新旧系统性能
- **负载测试**：高并发场景性能
- **内存测试**：内存使用情况

## 9. 实施计划

### 9.1 阶段划分

| 阶段 | 时间 | 主要任务 |
|------|------|----------|
| 1. 基础架构 | 1-2天 | 类型定义、VariableManager 实现 |
| 2. 核心集成 | 2-3天 | ThreadContext 集成、处理器更新 |
| 3. API 和验证 | 1-2天 | API 兼容性、验证器更新 |
| 4. 测试和优化 | 2-3天 | 全面测试、性能优化 |

### 9.2 里程碑

- **M1**：基础架构完成，单元测试通过
- **M2**：核心功能集成，集成测试通过
- **M3**：API 兼容性完成，回归测试通过
- **M4**：全面测试完成，性能达标

## 10. 风险和缓解

### 10.1 主要风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 性能下降 | 系统响应变慢 | 优化算法、添加缓存 |
| 复杂性增加 | 开发者困惑 | 详细文档、开发工具 |
| 兼容性问题 | 现有代码失效 | 渐进式迁移、回滚计划 |

### 10.2 监控指标

- **性能指标**：查找延迟、内存使用、CPU 开销
- **兼容性指标**：回归测试通过率、错误率
- **使用指标**：新作用域使用频率、开发者反馈

## 11. 附录

### 11.1 术语表

- **作用域（Scope）**：变量的可见性和生命周期范围
- **Thread**：工作流执行的独立实例
- **Subgraph**：嵌套的工作流执行单元
- **Loop**：重复执行的控制结构

### 11.2 参考实现

相关文件路径：
- `sdk/types/thread.ts`
- `sdk/types/workflow.ts`
- `sdk/core/execution/managers/variable-manager.ts`
- `sdk/core/execution/managers/variable-accessor.ts`
- `sdk/core/execution/context/thread-context.ts`

### 11.3 版本历史

- **v1.0**：初始版本，两级作用域
- **v2.0**：四级作用域系统（本文档）