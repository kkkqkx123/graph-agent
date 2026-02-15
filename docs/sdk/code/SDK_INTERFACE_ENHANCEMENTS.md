/**
 * SDK 层接口增强建议
 * 
 * 基于 code-handler 重构，分析 SDK 层应提供的接口和工具
 * 来支持应用层实现更好的节点执行前检查
 */

# SDK 层接口增强建议

## 一、现状分析

### 1.1 已有的核心机制

✅ **BEFORE_EXECUTE Hook 机制**
- 位置：`NodeExecutionCoordinator` 第 220-231 行
- 执行时机：节点逻辑执行前
- 配置方式：`Node.hooks` 数组

✅ **HookExecutionContext 上下文**
- 提供 Thread 和 Node 访问
- 支持自定义事件载荷

✅ **事件系统**
- EventManager 负责事件发送
- Hook 可触发自定义事件

### 1.2 缺失或不足之处

❌ **缺少通用的节点可执行性检查接口**
- 没有统一的 API 检查节点是否可执行
- 应用层需重复实现类似逻辑

❌ **缺少 Code 节点特定的安全检查工具**
- 没有标准的风险评估器
- 没有脚本验证的工具类

❌ **Hook 执行上下文信息不足**
- 无法直接访问 ThreadContext（只有 Thread 数据）
- 无法便捷访问节点配置的特定字段
- 无法在 Hook 中修改变量或状态

❌ **缺少执行条件的标准化定义**
- 没有 NodeExecutionPolicy 接口
- 无法统一管理不同节点类型的执行条件

---

## 二、建议的接口增强

### 2.1 节点可执行性检查接口

**位置**：新增 `sdk/core/execution/interfaces/node-executability.ts`

```typescript
/**
 * 节点可执行性检查接口
 * SDK 层提供的标准接口，应用层可实现自定义检查器
 */
export interface NodeExecutabilityChecker {
  /**
   * 检查节点是否可执行
   * @param thread 线程实例
   * @param node 节点定义
   * @param context 可选的执行上下文
   * @returns 检查结果
   */
  canExecute(
    thread: Thread,
    node: Node,
    context?: ExecutionCheckContext
  ): ExecutionCheckResult;
}

/**
 * 执行检查上下文
 */
export interface ExecutionCheckContext {
  /** 线程上下文（如果可用） */
  threadContext?: ThreadContext;
  /** 工作流定义 */
  workflow?: any;
  /** 额外的应用级上下文 */
  appContext?: Record<string, any>;
}

/**
 * 执行检查结果
 */
export interface ExecutionCheckResult {
  /** 是否可执行 */
  executable: boolean;
  /** 原因（如果不可执行） */
  reason?: string;
  /** 严重程度（error/warning/info） */
  severity?: 'error' | 'warning' | 'info';
  /** 详细信息 */
  details?: Record<string, any>;
}

/**
 * SDK 提供的默认实现
 */
export class DefaultNodeExecutabilityChecker implements NodeExecutabilityChecker {
  canExecute(
    thread: Thread,
    node: Node,
    context?: ExecutionCheckContext
  ): ExecutionCheckResult {
    // 检查线程状态
    const validStates = ['RUNNING'];
    if (!validStates.includes(thread.status)) {
      return {
        executable: false,
        reason: `Thread is in ${thread.status} state, expected RUNNING`,
        severity: 'error',
        details: {
          currentStatus: thread.status,
          expectedStates: validStates
        }
      };
    }

    // 检查节点是否已执行过
    if (thread.nodeResults.some(r => r.nodeId === node.id)) {
      return {
        executable: false,
        reason: `Node ${node.id} has already been executed`,
        severity: 'warning',
        details: {
          nodeId: node.id,
          previousExecution: thread.nodeResults.find(r => r.nodeId === node.id)
        }
      };
    }

    return { executable: true };
  }
}
```

### 2.2 节点执行策略接口

**位置**：新增 `sdk/core/execution/interfaces/node-execution-policy.ts`

