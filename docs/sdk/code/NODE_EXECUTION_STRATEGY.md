/**
 * 节点执行前检查逻辑的实现策略
 * 
 * 本文档分析 code-handler 删除 canExecute 逻辑后，
 * 应用层应如何实现节点执行检查，以及 SDK 层应提供哪些接口支持
 */

# 节点执行前检查的分层实现方案

## 一、问题背景

原 `code-handler.ts` 中包含的判断逻辑：
1. **Thread 状态检查** - `if (thread.status !== 'RUNNING')`
2. **风险等级验证** - 根据不同等级进行安全检查
3. **返回 SKIPPED 状态** - 当不满足条件时

这些逻辑不属于 SDK 核心执行能力，应由应用层负责。

---

## 二、SDK 层已提供的机制

### 2.1 Hook 机制（核心拦截机制）

**位置**：`sdk/core/execution/coordinators/node-execution-coordinator.ts`

**执行流程**（第 144-250 行）：
```
中断检查 → 子图处理 → NODE_STARTED事件 → 创建前置检查点 
→ BEFORE_EXECUTE Hook执行 → 节点逻辑执行 → AFTER_EXECUTE Hook执行
```

**Hook 执行位置**：在节点逻辑执行之前（Step 3）

### 2.2 Hook 配置接口

**类型定义**：`packages/types/src/node/hooks.ts`

```typescript
export interface NodeHook {
  hookType: HookType;              // BEFORE_EXECUTE 或 AFTER_EXECUTE
  condition?: Condition;            // 触发条件（可选）
  eventName: string;               // 自定义事件名
  eventPayload?: Record<string, any>; // 事件数据
  enabled?: boolean;               // 是否启用
  weight?: number;                 // 执行优先级
  createCheckpoint?: boolean;      // 是否创建检查点
  checkpointDescription?: string;  // 检查点描述
}

export enum HookType {
  BEFORE_EXECUTE = 'BEFORE_EXECUTE',
  AFTER_EXECUTE = 'AFTER_EXECUTE'
}
```

### 2.3 Hook 执行上下文

**接口**：`sdk/core/execution/handlers/hook-handlers/hook-handler.ts`

```typescript
export interface HookExecutionContext {
  thread: Thread;                     // 当前线程状态
  node: Node;                         // 当前节点定义
  result?: NodeExecutionResult;       // 节点结果（AFTER_EXECUTE）
  checkpointDependencies?: any;       // 检查点依赖
}
```

可在 Hook 中访问：
- `context.thread.status` - 线程状态
- `context.thread.variableScopes` - 变量作用域
- `context.thread.input/output` - 线程输入输出
- `context.node.config` - 节点配置（包括风险等级）

---

## 三、应用层实现方案

### 3.1 Thread 状态检查

**场景**：阻止在 PAUSED/COMPLETED/FAILED 状态下执行节点

**实现方式**：在节点上添加 BEFORE_EXECUTE Hook

```typescript
const codeNodeWithStateCheck: Node = {
  id: 'code-node-1',
  type: NodeType.CODE,
  config: { /* ... */ },
  hooks: [
    {
      hookType: HookType.BEFORE_EXECUTE,
      eventName: 'validation.thread_status',
      enabled: true,
      weight: 200, // 高优先级，最先执行
      // 只有线程处于 RUNNING 状态时才继续
      condition: {
        expression: "thread.status === 'RUNNING'"
      },
      eventPayload: {
        description: 'Check if thread is in RUNNING state',
        handler: async (context: HookExecutionContext) => {
          const validStates = ['RUNNING'];
          if (!validStates.includes(context.thread.status)) {
            throw new ThreadInterruptedException(
              `Thread is in ${context.thread.status} state, cannot execute node`,
              'INVALID_STATE',
              context.thread.id,
              context.node.id
            );
          }
        }
      }
    }
  ]
};
```

### 3.2 风险等级策略检查

**场景**：根据脚本风险等级执行不同的安全策略

**实现方式**：节点级 Hook 或 Middleware

#### 3.2.1 Hook 实现（推荐用于节点级控制）

