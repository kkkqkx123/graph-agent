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
export interface Err<E, T = never> {
  readonly _tag: 'Err';
  readonly error: E;
  isOk(): this is Ok<T, E>;
  isErr(): this is Err<E, T>;
  unwrap(): never;
  unwrapOr(defaultValue: never): never;
  unwrapOrElse(fn: (error: E) => never): never;
  map<U>(fn: (value: never) => U): Result<U, E>;
  mapErr<F>(fn: (error: E) => F): Result<never, F>;
  andThen<U>(fn: (value: never) => Result<U, E>): Result<never, E>;
  orElse<F>(fn: (error: E) => Result<never, F>): Result<never, F>;
  match<U>(matcher: { ok: (value: never) => U; err: (error: E) => U }): U;
}

/**
 * 创建成功结果
 * @param value 成功的值
 * @returns Ok实例
 */
export function ok<T, E = Error>(value: T): Ok<T, E> {
  return {
    _tag: 'Ok',
    value,
    isOk(): this is Ok<T, E> {
      return true;
    },
    isErr(): this is Err<E> {
      return false;
    },
    unwrap() {
      return this.value;
    },
    unwrapOr() {
      return this.value;
    },
    unwrapOrElse() {
      return this.value;
    },
    map(fn) {
      return ok(fn(this.value));
    },
    mapErr() {
      return this as any;
    },
    andThen(fn) {
      return fn(this.value);
    },
    orElse() {
      return this as any;
    },
    match(matcher) {
      return matcher.ok(this.value);
    }
  };
}

/**
 * 创建失败结果
 * @param error 错误信息
 * @returns Err实例
 */
export function err<E, T = never>(error: E): Err<E, T> {
  return {
    _tag: 'Err',
    error,
    isOk(): this is Ok<T, E> {
      return false;
    },
    isErr(): this is Err<E, T> {
      return true;
    },
    unwrap() {
      throw new Error(`Called unwrap on an Err: ${String(this.error)}`);
    },
    unwrapOr(defaultValue: never) {
      return defaultValue;
    },
    unwrapOrElse(fn) {
      return fn(this.error);
    },
    map() {
      return this as any;
    },
    mapErr(fn) {
      return err(fn(this.error));
    },
    andThen() {
      return this as any;
    },
    orElse(fn) {
      return fn(this.error);
    },
    match(matcher) {
      return matcher.err(this.error);
    }
  };
}

/**
 * 从可能抛出异常的函数创建Result
 * @param fn 可能抛出异常的函数
 * @returns Result实例
 */
export function tryCatch<T>(fn: () => T): Result<T, Error> {
  try {
    return ok(fn());
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * 从Promise创建Result
 * @param promise Promise对象
 * @returns Result的Promise
 */
export async function tryCatchAsync<T>(promise: Promise<T>): Promise<Result<T, Error>> {
  try {
    const value = await promise;
    return ok(value);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * 组合多个Result，全部成功时返回成功，否则返回第一个错误
 * @param results Result数组
 * @returns 组合后的Result
 */
export function all<T, E>(results: Result<T, E>[]): Result<T[], E> {
  const values: T[] = [];
  for (const result of results) {
    if (result.isErr()) {
      return result as any;
    }
    values.push(result.value);
  }
  return ok(values);
}

/**
 * 组合多个Result，返回第一个成功的结果
 * @param results Result数组
 * @returns 第一个成功的Result
 */
export function any<T, E>(results: Result<T, E>[]): Result<T, E> {
  for (const result of results) {
    if (result.isOk()) {
      return result;
    }
  }
  return results[0] as any;
}