```typescript
/**
 * 节点执行策略
 * 定义节点在不同场景下的执行规则
 */
export interface NodeExecutionPolicy {
  /** 节点类型 */
  nodeType: NodeType;
  
  /** 是否启用此节点 */
  enabled?: boolean;
  
  /** 允许的线程状态 */
  allowedThreadStates?: ThreadStatus[];
  
  /** 最大重试次数 */
  maxRetries?: number;
  
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  
  /** 超时时间（毫秒） */
  timeout?: number;
  
  /** 执行前检查 */
  preExecutionChecks?: NodePreExecutionCheck[];
  
  /** 执行后验证 */
  postExecutionValidation?: NodePostExecutionValidation[];
}

/**
 * 执行前检查接口
 */
export interface NodePreExecutionCheck {
  name: string;
  check: (context: HookExecutionContext) => Promise<CheckResult>;
}

/**
 * 检查结果
 */
export interface CheckResult {
  passed: boolean;
  message?: string;
  metadata?: Record<string, any>;
}

/**
 * 执行后验证接口
 */
export interface NodePostExecutionValidation {
  name: string;
  validate: (
    context: HookExecutionContext & { result: NodeExecutionResult }
  ) => Promise<ValidationResult>;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean;
  message?: string;
  metadata?: Record<string, any>;
}
```

### 2.3 Code 节点安全检查工具

**位置**：新增 `sdk/core/execution/tools/code-security-validator.ts`

```typescript
/**
 * Code 节点安全检查工具
 */
export interface CodeSecurityValidator {
  /**
   * 验证脚本名称安全性
   */
  validateScriptName(
    scriptName: string,
    riskLevel: CodeRiskLevel
  ): ValidationResult;

  /**
   * 检查脚本是否包含危险命令
   */
  hasDangerousCommands(scriptName: string): boolean;

  /**
   * 评估脚本风险等级
   */
  assessRisk(scriptName: string): CodeRiskLevel;

  /**
   * 验证脚本是否在白名单中
   */
  isWhitelisted(scriptName: string, whitelist: string[]): boolean;

  /**
   * 应用安全策略
   */
  applySecurity Policy(
    script: Script,
    policy: CodeSecurityPolicy
  ): SecurityCheckResult;
}

/**
 * Code 安全策略
 */
export interface CodeSecurityPolicy {
  /** 允许的风险等级 */
  allowedRiskLevels: CodeRiskLevel[];

  /** 脚本白名单 */
  whitelist?: string[];

  /** 脚本黑名单 */
  blacklist?: string[];

  /** 禁止的命令 */
  forbiddenCommands?: string[];

  /** 禁止的路径模式 */
  forbiddenPathPatterns?: RegExp[];

  /** 最大脚本大小（字节） */
  maxScriptSize?: number;

  /** 是否允许动态脚本 */
  allowDynamicScripts?: boolean;
}

/**
 * 安全检查结果
 */
export interface SecurityCheckResult {
  secure: boolean;
  violations: SecurityViolation[];
  recommendations?: string[];
}

/**
 * 安全违规
 */
export interface SecurityViolation {
  type: 'risk_level' | 'forbidden_command' | 'forbidden_path' | 'size_exceeded' | 'blacklisted';
  message: string;
  severity: 'error' | 'warning';
  details?: Record<string, any>;
}

/**
 * SDK 提供的默认实现
 */
export class DefaultCodeSecurityValidator implements CodeSecurityValidator {
  validateScriptName(scriptName: string, riskLevel: CodeRiskLevel): ValidationResult {
    if (riskLevel === 'low') {
      if (scriptName.includes('..') || scriptName.includes('~')) {
        return {
          valid: false,
          message: 'Script name contains potentially unsafe path characters'
        };
      }
    }
    return { valid: true };
  }

  hasDangerousCommands(scriptName: string): boolean {
    const dangerous = ['rm -rf', 'rm -r', 'del /f', 'format', 'shutdown'];
    return dangerous.some(cmd => scriptName.toLowerCase().includes(cmd));
  }

  assessRisk(scriptName: string): CodeRiskLevel {
    if (this.hasDangerousCommands(scriptName)) {
      return 'high';
    }
    if (scriptName.includes('..') || scriptName.includes('~')) {
      return 'medium';
    }
    return 'low';
  }

  isWhitelisted(scriptName: string, whitelist: string[]): boolean {
    return whitelist.includes(scriptName);
  }

  applySecurity Policy(
    script: Script,
    policy: CodeSecurityPolicy
  ): SecurityCheckResult {
    const violations: SecurityViolation[] = [];

    // 检查风险等级
    const risk = this.assessRisk(script.name);
    if (!policy.allowedRiskLevels.includes(risk)) {
      violations.push({
        type: 'risk_level',
        message: `Script risk level ${risk} is not allowed`,
        severity: 'error'
      });
    }

    // 检查黑名单
    if (policy.blacklist?.includes(script.name)) {
      violations.push({
        type: 'blacklisted',
        message: `Script ${script.name} is blacklisted`,
        severity: 'error'
      });
    }

    // 检查白名单（如果定义）
    if (policy.whitelist && !policy.whitelist.includes(script.name)) {
      violations.push({
        type: 'forbidden_command',
        message: `Script ${script.name} is not in whitelist`,
        severity: 'error'
      });
    }

    return {
      secure: violations.length === 0,
      violations
    };
  }
}
```

