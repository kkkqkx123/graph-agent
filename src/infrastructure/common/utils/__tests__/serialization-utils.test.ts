/**
 * 序列化工具单元测试
 */

import { SerializationUtils, SerializationConfig, SerializationResult } from '../serialization-utils';

describe('SerializationUtils', () => {
  let utils: SerializationUtils;

  beforeEach(() => {
    utils = new SerializationUtils();
  });

  describe('serialize 方法', () => {
    test('应该序列化简单对象', () => {
      const obj = { name: 'test', value: 123 };
      const result = utils.serialize(obj);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(typeof result.data).toBe('string');
      expect(result.data).toContain('test');
      expect(result.data).toContain('123');
    });

    test('应该序列化复杂对象', () => {
      const obj = {
        string: 'test',
        number: 123,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        object: { nested: 'value' },
        date: new Date('2023-01-01')
      };
      
      const result = utils.serialize(obj);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    test('应该处理循环引用', () => {
      const obj: any = { name: 'test' };
      obj.self = obj;
      
      const result = utils.serialize(obj);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('应该支持自定义配置', () => {
      const obj = { name: 'test', value: 123 };
      const config: SerializationConfig = {
        indent: 2,
        maxDepth: 10,
        excludeKeys: ['value']
      };
      
      const result = utils.serialize(obj, config);
      expect(result.success).toBe(true);
      expect(result.data).not.toContain('value');
      expect(result.data).toContain('name');
    });

    test('应该处理大数字', () => {
      const obj = { bigNumber: Number.MAX_SAFE_INTEGER };
      const result = utils.serialize(obj);
      expect(result.success).toBe(true);
      expect(result.data).toContain(String(Number.MAX_SAFE_INTEGER));
    });

    test('应该处理特殊字符', () => {
      const obj = { 
        special: '特殊字符: \n\t\r\\"\'' 
      };
      const result = utils.serialize(obj);
      expect(result.success).toBe(true);
    });
  });

  describe('deserialize 方法', () => {
    test('应该反序列化简单JSON', () => {
      const json = '{"name":"test","value":123}';
      const result = utils.deserialize(json);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'test', value: 123 });
    });

    test('应该反序列化复杂JSON', () => {
      const json = '{"array":[1,2,3],"object":{"nested":"value"}}';
      const result = utils.deserialize(json);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        array: [1, 2, 3],
        object: { nested: 'value' }
      });
    });

    test('应该处理无效JSON', () => {
      const invalidJson = '{"name":"test"';
      const result = utils.deserialize(invalidJson);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('应该处理空字符串', () => {
      const result = utils.deserialize('');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('应该处理null和undefined', () => {
      const result1 = utils.deserialize('null');
      expect(result1.success).toBe(true);
      expect(result1.data).toBeNull();
      
      const result2 = utils.deserialize('undefined');
      expect(result2.success).toBe(false);
    });

    test('应该支持reviver函数', () => {
      const json = '{"date":"2023-01-01T00:00:00.000Z"}';
      const reviver = (key: string, value: any) => {
        if (key === 'date') {
          return new Date(value);
        }
        return value;
      };
      
      const result = utils.deserialize(json, { reviver });
      expect(result.success).toBe(true);
      expect(result.data.date).toBeInstanceOf(Date);
    });
  });

  describe('isSerializable 方法', () => {
    test('应该检查可序列化对象', () => {
      const obj = { name: 'test', value: 123 };
      const result = utils.isSerializable(obj);
      expect(result).toBe(true);
    });

    test('应该检查不可序列化对象', () => {
      const obj: any = { func: () => {} };
      const result = utils.isSerializable(obj);
      expect(result).toBe(false);
    });

    test('应该检查循环引用', () => {
      const obj: any = { name: 'test' };
      obj.self = obj;
      const result = utils.isSerializable(obj);
      expect(result).toBe(false);
    });

    test('应该检查包含函数的对象', () => {
      const obj = { 
        name: 'test',
        method: function() { return 'test'; }
      };
      const result = utils.isSerializable(obj);
      expect(result).toBe(false);
    });

    test('应该检查包含Symbol的对象', () => {
      const obj = { 
        name: 'test',
        symbol: Symbol('test')
      };
      const result = utils.isSerializable(obj);
      expect(result).toBe(false);
    });

    test('应该检查包含undefined的对象', () => {
      const obj = { 
        name: 'test',
        value: undefined
      };
      const result = utils.isSerializable(obj);
      expect(result).toBe(true); // undefined在JSON中会被忽略
    });
  });

  describe('clone 方法', () => {
    test('应该深度克隆对象', () => {
      const original = { 
        name: 'test',
        nested: { value: 123 }
      };
      
      const cloned = utils.clone(original);
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.nested).not.toBe(original.nested);
    });

    test('应该处理数组', () => {
      const original = [1, 2, { nested: 'value' }];
      const cloned = utils.clone(original);
      
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned[2]).not.toBe(original[2]);
    });

    test('应该处理日期对象', () => {
      const original = { date: new Date('2023-01-01') };
      const cloned = utils.clone(original);
      
      expect(cloned.date).toEqual(original.date);
      expect(cloned.date).not.toBe(original.date);
    });

    test('应该处理正则表达式', () => {
      const original = { regex: /test/gi };
      const cloned = utils.clone(original);
      
      expect(cloned.regex).toEqual(original.regex);
      expect(cloned.regex).not.toBe(original.regex);
    });

    test('应该处理不可序列化对象', () => {
      const original: any = { func: () => {} };
      const cloned = utils.clone(original);
      
      expect(cloned.func).toBeUndefined();
      expect(cloned).toEqual({});
    });
  });

  describe('validateSchema 方法', () => {
    test('应该验证符合模式的对象', () => {
      const obj = { name: 'test', age: 25 };
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        },
        required: ['name', 'age']
      };
      
      const result = utils.validateSchema(obj, schema);
      expect(result.success).toBe(true);
    });

    test('应该拒绝不符合模式的对象', () => {
      const obj = { name: 'test', age: '25' }; // age应该是数字
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        },
        required: ['name', 'age']
      };
      
      const result = utils.validateSchema(obj, schema);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('应该处理缺少必需字段', () => {
      const obj = { name: 'test' }; // 缺少age字段
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        },
        required: ['name', 'age']
      };
      
      const result = utils.validateSchema(obj, schema);
      expect(result.success).toBe(false);
    });

    test('应该处理无效模式', () => {
      const obj = { name: 'test' };
      const invalidSchema = {};
      
      const result = utils.validateSchema(obj, invalidSchema);
      expect(result.success).toBe(false);
    });
  });

  describe('性能测试', () => {
    test('应该高效序列化大对象', () => {
      const largeObj: any = {};
      for (let i = 0; i < 1000; i++) {
        largeObj[`key${i}`] = `value${i}`;
      }
      
      const startTime = performance.now();
      const result = utils.serialize(largeObj);
      const endTime = performance.now();
      
      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
    });

    test('应该高效反序列化大JSON', () => {
      const largeObj: any = {};
      for (let i = 0; i < 1000; i++) {
        largeObj[`key${i}`] = `value${i}`;
      }
      
      const json = JSON.stringify(largeObj);
      const startTime = performance.now();
      const result = utils.deserialize(json);
      const endTime = performance.now();
      
      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
    });
  });

  describe('错误处理', () => {
    test('应该正确处理序列化错误', () => {
      const obj: any = { func: () => {} };
      const result = utils.serialize(obj);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
    });

    test('应该正确处理反序列化错误', () => {
      const invalidJson = '{"name":"test"';
      const result = utils.deserialize(invalidJson);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
    });

    test('应该提供详细的错误信息', () => {
      const obj: any = { func: () => {} };
      const result = utils.serialize(obj);
      
      expect(result.error).toContain('序列化');
      expect(result.error).toContain('失败');
    });
  });
});