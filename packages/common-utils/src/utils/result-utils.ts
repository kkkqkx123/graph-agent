import type { Result, Ok, Err } from '../types/result';

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
export function err<E>(error: E): Err<E> {
  return {
    _tag: 'Err',
    error,
    isOk(): this is Ok<never, E> {
      return false;
    },
    isErr(): this is Err<E> {
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
  if (results.length === 0) {
    return err(new Error('No results provided')) as any;
  }
  
  for (const result of results) {
    if (result.isOk()) {
      return result;
    }
  }
  return results[0] as any;
}