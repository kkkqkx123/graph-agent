# 异常体系重构方案

## 一、背景与目标

### 1.1 当前问题
- 定义了 208 个异常类，实际仅使用约 8 个（使用率 3.8%）
- 大量代码使用 `throw new Error(...)`，错误信息不统一
- 缺乏结构化的错误信息，难以进行错误分类和处理
- 代码库复杂度高，维护成本大

### 1.2 重构目标
- **简化异常体系**：基于实际使用场景，设计精简的异常类
- **统一错误定义**：提供结构化的错误信息（错误代码、上下文、原因）
- **改善错误处理**：支持错误分类、恢复策略和日志记录
- **降低维护成本**：减少未使用的异常类，提高代码可维护性

---

## 二、异常体系设计原则

### 2.1 设计原则
1. **实用性优先**：只定义实际需要的异常类
2. **层次清晰**：建立清晰的异常继承层次
3. **信息结构化**：每个异常包含错误代码、消息、上下文
4. **易于扩展**：支持未来添加新的异常类型
5. **向后兼容**：渐进式重构，不影响现有功能

### 2.2 异常命名规范
- 使用 `Error` 后缀
- 包含模块名称前缀（可选）
- 描述具体的错误类型
- 示例：`ValidationError`, `NotFoundError`, `StateTransitionError`

---

## 三、异常体系架构

### 3.1 异常继承层次

```
Error (JavaScript 原生)
└── BaseError (基础异常类)
    ├── ValidationError (验证错误)
    │   ├── ParameterValidationError
    │   ├── StateValidationError
    │   └── ConfigurationValidationError
    ├── NotFoundError (未找到错误)
    │   ├── ResourceNotFoundError
    │   └── EntityNotFoundError
    ├── StateTransitionError (状态转换错误)
    │   ├── InvalidStateTransitionError
    │   └── InvalidStatusError
    ├── ConfigurationError (配置错误)
    │   ├── MissingConfigurationError
    │   └── InvalidConfigurationError
    ├── ExecutionError (执行错误)
    │   ├── ExecutionTimeoutError
    │   ├── ExecutionCancelledError
    │   └── ExecutionFailedError
    ├── PermissionError (权限错误)
    │   ├── AccessDeniedError
    │   └── AuthenticationError
    ├── DependencyError (依赖错误)
    │   ├── DependencyNotFoundError
    │   └── DependencyNotSatisfiedError
    └── DomainMappingError (领域映射错误)
```

### 3.2 基础异常类设计

```typescript
/**
 * 基础异常类
 * 所有自定义异常的基类
 */
export abstract class BaseError extends Error {
  /**
   * 错误代码，用于错误分类和识别
   */
  public readonly code: string;

  /**
   * 错误上下文信息，包含相关的业务数据
   */
  public readonly context?: Record<string, unknown>;

  /**
   * 原始错误，用于错误链追踪
   */
  public readonly cause?: Error;

  /**
   * 错误发生时间
   */
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    this.cause = cause;
    this.timestamp = new Date();

    // 修复原型链，确保 instanceof 正常工作
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * 获取错误详情（用于日志记录）
   */
  getDetails(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      cause: this.cause?.message,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }

  /**
   * 判断是否为可重试错误
   */
  isRetryable(): boolean {
    return false;
  }

  /**
   * 获取建议的重试延迟（毫秒）
   */
  getRetryDelay(): number {
    return 1000; // 默认 1 秒
  }
}
```

---

## 四、核心异常类定义

### 4.1 验证错误（ValidationError）

```typescript
/**
 * 验证错误基类
 * 用于参数验证、状态验证等场景
 */
export class ValidationError extends BaseError {
  constructor(
    message: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, 'VALIDATION_ERROR', context, cause);
  }

  override isRetryable(): boolean {
    return false; // 验证错误通常不可重试
  }
}

/**
 * 参数验证错误
 */
export class ParameterValidationError extends ValidationError {
  constructor(
    parameterName: string,
    reason: string,
    context?: Record<string, unknown>
  ) {
    super(
      `参数验证失败: ${parameterName} - ${reason}`,
      {
        parameterName,
        reason,
        ...context,
      }
    );
  }
}

/**
 * 状态验证错误
 */
export class StateValidationError extends ValidationError {
  constructor(
    entity: string,
    currentState: string,
    expectedState: string,
    context?: Record<string, unknown>
  ) {
    super(
      `状态验证失败: ${entity} 当前状态为 ${currentState}，期望状态为 ${expectedState}`,
      {
        entity,
        currentState,
        expectedState,
        ...context,
      }
    );
  }
}

/**
 * 配置验证错误
 */
export class ConfigurationValidationError extends ValidationError {
  constructor(
    configKey: string,
    reason: string,
    context?: Record<string, unknown>
  ) {
    super(
      `配置验证失败: ${configKey} - ${reason}`,
      {
        configKey,
        reason,
        ...context,
      }
    );
  }
}
```

