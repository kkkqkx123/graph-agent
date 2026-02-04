/**
 * Result类型单元测试
 */

import { ok, err, tryCatch, tryCatchAsync, all, any } from '../result';

describe('Result类型', () => {
  describe('ok', () => {
    it('应该创建Ok结果', () => {
      const result = ok(42);
      expect(result.isOk()).toBe(true);
      expect(result.isErr()).toBe(false);
      expect(result.unwrap()).toBe(42);
    });

    it('应该支持unwrapOr', () => {
      const result = ok(42);
      expect(result.unwrapOr(0)).toBe(42);
    });

    it('应该支持unwrapOrElse', () => {
      const result = ok(42);
      expect(result.unwrapOrElse(() => 0)).toBe(42);
    });

    it('应该支持map', () => {
      const result = ok(42);
      const mapped = result.map(x => x * 2);
      expect(mapped.unwrap()).toBe(84);
    });

    it('应该支持mapErr', () => {
      const result = ok(42);
      const mapped = result.mapErr(e => new Error('mapped'));
      expect(mapped.unwrap()).toBe(42);
    });

    it('应该支持andThen', () => {
      const result = ok(42);
      const chained = result.andThen(x => ok(x * 2));
      expect(chained.unwrap()).toBe(84);
    });

    it('应该支持orElse', () => {
      const result = ok(42);
      const orElsed = result.orElse(() => ok(0));
      expect(orElsed.unwrap()).toBe(42);
    });

    it('应该支持match', () => {
      const result = ok(42);
      const matched = result.match({
        ok: value => value * 2,
        err: error => 0
      });
      expect(matched).toBe(84);
    });
  });

  describe('err', () => {
    it('应该创建Err结果', () => {
      const error = new Error('test error');
      const result = err(error);
      expect(result.isOk()).toBe(false);
      expect(result.isErr()).toBe(true);
      expect(result.error).toBe(error);
    });

    it('应该在unwrap时抛出错误', () => {
      const error = new Error('test error');
      const result = err(error);
      expect(() => result.unwrap()).toThrow('Called unwrap on an Err');
    });

    it('应该支持unwrapOr', () => {
      const error = new Error('test error');
      const result = err(error);
      expect(result.unwrapOr(0)).toBe(0);
    });

    it('应该支持unwrapOrElse', () => {
      const error = new Error('test error');
      const result = err(error);
      expect(result.unwrapOrElse(() => 0)).toBe(0);
    });

    it('应该支持map', () => {
      const error = new Error('test error');
      const result = err(error);
      const mapped = result.map(x => x * 2);
      expect(mapped.isErr()).toBe(true);
    });

    it('应该支持mapErr', () => {
      const error = new Error('test error');
      const result = err(error);
      const mapped = result.mapErr(e => new Error('mapped'));
      expect(mapped.isErr()).toBe(true);
      if (mapped.isErr()) {
        expect(mapped.error.message).toBe('mapped');
      }
    });

    it('应该支持andThen', () => {
      const error = new Error('test error');
      const result = err(error);
      const chained = result.andThen(x => ok(x * 2));
      expect(chained.isErr()).toBe(true);
    });

    it('应该支持orElse', () => {
      const error = new Error('test error');
      const result = err(error);
      const orElsed = result.orElse(() => ok(0));
      expect(orElsed.unwrap()).toBe(0);
    });

    it('应该支持match', () => {
      const error = new Error('test error');
      const result = err(error);
      const matched = result.match({
        ok: value => value * 2,
        err: error => 0
      });
      expect(matched).toBe(0);
    });
  });

  describe('tryCatch', () => {
    it('应该捕获同步异常并返回Ok', () => {
      const result = tryCatch(() => 42);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(42);
    });

    it('应该捕获同步异常并返回Err', () => {
      const result = tryCatch(() => {
        throw new Error('test error');
      });
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('test error');
      }
    });

    it('应该处理非Error类型的异常', () => {
      const result = tryCatch(() => {
        throw 'string error';
      });
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('string error');
      }
    });
  });

  describe('tryCatchAsync', () => {
    it('应该捕获异步异常并返回Ok', async () => {
      const result = await tryCatchAsync(Promise.resolve(42));
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(42);
    });

    it('应该捕获异步异常并返回Err', async () => {
      const result = await tryCatchAsync(
        Promise.reject(new Error('async error'))
      );
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('async error');
      }
    });
  });

  describe('all', () => {
    it('应该组合多个Ok结果', () => {
      const results = [ok(1), ok(2), ok(3)];
      const combined = all(results);
      expect(combined.isOk()).toBe(true);
      if (combined.isOk()) {
        expect(combined.value).toEqual([1, 2, 3]);
      }
    });

    it('应该在遇到第一个Err时返回Err', () => {
      const results = [ok(1), err(new Error('error')), ok(3)];
      const combined = all(results);
      expect(combined.isErr()).toBe(true);
    });

    it('应该处理空数组', () => {
      const results: any[] = [];
      const combined = all(results);
      expect(combined.isOk()).toBe(true);
      if (combined.isOk()) {
        expect(combined.value).toEqual([]);
      }
    });
  });

  describe('any', () => {
    it('应该返回第一个Ok结果', () => {
      const results = [err(new Error('error1')), ok(42), err(new Error('error2'))];
      const firstOk = any(results);
      expect(firstOk.isOk()).toBe(true);
      if (firstOk.isOk()) {
        expect(firstOk.value).toBe(42);
      }
    });

    it('应该在全部失败时返回第一个Err', () => {
      const results = [err(new Error('error1')), err(new Error('error2'))];
      const firstErr = any(results);
      expect(firstErr.isErr()).toBe(true);
    });

    it('应该处理空数组', () => {
      const results: any[] = [];
      const first = any(results);
      expect(first.isErr()).toBe(true);
    });
  });

  describe('链式操作', () => {
    it('应该支持复杂的链式操作', () => {
      const result = ok(10)
        .map(x => x * 2)
        .andThen(x => ok(x + 5))
        .map(x => x / 3);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(25 / 3);
      }
    });

    it('应该在链式操作中正确处理错误', () => {
      const result = ok(10)
        .map(x => x * 2)
        .andThen(x => err(new Error('failed')))
        .map(() => { throw new Error('This should not be executed'); });

      expect(result.isErr()).toBe(true);
    });

    it('应该支持错误恢复', () => {
      const result = err(new Error('failed'))
        .orElse(() => ok(42))
        .map(x => x * 2);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(84);
      }
    });
  });
});