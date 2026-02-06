# Result 类型重构迁移方案

## 背景
当前 `sdk/api/utils/result.ts` 文件位于 API 层，但 Core 层的验证器模块等组件需要使用函数式错误处理能力。根据项目严格的依赖规则（Types ← Utils ← Core ← API），必须将 Result 类型重构到正确的架构层。

## 架构问题
- **当前位置**: `sdk/api/utils/result.ts`
- **问题**: Core 层无法使用（违反依赖规则：Core 不能依赖 API）
- **影响**: 验证器、解析器等 Core 模块只能使用简单的二元错误处理

## 重构方案

### 1. 拆分 Result 到正确层级

#### Types 层 - `sdk/types/result.ts`
仅包含类型定义，无实现逻辑：

```typescript
/**
 * Result类型 - 函数式错误处理
 * 提供类型安全的错误处理机制，避免异常抛出
 */

/**
 * Result类型 - 表示操作的结果
 * @template T 成功时的值类型
 * @template E 失败时的错误类型
 */
export type Result<T, E = Error> = Ok<T> | Err<E>;

/**
 * 成功结果
 */
export interface Ok<T, E = Error> {
  readonly _tag: 'Ok';
  readonly value: T;
  isOk(): this is Ok<T, E>;
  isErr(): this is Err<E>;
  unwrap(): T;
  unwrapOr(defaultValue: T): T;
  unwrapOrElse(fn: (error: never) => T): T;
  map<U>(fn: (value: T) => U): Result<U, E>;
  mapErr<F>(fn: (error: never) => F): Result<T, F>;
  andThen<U>(fn: (value: T) => Result<U, E>): Result<U, E>;
  orElse<F>(fn: (error: never) => Result<T, F>): Result<T, F>;
  match<U>(matcher: { ok: (value: T) => U; err: (error: never) => U }): U;
}

/**
 * 失败结果
 */
export interface Err<E> {
  readonly _tag: 'Err';
  readonly error: E;
  isOk(): this is Ok<never, E>;
  isErr(): this is Err<E>;
  unwrap(): never;
  unwrapOr<T>(defaultValue: T): T;
  unwrapOrElse<T>(fn: (error: E) => T): T;
  map<U>(fn: (value: never) => U): Result<never, E>;
  mapErr<F>(fn: (error: E) => F): Result<never, F>;
  andThen<U>(fn: (value: never) => Result<U, E>): Result<U, E>;
  orElse<T, F>(fn: (error: E) => Result<T, F>): Result<T, F>;
  match<U>(matcher: { ok: (value: never) => U; err: (error: E) => U }): U;
}
```

#### Utils 层 - `sdk/utils/result-utils.ts`
包含所有实现逻辑：

```typescript
import type { Result, Ok, Err } from '../types/result';

/**
 * 创建成功结果
 * @param value 成功的值
 * @returns Ok实例
 */
export function ok<T, E = Error>(value: T): Ok<T, E> {
  // ... 实现
}

/**
 * 创建失败结果
 * @param error 错误信息
 * @returns Err实例
 */
export function err<E>(error: E): Err<E> {
  // ... 实现
}

/**
 * 从可能抛出异常的函数创建Result
 * @param fn 可能抛出异常的函数
 * @returns Result实例
 */
export function tryCatch<T>(fn: () => T): Result<T, Error> {
  // ... 实现
}

/**
 * 从Promise创建Result
 * @param promise Promise对象
 * @returns Result的Promise
 */
export async function tryCatchAsync<T>(promise: Promise<T>): Promise<Result<T, Error>> {
  // ... 实现
}

/**
 * 组合多个Result，全部成功时返回成功，否则返回第一个错误
 * @param results Result数组
 * @returns 组合后的Result
 */
export function all<T, E>(results: Result<T, E>[]): Result<T[], E> {
  // ... 实现
}

/**
 * 组合多个Result，返回第一个成功的结果
 * @param results Result数组
 * @returns 第一个成功的Result
 */
export function any<T, E>(results: Result<T, E>[]): Result<T, E> {
  // ... 实现
}
```

### 2. 更新验证器模块

将所有验证器从 `ValidationResult` 迁移到 `Result<ValidData, ValidationError[]>`：

```typescript
// Before
validate(workflow: WorkflowDefinition): ValidationResult {
  const errors: ValidationError[] = [];
  // ... validation logic
  return { valid: errors.length === 0, errors };
}

// After  
validate(workflow: WorkflowDefinition): Result<WorkflowDefinition, ValidationError[]> {
  const errors: ValidationError[] = [];
  // ... validation logic
  if (errors.length > 0) {
    return err(errors);
  }
  return ok(workflow);
}
```

### 3. 错误定义重构分析

#### 当前错误体系
- `sdk/types/errors.ts` 定义了 `ValidationError` 类和 `ValidationResult` 接口
- `ValidationResult` 是简单的 `{ valid: boolean, errors: ValidationError[] }` 结构

#### 建议：移除 ValidationResult，全面采用 Result
- **理由**: 
  1. `Result` 提供更强的类型安全和函数式能力
  2. 避免维护两套错误处理体系
  3. `Result<ValidData, ValidationError[]>` 比 `ValidationResult` 更精确
  4. 符合现代 TypeScript 最佳实践

#### 具体修改
- 删除 `ValidationResult` 接口
- 所有验证方法直接返回 `Result<ValidData, ValidationError[]>`
- 更新所有调用点使用 Result 的链式操作

### 4. 迁移步骤

#### 步骤 1: 创建新文件
- [ ] 创建 `sdk/types/result.ts`
- [ ] 创建 `sdk/utils/result-utils.ts`

#### 步骤 2: 迁移验证器模块
- [ ] `sdk/core/validation/workflow-validator.ts`
- [ ] `sdk/core/validation/node-validator.ts`  
- [ ] `sdk/core/validation/tool-config-validator.ts`
- [ ] `sdk/core/validation/message-validator.ts`
- [ ] `sdk/core/validation/hook-validator.ts`
- [ ] `sdk/core/validation/code-config-validator.ts`
- [ ] `sdk/core/validation/trigger-validator.ts`
- [ ] `sdk/core/validation/graph-validator.ts`

#### 步骤 3: 清理旧代码
- [ ] 删除 `sdk/types/errors.ts` 中的 `ValidationResult` 接口
- [ ] 删除 `sdk/api/utils/result.ts`
- [ ] 更新 API 层导入路径

#### 步骤 4: 更新构建器和组合器
- [ ] 更新 `sdk/api/builders/execution-builder.ts` 使用新的 Result
- [ ] 更新 `sdk/api/builders/workflow-composer.ts` 使用新的 Result

### 5. 预期收益

1. **架构合规**: 严格遵守依赖规则
2. **功能增强**: Core 层获得函数式错误处理能力
3. **类型安全**: 强制错误处理，减少运行时错误
4. **代码简洁**: 统一的错误处理模式，减少样板代码
5. **可组合性**: 支持复杂的验证链和错误累积

### 6. 风险评估

- **破坏性变更**: 需要更新所有验证器调用点
- **学习曲线**: 团队需要适应函数式错误处理模式
- **测试覆盖**: 需要确保所有迁移后的代码都有充分测试

**缓解措施**: 
- 逐步迁移，每次只处理一个验证器模块
- 充分的单元测试覆盖
- 详细的代码审查