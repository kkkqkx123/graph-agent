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