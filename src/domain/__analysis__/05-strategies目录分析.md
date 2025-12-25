# src\domain\workflow\strategies 目录分析

## 问题概述

分析 `src\domain\workflow\strategies\index.ts` 是否应该作为值对象，以及当前目录结构的合理性。

## 当前实现分析

### 文件内容
```typescript
// src/domain/workflow/strategies/index.ts

/**
 * 错误处理策略枚举
 */
export enum ErrorHandlingStrategy {
  STOP_ON_ERROR = 'stop_on_error',
  CONTINUE_ON_ERROR = 'continue_on_error',
  RETRY = 'retry',
  SKIP = 'skip'
}

/**
 * 执行策略枚举
 */
export enum ExecutionStrategy {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  CONDITIONAL = 'conditional'
}

/**
 * 错误处理策略接口
 */
export interface IErrorHandlingStrategy {
  readonly type: ErrorHandlingStrategy;
  handle(error: Error, context: unknown): Promise<void>;
}

/**
 * 执行策略接口
 */
export interface IExecutionStrategy {
  readonly type: ExecutionStrategy;
  execute(context: unknown): Promise<unknown>;
}
```

### 对比：现有的值对象实现

以 [`ExecutionModeValue`](src/domain/workflow/value-objects/execution-mode.ts:25) 为例：

```typescript
export class ExecutionModeValue extends ValueObject<ExecutionModeValueProps> {
  constructor(props: ExecutionModeValueProps) {
    super(props);
    this.validate();
  }
  
  // 业务方法
  public isSync(): boolean { ... }
  public isAsync(): boolean { ... }
  public isStream(): boolean { ... }
  
  // 静态工厂方法
  public static sync(): ExecutionModeValue { ... }
  public static fromString(value: string): ExecutionModeValue { ... }
}
```

---

## 核心问题分析

### 1. 当前strategies目录的问题

#### ❌ 违反单一职责原则
- **枚举定义**：`ErrorHandlingStrategy`, `ExecutionStrategy`
- **接口定义**：`IErrorHandlingStrategy`, `IExecutionStrategy`
- **混合职责**：既有数据定义又有行为契约

#### ❌ 不符合DDD规范
- **接口位置不当**：策略接口应该与具体实现分离
- **枚举使用原始类型**：缺乏值对象的封装和验证
- **缺少业务逻辑**：枚举本身不包含业务规则

#### ❌ 结构不一致
- **与workflow模块其他部分不协调**：其他值对象都有完整的封装
- **命名不统一**：`strategies` vs `value-objects`

---

### 2. 值对象 vs 策略模式的权衡

#### 值对象特征（适合作为值对象）
- ✅ **不可变性**：策略类型一旦确定不应改变
- ✅ **业务含义**：代表特定的业务概念
- ✅ **可验证性**：需要验证策略的有效性
- ✅ **可比较性**：需要比较策略是否相同

#### 策略模式特征（不适合作为值对象）
- ❌ **行为导向**：策略模式强调行为的多态性
- ❌ **动态性**：策略可能在运行时切换
- ❌ **复杂性**：策略可能包含复杂的状态和逻辑

---

## 重构建议

### 方案A：转换为值对象（推荐）

#### 目录结构调整
```
workflow/
├── value-objects/
│   ├── execution-mode.ts      # 已存在
│   ├── error-handling-strategy.ts  # 新增
│   └── execution-strategy.ts       # 新增
└── services/
    └── strategy-execution-service.ts  # 策略执行服务
```

#### 具体实现

