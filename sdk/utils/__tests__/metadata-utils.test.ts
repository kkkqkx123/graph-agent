/**
 * 元数据工具函数单元测试
 */

import { describe, it, expect } from '@jest/globals';
import {
  emptyMetadata,
  getMetadata,
  setMetadata,
  deleteMetadata,
  hasMetadata,
  mergeMetadata
} from '../metadata-utils';

describe('metadata-utils', () => {
  describe('emptyMetadata', () => {
    it('应该创建空元数据对象', () => {
      const metadata = emptyMetadata();
      expect(metadata).toEqual({});
      expect(Object.keys(metadata).length).toBe(0);
    });

    it('多次调用应该返回不同的对象引用', () => {
      const metadata1 = emptyMetadata();
      const metadata2 = emptyMetadata();
      expect(metadata1).not.toBe(metadata2);
    });
  });

  describe('getMetadata', () => {
    it('应该获取存在的元数据值', () => {
      const metadata = { key1: 'value1', key2: 123 };
      expect(getMetadata(metadata, 'key1')).toBe('value1');
      expect(getMetadata(metadata, 'key2')).toBe(123);
    });

    it('应该返回undefined当键不存在时', () => {
      const metadata = { key1: 'value1' };
      expect(getMetadata(metadata, 'nonexistent')).toBeUndefined();
    });

    it('应该支持获取复杂对象值', () => {
      const complexValue = { nested: { array: [1, 2, 3] } };
      const metadata = { complex: complexValue };
      expect(getMetadata(metadata, 'complex')).toEqual(complexValue);
    });

    it('应该支持获取null值', () => {
      const metadata = { key: null };
      expect(getMetadata(metadata, 'key')).toBeNull();
    });

    it('应该支持获取undefined值', () => {
      const metadata = { key: undefined };
      expect(getMetadata(metadata, 'key')).toBeUndefined();
    });
  });

  describe('setMetadata', () => {
    it('应该设置元数据值并返回新对象', () => {
      const metadata = { key1: 'value1' };
      const newMetadata = setMetadata(metadata, 'key2', 'value2');
      
      expect(newMetadata).toEqual({ key1: 'value1', key2: 'value2' });
      expect(metadata).toEqual({ key1: 'value1' }); // 原对象不变
      expect(newMetadata).not.toBe(metadata);
    });

    it('应该覆盖已存在的键', () => {
      const metadata = { key1: 'value1' };
      const newMetadata = setMetadata(metadata, 'key1', 'newValue');
      
      expect(newMetadata).toEqual({ key1: 'newValue' });
      expect(metadata).toEqual({ key1: 'value1' });
    });

    it('应该支持设置复杂对象值', () => {
      const metadata = {};
      const complexValue = { nested: { array: [1, 2, 3] } };
      const newMetadata = setMetadata(metadata, 'complex', complexValue);
      
      expect(newMetadata['complex']).toEqual(complexValue);
    });

    it('应该支持设置null值', () => {
      const metadata = { key1: 'value1' };
      const newMetadata = setMetadata(metadata, 'key1', null);
      
      expect(newMetadata['key1']).toBeNull();
    });

    it('应该支持设置undefined值', () => {
      const metadata = { key1: 'value1' };
      const newMetadata = setMetadata(metadata, 'key1', undefined);
      
      expect(newMetadata['key1']).toBeUndefined();
    });

    it('应该支持链式调用', () => {
      const metadata = {};
      const result = setMetadata(
        setMetadata(
          setMetadata(metadata, 'key1', 'value1'),
          'key2', 'value2'
        ),
        'key3', 'value3'
      );
      
      expect(result).toEqual({ key1: 'value1', key2: 'value2', key3: 'value3' });
    });
  });

  describe('deleteMetadata', () => {
    it('应该删除元数据值并返回新对象', () => {
      const metadata = { key1: 'value1', key2: 'value2' };
      const newMetadata = deleteMetadata(metadata, 'key1');
      
      expect(newMetadata).toEqual({ key2: 'value2' });
      expect(metadata).toEqual({ key1: 'value1', key2: 'value2' }); // 原对象不变
      expect(newMetadata).not.toBe(metadata);
    });

    it('应该处理不存在的键', () => {
      const metadata = { key1: 'value1' };
      const newMetadata = deleteMetadata(metadata, 'nonexistent');
      
      expect(newMetadata).toEqual({ key1: 'value1' });
      expect(newMetadata).not.toBe(metadata);
    });

    it('应该删除最后一个键后返回空对象', () => {
      const metadata = { key1: 'value1' };
      const newMetadata = deleteMetadata(metadata, 'key1');
      
      expect(newMetadata).toEqual({});
    });

    it('应该支持删除多个键', () => {
      const metadata = { key1: 'value1', key2: 'value2', key3: 'value3' };
      const result = deleteMetadata(
        deleteMetadata(metadata, 'key1'),
        'key2'
      );
      
      expect(result).toEqual({ key3: 'value3' });
    });
  });

  describe('hasMetadata', () => {
    it('应该返回true当键存在时', () => {
      const metadata = { key1: 'value1', key2: 123 };
      expect(hasMetadata(metadata, 'key1')).toBe(true);
      expect(hasMetadata(metadata, 'key2')).toBe(true);
    });

    it('应该返回false当键不存在时', () => {
      const metadata = { key1: 'value1' };
      expect(hasMetadata(metadata, 'nonexistent')).toBe(false);
    });

    it('应该返回true当键存在但值为null时', () => {
      const metadata = { key: null };
      expect(hasMetadata(metadata, 'key')).toBe(true);
    });

    it('应该返回true当键存在但值为undefined时', () => {
      const metadata = { key: undefined };
      expect(hasMetadata(metadata, 'key')).toBe(true);
    });

    it('应该返回false当键为空字符串时', () => {
      const metadata = { key1: 'value1' };
      expect(hasMetadata(metadata, '')).toBe(false);
    });
  });

  describe('mergeMetadata', () => {
    it('应该合并多个元数据对象', () => {
      const metadata1 = { key1: 'value1' };
      const metadata2 = { key2: 'value2' };
      const metadata3 = { key3: 'value3' };
      
      const result = mergeMetadata(metadata1, metadata2, metadata3);
      expect(result).toEqual({ key1: 'value1', key2: 'value2', key3: 'value3' });
    });

    it('应该合并空对象', () => {
      const metadata1 = { key1: 'value1' };
      const metadata2 = {};
      
      const result = mergeMetadata(metadata1, metadata2);
      expect(result).toEqual({ key1: 'value1' });
    });

    it('应该处理所有空对象', () => {
      const result = mergeMetadata({}, {}, {});
      expect(result).toEqual({});
    });

    it('应该处理单个对象', () => {
      const metadata = { key1: 'value1', key2: 'value2' };
      const result = mergeMetadata(metadata);
      expect(result).toEqual(metadata);
    });

    it('应该处理无参数情况', () => {
      const result = mergeMetadata();
      expect(result).toEqual({});
    });

    it('后面的对象应该覆盖前面的同名键', () => {
      const metadata1 = { key1: 'value1', key2: 'value2' };
      const metadata2 = { key2: 'newValue2', key3: 'value3' };
      
      const result = mergeMetadata(metadata1, metadata2);
      expect(result).toEqual({ key1: 'value1', key2: 'newValue2', key3: 'value3' });
    });

    it('应该返回新对象，不修改原对象', () => {
      const metadata1 = { key1: 'value1' };
      const metadata2 = { key2: 'value2' };
      
      const result = mergeMetadata(metadata1, metadata2);
      
      expect(metadata1).toEqual({ key1: 'value1' });
      expect(metadata2).toEqual({ key2: 'value2' });
      expect(result).not.toBe(metadata1);
      expect(result).not.toBe(metadata2);
    });

    it('应该支持合并复杂对象', () => {
      const metadata1 = { complex: { nested: 'value1' } };
      const metadata2 = { simple: 'value2' };
      
      const result = mergeMetadata(metadata1, metadata2);
      expect(result).toEqual({
        complex: { nested: 'value1' },
        simple: 'value2'
      });
    });
  });
});