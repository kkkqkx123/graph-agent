# 节点执行器实现计划

## 问题分析

### 当前状态

1. **基类实现**：[`sdk/core/execution/node-executor.ts`](sdk/core/execution/node-executor.ts) 已实现节点执行器基类
2. **设计文档**：[`plans/sdk/core/execution/node-executors/`](plans/sdk/core/execution/node-executors/) 目录下有15个节点执行器的详细设计文档
3. **节点类型**：[`sdk/types/node.ts`](sdk/types/node.ts) 定义了15种节点类型

### 核心问题

#### 问题 1：缺少具体节点执行器实现

**现状：**
- 只有 [`NodeExecutor`](sdk/core/execution/node-executor.ts:15) 基类
- 没有任何具体的节点执行器实现
- 无法执行任何节点

**影响：**
- 工作流无法执行
- 所有节点类型都无法处理

#### 问题 2：缺少节点执行器注册机制

**现状：**
- 没有节点执行器工厂或注册表
- 无法根据节点类型选择对应的执行器

**影响：**
- 无法动态创建节点执行器
- 无法扩展新的节点类型

## 解决方案

### 方案 1：创建节点执行器工厂

#### 1.1 创建 NodeExecutorFactory

**文件：** `sdk/core/execution/node-executor-factory.ts`

**内容：**
```typescript
/**
 * 节点执行器工厂
 * 负责根据节点类型创建对应的执行器
 */

import { NodeExecutor } from './node-executor';
import { NodeType } from '../../types/node';
import type { ExecutionContext } from './execution-context';

// 导入所有节点执行器
import { StartNodeExecutor } from './executors/start-node-executor';
import { EndNodeExecutor } from './executors/end-node-executor';
import { VariableNodeExecutor } from './executors/variable-node-executor';
import { ForkNodeExecutor } from './executors/fork-node-executor';
import { JoinNodeExecutor } from './executors/join-node-executor';
import { CodeNodeExecutor } from './executors/code-node-executor';
import { LLMNodeExecutor } from './executors/llm-node-executor';
import { ToolNodeExecutor } from './executors/tool-node-executor';
import { UserInteractionNodeExecutor } from './executors/user-interaction-node-executor';
import { RouteNodeExecutor } from './executors/route-node-executor';
import { ContextProcessorNodeExecutor } from './executors/context-processor-node-executor';
import { LoopStartNodeExecutor } from './executors/loop-start-node-executor';
import { LoopEndNodeExecutor } from './executors/loop-end-node-executor';
import { SubgraphNodeExecutor } from './executors/subgraph-node-executor';

/**
 * 节点执行器工厂
 */
export class NodeExecutorFactory {
  private static executorMap: Map<NodeType, new () => NodeExecutor> = new Map();

  /**
   * 初始化执行器映射
   */
  private static initializeExecutorMap(): void {
    // 注册所有节点执行器
    this.executorMap.set(NodeType.START, StartNodeExecutor);
    this.executorMap.set(NodeType.END, EndNodeExecutor);
    this.executorMap.set(NodeType.VARIABLE, VariableNodeExecutor);
    this.executorMap.set(NodeType.FORK, ForkNodeExecutor);
    this.executorMap.set(NodeType.JOIN, JoinNodeExecutor);
    this.executorMap.set(NodeType.CODE, CodeNodeExecutor);
    this.executorMap.set(NodeType.LLM, LLMNodeExecutor);
    this.executorMap.set(NodeType.TOOL, ToolNodeExecutor);
    this.executorMap.set(NodeType.USER_INTERACTION, UserInteractionNodeExecutor);
    this.executorMap.set(NodeType.ROUTE, RouteNodeExecutor);
    this.executorMap.set(NodeType.CONTEXT_PROCESSOR, ContextProcessorNodeExecutor);
    this.executorMap.set(NodeType.LOOP_START, LoopStartNodeExecutor);
    this.executorMap.set(NodeType.LOOP_END, LoopEndNodeExecutor);
    this.executorMap.set(NodeType.SUBGRAPH, SubgraphNodeExecutor);
  }

  /**
   * 创建节点执行器
   * @param nodeType 节点类型
   * @returns 节点执行器实例
   */
  static createExecutor(nodeType: NodeType): NodeExecutor {
    // 确保映射已初始化
    if (this.executorMap.size === 0) {
      this.initializeExecutorMap();
    }

    const ExecutorClass = this.executorMap.get(nodeType);
    if (!ExecutorClass) {
      throw new Error(`No executor found for node type: ${nodeType}`);
    }

    return new ExecutorClass();
  }

  /**
   * 注册自定义节点执行器
   * @param nodeType 节点类型
   * @param ExecutorClass 执行器类
   */
  static registerExecutor(
    nodeType: NodeType,
    ExecutorClass: new () => NodeExecutor
  ): void {
    this.executorMap.set(nodeType, ExecutorClass);
  }

  /**
   * 检查是否支持该节点类型
   * @param nodeType 节点类型
   * @returns 是否支持
   */
  static isSupported(nodeType: NodeType): boolean {
    return this.executorMap.has(nodeType);
  }
}
```

