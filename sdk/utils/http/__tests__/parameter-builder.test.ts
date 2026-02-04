/**
 * parameter-builder 单元测试
 */

import { describe, it, expect } from '@jest/globals';
import {
  mergeParameters,
  extractParameters,
  filterEmptyParameters,
  isEmptyParameters,
  MergeParametersOptions
} from '../parameter-builder';

describe('parameter-builder', () => {
  describe('mergeParameters', () => {
    it('应该合并两个参数对象', () => {
      const target = { temperature: 0.7, max_tokens: 4096 };
      const source = { top_p: 1.0, frequency_penalty: 0.5 };
      const result = mergeParameters(target, source);
      expect(result).toEqual({
        temperature: 0.7,
        max_tokens: 4096,
        top_p: 1.0,
        frequency_penalty: 0.5
      });
    });

    it('应该用 source 覆盖 target 中的同名参数', () => {
      const target = { temperature: 0.7, max_tokens: 4096 };
      const source = { temperature: 0.8 };
      const result = mergeParameters(target, source);
      expect(result).toEqual({
        temperature: 0.8,
        max_tokens: 4096
      });
    });

    it('应该处理 undefined source', () => {
      const target = { temperature: 0.7, max_tokens: 4096 };
      const result = mergeParameters(target, undefined);
      expect(result).toEqual({
        temperature: 0.7,
        max_tokens: 4096
      });
    });

    it('应该返回 target 的副本', () => {
      const target = { temperature: 0.7, max_tokens: 4096 };
      const result = mergeParameters(target, undefined);
      expect(result).not.toBe(target);
      expect(result).toEqual(target);
    });

    it('应该支持排除特定键', () => {
      const target = { temperature: 0.7, max_tokens: 4096 };
      const source = { temperature: 0.8, top_p: 1.0 };
      const options: MergeParametersOptions = { excludeKeys: ['max_tokens'] };
      const result = mergeParameters(target, source, options);
      expect(result).toEqual({
        temperature: 0.8,
        top_p: 1.0
      });
    });

    it('应该支持排除多个键', () => {
      const target = { temperature: 0.7, max_tokens: 4096, top_p: 1.0 };
      const source = { temperature: 0.8, frequency_penalty: 0.5 };
      const options: MergeParametersOptions = { excludeKeys: ['max_tokens', 'top_p'] };
      const result = mergeParameters(target, source, options);
      expect(result).toEqual({
        temperature: 0.8,
        frequency_penalty: 0.5
      });
    });

    it('应该支持键名转换', () => {
      const target = { temperature: 0.7 };
      const source = { max_tokens: 4096 };
      const options: MergeParametersOptions = {
        transform: (key, value) => {
          if (key === 'max_tokens') {
            return { key: 'maxTokens', value };
          }
          return null;
        }
      };
      const result = mergeParameters(target, source, options);
      expect(result).toEqual({
        temperature: 0.7,
        maxTokens: 4096
      });
    });

    it('应该对返回 null 的键按常规方式处理', () => {
      const target = { temperature: 0.7 };
      const source = { max_tokens: 4096, top_p: 1.0 };
      const options: MergeParametersOptions = {
        transform: (key, value) => {
          if (key === 'max_tokens') {
            return { key: 'maxTokens', value };
          }
          return null;
        }
      };
      const result = mergeParameters(target, source, options);
      expect(result).toEqual({
        temperature: 0.7,
        maxTokens: 4096,
        top_p: 1.0
      });
    });

    it('应该支持深度合并', () => {
      const target = { config: { temperature: 0.7, max_tokens: 4096 } };
      const source = { config: { temperature: 0.8, top_p: 1.0 } };
      const options: MergeParametersOptions = { deep: true };
      const result = mergeParameters(target, source, options);
      expect(result).toEqual({
        config: {
          temperature: 0.8,
          max_tokens: 4096,
          top_p: 1.0
        }
      });
    });

    it('应该支持深度合并嵌套对象', () => {
      const target = { config: { nested: { value1: 1, value2: 2 } } };
      const source = { config: { nested: { value2: 3, value3: 4 } } };
      const options: MergeParametersOptions = { deep: true };
      const result = mergeParameters(target, source, options);
      expect(result).toEqual({
        config: {
          nested: {
            value1: 1,
            value2: 3,
            value3: 4
          }
        }
      });
    });

    it('应该不深度合并数组', () => {
      const target = { items: [1, 2, 3] };
      const source = { items: [4, 5, 6] };
      const options: MergeParametersOptions = { deep: true };
      const result = mergeParameters(target, source, options);
      expect(result).toEqual({
        items: [4, 5, 6]
      });
    });

    it('应该处理深度合并时 target 中不存在的键', () => {
      const target = { config: { temperature: 0.7 } };
      const source = { config: { top_p: 1.0 } };
      const options: MergeParametersOptions = { deep: true };
      const result = mergeParameters(target, source, options);
      expect(result).toEqual({
        config: {
          temperature: 0.7,
          top_p: 1.0
        }
      });
    });

    it('应该处理空对象', () => {
      const result = mergeParameters({}, {});
      expect(result).toEqual({});
    });

    it('应该处理包含 null 值的参数', () => {
      const target = { temperature: 0.7, value: null };
      const source = { top_p: 1.0 };
      const result = mergeParameters(target, source);
      expect(result).toEqual({
        temperature: 0.7,
        value: null,
        top_p: 1.0
      });
    });

    it('应该处理包含 undefined 值的参数', () => {
      const target = { temperature: 0.7, value: undefined };
      const source = { top_p: 1.0 };
      const result = mergeParameters(target, source);
      expect(result).toEqual({
        temperature: 0.7,
        value: undefined,
        top_p: 1.0
      });
    });

    it('应该处理包含特殊字符的键名', () => {
      const target = { 'x-custom': 'value1' };
      const source = { 'x-custom': 'value2' };
      const result = mergeParameters(target, source);
      expect(result).toEqual({
        'x-custom': 'value2'
      });
    });

    it('应该同时使用 excludeKeys 和 transform', () => {
      const target = { temperature: 0.7, max_tokens: 4096 };
      const source = { temperature: 0.8, top_p: 1.0, frequency_penalty: 0.5 };
      const options: MergeParametersOptions = {
        excludeKeys: ['max_tokens'],
        transform: (key, value) => {
          if (key === 'frequency_penalty') {
            return { key: 'frequencyPenalty', value };
          }
          return null;
        }
      };
      const result = mergeParameters(target, source, options);
      expect(result).toEqual({
        temperature: 0.8,
        top_p: 1.0,
        frequencyPenalty: 0.5
      });
    });
  });

  describe('extractParameters', () => {
    it('应该提取指定的键', () => {
      const source = { temperature: 0.7, max_tokens: 4096, top_p: 1.0 };
      const result = extractParameters(source, ['max_tokens']);
      expect(result).toEqual({
        extracted: { max_tokens: 4096 },
        remaining: { temperature: 0.7, top_p: 1.0 }
      });
    });

    it('应该提取多个键', () => {
      const source = { temperature: 0.7, max_tokens: 4096, top_p: 1.0 };
      const result = extractParameters(source, ['temperature', 'top_p']);
      expect(result).toEqual({
        extracted: { temperature: 0.7, top_p: 1.0 },
        remaining: { max_tokens: 4096 }
      });
    });

    it('应该处理不存在的键', () => {
      const source = { temperature: 0.7, max_tokens: 4096 };
      const result = extractParameters(source, ['top_p']);
      expect(result).toEqual({
        extracted: {},
        remaining: { temperature: 0.7, max_tokens: 4096 }
      });
    });

    it('应该处理 undefined source', () => {
      const result = extractParameters(undefined, ['temperature']);
      expect(result).toEqual({
        extracted: {},
        remaining: {}
      });
    });

    it('应该处理空键列表', () => {
      const source = { temperature: 0.7, max_tokens: 4096 };
      const result = extractParameters(source, []);
      expect(result).toEqual({
        extracted: {},
        remaining: { temperature: 0.7, max_tokens: 4096 }
      });
    });

    it('应该处理空对象', () => {
      const result = extractParameters({}, ['temperature']);
      expect(result).toEqual({
        extracted: {},
        remaining: {}
      });
    });

    it('应该提取所有键', () => {
      const source = { temperature: 0.7, max_tokens: 4096, top_p: 1.0 };
      const result = extractParameters(source, ['temperature', 'max_tokens', 'top_p']);
      expect(result).toEqual({
        extracted: { temperature: 0.7, max_tokens: 4096, top_p: 1.0 },
        remaining: {}
      });
    });

    it('应该保留原始值的引用', () => {
      const source = { temperature: 0.7, nested: { value: 1 } };
      const result = extractParameters(source, ['nested']);
      expect(result.extracted['nested']).toBe(source.nested);
    });
  });

  describe('filterEmptyParameters', () => {
    it('应该过滤掉 undefined 值', () => {
      const params = { temperature: 0.7, max_tokens: undefined, top_p: 1.0 };
      const result = filterEmptyParameters(params);
      expect(result).toEqual({
        temperature: 0.7,
        top_p: 1.0
      });
    });

    it('应该过滤掉 null 值', () => {
      const params = { temperature: 0.7, max_tokens: null, top_p: 1.0 };
      const result = filterEmptyParameters(params);
      expect(result).toEqual({
        temperature: 0.7,
        top_p: 1.0
      });
    });

    it('应该同时过滤 undefined 和 null', () => {
      const params = { temperature: 0.7, max_tokens: undefined, top_p: null, frequency_penalty: 0.5 };
      const result = filterEmptyParameters(params);
      expect(result).toEqual({
        temperature: 0.7,
        frequency_penalty: 0.5
      });
    });

    it('应该保留 0 值', () => {
      const params = { temperature: 0, max_tokens: 4096 };
      const result = filterEmptyParameters(params);
      expect(result).toEqual({
        temperature: 0,
        max_tokens: 4096
      });
    });

    it('应该保留空字符串', () => {
      const params = { value: '', other: 'test' };
      const result = filterEmptyParameters(params);
      expect(result).toEqual({
        value: '',
        other: 'test'
      });
    });

    it('应该保留 false 值', () => {
      const params = { enabled: false, other: true };
      const result = filterEmptyParameters(params);
      expect(result).toEqual({
        enabled: false,
        other: true
      });
    });

    it('应该保留空数组', () => {
      const params = { items: [], other: [1, 2, 3] };
      const result = filterEmptyParameters(params);
      expect(result).toEqual({
        items: [],
        other: [1, 2, 3]
      });
    });

    it('应该保留空对象', () => {
      const params = { config: {}, other: { value: 1 } };
      const result = filterEmptyParameters(params);
      expect(result).toEqual({
        config: {},
        other: { value: 1 }
      });
    });

    it('应该处理空对象', () => {
      const result = filterEmptyParameters({});
      expect(result).toEqual({});
    });

    it('应该处理嵌套对象中的 undefined 和 null', () => {
      const params = { config: { value1: undefined, value2: null, value3: 1 } };
      const result = filterEmptyParameters(params);
      expect(result).toEqual({
        config: { value1: undefined, value2: null, value3: 1 }
      });
    });
  });

  describe('isEmptyParameters', () => {
    it('应该返回 true 对于 undefined', () => {
      expect(isEmptyParameters(undefined)).toBe(true);
    });

    it('应该返回 true 对于空对象', () => {
      expect(isEmptyParameters({})).toBe(true);
    });

    it('应该返回 false 对于非空对象', () => {
      expect(isEmptyParameters({ temperature: 0.7 })).toBe(false);
    });

    it('应该返回 false 对于包含多个参数的对象', () => {
      expect(isEmptyParameters({
        temperature: 0.7,
        max_tokens: 4096,
        top_p: 1.0
      })).toBe(false);
    });

    it('应该返回 false 对于包含 undefined 值的对象', () => {
      expect(isEmptyParameters({ value: undefined })).toBe(false);
    });

    it('应该返回 false 对于包含 null 值的对象', () => {
      expect(isEmptyParameters({ value: null })).toBe(false);
    });

    it('应该返回 false 对于包含 0 值的对象', () => {
      expect(isEmptyParameters({ value: 0 })).toBe(false);
    });

    it('应该返回 false 对于包含空字符串的对象', () => {
      expect(isEmptyParameters({ value: '' })).toBe(false);
    });

    it('应该返回 false 对于包含 false 值的对象', () => {
      expect(isEmptyParameters({ value: false })).toBe(false);
    });
  });
});