# NodeExecutionResult.input/output 字段分析报告（修订版）

## 一、执行摘要

经过对 SDK 代码库的全面分析，发现 `NodeExecutionResult` 中的 `input` 和 `output` 字段存在以下问题：

1. **`input` 字段完全未被使用** - 审计需求可通过其他方式满足
2. **`output` 字段使用混乱** - 部分节点需要，部分不需要，且用途不明确
3. **Hook 机制需要改进** - 应该支持修改节点输出（可选）和全局状态（主要）
4. **Hook 架构需要重构** - 改造为类似 trigger-handlers/node-handlers 的模块化设计

## 二、NodeExecutionResult.input 使用情况

### 2.1 定义位置
- 文件: `sdk/types/thread.ts:89`
- 类型: `any`
- 说明: 记录节点执行时的输入数据

### 2.2 实际使用情况
通过代码搜索发现：
- **设置**: 没有任何地方在 `nodeResults.push` 时设置 `input` 字段
- **读取**: 没有任何地方读取 `nodeResult.input` 或 `lastNodeResult.input`
- **引用**: 仅在注释和文档中提到

### 2.3 审计需求分析

#### 2.3.1 审计场景
在 `sdk/types/workflow.ts:131` 和 `sdk/types/workflow.ts:141` 中，提到了"运行时审计和调试"的需求：

```typescript
/**
 * 用途：运行时审计和调试，追踪子工作流的数据来源
 */
inputMapping: Map<string, ID>;

/**
 * 用途：运行时审计和调试，追踪子工作流的数据去向
 */
outputMapping: Map<string, ID>;
```

这表明系统确实有审计和追踪数据流的需求。

#### 2.3.2 input 字段的潜在审计价值

如果 `NodeExecutionResult.input` 字段被使用，可能的审计场景包括：

1. **节点输入追踪**: 记录每个节点接收到的输入数据
2. **数据流分析**: 追踪数据在工作流中的传递路径
3. **调试支持**: 在节点执行失败时，查看输入数据
4. **合规审计**: 某些场景需要记录所有数据处理过程

#### 2.3.3 替代方案分析

**方案 A: 使用 Thread.input + 变量系统**
- **优点**: 
  - 利用现有的 `Thread.input` 和 `thread.variableValues`
  - 通过表达式解析可以追踪数据来源
  - 不需要额外的存储空间
- **缺点**:
  - 无法记录节点级别的输入快照
  - 如果变量在节点执行前被修改，无法追溯原始输入

**方案 B: 使用事件系统**
- **优点**:
  - 通过 `NODE_STARTED` 事件记录节点输入
  - 不修改 `NodeExecutionResult` 结构
  - 可以灵活地记录额外信息
- **缺点**:
  - 需要额外的事件处理逻辑
  - 数据分散在事件日志中

**方案 C: 使用 Checkpoint 机制**
- **优点**:
  - Checkpoint 已经包含完整的 Thread 状态
  - 可以恢复到任意节点的执行前状态
  - 支持时间点审计
- **缺点**:
  - Checkpoint 是全局快照，不是节点级别的
  - 需要额外的存储空间

**方案 D: 添加专门的审计日志**
- **优点**:
  - 专门为审计设计，结构清晰
  - 不影响核心执行逻辑
  - 可以按需启用/禁用
- **缺点**:
  - 需要额外的日志系统
  - 增加系统复杂度

#### 2.3.4 推荐方案

**推荐使用方案 B（事件系统）+ 方案 D（审计日志）的组合**：

1. **事件系统**: 在 `NODE_STARTED` 事件中包含节点输入信息
2. **审计日志**: 可选的审计日志系统，记录详细的数据流

**理由**:
- 不修改核心数据结构
- 灵活性高，可以按需启用
- 与现有的事件系统集成良好
- 满足审计需求的同时不影响性能

### 2.4 结论
**`NodeExecutionResult.input` 字段可以删除，审计需求通过事件系统和审计日志满足。**

## 三、NodeExecutionResult.output 使用情况

### 3.1 定义位置
- 文件: `sdk/types/thread.ts:107`
- 类型: `any`
- 说明: 记录节点执行后的输出数据

### 3.2 实际使用情况

#### 3.2.1 在 nodeResults.push 时设置 output 的节点