### 方案 2：实现节点执行器

#### 2.1 节点执行器实现优先级

根据依赖关系和复杂度，建议按以下顺序实现：

**第一批：基础节点（无依赖）**
1. [`StartNodeExecutor`](plans/sdk/core/execution/node-executors/start-logic.md) - 开始节点
2. [`EndNodeExecutor`](plans/sdk/core/execution/node-executors/end-logic.md) - 结束节点
3. [`VariableNodeExecutor`](plans/sdk/core/execution/node-executors/variable-logic.md) - 变量节点

**第二批：简单节点（依赖基础节点）**
4. [`RouteNodeExecutor`](plans/sdk/core/execution/node-executors/route-logic.md) - 路由节点
5. [`CodeNodeExecutor`](plans/sdk/core/execution/node-executors/code-logic.md) - 代码节点

**第三批：复杂节点（依赖多个组件）**
6. [`LLMNodeExecutor`](plans/sdk/core/execution/node-executors/llm-logic.md) - LLM节点
7. [`ToolNodeExecutor`](plans/sdk/core/execution/node-executors/tool-logic.md) - 工具节点
8. [`ContextProcessorNodeExecutor`](plans/sdk/core/execution/node-executors/context-processor-logic.md) - 上下文处理器节点

**第四批：高级节点（依赖复杂逻辑）**
9. [`ForkNodeExecutor`](plans/sdk/core/execution/node-executors/fork-logic.md) - 分叉节点
10. [`JoinNodeExecutor`](plans/sdk/core/execution/node-executors/join-logic.md) - 连接节点
11. [`LoopStartNodeExecutor`](plans/sdk/core/execution/node-executors/loop-start-logic.md) - 循环开始节点
12. [`LoopEndNodeExecutor`](plans/sdk/core/execution/node-executors/loop-end-logic.md) - 循环结束节点

**第五批：特殊节点（依赖外部系统）**
13. [`UserInteractionNodeExecutor`](plans/sdk/core/execution/node-executors/user-interaction-logic.md) - 用户交互节点
14. [`SubgraphNodeExecutor`](plans/sdk/core/execution/node-executors/subgraph-logic.md) - 子图节点

#### 2.2 节点执行器实现模板

**文件结构：**
```
sdk/core/execution/executors/
├── start-node-executor.ts
├── end-node-executor.ts
├── variable-node-executor.ts
├── route-node-executor.ts
├── code-node-executor.ts
├── llm-node-executor.ts
├── tool-node-executor.ts
├── context-processor-node-executor.ts
├── fork-node-executor.ts
├── join-node-executor.ts
├── loop-start-node-executor.ts
├── loop-end-node-executor.ts
├── user-interaction-node-executor.ts
├── subgraph-node-executor.ts
└── index.ts
```