### 4.2 未找到错误（NotFoundError）

```typescript
/**
 * 未找到错误基类
 * 用于资源不存在的场景
 */
export class NotFoundError extends BaseError {
  constructor(
    resourceType: string,
    resourceId: string,
    context?: Record<string, unknown>
  ) {
    super(
      `${resourceType} 未找到: ${resourceId}`,
      'NOT_FOUND',
      {
        resourceType,
        resourceId,
        ...context,
      }
    );
  }

  override isRetryable(): boolean {
    return false; // 资源不存在通常不可重试
  }
}

/**
 * 实体未找到错误
 */
export class EntityNotFoundError extends NotFoundError {
  constructor(
    entityType: string,
    entityId: string,
    context?: Record<string, unknown>
  ) {
    super(entityType, entityId, {
      entityType,
      ...context,
    });
  }
}
```

### 4.3 状态转换错误（StateTransitionError）

```typescript
/**
 * 状态转换错误基类
 * 用于不允许的状态转换场景
 */
export class StateTransitionError extends BaseError {
  constructor(
    entity: string,
    entityId: string,
    fromState: string,
    toState: string,
    reason: string,
    context?: Record<string, unknown>
  ) {
    super(
      `状态转换失败: ${entity}(${entityId}) 不能从 ${fromState} 转换到 ${toState} - ${reason}`,
      'STATE_TRANSITION_ERROR',
      {
        entity,
        entityId,
        fromState,
        toState,
        reason,
        ...context,
      }
    );
  }

  override isRetryable(): boolean {
    return false;
  }
}

/**
 * 无效状态转换错误
 */
export class InvalidStateTransitionError extends StateTransitionError {
  constructor(
    entity: string,
    entityId: string,
    fromState: string,
    toState: string,
    context?: Record<string, unknown>
  ) {
    super(
      entity,
      entityId,
      fromState,
      toState,
      '不允许的状态转换',
      context
    );
  }
}

/**
 * 无效状态错误
 */
export class InvalidStatusError extends StateTransitionError {
  constructor(
    entity: string,
    entityId: string,
    currentStatus: string,
    requiredStatus: string,
    context?: Record<string, unknown>
  ) {
    super(
      entity,
      entityId,
      currentStatus,
      requiredStatus,
      `当前状态为 ${currentStatus}，需要状态为 ${requiredStatus}`,
      context
    );
  }
}
```

### 4.4 配置错误（ConfigurationError）

```typescript
/**
 * 配置错误基类
 * 用于配置缺失或无效的场景
 */
export class ConfigurationError extends BaseError {
  constructor(
    message: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, 'CONFIGURATION_ERROR', context, cause);
  }

  override isRetryable(): boolean {
    return false; // 配置错误通常不可重试
  }
}

/**
 * 配置缺失错误
 */
export class MissingConfigurationError extends ConfigurationError {
  constructor(
    configKey: string,
    context?: Record<string, unknown>
  ) {
    super(
      `配置缺失: ${configKey}`,
      {
        configKey,
        ...context,
      }
    );
  }
}

/**
 * 无效配置错误
 */
export class InvalidConfigurationError extends ConfigurationError {
  constructor(
    configKey: string,
    reason: string,
    context?: Record<string, unknown>
  ) {
    super(
      `无效配置: ${configKey} - ${reason}`,
      {
        configKey,
        reason,
        ...context,
      }
    );
  }
}
```

### 4.5 执行错误（ExecutionError）