| 节点类型 | 文件 | output 内容 | 用途 |
|---------|------|------------|------|
| VARIABLE | `variable-handler.ts:206-210` | `{ variableName, value, type }` | 记录变量更新 |
| TOOL | `tool-handler.ts:198` | 工具执行结果 | 记录工具调用结果 |
| CODE | `code-handler.ts:186` | 脚本执行结果 | 记录脚本执行结果 |
| LOOP_START | `loop-start-handler.ts:271-284` | `{ loopId, variableName, currentValue, iterationCount, shouldContinue }` | 记录循环状态 |
| LOOP_END | `loop-end-handler.ts:218-232` | `{ loopId, shouldContinue, shouldBreak, loopConditionMet, iterationCount, nextNodeId }` | 记录循环状态 |

#### 3.2.2 在 nodeResults.push 时**不设置** output 的节点

| 节点类型 | 文件 | 说明 |
|---------|------|------|
| START | `start-handler.ts:94-100` | 仅记录执行完成，无 output |
| END | `end-handler.ts:91-97` | 仅记录执行完成，无 output |

#### 3.2.3 Handler 返回值包含 output 但未记录到 nodeResults

| 节点类型 | 文件 | 返回值内容 | 是否记录到 nodeResults |
|---------|------|-----------|---------------------|
| ROUTE | `route-handler.ts:105-108` | `{ selectedRoute, targetNodeId }` | ❌ 否 |
| FORK | `fork-handler.ts:77-82` | `{ forkId, forkStrategy, childNodeIds, message }` | ❌ 否 |
| JOIN | `join-handler.ts:95-102` | `{ joinId, joinStrategy, threshold, timeout, childThreadIds, message }` | ❌ 否 |
| CONTEXT_PROCESSOR | `context-processor-handler.ts:153-156` | `{ processorType, results }` | ❌ 否 |

#### 3.2.4 读取 NodeExecutionResult.output 的地方

1. **`thread-executor.ts:208`**
   ```typescript
   output: output.status ? undefined : output
   ```
   - 用途: 将 handler 返回值作为 nodeResult.output
   - 问题: 如果 output 包含 status 字段，则不设置 output（逻辑不清晰）

2. **`graph-navigator.ts:184-187`**
   ```typescript
   if (lastNodeResult && lastNodeResult.nodeId === currentNodeId &&
     lastNodeResult.output && typeof lastNodeResult.output === 'object' &&
     'selectedNode' in lastNodeResult.output) {
     return lastNodeResult.output.selectedNode as string;
   }
   ```
   - 用途: ROUTE 节点从执行结果中获取 selectedNode
   - 问题: ROUTE handler 返回的是 `targetNodeId`，但这里查找的是 `selectedNode`，**逻辑不匹配**

3. **`hook-handler.ts:178`**
   ```typescript
   output: result?.output
   ```
   - 用途: Hook 评估上下文中包含节点输出
   - 问题: Hook 应该操作变量和节点输出（详见第五节）

### 3.3 结论
**`NodeExecutionResult.output` 字段使用混乱，需要重新设计。**

## 四、各节点类型对 input/output 的需求分析

### 4.1 不需要 input/output 的节点

| 节点类型 | 原因 |
|---------|------|
| START | 仅初始化工作流，无输入输出 |
| END | 仅标记工作流完成，无输入输出 |
| FORK | 占位符节点，实际逻辑由 ThreadCoordinator 处理 |
| JOIN | 占位符节点，实际逻辑由 ThreadCoordinator 处理 |

### 4.2 需要 output 但不需要 input 的节点

| 节点类型 | output 用途 | 是否必要 |
|---------|------------|---------|
| VARIABLE | 记录变量更新（变量名、值、类型） | ❌ 不必要 - 已通过 `thread.variableValues` 记录 |
| TOOL | 记录工具执行结果 | ⚠️ 可选 - 用于调试和追踪 |
| CODE | 记录脚本执行结果 | ⚠️ 可选 - 用于调试和追踪 |
| LOOP_START | 记录循环状态 | ⚠️ 可选 - 用于调试和追踪 |
| LOOP_END | 记录循环状态 | ⚠️ 可选 - 用于调试和追踪 |

### 4.3 需要 output 用于路由决策的节点

| 节点类型 | output 用途 | 是否必要 |
|---------|------------|---------|
| ROUTE | 返回 `selectedNode` 或 `targetNodeId` 用于路由决策 | ✅ 必要 - 但当前实现有问题 |

### 4.4 直接操作变量的节点

| 节点类型 | 操作方式 | 是否需要 output |
|---------|---------|----------------|
| CONTEXT_PROCESSOR | 直接修改 `thread.variableValues` | ❌ 不必要 - output 仅用于记录 |