**实现模板：**
```typescript
/**
 * XXX节点执行器
 * 负责执行XXX节点
 */

import { NodeExecutor } from '../node-executor';
import type { Node } from '../../types/node';
import type { Thread } from '../../types/thread';
import type { NodeExecutionResult } from '../../types/thread';
import { NodeType } from '../../types/node';
import { ValidationError } from '../../types/errors';
import type { ExecutionContext } from '../execution-context';

/**
 * XXX节点执行器
 */
export class XXXNodeExecutor extends NodeExecutor {
  /**
   * 验证节点配置
   */
  protected validate(node: Node): boolean {
    // 检查节点类型
    if (node.type !== NodeType.XXX) {
      return false;
    }

    // 检查必需的配置项
    const config = node.config as XXXNodeConfig;
    if (!config.requiredField) {
      return false;
    }

    return true;
  }

  /**
   * 检查节点是否可以执行
   */
  protected canExecute(thread: Thread, node: Node): boolean {
    // 调用父类检查
    if (!super.canExecute(thread, node)) {
      return false;
    }

    // 添加特定检查
    // ...

    return true;
  }

  /**
   * 执行节点的具体逻辑
   */
  protected async doExecute(thread: Thread, node: Node): Promise<any> {
    const config = node.config as XXXNodeConfig;

    // 步骤1：获取配置
    // ...

    // 步骤2：验证配置
    // ...

    // 步骤3：执行逻辑
    // ...

    // 步骤4：返回结果
    return result;
  }
}
```

### 方案 3：创建执行器索引

**文件：** `sdk/core/execution/executors/index.ts`

**内容：**
```typescript
/**
 * 节点执行器索引
 * 导出所有节点执行器
 */

export { StartNodeExecutor } from './start-node-executor';
export { EndNodeExecutor } from './end-node-executor';
export { VariableNodeExecutor } from './variable-node-executor';
export { ForkNodeExecutor } from './fork-node-executor';
export { JoinNodeExecutor } from './join-node-executor';
export { CodeNodeExecutor } from './code-node-executor';
export { LLMNodeExecutor } from './llm-node-executor';
export { ToolNodeExecutor } from './tool-node-executor';
export { UserInteractionNodeExecutor } from './user-interaction-node-executor';
export { RouteNodeExecutor } from './route-node-executor';
export { ContextProcessorNodeExecutor } from './context-processor-node-executor';
export { LoopStartNodeExecutor } from './loop-start-node-executor';
export { LoopEndNodeExecutor } from './loop-end-node-executor';
export { SubgraphNodeExecutor } from './subgraph-node-executor';
```

## 实施步骤

### 阶段 1：基础设施

1. **创建执行器目录结构**
   - 创建 `sdk/core/execution/executors/` 目录
   - 创建所有执行器文件

2. **实现 NodeExecutorFactory**
   - 文件：`sdk/core/execution/node-executor-factory.ts`
   - 实现工厂类
   - 实现注册机制

3. **创建执行器索引**
   - 文件：`sdk/core/execution/executors/index.ts`
   - 导出所有执行器

### 阶段 2：基础节点实现

4. **实现 StartNodeExecutor**
   - 文件：`sdk/core/execution/executors/start-node-executor.ts`
   - 参考：[`plans/sdk/core/execution/node-executors/start-logic.md`](plans/sdk/core/execution/node-executors/start-logic.md)
   - 初始化 Thread 状态
   - 触发 THREAD_STARTED 事件

5. **实现 EndNodeExecutor**
   - 文件：`sdk/core/execution/executors/end-node-executor.ts`
   - 参考：[`plans/sdk/core/execution/node-executors/end-logic.md`](plans/sdk/core/execution/node-executors/end-logic.md)
   - 收集输出数据
   - 触发 THREAD_COMPLETED 事件

6. **实现 VariableNodeExecutor**
   - 文件：`sdk/core/execution/executors/variable-node-executor.ts`
   - 参考：[`plans/sdk/core/execution/node-executors/variable-logic.md`](plans/sdk/core/execution/node-executors/variable-logic.md)
   - 解析表达式
   - 更新变量值

### 阶段 3：简单节点实现

7. **实现 RouteNodeExecutor**
   - 文件：`sdk/core/execution/executors/route-node-executor.ts`
   - 参考：[`plans/sdk/core/execution/node-executors/route-logic.md`](plans/sdk/core/execution/node-executors/route-logic.md)
   - 评估条件表达式
   - 选择下一个节点