### 2.4 增强的 HookExecutionContext

**位置**：修改 `sdk/core/execution/handlers/hook-handlers/hook-handler.ts`

```typescript
/**
 * 增强的 Hook 执行上下文
 */
export interface EnhancedHookExecutionContext extends HookExecutionContext {
  /**
   * 获取线程状态
   */
  getThreadStatus(): ThreadStatus;

  /**
   * 获取节点配置（带类型安全）
   */
  getNodeConfig<T = any>(): T;

  /**
   * 从线程变量中获取值
   */
  getVariable(path: string): any;

  /**
   * 设置线程变量
   */
  setVariable(path: string, value: any): void;

  /**
   * 获取上一个节点的执行结果
   */
  getPreviousNodeResult(): NodeExecutionResult | undefined;

  /**
   * 检查节点是否已执行过
   */
  isNodeExecuted(nodeId: string): boolean;

  /**
   * 获取节点执行历史
   */
  getNodeExecutionHistory(nodeId: string): NodeExecutionResult[];

  /**
   * 获取线程上下文（如果可用）
   */
  getThreadContext(): ThreadContext | undefined;
}

/**
 * 实现增强的上下文
 */
export class DefaultEnhancedHookExecutionContext implements EnhancedHookExecutionContext {
  constructor(
    public thread: Thread,
    public node: Node,
    public result?: NodeExecutionResult,
    private threadContext?: ThreadContext
  ) {}

  getThreadStatus(): ThreadStatus {
    return this.thread.status as ThreadStatus;
  }

  getNodeConfig<T = any>(): T {
    return this.node.config as T;
  }

  getVariable(path: string): any {
    const parts = path.split('.');
    let value: any = this.thread.variableScopes;
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }
    return value;
  }

  setVariable(path: string, value: any): void {
    const parts = path.split('.');
    const lastPart = parts.pop();
    if (!lastPart) return;

    let target: any = this.thread.variableScopes;
    for (const part of parts) {
      if (!(part in target)) {
        target[part] = {};
      }
      target = target[part];
    }
    target[lastPart] = value;
  }

  getPreviousNodeResult(): NodeExecutionResult | undefined {
    if (this.thread.nodeResults.length === 0) return undefined;
    return this.thread.nodeResults[this.thread.nodeResults.length - 1];
  }

  isNodeExecuted(nodeId: string): boolean {
    return this.thread.nodeResults.some(r => r.nodeId === nodeId);
  }

  getNodeExecutionHistory(nodeId: string): NodeExecutionResult[] {
    return this.thread.nodeResults.filter(r => r.nodeId === nodeId);
  }

  getThreadContext(): ThreadContext | undefined {
    return this.threadContext;
  }
}
```

---

## 三、新增工具类和帮助函数

### 3.1 节点执行检查构建器

**位置**：新增 `sdk/core/execution/builders/node-check-builder.ts`