## 五、Hook 机制分析与改进方案

### 5.1 当前实现

在 `hook-handler.ts` 中，Hook 的评估上下文包含：

```typescript
interface HookEvaluationContext {
  output: any;              // 节点执行结果
  status: string;           // 节点状态
  executionTime: number;    // 执行时间
  error?: any;              // 错误信息
  variables: Record<string, any>;  // 当前变量状态
  config: any;              // 节点配置
  metadata?: Record<string, any>;   // 节点元数据
}
```

转换为 `EvaluationContext` 时：

```typescript
private convertToEvaluationContext(hookContext: HookEvaluationContext): EvaluationContext {
  return {
    input: {},  // 空对象
    output: {
      result: hookContext.output,
      status: hookContext.status,
      executionTime: hookContext.executionTime,
      error: hookContext.error
    },
    variables: hookContext.variables
  };
}
```

### 5.2 Hook 的职责分析

#### 5.2.1 Hook 的主要职责

根据设计原则，Hook 应该：

1. **基于节点执行情况修改全局状态**（主要职责）
   - 修改 `thread.variableValues`
   - 修改 `thread.output`（仅在 END 节点）

2. **可选地修改节点输出**（次要职责）
   - 在某些场景下，Hook 可能需要修改节点的输出数据
   - 例如：数据转换、格式化、过滤等

3. **触发自定义事件**（扩展功能）
   - 通知外部系统节点执行情况
   - 集成第三方服务

#### 5.2.2 当前实现的问题

1. **概念混淆**: 将节点执行结果（局部）作为 output（全局概念）
2. **职责不清**: 没有明确区分修改全局状态和修改节点输出
3. **input 为空**: `input` 字段始终为空对象，没有实际用途
4. **架构不清晰**: 所有 Hook 逻辑集中在一个类中，缺乏模块化

### 5.3 Hook 架构改进方案

#### 5.3.1 参考 Trigger Handler 架构

Trigger Handler 的架构特点：

```
sdk/core/execution/handlers/trigger-handlers/
├── custom-handler.ts          # 自定义动作
├── pause-thread-handler.ts    # 暂停线程
├── resume-thread-handler.ts   # 恢复线程
├── send-notification-handler.ts  # 发送通知
├── set-variable-handler.ts    # 设置变量
├── skip-node-handler.ts       # 跳过节点
├── stop-thread-handler.ts     # 停止线程
└── index.ts                   # 导出所有 handler
```

每个 handler 的特点：
- 独立的文件
- 统一的接口（接收 `TriggerAction` 和 `triggerId`）
- 返回 `TriggerExecutionResult`
- 清晰的职责划分

#### 5.3.2 Hook Handler 架构设计

**建议的目录结构**:

```
sdk/core/execution/handlers/hook-handlers/
├── modify-variable-handler.ts    # 修改变量
├── modify-output-handler.ts      # 修改节点输出
├── modify-thread-output-handler.ts  # 修改工作流输出
├── send-event-handler.ts         # 发送事件
├── custom-hook-handler.ts        # 自定义 Hook
├── index.ts                      # 导出所有 handler
└── hook-executor.ts              # Hook 执行器（协调器）
```

**类型定义**:

```typescript
/**
 * Hook 动作类型枚举
 */
export enum HookActionType {
  /** 修改变量 */
  MODIFY_VARIABLE = 'modify_variable',
  /** 修改节点输出 */
  MODIFY_NODE_OUTPUT = 'modify_node_output',
  /** 修改工作流输出 */
  MODIFY_THREAD_OUTPUT = 'modify_thread_output',
  /** 发送事件 */
  SEND_EVENT = 'send_event',
  /** 自定义 Hook */
  CUSTOM = 'custom'
}

/**
 * Hook 动作接口
 */
export interface HookAction {
  /** 动作类型 */
  type: HookActionType;
  /** 动作参数 */
  parameters: Record<string, any>;
  /** 动作元数据 */
  metadata?: Metadata;
}

/**
 * Hook 执行结果接口
 */
export interface HookExecutionResult {
  /** Hook ID */
  hookId: string;
  /** 是否成功执行 */
  success: boolean;
  /** 执行的动作 */
  action: HookAction;
  /** 执行时间 */
  executionTime: Timestamp;
  /** 执行结果数据 */
  result?: any;
  /** 错误信息（如果失败） */
  error?: any;
  /** 执行元数据 */
  metadata?: Metadata;
}
```

**Hook 评估上下文（改进版）**:

```typescript
/**
 * Hook 执行上下文
 */
export interface HookExecutionContext {
  /** Thread 实例 */
  thread: Thread;
  /** 节点定义 */
  node: Node;
  /** 节点执行结果（AFTER_EXECUTE 时可用） */
  nodeResult?: NodeExecutionResult;
  /** Hook 配置 */
  hook: NodeHook;
}

/**
 * Hook 评估上下文（内部使用）
 */
interface HookEvaluationContext {
  // 节点执行信息（只读）
  nodeResult: {
    nodeId: ID;
    nodeType: string;
    status: string;
    executionTime: number;
    error?: any;
    data?: any;  // 节点执行数据（重命名后的 output）
  };
  
  // 全局状态（可修改）
  variables: Record<string, any>;  // thread.variableValues
  output: Record<string, any>;     // thread.output
  
  // 节点配置（只读）
  config: any;
  metadata?: Record<string, any>;
}
```

**Handler 示例**:

```typescript
// modify-variable-handler.ts
export async function modifyVariableHandler(
  action: HookAction,
  context: HookExecutionContext
): Promise<HookExecutionResult> {
  const startTime = Date.now();
  
  try {
    const { variables } = action.parameters;
    
    // 修改变量
    for (const [name, value] of Object.entries(variables)) {
      context.thread.variableValues[name] = value;
    }
    
    return {
      hookId: context.hook.hookName,
      success: true,
      action,
      executionTime: Date.now() - startTime,
      result: { message: 'Variables modified successfully', variables }
    };
  } catch (error) {
    return {
      hookId: context.hook.hookName,
      success: false,
      action,
      executionTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// modify-output-handler.ts
export async function modifyOutputHandler(
  action: HookAction,
  context: HookExecutionContext
): Promise<HookExecutionResult> {
  const startTime = Date.now();
  
  try {
    const { modifications } = action.parameters;
    
    // 修改节点输出
    if (context.nodeResult) {
      context.nodeResult.data = {
        ...context.nodeResult.data,
        ...modifications
      };
    }
    
    return {
      hookId: context.hook.hookName,
      success: true,
      action,
      executionTime: Date.now() - startTime,
      result: { message: 'Node output modified successfully', modifications }
    };
  } catch (error) {
    return {
      hookId: context.hook.hookName,
      success: false,
      action,
      executionTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
```

**Hook 执行器（协调器）**:

```typescript
export class HookExecutor {
  private handlers: Map<HookActionType, HookHandler> = new Map();
  
  constructor() {
    // 注册所有 handler
    this.registerHandler(HookActionType.MODIFY_VARIABLE, modifyVariableHandler);
    this.registerHandler(HookActionType.MODIFY_NODE_OUTPUT, modifyOutputHandler);
    this.registerHandler(HookActionType.MODIFY_THREAD_OUTPUT, modifyThreadOutputHandler);
    this.registerHandler(HookActionType.SEND_EVENT, sendEventHandler);
    this.registerHandler(HookActionType.CUSTOM, customHookHandler);
  }
  
  private registerHandler(type: HookActionType, handler: HookHandler): void {
    this.handlers.set(type, handler);
  }
  
  async executeHook(
    context: HookExecutionContext,
    emitEvent: (event: NodeCustomEvent) => Promise<void>
  ): Promise<void> {
    const { hook } = context;
    
    // 评估触发条件
    if (hook.condition) {
      const evalContext = this.buildEvaluationContext(context);
      const shouldTrigger = conditionEvaluator.evaluate(
        { expression: hook.condition },
        this.convertToEvaluationContext(evalContext)
      );
      
      if (!shouldTrigger) {
        return;
      }
    }
    
    // 执行 Hook 动作
    const handler = this.handlers.get(hook.actionType);
    if (handler) {
      const result = await handler(hook.action, context);
      
      // 触发事件
      if (hook.eventName) {
        await this.emitCustomEvent(context, hook.eventName, result, emitEvent);
      }
    }
  }
  
  // ... 其他辅助方法
}
```

### 5.4 Hook 配置改进

**改进后的 NodeHook 接口**:

```typescript
export interface NodeHook {
  /** Hook 名称，用于标识和调试 */
  hookName: string;
  /** Hook 类型 */
  hookType: HookType;
  /** Hook 动作类型 */
  actionType: HookActionType;
  /** Hook 动作配置 */
  action: HookAction;
  /** 触发条件（可选） */
  condition?: string;
  /** 要触发的自定义事件名称（可选） */
  eventName?: string;
  /** 事件载荷生成逻辑（可选） */
  eventPayload?: Record<string, any>;
  /** 权重（用于排序，权重高的先执行） */
  weight?: number;
  /** 是否启用（默认 true） */
  enabled?: boolean;
  /** Hook 元数据 */
  metadata?: Metadata;
}
```