**错误处理策略值对象**：
```typescript
// value-objects/error-handling-strategy.ts
import { ValueObject } from '../../common/value-objects/value-object';
import { DomainError } from '../../common/errors/domain-error';

export enum ErrorHandlingStrategyType {
  STOP_ON_ERROR = 'stop_on_error',
  CONTINUE_ON_ERROR = 'continue_on_error',
  RETRY = 'retry',
  SKIP = 'skip'
}

export interface ErrorHandlingStrategyProps {
  type: ErrorHandlingStrategyType;
  retryCount?: number;
  retryDelay?: number;
}

export class ErrorHandlingStrategy extends ValueObject<ErrorHandlingStrategyProps> {
  constructor(props: ErrorHandlingStrategyProps) {
    super(props);
    this.validate();
  }

  private validate(): void {
    if (!Object.values(ErrorHandlingStrategyType).includes(this.props.type)) {
      throw new DomainError(`无效的错误处理策略: ${this.props.type}`);
    }
    
    if (this.props.type === ErrorHandlingStrategyType.RETRY) {
      if (!this.props.retryCount || this.props.retryCount <= 0) {
        throw new DomainError('重试策略必须指定有效的重试次数');
      }
    }
  }

  // 业务方法
  public isStopOnError(): boolean {
    return this.props.type === ErrorHandlingStrategyType.STOP_ON_ERROR;
  }

  public isContinueOnError(): boolean {
    return this.props.type === ErrorHandlingStrategyType.CONTINUE_ON_ERROR;
  }

  public isRetry(): boolean {
    return this.props.type === ErrorHandlingStrategyType.RETRY;
  }

  public getRetryCount(): number {
    return this.props.retryCount || 0;
  }

  // 静态工厂方法
  public static stopOnError(): ErrorHandlingStrategy {
    return new ErrorHandlingStrategy({ type: ErrorHandlingStrategyType.STOP_ON_ERROR });
  }

  public static continueOnError(): ErrorHandlingStrategy {
    return new ErrorHandlingStrategy({ type: ErrorHandlingStrategyType.CONTINUE_ON_ERROR });
  }

  public static retry(count: number, delay: number = 1000): ErrorHandlingStrategy {
    return new ErrorHandlingStrategy({ 
      type: ErrorHandlingStrategyType.RETRY,
      retryCount: count,
      retryDelay: delay
    });
  }

  public static skip(): ErrorHandlingStrategy {
    return new ErrorHandlingStrategy({ type: ErrorHandlingStrategyType.SKIP });
  }
}
```

**执行策略值对象**：
```typescript
// value-objects/execution-strategy.ts
import { ValueObject } from '../../common/value-objects/value-object';
import { DomainError } from '../../common/errors/domain-error';

export enum ExecutionStrategyType {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  CONDITIONAL = 'conditional'
}

export interface ExecutionStrategyProps {
  type: ExecutionStrategyType;
  maxConcurrency?: number;
  condition?: string; // 条件表达式
}

export class ExecutionStrategy extends ValueObject<ExecutionStrategyProps> {
  constructor(props: ExecutionStrategyProps) {
    super(props);
    this.validate();
  }

  private validate(): void {
    if (!Object.values(ExecutionStrategyType).includes(this.props.type)) {
      throw new DomainError(`无效的执行策略: ${this.props.type}`);
    }
    
    if (this.props.type === ExecutionStrategyType.PARALLEL) {
      if (this.props.maxConcurrency && this.props.maxConcurrency <= 0) {
        throw new DomainError('并行策略的最大并发数必须大于0');
      }
    }
    
    if (this.props.type === ExecutionStrategyType.CONDITIONAL) {
      if (!this.props.condition) {
        throw new DomainError('条件策略必须指定条件表达式');
      }
    }
  }

  // 业务方法
  public isSequential(): boolean {
    return this.props.type === ExecutionStrategyType.SEQUENTIAL;
  }

  public isParallel(): boolean {
    return this.props.type === ExecutionStrategyType.PARALLEL;
  }

  public isConditional(): boolean {
    return this.props.type === ExecutionStrategyType.CONDITIONAL;
  }

  public getMaxConcurrency(): number {
    return this.props.maxConcurrency || 1;
  }

  public getCondition(): string | undefined {
    return this.props.condition;
  }

  // 静态工厂方法
  public static sequential(): ExecutionStrategy {
    return new ExecutionStrategy({ type: ExecutionStrategyType.SEQUENTIAL });
  }

  public static parallel(maxConcurrency: number = 4): ExecutionStrategy {
    return new ExecutionStrategy({ 
      type: ExecutionStrategyType.PARALLEL,
      maxConcurrency
    });
  }

  public static conditional(condition: string): ExecutionStrategy {
    return new ExecutionStrategy({ 
      type: ExecutionStrategyType.CONDITIONAL,
      condition
    });
  }
}
```

