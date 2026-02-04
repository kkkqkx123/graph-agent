/**
 * header-builder 单元测试
 */

import { describe, it, expect } from '@jest/globals';
import { mergeHeaders, isEmptyHeaders } from '../header-builder';

describe('header-builder', () => {
  describe('mergeHeaders', () => {
    it('应该合并多个头对象', () => {
      const result = mergeHeaders(
        { 'Content-Type': 'application/json' },
        { 'Authorization': 'Bearer test' },
        { 'X-Custom': 'value' }
      );
      expect(result).toEqual({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test',
        'X-Custom': 'value'
      });
    });

    it('应该处理单个头对象', () => {
      const result = mergeHeaders({ 'Content-Type': 'application/json' });
      expect(result).toEqual({
        'Content-Type': 'application/json'
      });
    });

    it('应该处理空参数', () => {
      const result = mergeHeaders();
      expect(result).toEqual({});
    });

    it('应该跳过 undefined 头对象', () => {
      const result = mergeHeaders(
        { 'Content-Type': 'application/json' },
        undefined,
        { 'Authorization': 'Bearer test' }
      );
      expect(result).toEqual({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test'
      });
    });

    it('应该支持大小写不敏感的覆盖', () => {
      const result = mergeHeaders(
        { 'Content-Type': 'application/json' },
        { 'content-type': 'text/html' }
      );
      expect(result).toEqual({
        'content-type': 'text/html'
      });
    });

    it('应该保留最后出现的头的大小写', () => {
      const result = mergeHeaders(
        { 'Content-Type': 'application/json' },
        { 'CONTENT-TYPE': 'text/html' }
      );
      expect(result).toEqual({
        'CONTENT-TYPE': 'text/html'
      });
    });

    it('应该通过 undefined 值显式删除头', () => {
      const result = mergeHeaders(
        { 'Content-Type': 'application/json', 'Authorization': 'Bearer test' },
        { 'Authorization': undefined }
      );
      expect(result).toEqual({
        'Content-Type': 'application/json'
      });
    });

    it('应该通过 undefined 值删除大小写不敏感的头', () => {
      const result = mergeHeaders(
        { 'Content-Type': 'application/json' },
        { 'content-type': undefined }
      );
      expect(result).toEqual({});
    });

    it('应该处理多个删除操作', () => {
      const result = mergeHeaders(
        { 'Content-Type': 'application/json', 'Authorization': 'Bearer test', 'X-Custom': 'value' },
        { 'Authorization': undefined },
        { 'X-Custom': undefined }
      );
      expect(result).toEqual({
        'Content-Type': 'application/json'
      });
    });

    it('应该处理删除后重新添加', () => {
      const result = mergeHeaders(
        { 'Content-Type': 'application/json' },
        { 'Content-Type': undefined },
        { 'Content-Type': 'text/html' }
      );
      expect(result).toEqual({
        'Content-Type': 'text/html'
      });
    });

    it('应该处理混合大小写的删除和添加', () => {
      const result = mergeHeaders(
        { 'Content-Type': 'application/json' },
        { 'content-type': undefined },
        { 'CONTENT-TYPE': 'text/html' }
      );
      expect(result).toEqual({
        'CONTENT-TYPE': 'text/html'
      });
    });

    it('应该处理多个同名头只保留最后一个', () => {
      const result = mergeHeaders(
        { 'X-Custom': 'value1' },
        { 'X-Custom': 'value2' },
        { 'X-Custom': 'value3' }
      );
      expect(result).toEqual({
        'X-Custom': 'value3'
      });
    });

    it('应该处理复杂的合并场景', () => {
      const result = mergeHeaders(
        { 'Content-Type': 'application/json', 'Authorization': 'Bearer test1' },
        { 'X-Custom': 'value1' },
        { 'Authorization': 'Bearer test2' },
        { 'X-Custom': undefined },
        { 'X-New': 'new-value' }
      );
      expect(result).toEqual({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test2',
        'X-New': 'new-value'
      });
    });

    it('应该处理空字符串值', () => {
      const result = mergeHeaders(
        { 'Content-Type': 'application/json' },
        { 'X-Empty': '' }
      );
      expect(result).toEqual({
        'Content-Type': 'application/json',
        'X-Empty': ''
      });
    });

    it('应该处理包含特殊字符的头值', () => {
      const result = mergeHeaders(
        { 'X-Special': '!@#$%^&*()_+-=[]{}|;:,.<>?' }
      );
      expect(result).toEqual({
        'X-Special': '!@#$%^&*()_+-=[]{}|;:,.<>?'
      });
    });

    it('应该处理包含 Unicode 的头值', () => {
      const result = mergeHeaders(
        { 'X-Unicode': '你好世界 🌍' }
      );
      expect(result).toEqual({
        'X-Unicode': '你好世界 🌍'
      });
    });

    it('应该处理多个连续的 undefined 头对象', () => {
      const result = mergeHeaders(
        undefined,
        undefined,
        { 'Content-Type': 'application/json' },
        undefined
      );
      expect(result).toEqual({
        'Content-Type': 'application/json'
      });
    });
  });

  describe('isEmptyHeaders', () => {
    it('应该返回 true 对于 undefined', () => {
      expect(isEmptyHeaders(undefined)).toBe(true);
    });

    it('应该返回 true 对于空对象', () => {
      expect(isEmptyHeaders({})).toBe(true);
    });

    it('应该返回 false 对于非空对象', () => {
      expect(isEmptyHeaders({ 'Content-Type': 'application/json' })).toBe(false);
    });

    it('应该返回 false 对于包含多个头的对象', () => {
      expect(isEmptyHeaders({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test'
      })).toBe(false);
    });

    it('应该返回 false 对于包含空字符串值的对象', () => {
      expect(isEmptyHeaders({ 'X-Empty': '' })).toBe(false);
    });
  });
});