```typescript
const codeNodeWithRiskControl: Node = {
  id: 'code-node-2',
  type: NodeType.CODE,
  config: {
    scriptName: 'dangerous-script',
    risk: 'medium'
  } as CodeNodeConfig,
  hooks: [
    {
      hookType: HookType.BEFORE_EXECUTE,
      eventName: 'security.risk_validation',
      weight: 150,
      enabled: true,
      // 仅对 medium 及以上风险执行
      condition: {
        expression: "config.risk in ['medium', 'high']"
      },
      eventPayload: {
        handler: async (context: HookExecutionContext) => {
          const config = context.node.config as CodeNodeConfig;
          
          switch (config.risk) {
            case 'low':
              // 检查脚本名称中的不安全字符
              if (config.scriptName.includes('..') || config.scriptName.includes('~')) {
                throw new RuntimeValidationError(
                  'Script path contains invalid characters',
                  { operation: 'handle', field: 'code.security' }
                );
              }
              break;
              
            case 'medium':
              // 检查危险命令
              const dangerousCommands = ['rm -rf', 'del /f', 'format', 'shutdown'];
              if (dangerousCommands.some(cmd => 
                config.scriptName.toLowerCase().includes(cmd)
              )) {
                throw new RuntimeValidationError(
                  'Script contains dangerous commands',
                  { operation: 'handle', field: 'code.security' }
                );
              }
              break;
              
            case 'high':
              // 记录警告但允许执行
              console.warn(`Executing high-risk script: ${config.scriptName}`);
              break;
          }
        }
      }
    }
  ]
};
```

#### 3.2.2 全局 Middleware 实现（推荐用于工作流级控制）

```typescript
// 在应用初始化时创建全局风险检查 Hook
function createGlobalRiskValidationHook(): NodeHook {
  return {
    hookType: HookType.BEFORE_EXECUTE,
    eventName: 'security.global_risk_check',
    weight: 100,
    enabled: true,
    // 仅对 CODE 节点执行
    condition: {
      expression: "node.type === 'CODE'"
    },
    eventPayload: {
      policy: 'strict', // 应用层定义的策略等级
      handler: async (context: HookExecutionContext) => {
        const config = context.node.config as CodeNodeConfig;
        
        // 场景1：禁用所有高风险脚本
        if (config.risk === 'high') {
          throw new ExecutionError(
            'High-risk scripts are disabled in this environment',
            context.node.id
          );
        }
        
        // 场景2：白名单检查
        const whitelistedScripts = ['safe-script-1', 'safe-script-2'];
        if (!whitelistedScripts.includes(config.scriptName)) {
          throw new ExecutionError(
            `Script "${config.scriptName}" is not in whitelist`,
            context.node.id
          );
        }
      }
    }
  };
}
```

### 3.3 自定义检查逻辑

**场景**：检查特定业务条件（如权限、配额、依赖关系）

```typescript
const codeNodeWithCustomCheck: Node = {
  id: 'code-node-3',
  type: NodeType.CODE,
  config: { /* ... */ },
  hooks: [
    {
      hookType: HookType.BEFORE_EXECUTE,
      eventName: 'business.permission_check',
      weight: 120,
      eventPayload: {
        requiredRole: 'admin',
        handler: async (context: HookExecutionContext) => {
          // 检查线程启动者的权限
          const userId = context.thread.variableScopes.thread?.userId;
          const userRole = context.thread.variableScopes.thread?.userRole;
          
          if (userRole !== 'admin') {
            throw new ExecutionError(
              `User ${userId} has insufficient permissions to execute this node`,
              context.node.id
            );
          }
        }
      }
    }
  ]
};
```

---

## 四、SDK 层应提供的接口

### 4.1 已有接口（无需修改）

✅ `HookExecutionContext` - 提供访问 Thread/Node 的接口
✅ `NodeHook` 配置接口 - 支持条件、权重、自定义事件
✅ 执行前 Hook 机制 - NodeExecutionCoordinator 中已实现

### 4.2 需要增强的接口

#### 4.2.1 提供节点状态预检查接口

**目的**：允许应用层在执行前进行同步检查

```typescript
/**
 * 节点执行前的预检查接口
 * 应用层可在执行 Hook 之前调用此接口进行快速检查
 */
export interface NodeExecutabilityChecker {
  /**
   * 检查节点是否可执行
   * @param thread 线程实例
   * @param node 节点定义
   * @returns 检查结果和原因
   */
  canExecute(thread: Thread, node: Node): {
    canExecute: boolean;
    reason?: string;
    severity?: 'error' | 'warning' | 'info';
  };
}

/**
 * SDK 应提供的默认实现
 */
export class DefaultNodeExecutabilityChecker implements NodeExecutabilityChecker {
  canExecute(thread: Thread, node: Node): { canExecute: boolean; reason?: string } {
    // 检查 Thread 状态
    const validStates = ['RUNNING'];
    if (!validStates.includes(thread.status)) {
      return {
        canExecute: false,
        reason: `Thread is in ${thread.status} state`
      };
    }
    
    return { canExecute: true };
  }
}
```

#### 4.2.2 增强 Hook 执行上下文

**目的**：提供更多信息支持复杂的检查逻辑

```typescript
export interface HookExecutionContext {
  thread: Thread;
  node: Node;
  result?: NodeExecutionResult;
  checkpointDependencies?: CheckpointDependencies;
  
  // 新增：提供便捷的访问方法
  getThreadStatus(): string;
  getNodeConfig<T>(): T;
  getVariable(path: string): any;
  setVariable(path: string, value: any): void;
}
```