```typescript
/**
 * 节点执行检查构建器
 * 提供流式 API 构建 Hook
 */
export class NodeCheckBuilder {
  private hooks: NodeHook[] = [];

  /**
   * 添加线程状态检查
   */
  withThreadStatusCheck(allowedStates: ThreadStatus[]): this {
    this.hooks.push({
      hookType: HookType.BEFORE_EXECUTE,
      eventName: 'check.thread_status',
      weight: 200,
      eventPayload: {
        allowedStates,
        handler: async (context: HookExecutionContext) => {
          if (!allowedStates.includes(context.thread.status as ThreadStatus)) {
            throw new ThreadInterruptedException(
              `Thread is in ${context.thread.status} state`,
              'INVALID_STATE',
              context.thread.id,
              context.node.id
            );
          }
        }
      }
    });
    return this;
  }

  /**
   * 添加权限检查
   */
  withPermissionCheck(requiredPermissions: string[]): this {
    this.hooks.push({
      hookType: HookType.BEFORE_EXECUTE,
      eventName: 'check.permissions',
      weight: 150,
      eventPayload: {
        requiredPermissions,
        handler: async (context: HookExecutionContext) => {
          const userPermissions = context.thread.variableScopes.thread?.permissions || [];
          const missing = requiredPermissions.filter(p => !userPermissions.includes(p));
          if (missing.length > 0) {
            throw new ExecutionError(
              `Missing permissions: ${missing.join(', ')}`,
              context.node.id
            );
          }
        }
      }
    });
    return this;
  }

  /**
   * 添加自定义检查
   */
  withCustomCheck(
    eventName: string,
    check: (context: HookExecutionContext) => Promise<void>,
    weight: number = 100
  ): this {
    this.hooks.push({
      hookType: HookType.BEFORE_EXECUTE,
      eventName,
      weight,
      eventPayload: { handler: check }
    });
    return this;
  }

  /**
   * 添加 Code 节点安全检查
   */
  withCodeSecurityCheck(
    validator: CodeSecurityValidator,
    policy: CodeSecurityPolicy
  ): this {
    this.hooks.push({
      hookType: HookType.BEFORE_EXECUTE,
      eventName: 'check.code_security',
      weight: 140,
      eventPayload: {
        validator,
        policy,
        handler: async (context: HookExecutionContext) => {
          const config = context.node.config as CodeNodeConfig;
          const result = validator.applySecurity Policy(
            { name: config.scriptName } as Script,
            policy
          );
          if (!result.secure) {
            throw new ExecutionError(
              `Code security check failed: ${result.violations[0]?.message}`,
              context.node.id
            );
          }
        }
      }
    });
    return this;
  }

  /**
   * 构建 Hook 数组
   */
  build(): NodeHook[] {
    return this.hooks.sort((a, b) => (b.weight || 0) - (a.weight || 0));
  }
}

// 使用示例
const hooks = new NodeCheckBuilder()
  .withThreadStatusCheck(['RUNNING'])
  .withPermissionCheck(['data_access'])
  .withCodeSecurityCheck(validator, policy)
  .build();
```

### 3.2 执行条件评估器

**位置**：新增 `sdk/core/execution/evaluators/execution-condition-evaluator.ts`

```typescript
/**
 * 节点执行条件评估器
 */
export interface ExecutionConditionEvaluator {
  /**
   * 评估节点是否应该被执行
   */
  evaluate(
    condition: ExecutionCondition,
    context: HookExecutionContext
  ): boolean;
}

/**
 * 执行条件定义
 */
export interface ExecutionCondition {
  /** AND 条件（所有必须为真） */
  all?: ExecutionCondition[];
  
  /** OR 条件（任意一个为真） */
  any?: ExecutionCondition[];
  
  /** 表达式 */
  expression?: string;
  
  /** 反转（NOT） */
  not?: ExecutionCondition;
}

/**
 * 默认实现
 */
export class DefaultExecutionConditionEvaluator implements ExecutionConditionEvaluator {
  evaluate(condition: ExecutionCondition, context: HookExecutionContext): boolean {
    if (condition.all) {
      return condition.all.every(c => this.evaluate(c, context));
    }

    if (condition.any) {
      return condition.any.some(c => this.evaluate(c, context));
    }

    if (condition.not) {
      return !this.evaluate(condition.not, context);
    }

    if (condition.expression) {
      const { conditionEvaluator } = require('@modular-agent/common-utils');
      const evalContext = {
        thread: context.thread,
        node: context.node,
        result: context.result
      };
      return conditionEvaluator.evaluate(
        { expression: condition.expression },
        evalContext
      );
    }

    return true;
  }
}
```

