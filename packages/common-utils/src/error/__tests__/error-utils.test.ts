import { describe, it, expect } from 'vitest';
import {
  getErrorMessage,
  normalizeError,
  isError,
  getErrorOrUndefined,
  getErrorOrNew,
  createAbortError,
  isAbortError,
} from '../error-utils.js';
import { AbortError, ThreadInterruptedException } from '@modular-agent/types';

describe('error-utils', () => {
  describe('getErrorMessage', () => {
    it('应该返回 Error 对象的 message', () => {
      const error = new Error('Test error message');
      expect(getErrorMessage(error)).toBe('Test error message');
    });

    it('应该直接返回字符串', () => {
      const error = 'String error message';
      expect(getErrorMessage(error)).toBe('String error message');
    });

    it('应该为 null 返回 "Unknown error"', () => {
      expect(getErrorMessage(null)).toBe('Unknown error');
    });

    it('应该为 undefined 返回 "Unknown error"', () => {
      expect(getErrorMessage(undefined)).toBe('Unknown error');
    });

    it('应该提取对象的 message 属性', () => {
      const error = { message: 'Object error message' };
      expect(getErrorMessage(error)).toBe('Object error message');
    });

    it('应该调用对象的 toString 方法', () => {
      const error = { toString: () => 'Custom toString' };
      expect(getErrorMessage(error)).toBe('Custom toString');
    });

    it('应该调用对象的 toString 方法（普通对象返回 [object Object]）', () => {
      const error = { code: 500, detail: 'Server error' };
      expect(getErrorMessage(error)).toBe('[object Object]');
    });

    it('应该将数字转换为字符串', () => {
      expect(getErrorMessage(404)).toBe('404');
    });

    it('应该将布尔值转换为字符串', () => {
      expect(getErrorMessage(true)).toBe('true');
    });
  });

  describe('normalizeError', () => {
    it('应该直接返回 Error 对象', () => {
      const error = new Error('Test error');
      const result = normalizeError(error);
      expect(result).toBe(error);
      expect(result.message).toBe('Test error');
    });

    it('应该将字符串转换为 Error 对象', () => {
      const error = 'String error';
      const result = normalizeError(error);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('String error');
    });

    it('应该为 null 创建包含 "Unknown error" 的 Error 对象', () => {
      const result = normalizeError(null);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Unknown error');
    });

    it('应该为 undefined 创建包含 "Unknown error" 的 Error 对象', () => {
      const result = normalizeError(undefined);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Unknown error');
    });

    it('应该提取对象的 message 属性创建 Error', () => {
      const error = { message: 'Object error' };
      const result = normalizeError(error);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Object error');
    });

    it('应该调用对象的 toString 方法创建 Error', () => {
      const error = { toString: () => 'Custom toString' };
      const result = normalizeError(error);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Custom toString');
    });

    it('应该调用对象的 toString 方法创建 Error（普通对象返回 [object Object]）', () => {
      const error = { code: 500 };
      const result = normalizeError(error);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('[object Object]');
    });

    it('应该将数字转换为 Error 对象', () => {
      const result = normalizeError(404);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('404');
    });
  });

  describe('isError', () => {
    it('应该为 Error 对象返回 true', () => {
      const error = new Error('Test error');
      expect(isError(error)).toBe(true);
    });

    it('应该为字符串返回 false', () => {
      expect(isError('error string')).toBe(false);
    });

    it('应该为 null 返回 false', () => {
      expect(isError(null)).toBe(false);
    });

    it('应该为 undefined 返回 false', () => {
      expect(isError(undefined)).toBe(false);
    });

    it('应该为普通对象返回 false', () => {
      expect(isError({ message: 'error' })).toBe(false);
    });

    it('应该为数字返回 false', () => {
      expect(isError(404)).toBe(false);
    });
  });

  describe('getErrorOrUndefined', () => {
    it('应该返回 Error 对象', () => {
      const error = new Error('Test error');
      const result = getErrorOrUndefined(error);
      expect(result).toBe(error);
    });

    it('应该为字符串返回 undefined', () => {
      const result = getErrorOrUndefined('error string');
      expect(result).toBeUndefined();
    });

    it('应该为 null 返回 undefined', () => {
      const result = getErrorOrUndefined(null);
      expect(result).toBeUndefined();
    });

    it('应该为 undefined 返回 undefined', () => {
      const result = getErrorOrUndefined(undefined);
      expect(result).toBeUndefined();
    });

    it('应该为普通对象返回 undefined', () => {
      const result = getErrorOrUndefined({ message: 'error' });
      expect(result).toBeUndefined();
    });
  });

  describe('getErrorOrNew', () => {
    it('应该返回 Error 对象', () => {
      const error = new Error('Test error');
      const result = getErrorOrNew(error);
      expect(result).toBe(error);
    });

    it('应该为字符串创建新的 Error 对象', () => {
      const result = getErrorOrNew('error string');
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('error string');
    });

    it('应该为 null 创建新的 Error 对象', () => {
      const result = getErrorOrNew(null);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('null');
    });

    it('应该为 undefined 创建新的 Error 对象', () => {
      const result = getErrorOrNew(undefined);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('undefined');
    });

    it('应该为数字创建新的 Error 对象', () => {
      const result = getErrorOrNew(404);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('404');
    });
  });

  describe('createAbortError', () => {
    it('应该创建 AbortError 实例', () => {
      const error = createAbortError('Operation aborted');
      expect(error).toBeInstanceOf(AbortError);
      expect(error.message).toBe('Operation aborted');
    });

    it('应该使用 signal 的 reason 作为 cause', () => {
      const controller = new AbortController();
      const reason = new Error('Custom abort reason');
      controller.abort(reason);
      
      const error = createAbortError('Operation aborted', controller.signal);
      expect(error.cause).toBe(reason);
    });

    it('应该在没有 signal 时创建没有 cause 的 AbortError', () => {
      const error = createAbortError('Operation aborted');
      expect(error.cause).toBeUndefined();
    });
  });

  describe('isAbortError', () => {
    it('应该为 AbortError 实例返回 true', () => {
      const error = new AbortError('Operation aborted');
      expect(isAbortError(error)).toBe(true);
    });

    it('应该为嵌套的 AbortError 返回 true', () => {
      const abortError = new AbortError('Operation aborted');
      const error = new Error('Wrapper error');
      error.cause = abortError;
      
      expect(isAbortError(error)).toBe(true);
    });

    it('应该为普通 Error 返回 false', () => {
      const error = new Error('Regular error');
      expect(isAbortError(error)).toBe(false);
    });

    it('应该为字符串返回 false', () => {
      expect(isAbortError('error string')).toBe(false);
    });

    it('应该为 null 返回 false', () => {
      expect(isAbortError(null)).toBe(false);
    });

    it('应该为 undefined 返回 false', () => {
      expect(isAbortError(undefined)).toBe(false);
    });

    it('应该为嵌套的非 AbortError 返回 false', () => {
      const innerError = new Error('Inner error');
      const error = new Error('Wrapper error');
      error.cause = innerError;
      
      expect(isAbortError(error)).toBe(false);
    });
  });

});