#### 4.2.3 提供风险等级检查工具类

**目的**：为应用层提供标准的风险评估能力

```typescript
/**
 * 代码节点风险评估器
 */
export interface CodeRiskAssessor {
  /**
   * 评估脚本风险等级
   */
  assessRisk(scriptName: string): RiskLevel;
  
  /**
   * 检查脚本是否违反安全策略
   */
  validateSecurityPolicy(
    script: Script,
    policy: SecurityPolicy
  ): ValidationResult;
}

export interface SecurityPolicy {
  allowedRiskLevels: RiskLevel[];
  whitelistedScripts?: string[];
  blacklistedPatterns?: RegExp[];
  maxScriptSize?: number;
}
```

---

## 五、应用层架构建议

### 5.1 分层设计

```
┌─────────────────────────────────────┐
│     应用层（Workflow Executor）     │
│  - 定义节点 Hook 配置               │
│  - 注册全局策略检查                 │
│  - 处理 Hook 事件                   │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│     SDK 层（NodeExecutionCoordinator）│
│  - 执行 BEFORE_EXECUTE Hook         │
│  - 执行节点逻辑                     │
│  - 记录执行历史                     │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│    Handler 层（code-handler 等）     │
│  - 纯执行逻辑                       │
│  - 无业务决策                       │
└─────────────────────────────────────┘
```

### 5.2 工作流配置示例

```typescript
// 应用层：定义工作流和节点
const workflow = {
  id: 'workflow-1',
  nodes: [
    {
      id: 'code-node',
      type: NodeType.CODE,
      config: {
        scriptName: 'data-processing',
        risk: 'medium'
      },
      // 应用层添加的检查 Hook
      hooks: [
        createThreadStateCheckHook(),      // 检查线程状态
        createRiskValidationHook(),        // 检查风险等级
        createPermissionCheckHook(),       // 检查权限
        createQuotaCheckHook()            // 检查配额
      ]
    }
  ]
};

// 应用层：执行工作流
async function executeWorkflow(workflow, input) {
  const executor = new ThreadExecutor(workflow);
  
  // ThreadExecutor 将调用 NodeExecutionCoordinator
  // NodeExecutionCoordinator 执行所有 BEFORE_EXECUTE Hook
  // Hook 完成检查后，才执行节点逻辑（code-handler）
  return await executor.execute(input);
}
```

---

## 六、检查逻辑流程图

```
开始执行节点
  ↓
NodeExecutionCoordinator.executeNode()
  ↓
【应用层 Hook - BEFORE_EXECUTE】
  ├─ Hook 1: 检查 Thread 状态
  ├─ Hook 2: 检查风险等级
  ├─ Hook 3: 检查权限
  └─ Hook N: 自定义检查
  ↓
所有 Hook 通过 ✓
  ↓
执行节点逻辑
  ├─ code-handler.execute()
  └─ 返回结果
  ↓
【应用层 Hook - AFTER_EXECUTE】
  ├─ Hook 1: 审计日志
  └─ Hook N: 后处理
  ↓
返回执行结果
```

---

## 七、优势总结

| 方面 | 原设计 | 新设计 |
|------|--------|--------|
| **职责分离** | Handler 混合了业务决策 | Handler 纯执行，应用层决策 |
| **灵活性** | 风险检查硬编码 | 应用层可自定义策略 |
| **扩展性** | 修改 handler 需改 SDK | 通过 Hook 添加新检查 |
| **复用性** | 逻辑耦合到节点类型 | Hook 机制可跨节点复用 |
| **可测试性** | 需同时测试业务逻辑和执行 | 分离测试，各层独立验证 |

---

## 八、迁移指南

### 8.1 从原 code-handler 迁移到 Hook 模式

**原方式**：
```typescript
// code-handler 中直接检查
if (!canExecute(thread, node)) return SKIPPED;
validateRiskLevel(config.risk, config.scriptName);
```

**新方式**：
```typescript
// 应用层在节点定义中添加 Hook
node.hooks = [
  {
    hookType: HookType.BEFORE_EXECUTE,
    condition: { expression: "thread.status === 'RUNNING'" },
    eventPayload: { /* 检查逻辑 */ }
  }
];
```

### 8.2 其他节点处理器的适配

**route-handler**：继续保留路由逻辑（业务核心）
**llm-handler**：继续保留 LLM 调用逻辑（业务核心）
**variable-handler**：可考虑提供 Hook 支持权限检查

---

## 九、参考资源

- **SDK Hook 实现**：`sdk/core/execution/handlers/hook-handlers/`
- **Hook 配置类型**：`packages/types/src/node/hooks.ts`
- **节点执行协调器**：`sdk/core/execution/coordinators/node-execution-coordinator.ts`
- **应用层执行器**：`apps/*/src/**/executor.ts`（应用自行实现）