8. **实现 CodeNodeExecutor**
   - 文件：`sdk/core/execution/executors/code-node-executor.ts`
   - 参考：[`plans/sdk/core/execution/node-executors/code-logic.md`](plans/sdk/core/execution/node-executors/code-logic.md)
   - 执行脚本代码
   - 处理超时和重试

### 阶段 4：复杂节点实现

9. **实现 LLMNodeExecutor**
   - 文件：`sdk/core/execution/executors/llm-node-executor.ts`
   - 参考：[`plans/sdk/core/execution/node-executors/llm-logic.md`](plans/sdk/core/execution/node-executors/llm-logic.md)
   - 调用 LLM API
   - 处理工具调用

10. **实现 ToolNodeExecutor**
    - 文件：`sdk/core/execution/executors/tool-node-executor.ts`
    - 参考：[`plans/sdk/core/execution/node-executors/tool-logic.md`](plans/sdk/core/execution/node-executors/tool-logic.md)
    - 调用工具服务
    - 处理超时和重试

11. **实现 ContextProcessorNodeExecutor**
    - 文件：`sdk/core/execution/executors/context-processor-node-executor.ts`
    - 参考：[`plans/sdk/core/execution/node-executors/context-processor-logic.md`](plans/sdk/core/execution/node-executors/context-processor-logic.md)
    - 处理上下文消息
    - 支持多种处理类型

### 阶段 5：高级节点实现

12. **实现 ForkNodeExecutor**
    - 文件：`sdk/core/execution/executors/fork-node-executor.ts`
    - 参考：[`plans/sdk/core/execution/node-executors/fork-logic.md`](plans/sdk/core/execution/node-executors/fork-logic.md)
    - 创建子 Thread
    - 支持串行和并行执行

13. **实现 JoinNodeExecutor**
    - 文件：`sdk/core/execution/executors/join-node-executor.ts`
    - 参考：[`plans/sdk/core/execution/node-executors/join-logic.md`](plans/sdk/core/execution/node-executors/join-logic.md)
    - 等待子 Thread 完成
    - 合并结果

14. **实现 LoopStartNodeExecutor**
    - 文件：`sdk/core/execution/executors/loop-start-node-executor.ts`
    - 参考：[`plans/sdk/core/execution/node-executors/loop-start-logic.md`](plans/sdk/core/execution/node-executors/loop-start-logic.md)
    - 初始化循环变量
    - 控制循环流程

15. **实现 LoopEndNodeExecutor**
    - 文件：`sdk/core/execution/executors/loop-end-node-executor.ts`
    - 参考：[`plans/sdk/core/execution/node-executors/loop-end-logic.md`](plans/sdk/core/execution/node-executors/loop-end-logic.md)
    - 更新循环变量
    - 检查中断条件

### 阶段 6：特殊节点实现

16. **实现 UserInteractionNodeExecutor**
    - 文件：`sdk/core/execution/executors/user-interaction-node-executor.ts`
    - 参考：[`plans/sdk/core/execution/node-executors/user-interaction-logic.md`](plans/sdk/core/execution/node-executors/user-interaction-logic.md)
    - 触发用户交互
    - 等待用户输入

17. **实现 SubgraphNodeExecutor**
    - 文件：`sdk/core/execution/executors/subgraph-node-executor.ts`
    - 参考：[`plans/sdk/core/execution/node-executors/subgraph-logic.md`](plans/sdk/core/execution/node-executors/subgraph-logic.md)
    - 调用子工作流
    - 处理输入输出映射

### 阶段 7：集成测试

18. **创建单元测试**
    - 为每个执行器创建单元测试
    - 测试验证逻辑
    - 测试执行逻辑
    - 测试错误处理

19. **创建集成测试**
    - 测试完整的工作流执行
    - 测试节点之间的协作
    - 测试变量传递
    - 测试条件路由

20. **创建端到端测试**
    - 测试复杂工作流
    - 测试 Fork/Join 场景
    - 测试循环场景
    - 测试错误恢复

## 注意事项

### 1. 依赖管理

- **LLMNodeExecutor** 依赖 [`LLMWrapper`](sdk/core/llm/wrapper.ts)
- **ToolNodeExecutor** 依赖 [`ToolService`](sdk/core/tools/tool-service.ts)
- **ForkNodeExecutor** 和 **JoinNodeExecutor** 依赖 [`ForkJoinManager`](sdk/core/execution/fork-join-manager.ts)
- **VariableNodeExecutor** 依赖 [`VariableManager`](sdk/core/state/variable-manager.ts)