---

## 四、集成建议

### 4.1 在 SingletonRegistry 中注册工具

```typescript
/**
 * 在 sdk/core/context/singleton-registry.ts 中添加
 */
export class SingletonRegistry {
  private static codeSecurityValidator?: CodeSecurityValidator;
  private static executionConditionEvaluator?: ExecutionConditionEvaluator;
  private static nodeExecutabilityChecker?: NodeExecutabilityChecker;

  static registerCodeSecurityValidator(validator: CodeSecurityValidator): void {
    this.codeSecurityValidator = validator;
  }

  static getCodeSecurityValidator(): CodeSecurityValidator {
    if (!this.codeSecurityValidator) {
      this.codeSecurityValidator = new DefaultCodeSecurityValidator();
    }
    return this.codeSecurityValidator;
  }

  static registerExecutionConditionEvaluator(evaluator: ExecutionConditionEvaluator): void {
    this.executionConditionEvaluator = evaluator;
  }

  static getExecutionConditionEvaluator(): ExecutionConditionEvaluator {
    if (!this.executionConditionEvaluator) {
      this.executionConditionEvaluator = new DefaultExecutionConditionEvaluator();
    }
    return this.executionConditionEvaluator;
  }

  static registerNodeExecutabilityChecker(checker: NodeExecutabilityChecker): void {
    this.nodeExecutabilityChecker = checker;
  }

  static getNodeExecutabilityChecker(): NodeExecutabilityChecker {
    if (!this.nodeExecutabilityChecker) {
      this.nodeExecutabilityChecker = new DefaultNodeExecutabilityChecker();
    }
    return this.nodeExecutabilityChecker;
  }
}
```

### 4.2 导出新接口

```typescript
/**
 * 在 sdk/core/execution/index.ts 中添加
 */
export type {
  NodeExecutabilityChecker,
  ExecutionCheckContext,
  ExecutionCheckResult
} from './interfaces/node-executability';

export type {
  NodeExecutionPolicy,
  NodePreExecutionCheck,
  NodePostExecutionValidation,
  CheckResult,
  ValidationResult
} from './interfaces/node-execution-policy';

export type {
  CodeSecurityValidator,
  CodeSecurityPolicy,
  SecurityCheckResult,
  SecurityViolation
} from './tools/code-security-validator';

export {
  DefaultCodeSecurityValidator
} from './tools/code-security-validator';

export { NodeCheckBuilder } from './builders/node-check-builder';

export type {
  ExecutionConditionEvaluator,
  ExecutionCondition
} from './evaluators/execution-condition-evaluator';

export {
  DefaultExecutionConditionEvaluator
} from './evaluators/execution-condition-evaluator';
```

---

## 五、优先级和实施顺序

### 优先级 1（必需）
- [ ] Code 安全检查工具 (`CodeSecurityValidator`)
- [ ] 增强 HookExecutionContext 的便捷方法

### 优先级 2（重要）
- [ ] 节点可执行性检查接口
- [ ] 节点执行检查构建器

### 优先级 3（可选）
- [ ] 节点执行策略接口
- [ ] 执行条件评估器

---

## 六、向后兼容性

所有新增接口都是**可选的**，既有代码无需修改：

- 应用层可继续使用原始 Hook 配置
- 新工具仅在应用层需要时导入使用
- 默认实现提供基础功能

---

## 七、文档更新计划

- [ ] 在 SDK API 文档中添加新接口说明
- [ ] 提供最佳实践指南（Hook 权重、执行顺序等）
- [ ] 添加常见场景的示例代码
- [ ] 创建迁移指南（从硬编码检查到 Hook）

---

## 总结

通过这些增强，SDK 层将提供：

1. **标准化的检查接口** - 应用层有明确的契约
2. **开箱即用的工具** - 减少应用层的重复代码
3. **灵活的扩展机制** - 应用层可自定义实现
4. **更好的文档支持** - 清晰的使用指南

同时保持 SDK 的核心职责（执行引擎），应用层拥有完整的决策权（业务逻辑）。
