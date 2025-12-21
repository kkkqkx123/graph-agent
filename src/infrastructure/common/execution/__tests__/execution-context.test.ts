/**
 * 执行上下文单元测试
 */

import { BaseExecutionContext } from '../execution-context';

describe('BaseExecutionContext', () => {
  let context: BaseExecutionContext;

  beforeEach(() => {
    context = new BaseExecutionContext('test-id', 'test-type');
  });

  describe('构造函数', () => {
    test('应该创建空的执行上下文', () => {
      expect(context).toBeDefined();
      expect(context.getVariable('test')).toBeUndefined();
    });

    test('应该支持初始参数和配置', () => {
      const parameters = { param1: 'value1', param2: 123 };
      const configuration = { config1: 'config-value' };
      const contextWithData = new BaseExecutionContext('test-id', 'test-type', parameters, configuration);
      
      expect(contextWithData.getParameter('param1')).toBe('value1');
      expect(contextWithData.getParameter('param2')).toBe(123);
      expect(contextWithData.getConfig('config1')).toBe('config-value');
    });
  });

  describe('setVariable 方法', () => {
    test('应该设置变量值', () => {
      context.setVariable('testKey', 'testValue');
      expect(context.getVariable('testKey')).toBe('testValue');
    });

    test('应该覆盖现有值', () => {
      context.setVariable('key', 'value1');
      context.setVariable('key', 'value2');
      expect(context.getVariable('key')).toBe('value2');
    });

    test('应该支持各种数据类型', () => {
      const testData = {
        string: 'test',
        number: 123,
        boolean: true,
        object: { nested: 'value' },
        array: [1, 2, 3],
        null: null,
        undefined: undefined
      };

      Object.entries(testData).forEach(([key, value]) => {
        context.setVariable(key, value);
        expect(context.getVariable(key)).toBe(value);
      });
    });
  });

  describe('getVariable 方法', () => {
    test('应该返回设置的变量值', () => {
      context.setVariable('key', 'value');
      expect(context.getVariable('key')).toBe('value');
    });

    test('应该返回 undefined 对于不存在的变量', () => {
      expect(context.getVariable('nonexistent')).toBeUndefined();
    });
  });

  describe('hasVariable 方法', () => {
    test('应该返回 true 对于存在的变量', () => {
      context.setVariable('key', 'value');
      expect(context.hasVariable('key')).toBe(true);
    });

    test('应该返回 false 对于不存在的变量', () => {
      expect(context.hasVariable('nonexistent')).toBe(false);
    });

    test('应该正确处理 null 和 undefined 值', () => {
      context.setVariable('nullKey', null);
      context.setVariable('undefinedKey', undefined);
      
      expect(context.hasVariable('nullKey')).toBe(true);
      expect(context.hasVariable('undefinedKey')).toBe(true);
    });
  });

  describe('deleteVariable 方法', () => {
    test('应该删除存在的变量', () => {
      context.setVariable('key', 'value');
      expect(context.hasVariable('key')).toBe(true);
      
      context.deleteVariable('key');
      expect(context.hasVariable('key')).toBe(false);
      expect(context.getVariable('key')).toBeUndefined();
    });

    test('应该忽略不存在的变量', () => {
      expect(context.deleteVariable('nonexistent')).toBe(false);
    });
  });

  describe('clearVariables 方法', () => {
    test('应该清除所有变量', () => {
      context.setVariable('key1', 'value1');
      context.setVariable('key2', 'value2');
      
      expect(context.hasVariable('key1')).toBe(true);
      expect(context.hasVariable('key2')).toBe(true);
      
      context.clearVariables();
      
      expect(context.hasVariable('key1')).toBe(false);
      expect(context.hasVariable('key2')).toBe(false);
    });

    test('应该清空后可以重新设置', () => {
      context.setVariable('key', 'value');
      context.clearVariables();
      
      context.setVariable('newKey', 'newValue');
      expect(context.getVariable('newKey')).toBe('newValue');
    });
  });

  describe('getVariables 方法', () => {
    test('应该返回所有变量', () => {
      context.setVariable('key1', 'value1');
      context.setVariable('key2', 'value2');
      
      const variables = context.getVariables();
      expect(variables['key1']).toBe('value1');
      expect(variables['key2']).toBe('value2');
      expect(Object.keys(variables)).toHaveLength(2);
    });

    test('应该返回空对象对于空上下文', () => {
      expect(context.getVariables()).toEqual({});
    });
  });

  describe('getParameter 方法', () => {
    test('应该返回参数值', () => {
      const parameters = { param1: 'value1', param2: 123 };
      const contextWithParams = new BaseExecutionContext('test-id', 'test-type', parameters);
      
      expect(contextWithParams.getParameter('param1')).toBe('value1');
      expect(contextWithParams.getParameter('param2')).toBe(123);
    });

    test('应该返回 undefined 对于不存在的参数', () => {
      expect(context.getParameter('nonexistent')).toBeUndefined();
    });
  });

  describe('getConfig 方法', () => {
    test('应该返回配置值', () => {
      const configuration = { config1: 'config-value' };
      const contextWithConfig = new BaseExecutionContext('test-id', 'test-type', {}, configuration);
      
      expect(contextWithConfig.getConfig('config1')).toBe('config-value');
    });

    test('应该返回 undefined 对于不存在的配置', () => {
      expect(context.getConfig('nonexistent')).toBeUndefined();
    });
  });

  describe('getDuration 方法', () => {
    test('应该返回执行时长', () => {
      const startTime = new Date();
      const contextWithStartTime = new BaseExecutionContext('test-id', 'test-type', {}, {}, startTime);
      
      // 等待一小段时间
      setTimeout(() => {
        const duration = contextWithStartTime.getDuration();
        expect(duration).toBeGreaterThan(0);
        expect(duration).toBeLessThan(100); // 应该在100ms内
      }, 10);
    });
  });

  describe('createChildContext 方法', () => {
    test('应该创建子上下文', () => {
      context.setVariable('parentVar', 'parentValue');
      const childContext = context.createChildContext('child-id', 'child-type');
      
      expect(childContext.executionId).toBe('child-id');
      expect(childContext.executionType).toBe('child-type');
      expect(childContext.getVariable('parentVar')).toBe('parentValue');
    });

    test('应该支持自定义参数', () => {
      const childParams = { childParam: 'child-value' };
      const childContext = context.createChildContext('child-id', 'child-type', childParams);
      
      expect(childContext.getParameter('childParam')).toBe('child-value');
    });
  });

  describe('clone 方法', () => {
    test('应该创建深拷贝', () => {
      context.setVariable('key1', 'value1');
      context.setVariable('key2', { nested: 'value' });
      
      const clonedContext = context.clone();
      
      // 修改原始上下文不应该影响克隆
      context.setVariable('key1', 'modified');
      expect(clonedContext.getVariable('key1')).toBe('value1');
      
      // 修改嵌套对象
      const originalObject = context.getVariable('key2') as any;
      originalObject.nested = 'modified';
      expect((clonedContext.getVariable('key2') as any).nested).toBe('value');
    });

    test('克隆应该包含所有数据', () => {
      context.setVariable('key1', 'value1');
      context.setVariable('key2', 'value2');
      
      const clonedContext = context.clone();
      expect(clonedContext.getVariable('key1')).toBe('value1');
      expect(clonedContext.getVariable('key2')).toBe('value2');
    });
  });

  describe('toJSON 方法', () => {
    test('应该转换为JSON格式', () => {
      context.setVariable('testVar', 'testValue');
      const json = context.toJSON();
      
      expect(json['executionId']).toBe('test-id');
      expect(json['executionType']).toBe('test-type');
      expect(json['variables']).toEqual({ testVar: 'testValue' });
      expect(json['duration']).toBeDefined();
    });
  });

  describe('fromJSON 方法', () => {
    test('应该从JSON创建上下文', () => {
      const jsonData = {
        executionId: 'json-id',
        executionType: 'json-type',
        parameters: { param1: 'value1' },
        configuration: { config1: 'config-value' },
        startedAt: new Date().toISOString(),
        variables: { var1: 'var-value' }
      };
      
      const contextFromJson = BaseExecutionContext.fromJSON(jsonData);
      
      expect(contextFromJson.executionId).toBe('json-id');
      expect(contextFromJson.executionType).toBe('json-type');
      expect(contextFromJson.getParameter('param1')).toBe('value1');
      expect(contextFromJson.getConfig('config1')).toBe('config-value');
      expect(contextFromJson.getVariable('var1')).toBe('var-value');
    });
  });

  describe('性能测试', () => {
    test('应该高效处理大量变量', () => {
      const startTime = performance.now();
      
      // 设置1000个变量
      for (let i = 0; i < 1000; i++) {
        context.setVariable(`key${i}`, `value${i}`);
      }
      
      // 读取所有变量
      for (let i = 0; i < 1000; i++) {
        expect(context.getVariable(`key${i}`)).toBe(`value${i}`);
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
    });
  });
});