```typescript
/**
 * 执行错误基类
 * 用于执行过程中的错误
 */
export class ExecutionError extends BaseError {
  constructor(
    message: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, 'EXECUTION_ERROR', context, cause);
  }

  override isRetryable(): boolean {
    return true; // 执行错误通常可重试
  }

  override getRetryDelay(): number {
    return 2000; // 默认 2 秒
  }
}

/**
 * 执行超时错误
 */
export class ExecutionTimeoutError extends ExecutionError {
  constructor(
    operation: string,
    timeout: number,
    context?: Record<string, unknown>
  ) {
    super(
      `执行超时: ${operation} 超过 ${timeout}ms`,
      {
        operation,
        timeout,
        ...context,
      }
    );
  }

  override getRetryDelay(): number {
    return 5000; // 超时错误建议延迟 5 秒重试
  }
}

/**
 * 执行取消错误
 */
export class ExecutionCancelledError extends ExecutionError {
  constructor(
    operation: string,
    reason?: string,
    context?: Record<string, unknown>
  ) {
    super(
      `执行取消: ${operation}${reason ? ` - ${reason}` : ''}`,
      {
        operation,
        reason,
        ...context,
      }
    );
  }

  override isRetryable(): boolean {
    return false; // 取消的操作不可重试
  }
}

/**
 * 执行失败错误
 */
export class ExecutionFailedError extends ExecutionError {
  constructor(
    operation: string,
    reason: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(
      `执行失败: ${operation} - ${reason}`,
      {
        operation,
        reason,
        ...context,
      },
      cause
    );
  }
}
```

### 4.6 权限错误（PermissionError）

```typescript
/**
 * 权限错误基类
 * 用于权限不足的场景
 */
export class PermissionError extends BaseError {
  constructor(
    message: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'PERMISSION_ERROR', context);
  }

  override isRetryable(): boolean {
    return false; // 权限错误不可重试
  }
}

/**
 * 访问拒绝错误
 */
export class AccessDeniedError extends PermissionError {
  constructor(
    resource: string,
    userId?: string,
    context?: Record<string, unknown>
  ) {
    super(
      `访问被拒绝: ${resource}${userId ? ` (用户: ${userId})` : ''}`,
      {
        resource,
        userId,
        ...context,
      }
    );
  }
}

/**
 * 认证错误
 */
export class AuthenticationError extends PermissionError {
  constructor(
    reason: string = '认证失败',
    context?: Record<string, unknown>
  ) {
    super(reason, context);
  }
}
```

### 4.7 依赖错误（DependencyError）

```typescript
/**
 * 依赖错误基类
 * 用于依赖项不满足的场景
 */
export class DependencyError extends BaseError {
  constructor(
    message: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'DEPENDENCY_ERROR', context);
  }

  override isRetryable(): boolean {
    return false; // 依赖错误通常不可重试
  }
}

/**
 * 依赖未找到错误
 */
export class DependencyNotFoundError extends DependencyError {
  constructor(
    dependencyType: string,
    dependencyId: string,
    context?: Record<string, unknown>
  ) {
    super(
      `依赖未找到: ${dependencyType} - ${dependencyId}`,
      {
        dependencyType,
        dependencyId,
        ...context,
      }
    );
  }
}

/**
 * 依赖不满足错误
 */
export class DependencyNotSatisfiedError extends DependencyError {
  constructor(
    dependency: string,
    reason: string,
    context?: Record<string, unknown>
  ) {
    super(
      `依赖不满足: ${dependency} - ${reason}`,
      {
        dependency,
        reason,
        ...context,
      }
    );
  }
}
```

### 4.8 领域映射错误（DomainMappingError）

```typescript
/**
 * 领域映射错误代码枚举
 */
export enum MapperErrorCode {
  /** 数据验证错误 */
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  /** 类型转换错误 */
  TYPE_CONVERSION_ERROR = 'TYPE_CONVERSION_ERROR',
  /** 未知映射错误 */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * 领域映射错误类
 * 用于数据映射过程中的错误
 */
export class DomainMappingError extends BaseError {
  constructor(
    code: MapperErrorCode,
    message: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, code, context, cause);
  }

  override isRetryable(): boolean {
    return false; // 映射错误通常不可重试
  }
}
```

---

## 五、异常使用指南

### 5.1 何时使用自定义异常

**应该使用自定义异常的场景：**
1. 需要特殊处理的错误（如重试、降级）
2. 需要结构化错误信息的场景
3. 跨层传递的错误
4. 需要错误代码进行分类的场景
5. 需要记录详细上下文的场景

**可以使用通用 Error 的场景：**
1. 简单的验证错误（仅在当前方法内使用）
2. 不会跨层传递的错误
3. 临时性的错误（如开发调试）
4. 不需要特殊处理的错误

### 5.2 异常使用示例

#### 示例 1：参数验证

```typescript
// ❌ 不推荐：使用通用 Error
function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error('Division by zero');
  }
  return a / b;
}

// ✅ 推荐：使用自定义异常
function divide(a: number, b: number): number {
  if (b === 0) {
    throw new ParameterValidationError('b', '不能为零');
  }
  return a / b;
}
```