**策略执行服务**：
```typescript
// services/strategy-execution-service.ts
export class StrategyExecutionService {
  async executeWithStrategy(
    strategy: ExecutionStrategy,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    // 根据策略类型执行不同的逻辑
    if (strategy.isSequential()) {
      return this.executeSequential(context);
    } else if (strategy.isParallel()) {
      return this.executeParallel(context, strategy.getMaxConcurrency());
    } else if (strategy.isConditional()) {
      return this.executeConditional(context, strategy.getCondition());
    }
  }

  async handleError(
    strategy: ErrorHandlingStrategy,
    error: Error,
    context: ExecutionContext
  ): Promise<ErrorHandlingResult> {
    // 根据错误处理策略处理错误
    if (strategy.isStopOnError()) {
      throw error;
    } else if (strategy.isContinueOnError()) {
      return ErrorHandlingResult.continue();
    } else if (strategy.isRetry()) {
      return this.retryExecution(strategy, error, context);
    } else if (strategy.isSkip()) {
      return ErrorHandlingResult.skip();
    }
  }
}
```

---

### 方案B：保持策略模式（不推荐）

如果确实需要策略模式，应该这样组织：

```
workflow/
├── value-objects/
│   ├── error-handling-strategy-type.ts  # 策略类型值对象
│   └── execution-strategy-type.ts       # 策略类型值对象
├── strategies/                          # 策略实现（移到基础设施层）
│   ├── error-handling/
│   │   ├── stop-on-error.strategy.ts
│   │   ├── continue-on-error.strategy.ts
│   │   └── retry.strategy.ts
│   └── execution/
│       ├── sequential.strategy.ts
│       ├── parallel.strategy.ts
│       └── conditional.strategy.ts
└── interfaces/                          # 策略接口
    ├── error-handling-strategy.interface.ts
    └── execution-strategy.interface.ts
```

**问题**：
- 策略实现属于技术细节，不应在领域层
- 增加了不必要的复杂性
- 违反了领域层只包含业务规则的原则

---

## 推荐方案：转换为值对象

### 理由

1. **符合DDD原则**：策略类型是业务概念，应该作为值对象
2. **结构一致性**：与workflow模块其他值对象保持一致
3. **业务逻辑封装**：可以在值对象中封装验证和业务规则
4. **类型安全**：提供更好的类型检查和编译时验证
5. **易于使用**：静态工厂方法提供便捷的创建方式

### 优势

1. **不可变性**：值对象一旦创建不可修改
2. **可验证性**：构造时验证业务规则
3. **可比较性**：支持值对象的相等性比较
4. **业务方法**：提供领域相关的业务方法
5. **序列化友好**：支持JSON序列化和反序列化

### 实施步骤

1. **创建值对象类**：按照上述示例创建值对象
2. **更新引用**：修改所有使用枚举的地方
3. **删除strategies目录**：移除原有的strategies目录
4. **更新测试**：确保所有测试通过
5. **更新文档**：更新相关文档和示例

---

## 影响评估

### 需要修改的文件

1. **Workflow实体**：更新策略属性的类型
2. **Workflow服务**：更新策略使用方式
3. **测试文件**：更新测试用例
4. **API接口**：更新序列化/反序列化逻辑

### 风险评估

- **低风险**：主要是类型变更，不涉及业务逻辑变化
- **向后兼容**：可以通过适配器模式保持API兼容
- **测试覆盖**：现有测试可以验证重构正确性

---

## 结论

**强烈建议将 `strategies` 目录转换为值对象**，理由如下：

1. **符合架构规范**：策略类型是业务概念，应该作为值对象
2. **提高代码质量**：值对象提供更好的封装和验证
3. **保持结构一致**：与workflow模块其他部分保持一致
4. **降低复杂性**：避免不必要的策略模式复杂性

通过这种重构，将显著提升代码的可维护性、类型安全性和业务逻辑的清晰度。