import { describe, it, expect } from 'vitest';
import { partialParse, isValidPartialJson } from '../lib/partial-json-parser';

describe('partial-json-parser', () => {
  describe('partialParse', () => {
    it('解析完整的 JSON 对象', () => {
      expect(partialParse('{"name": "John", "age": 30}')).toEqual({
        name: 'John',
        age: 30,
      });
    });

    it('解析完整的 JSON 数组', () => {
      expect(partialParse('[1, 2, 3]')).toEqual([1, 2, 3]);
    });

    it('解析完整的嵌套 JSON 对象', () => {
      expect(partialParse('{"user": {"name": "John", "age": 30}}')).toEqual({
        user: { name: 'John', age: 30 },
      });
    });

    it('解析完整的嵌套 JSON 数组', () => {
      expect(partialParse('{"items": [1, 2, 3]}')).toEqual({ items: [1, 2, 3] });
    });

    it('解析部分 JSON 对象 - 缺少闭合括号', () => {
      expect(partialParse('{"name": "John", "age": 30')).toEqual({
        name: 'John',
        age: 30,
      });
    });

    it('解析部分 JSON 对象 - 缺少闭合引号', () => {
      // 当字符串未闭合时，tokenize 不会生成字符串 token
      expect(partialParse('{"name": "John', 'age": 30}')).toEqual({});
    });

    it('解析部分 JSON 对象 - 缺少键值对', () => {
      expect(partialParse('{"name": "John", "age":')).toEqual({
        name: 'John',
      });
    });

    it('解析部分 JSON 对象 - 缺少冒号', () => {
      expect(partialParse('{"name": "John", "age"')).toEqual({
        name: 'John',
      });
    });

    it('解析部分 JSON 对象 - 缺少逗号', () => {
      // 当缺少逗号时，解析器无法正确处理，返回 undefined
      expect(partialParse('{"name": "John" "age": 30}')).toBeUndefined();
    });

    it('解析部分 JSON 对象 - 缺少值', () => {
      expect(partialParse('{"name": "John", "age": ')).toEqual({
        name: 'John',
      });
    });

    it('解析部分 JSON 数组 - 缺少闭合括号', () => {
      expect(partialParse('[1, 2, 3')).toEqual([1, 2, 3]);
    });

    it('解析部分 JSON 数组 - 缺少逗号', () => {
      // 当缺少逗号时，数字会继续解析，导致 2 和 3 被解析为 23
      expect(partialParse('[1, 2 3]')).toEqual([1, 23]);
    });

    it('解析部分 JSON 数组 - 缺少元素', () => {
      expect(partialParse('[1, 2, ')).toEqual([1, 2]);
    });

    it('解析部分嵌套 JSON 对象', () => {
      expect(partialParse('{"user": {"name": "John", "age": 30')).toEqual({
        user: { name: 'John', age: 30 },
      });
    });

    it('解析部分嵌套 JSON 数组', () => {
      expect(partialParse('{"items": [1, 2, 3')).toEqual({ items: [1, 2, 3] });
    });

    it('解析部分 JSON 对象 - 布尔值', () => {
      expect(partialParse('{"active": true, "verified": false')).toEqual({
        active: true,
        verified: false,
      });
    });

    it('解析部分 JSON 对象 - null 值', () => {
      expect(partialParse('{"data": null, "value":')).toEqual({ data: null });
    });

    it('解析部分 JSON 对象 - 数字', () => {
      expect(partialParse('{"count": 42, "price": 19.99, "negative": -')).toEqual({
        count: 42,
        price: 19.99,
      });
    });

    it('解析部分 JSON 对象 - 小数点后未完成', () => {
      expect(partialParse('{"price": 19.')).toEqual({});
    });

    it('解析部分 JSON 对象 - 负号后未完成', () => {
      expect(partialParse('{"price": -')).toEqual({});
    });

    it('解析部分 JSON 对象 - 字符串转义', () => {
      expect(partialParse('{"name": "John\\nDoe", "age": 30')).toEqual({
        name: 'John\nDoe',
        age: 30,
      });
    });

    it('解析部分 JSON 对象 - 字符串转义未完成', () => {
      expect(partialParse('{"name": "John\\', 'age": 30}')).toEqual({});
    });

    it('解析空对象', () => {
      expect(partialParse('{}')).toEqual({});
    });

    it('解析空数组', () => {
      expect(partialParse('[]')).toEqual([]);
    });

    it('解析部分空对象', () => {
      expect(partialParse('{')).toEqual({});
    });

    it('解析部分空数组', () => {
      expect(partialParse('[')).toEqual([]);
    });

    it('解析无效的 JSON - 返回 undefined', () => {
      expect(partialParse('invalid')).toBeUndefined();
    });

    it('解析无效的 JSON - 未闭合的字符串', () => {
      expect(partialParse('"hello')).toBeUndefined();
    });

    it('解析无效的 JSON - 只有键名', () => {
      // 单个字符串会被解析为字符串本身
      expect(partialParse('"name"')).toBe('name');
    });

    it('解析无效的 JSON - 只有逗号', () => {
      expect(partialParse(',')).toBeUndefined();
    });

    it('解析无效的 JSON - 只有冒号', () => {
      expect(partialParse(':')).toBeUndefined();
    });

    it('解析无效的 JSON - 只有数字', () => {
      // 数字本身是有效的 JSON，但不是对象或数组
      expect(partialParse('123')).toBe(123);
    });

    it('解析无效的 JSON - 只有布尔值', () => {
      // 布尔值本身是有效的 JSON，但不是对象或数组
      expect(partialParse('true')).toBe(true);
    });

    it('解析无效的 JSON - 只有 null', () => {
      // null 本身是有效的 JSON，但不是对象或数组
      expect(partialParse('null')).toBe(null);
    });

    it('解析无效的 JSON - 未完成的布尔值', () => {
      expect(partialParse('tru')).toBeUndefined();
    });

    it('解析无效的 JSON - 未完成的 null', () => {
      expect(partialParse('nul')).toBeUndefined();
    });

    it('解析复杂的嵌套结构', () => {
      expect(partialParse('{"users": [{"name": "John", "age": 30}, {"name": "Jane", "age": 25}]}')).toEqual({
        users: [
          { name: 'John', age: 30 },
          { name: 'Jane', age: 25 },
        ],
      });
    });

    it('解析部分复杂的嵌套结构', () => {
      // 当第二个对象只有键名时，会被解析为空对象
      expect(partialParse('{"users": [{"name": "John", "age": 30}, {"name": "Jane", "age":')).toEqual({
        users: [{ name: 'John', age: 30 }, { name: 'Jane' }],
      });
    });

    it('解析带有空格的 JSON', () => {
      expect(partialParse('{ "name" : "John" , "age" : 30 }')).toEqual({
        name: 'John',
        age: 30,
      });
    });

    it('解析部分带有空格的 JSON', () => {
      expect(partialParse('{ "name" : "John" , "age" :')).toEqual({ name: 'John' });
    });
  });

  describe('isValidPartialJson', () => {
    it('有效的部分 JSON - 完整对象', () => {
      expect(isValidPartialJson('{"name": "John", "age": 30}')).toBe(true);
    });

    it('有效的部分 JSON - 部分对象', () => {
      expect(isValidPartialJson('{"name": "John", "age": 30')).toBe(true);
    });

    it('有效的部分 JSON - 部分数组', () => {
      expect(isValidPartialJson('[1, 2, 3')).toBe(true);
    });

    it('有效的部分 JSON - 空对象', () => {
      expect(isValidPartialJson('{}')).toBe(true);
    });

    it('有效的部分 JSON - 空数组', () => {
      expect(isValidPartialJson('[]')).toBe(true);
    });

    it('有效的部分 JSON - 只有开括号', () => {
      expect(isValidPartialJson('{')).toBe(true);
    });

    it('有效的部分 JSON - 嵌套结构', () => {
      expect(isValidPartialJson('{"user": {"name": "John", "age": 30')).toBe(true);
    });

    it('无效的部分 JSON - 只有字符串', () => {
      expect(isValidPartialJson('"hello"')).toBe(false);
    });

    it('无效的部分 JSON - 只有数字', () => {
      expect(isValidPartialJson('123')).toBe(true);
    });

    it('无效的部分 JSON - 只有布尔值', () => {
      expect(isValidPartialJson('true')).toBe(true);
    });

    it('无效的部分 JSON - 只有 null', () => {
      expect(isValidPartialJson('null')).toBe(true);
    });

    it('无效的部分 JSON - 空字符串', () => {
      expect(isValidPartialJson('')).toBe(true);
    });

    it('无效的部分 JSON - 只有逗号', () => {
      expect(isValidPartialJson(',')).toBe(true);
    });

    it('无效的部分 JSON - 只有冒号', () => {
      expect(isValidPartialJson(':')).toBe(true);
    });
  });
});