#### 示例 2：状态转换

```typescript
// ❌ 不推荐：使用通用 Error
function activateWorkflow(workflow: Workflow): void {
  if (workflow.status.isArchived()) {
    throw new Error('无法激活已归档的工作流');
  }
  workflow.activate();
}

// ✅ 推荐：使用自定义异常
function activateWorkflow(workflow: Workflow): void {
  if (workflow.status.isArchived()) {
    throw new InvalidStateTransitionError(
      'Workflow',
      workflow.id.toString(),
      workflow.status.toString(),
      'ACTIVE',
      '已归档的工作流不能激活'
    );
  }
  workflow.activate();
}
```

#### 示例 3：资源未找到

```typescript
// ❌ 不推荐：使用通用 Error
function getWorkflow(id: string): Workflow {
  const workflow = this.workflows.get(id);
  if (!workflow) {
    throw new Error(`工作流不存在: ${id}`);
  }
  return workflow;
}

// ✅ 推荐：使用自定义异常
function getWorkflow(id: string): Workflow {
  const workflow = this.workflows.get(id);
  if (!workflow) {
    throw new EntityNotFoundError('Workflow', id);
  }
  return workflow;
}
```

#### 示例 4：执行超时

```typescript
// ❌ 不推荐：使用通用 Error
async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeout: number
): Promise<T> {
  const timer = setTimeout(() => {
    throw new Error(`执行超时: ${timeout}ms`);
  }, timeout);
  // ...
}

// ✅ 推荐：使用自定义异常
async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeout: number
): Promise<T> {
  const timer = setTimeout(() => {
    throw new ExecutionTimeoutError('executeWithTimeout', timeout);
  }, timeout);
  // ...
}
```

### 5.3 异常处理最佳实践

#### 1. 捕获特定异常

```typescript
try {
  await workflowManager.activateWorkflow(workflowId);
} catch (error) {
  if (error instanceof InvalidStateTransitionError) {
    // 处理状态转换错误
    logger.warn('状态转换失败', error.getDetails());
  } else if (error instanceof EntityNotFoundError) {
    // 处理实体未找到错误
    logger.error('工作流不存在', error.getDetails());
  } else {
    // 处理其他错误
    logger.error('未知错误', error);
    throw error;
  }
}
```

#### 2. 错误重试

```typescript
async function executeWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (error instanceof BaseError && !error.isRetryable()) {
        throw error; // 不可重试的错误直接抛出
      }
      const delay = error instanceof BaseError
        ? error.getRetryDelay()
        : 1000;
      await sleep(delay * (i + 1)); // 指数退避
    }
  }
  throw lastError!;
}
```

#### 3. 错误日志记录

```typescript
function logError(error: Error): void {
  if (error instanceof BaseError) {
    logger.error('业务错误', {
      code: error.code,
      message: error.message,
      context: error.context,
      timestamp: error.timestamp,
    });
  } else {
    logger.error('系统错误', {
      message: error.message,
      stack: error.stack,
    });
  }
}
```

---

## 六、重构实施计划

### 6.1 第一阶段：创建新的异常体系（1周）

**任务清单：**
- [ ] 创建 `src/common/exceptions/` 目录
- [ ] 实现 `BaseError` 基类
- [ ] 实现核心异常类（ValidationError, NotFoundError, StateTransitionError 等）
- [ ] 编写异常类的单元测试
- [ ] 创建异常使用文档

**文件结构：**
```
src/common/exceptions/
├── index.ts                    # 导出所有异常类
├── base-error.ts              # BaseError 基类
├── validation-error.ts        # 验证错误相关
├── not-found-error.ts         # 未找到错误相关
├── state-transition-error.ts  # 状态转换错误相关
├── configuration-error.ts     # 配置错误相关
├── execution-error.ts         # 执行错误相关
├── permission-error.ts        # 权限错误相关
├── dependency-error.ts        # 依赖错误相关
└── domain-mapping-error.ts    # 领域映射错误相关
```

### 6.2 第二阶段：渐进式重构（2-4周）

**重构优先级：**

**高优先级（核心业务逻辑）：**
1. Workflow 模块的状态转换错误
2. Thread 模块的执行错误
3. Session 模块的权限错误
4. State 模块的验证错误

**中优先级（常用功能）：**
1. Tools 模块的配置错误
2. LLM 模块的执行错误
3. Checkpoint 模块的未找到错误