### 2. 错误处理

- 所有执行器必须正确处理错误
- 使用 [`ValidationError`](sdk/types/errors.ts) 表示配置错误
- 使用 [`ExecutionError`](sdk/types/errors.ts) 表示执行错误
- 使用 [`NotFoundError`](sdk/types/errors.ts) 表示资源不存在

### 3. 事件触发

- **StartNodeExecutor** 触发 THREAD_STARTED 事件
- **EndNodeExecutor** 触发 THREAD_COMPLETED 事件
- **ForkNodeExecutor** 触发 THREAD_FORKED 事件
- **JoinNodeExecutor** 触发 THREAD_JOINED 事件
- 所有节点触发 NODE_STARTED、NODE_COMPLETED 或 NODE_FAILED 事件

### 4. 变量管理

- **VariableNodeExecutor** 使用 [`VariableManager`](sdk/core/state/variable-manager.ts) 管理变量
- 所有执行器可以通过 [`ExecutionContext`](sdk/core/execution/execution-context.ts) 访问变量
- 支持变量引用 `{{variableName}}`

### 5. 超时控制

- **CodeNodeExecutor** 支持超时控制
- **ToolNodeExecutor** 支持超时控制
- **JoinNodeExecutor** 支持超时控制
- 使用超时定时器控制执行时间

### 6. 重试机制

- **CodeNodeExecutor** 支持重试
- **ToolNodeExecutor** 支持重试
- 配置重试次数和重试延迟

### 7. 安全性

- **CodeNodeExecutor** 根据风险等级选择执行策略
- 高风险脚本在沙箱中执行
- 限制系统资源访问

### 8. 性能优化

- 避免重复创建执行器实例
- 缓存执行器实例
- 优化变量访问性能

## 相关文件

### 类型定义
- [`sdk/types/node.ts`](sdk/types/node.ts) - 节点类型定义
- [`sdk/types/thread.ts`](sdk/types/thread.ts) - Thread 类型定义
- [`sdk/types/errors.ts`](sdk/types/errors.ts) - 错误类型定义

### 核心组件
- [`sdk/core/execution/node-executor.ts`](sdk/core/execution/node-executor.ts) - 节点执行器基类
- [`sdk/core/execution/execution-context.ts`](sdk/core/execution/execution-context.ts) - 执行上下文
- [`sdk/core/state/variable-manager.ts`](sdk/core/state/variable-manager.ts) - 变量管理器
- [`sdk/core/state/thread-state.ts`](sdk/core/state/thread-state.ts) - Thread 状态管理器

### 依赖组件
- [`sdk/core/llm/wrapper.ts`](sdk/core/llm/wrapper.ts) - LLM 包装器
- [`sdk/core/tools/tool-service.ts`](sdk/core/tools/tool-service.ts) - 工具服务
- [`sdk/core/execution/fork-join-manager.ts`](sdk/core/execution/fork-join-manager.ts) - Fork/Join 管理器

### 设计文档
- [`plans/sdk/core/execution/node-executor.md`](plans/sdk/core/execution/node-executor.md) - 节点执行器设计文档
- [`plans/sdk/core/execution/node-executor-logic.md`](plans/sdk/core/execution/node-executor-logic.md) - 节点执行器执行逻辑
- [`plans/sdk/core/execution/node-executors/`](plans/sdk/core/execution/node-executors/) - 各节点执行器详细设计

## 实施建议

### 1. 分阶段实施

按照上述优先级分阶段实施，每个阶段完成后进行测试和验证。

### 2. 持续集成

每个执行器实现完成后，立即编写单元测试和集成测试。

### 3. 代码审查

每个执行器实现完成后，进行代码审查，确保代码质量和一致性。

### 4. 文档更新

每个执行器实现完成后，更新相关文档和注释。

### 5. 性能测试

所有执行器实现完成后，进行性能测试，优化性能瓶颈。

### 6. 安全审计

所有执行器实现完成后，进行安全审计，确保没有安全漏洞。