## 六、建议方案

### 6.1 删除 NodeExecutionResult.input

**理由**: 
- 完全未被使用
- 审计需求通过事件系统和审计日志满足

**影响**: 无

### 6.2 重新设计 NodeExecutionResult.output

#### 方案 A: 完全删除 output 字段

**优点**:
- 简化数据结构
- 避免概念混淆

**缺点**:
- 失去节点执行结果的追踪能力
- ROUTE 节点需要其他方式传递路由决策

**适用场景**: 如果不需要详细的执行追踪

#### 方案 B: 重命名为 data，明确用途

**优点**:
- 保留执行追踪能力
- 明确字段用途（data 而非 output）

**缺点**:
- 需要修改所有使用该字段的地方

**适用场景**: 如果需要详细的执行追踪

#### 方案 C: 分类处理（推荐）

**设计思路**:
1. **删除** `NodeExecutionResult.input`
2. **重命名** `NodeExecutionResult.output` 为 `NodeExecutionResult.data`
3. **明确** `data` 字段的用途：仅用于执行追踪和调试
4. **分离** 路由决策逻辑：ROUTE 节点通过特殊机制传递路由决策
5. **支持** Hook 修改节点输出（通过修改 `data` 字段）

**具体实现**:

```typescript
export interface NodeExecutionResult {
  nodeId: ID;
  nodeType: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED' | 'CANCELLED';
  step: number;
  
  /**
   * 执行数据（用于追踪和调试）
   *
   * 说明：记录节点执行时的相关数据
   * - 用于执行追踪和调试
   * - 不参与表达式解析
   * - 可选字段，某些节点类型可能不需要
   * - Hook 可以修改此字段（可选操作）
   *
   * 示例：
   * - TOOL 节点：包含工具调用参数和结果
   * - CODE 节点：包含脚本执行结果
   * - LOOP 节点：包含循环状态信息
   * - ROUTE 节点：包含路由决策信息
   */
  data?: any;
  
  error?: any;
  executionTime?: Timestamp;
  startTime?: Timestamp;
  endTime?: Timestamp;
  timestamp?: Timestamp;
}
```

**各节点类型的 data 字段使用**:

| 节点类型 | 是否设置 data | data 内容 | Hook 是否可修改 |
|---------|--------------|----------|----------------|
| START | ❌ 否 | - | - |
| END | ❌ 否 | - | - |
| VARIABLE | ❌ 否 | 已通过 `thread.variableValues` 记录 | - |
| TOOL | ✅ 是 | `{ parameters, result, executionTime }` | ✅ 是 |
| CODE | ✅ 是 | `{ script, result, executionTime }` | ✅ 是 |
| LOOP_START | ✅ 是 | `{ loopId, variableName, currentValue, iterationCount }` | ✅ 是 |
| LOOP_END | ✅ 是 | `{ loopId, shouldContinue, shouldBreak, iterationCount }` | ✅ 是 |
| ROUTE | ✅ 是 | `{ selectedRoute, targetNodeId }` | ✅ 是 |
| FORK | ❌ 否 | 占位符节点 | - |
| JOIN | ❌ 否 | 占位符节点 | - |
| CONTEXT_PROCESSOR | ❌ 否 | 已通过 `thread.variableValues` 记录 | - |

### 6.3 改进 Hook 机制

**改进后的 Hook 评估上下文**:

```typescript
interface HookEvaluationContext {
  // 节点执行信息（只读）
  nodeResult: {
    nodeId: ID;
    nodeType: string;
    status: string;
    executionTime: number;
    error?: any;
    data?: any;  // 节点执行数据（可修改）
  };
  
  // 全局状态（可修改）
  variables: Record<string, any>;
  output: Record<string, any>;  // Thread.output
  
  // 节点配置（只读）
  config: any;
  metadata?: Record<string, any>;
}
```

**改进后的 convertToEvaluationContext**:

```typescript
private convertToEvaluationContext(hookContext: HookEvaluationContext): EvaluationContext {
  return {
    variables: hookContext.variables,
    input: {},  // Thread.input（如果需要）
    output: hookContext.output  // Thread.output（全局）
  };
}
```