**低优先级（辅助功能）：**
1. Prompt 模块的验证错误
2. Interaction 模块的执行错误

**重构策略：**
1. 每次重构一个模块
2. 先重构异常抛出，再重构异常捕获
3. 保持向后兼容，逐步替换
4. 每次重构后运行测试

### 6.3 第三阶段：清理旧异常类（1周）

**任务清单：**
- [ ] 标记旧的异常类为 `@deprecated`
- [ ] 更新导入语句，使用新的异常类
- [ ] 删除未使用的旧异常类
- [ ] 更新文档和示例

### 6.4 第四阶段：优化和监控（持续）

**任务清单：**
- [ ] 集成错误监控工具（如 Sentry）
- [ ] 收集异常使用数据
- [ ] 优化异常处理策略
- [ ] 定期审查异常使用情况

---

## 七、迁移指南

### 7.1 旧代码到新代码的映射

| 旧代码 | 新代码 |
|--------|--------|
| `throw new Error('参数验证失败')` | `throw new ParameterValidationError('param', 'reason')` |
| `throw new Error('工作流不存在')` | `throw new EntityNotFoundError('Workflow', id)` |
| `throw new Error('只能编辑草稿状态的工作流')` | `throw new InvalidStateTransitionError(...)` |
| `throw new Error('执行超时')` | `throw new ExecutionTimeoutError(...)` |
| `throw new Error('无权限操作')` | `throw new AccessDeniedError(...)` |

### 7.2 迁移步骤

1. **识别需要迁移的代码**
   ```bash
   # 搜索所有 throw new Error 语句
   grep -r "throw new Error" src/
   ```

2. **选择合适的异常类**
   - 根据错误类型选择对应的异常类
   - 参考异常使用指南

3. **替换异常抛出**
   ```typescript
   // 旧代码
   throw new Error('工作流不存在: ' + id);

   // 新代码
   throw new EntityNotFoundError('Workflow', id);
   ```

4. **更新异常捕获**
   ```typescript
   // 旧代码
   try {
     // ...
   } catch (error) {
     if (error.message.includes('工作流不存在')) {
       // 处理
     }
   }

   // 新代码
   try {
     // ...
   } catch (error) {
     if (error instanceof EntityNotFoundError) {
       // 处理
     }
   }
   ```

5. **运行测试**
   ```bash
   npm test
   ```

---

## 八、预期收益

### 8.1 代码质量提升
- **减少代码复杂度**：从 208 个异常类减少到约 20 个
- **提高代码可读性**：结构化的错误信息更易理解
- **改善错误处理**：统一的异常处理逻辑

### 8.2 开发效率提升
- **减少代码审查时间**：统一的异常使用规范
- **降低学习成本**：清晰的异常体系
- **提高错误定位效率**：结构化的错误信息

### 8.3 系统可靠性提升
- **改善错误恢复**：支持错误重试策略
- **增强错误监控**：结构化的错误日志
- **提升系统健壮性**：更好的错误处理

---

## 九、风险评估

### 9.1 潜在风险

1. **重构风险**
   - 可能引入新的 bug
   - 可能影响现有功能
   - 需要大量测试

2. **兼容性风险**
   - 可能影响依赖方
   - 可能需要更新文档
   - 可能需要培训开发者

3. **时间风险**
   - 重构可能需要较长时间
   - 可能影响其他开发任务
   - 可能需要额外的资源

### 9.2 风险缓解措施

1. **渐进式重构**
   - 分阶段进行，每次重构一个模块
   - 保持向后兼容
   - 充分测试

2. **代码审查**
   - 所有重构代码需要审查
   - 建立重构检查清单
   - 使用自动化工具

3. **文档和培训**
   - 更新异常使用文档
   - 提供迁移指南
   - 组织培训会议

---

## 十、总结

### 10.1 核心要点

1. **简化异常体系**：从 208 个异常类减少到约 20 个
2. **统一错误定义**：提供结构化的错误信息
3. **改善错误处理**：支持错误分类、恢复策略
4. **渐进式重构**：分阶段进行，降低风险

### 10.2 下一步行动

1. **评审方案**：与团队讨论并确认方案
2. **创建异常类**：实现新的异常体系
3. **开始重构**：从高优先级模块开始
4. **持续优化**：根据使用情况调整

---

**文档版本**: 1.0
**创建日期**: 2025-01-XX
**最后更新**: 2025-01-XX
**维护者**: 架构团队