### 6.4 实施审计日志系统

**审计日志接口**:

```typescript
/**
 * 审计日志条目
 */
export interface AuditLogEntry {
  /** 日志ID */
  id: ID;
  /** 线程ID */
  threadId: ID;
  /** 节点ID */
  nodeId: ID;
  /** 节点类型 */
  nodeType: string;
  /** 事件类型 */
  eventType: 'NODE_STARTED' | 'NODE_COMPLETED' | 'VARIABLE_UPDATED';
  /** 时间戳 */
  timestamp: Timestamp;
  /** 输入数据（NODE_STARTED 时） */
  inputData?: Record<string, any>;
  /** 输出数据（NODE_COMPLETED 时） */
  outputData?: Record<string, any>;
  /** 变量更新（VARIABLE_UPDATED 时） */
  variableUpdate?: {
    name: string;
    oldValue: any;
    newValue: any;
  };
  /** 元数据 */
  metadata?: Metadata;
}

/**
 * 审计日志管理器
 */
export interface AuditLogManager {
  /**
   * 记录审计日志
   */
  log(entry: AuditLogEntry): Promise<void>;
  
  /**
   * 查询审计日志
   */
  query(filter: AuditLogFilter): Promise<AuditLogEntry[]>;
  
  /**
   * 清理审计日志
   */
  cleanup(before: Timestamp): Promise<number>;
}
```

## 七、实施建议

### 7.1 优先级

1. **高优先级**: 删除 `NodeExecutionResult.input`（无风险）
2. **高优先级**: 重命名 `output` 为 `data`，明确用途
3. **中优先级**: 改进 Hook 机制，支持修改节点输出和全局状态
4. **中优先级**: 重构 Hook 架构，改造为模块化设计
5. **低优先级**: 实施审计日志系统
6. **低优先级**: 修复 ROUTE 节点的路由决策逻辑

### 7.2 实施步骤

**第一阶段：核心数据结构改进**
1. 删除 `NodeExecutionResult.input` 字段
2. 重命名 `output` 为 `data`
3. 更新所有使用该字段的地方
4. 更新文档和测试

**第二阶段：Hook 机制改进**
1. 定义新的 Hook 类型系统
2. 实现 Hook Handler 模块
3. 改进 Hook 执行器
4. 更新 Hook 配置接口

**第三阶段：审计系统实施**
1. 设计审计日志接口
2. 实现审计日志管理器
3. 集成到节点执行流程
4. 提供查询和清理功能

**第四阶段：优化和测试**
1. 修复 ROUTE 节点逻辑
2. 完善单元测试
3. 性能优化
4. 文档更新

### 7.3 风险评估

| 改动项 | 风险等级 | 说明 |
|-------|---------|------|
| 删除 input | 低 | 完全未被使用 |
| 重命名 output 为 data | 中 | 需要更新所有使用该字段的地方 |
| 改进 Hook 机制 | 中 | 需要确保向后兼容性 |
| 重构 Hook 架构 | 中 | 需要仔细设计接口 |
| 实施审计日志系统 | 低 | 新功能，不影响现有逻辑 |
| 修复 ROUTE 节点 | 低 | 当前实现有问题，修复后更清晰 |

## 八、总结

### 8.1 核心问题

1. **`input` 字段完全未被使用** - 审计需求通过事件系统和审计日志满足
2. **`output` 字段用途不明确** - 混淆了节点执行数据和工作流输出
3. **Hook 机制需要改进** - 应该支持修改节点输出（可选）和全局状态（主要）
4. **Hook 架构需要重构** - 改造为类似 trigger-handlers/node-handlers 的模块化设计

### 8.2 推荐方案

1. **删除** `NodeExecutionResult.input`
2. **重命名** `NodeExecutionResult.output` 为 `NodeExecutionResult.data`
3. **明确** `data` 字段仅用于执行追踪和调试，Hook 可以修改此字段
4. **改进** Hook 机制，支持修改节点输出（可选）和全局状态（主要）
5. **重构** Hook 架构，改造为模块化设计
6. **实施** 审计日志系统，满足审计需求

### 8.3 预期收益

1. **简化数据结构** - 删除不必要的字段
2. **明确职责** - 区分节点执行数据和工作流输出
3. **提高可维护性** - 代码逻辑更清晰
4. **降低理解成本** - 新开发者更容易理解系统设计
5. **增强扩展性** - 模块化的 Hook 架构更易于扩展
6. **满足审计需求** - 通过审计日志系统提供完整的数据追踪能力