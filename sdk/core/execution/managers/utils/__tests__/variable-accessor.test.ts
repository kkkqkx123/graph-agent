/**
 * VariableAccessor 测试
 * 测试统一的变量访问器功能
 */

import { VariableAccessor, VariableNamespace } from '../variable-accessor';
import type { ThreadContext } from '../../../context/thread-context';

// Mock ThreadContext
const createMockThreadContext = (
  input: Record<string, any> = {},
  output: Record<string, any> = {},
  variableScopes: any = {}
): Partial<ThreadContext> => {
  const defaultScopes = {
    global: {},
    thread: {},
    subgraph: [],
    loop: [],
    ...variableScopes
  };

  return {
    getInput: jest.fn(() => input),
    getOutput: jest.fn(() => output),
    getVariable: jest.fn((name: string) => {
      // 按优先级查找：loop > subgraph > thread > global
      if (defaultScopes.loop.length > 0 && defaultScopes.loop[defaultScopes.loop.length - 1][name] !== undefined) {
        return defaultScopes.loop[defaultScopes.loop.length - 1][name];
      }
      if (defaultScopes.subgraph.length > 0 && defaultScopes.subgraph[defaultScopes.subgraph.length - 1][name] !== undefined) {
        return defaultScopes.subgraph[defaultScopes.subgraph.length - 1][name];
      }
      if (defaultScopes.thread[name] !== undefined) {
        return defaultScopes.thread[name];
      }
      if (defaultScopes.global[name] !== undefined) {
        return defaultScopes.global[name];
      }
      return undefined;
    }),
    thread: {
      variableScopes: defaultScopes
    } as any
  };
};

describe('VariableAccessor', () => {
  describe('get - 简单变量', () => {
    it('应该从全局作用域获取变量', () => {
      const threadContext = createMockThreadContext(
        {},
        {},
        {
          global: { userName: 'alice' },
          thread: {},
          subgraph: [],
          loop: []
        }
      );
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      const result = accessor.get('userName');
      expect(result).toBe('alice');
    });

    it('应该从线程作用域获取变量', () => {
      const threadContext = createMockThreadContext(
        {},
        {},
        {
          global: {},
          thread: { status: 'active' },
          subgraph: [],
          loop: []
        }
      );
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      const result = accessor.get('status');
      expect(result).toBe('active');
    });

    it('应该优先从子图作用域获取变量', () => {
      const threadContext = createMockThreadContext(
        {},
        {},
        {
          global: { count: 1 },
          thread: { count: 2 },
          subgraph: [{ count: 3 }],
          loop: []
        }
      );
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      const result = accessor.get('count');
      expect(result).toBe(3);
    });

    it('应该优先从循环作用域获取变量', () => {
      const threadContext = createMockThreadContext(
        {},
        {},
        {
          global: { item: 'global' },
          thread: { item: 'thread' },
          subgraph: [{ item: 'subgraph' }],
          loop: [{ item: 'loop' }]
        }
      );
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      const result = accessor.get('item');
      expect(result).toBe('loop');
    });

    it('应该对空路径返回 undefined', () => {
      const threadContext = createMockThreadContext();
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      const result = accessor.get('');
      expect(result).toBeUndefined();
    });

    it('应该对不存在的变量返回 undefined', () => {
      const threadContext = createMockThreadContext();
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      const result = accessor.get('nonExistent');
      expect(result).toBeUndefined();
    });
  });

  describe('get - 输入数据命名空间', () => {
    it('应该获取整个输入数据', () => {
      const input = { name: 'alice', age: 30 };
      const threadContext = createMockThreadContext(input);
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      const result = accessor.get('input');
      expect(result).toEqual(input);
    });

    it('应该获取输入数据的顶级属性', () => {
      const input = { name: 'alice', age: 30 };
      const threadContext = createMockThreadContext(input);
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      const result = accessor.get('input.name');
      expect(result).toBe('alice');
    });

    it('应该获取输入数据的嵌套属性', () => {
      const input = { user: { profile: { name: 'alice' } } };
      const threadContext = createMockThreadContext(input);
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      const result = accessor.get('input.user.profile.name');
      expect(result).toBe('alice');
    });

    it('应该获取输入数据的数组元素', () => {
      const input = { items: [{ name: 'item1' }, { name: 'item2' }] };
      const threadContext = createMockThreadContext(input);
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      const result = accessor.get('input.items[0].name');
      expect(result).toBe('item1');
    });

    it('应该对不存在的输入属性返回 undefined', () => {
      const input = { name: 'alice' };
      const threadContext = createMockThreadContext(input);
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      const result = accessor.get('input.nonExistent');
      expect(result).toBeUndefined();
    });
  });

  describe('get - 输出数据命名空间', () => {
    it('应该获取整个输出数据', () => {
      const output = { result: 'success', code: 200 };
      const threadContext = createMockThreadContext({}, output);
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      const result = accessor.get('output');
      expect(result).toEqual(output);
    });

    it('应该获取输出数据的顶级属性', () => {
      const output = { result: 'success', code: 200 };
      const threadContext = createMockThreadContext({}, output);
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      const result = accessor.get('output.result');
      expect(result).toBe('success');
    });

    it('应该获取输出数据的嵌套属性', () => {
      const output = { data: { response: { status: 'ok' } } };
      const threadContext = createMockThreadContext({}, output);
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      const result = accessor.get('output.data.response.status');
      expect(result).toBe('ok');
    });

    it('应该对不存在的输出属性返回 undefined', () => {
      const output = { result: 'success' };
      const threadContext = createMockThreadContext({}, output);
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      const result = accessor.get('output.nonExistent');
      expect(result).toBeUndefined();
    });
  });

  describe('get - 全局作用域命名空间', () => {
    it('应该获取全局作用域的属性', () => {
      const threadContext = createMockThreadContext(
        {},
        {},
        { global: { config: { debug: true } }, thread: {}, subgraph: [], loop: [] }
      );
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      const result = accessor.get('global.config');
      expect(result).toEqual({ debug: true });
    });

    it('应该获取全局作用域的嵌套属性', () => {
      const threadContext = createMockThreadContext(
        {},
        {},
        { global: { config: { debug: true } }, thread: {}, subgraph: [], loop: [] }
      );
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      const result = accessor.get('global.config.debug');
      expect(result).toBe(true);
    });

    it('应该对不存在的全局属性返回 undefined', () => {
      const threadContext = createMockThreadContext(
        {},
        {},
        { global: {}, thread: {}, subgraph: [], loop: [] }
      );
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      const result = accessor.get('global.nonExistent');
      expect(result).toBeUndefined();
    });
  });

  describe('get - 线程作用域命名空间', () => {
    it('应该获取线程作用域的属性', () => {
      const threadContext = createMockThreadContext(
        {},
        {},
        { global: {}, thread: { state: 'running' }, subgraph: [], loop: [] }
      );
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      const result = accessor.get('thread.state');
      expect(result).toBe('running');
    });

    it('应该获取线程作用域的多个属性', () => {
      const threadContext = createMockThreadContext(
        {},
        {},
        { global: {}, thread: { state: 'running', count: 5 }, subgraph: [], loop: [] }
      );
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      expect(accessor.get('thread.state')).toBe('running');
      expect(accessor.get('thread.count')).toBe(5);
    });

    it('应该对不存在的线程属性返回 undefined', () => {
      const threadContext = createMockThreadContext(
        {},
        {},
        { global: {}, thread: {}, subgraph: [], loop: [] }
      );
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      const result = accessor.get('thread.nonExistent');
      expect(result).toBeUndefined();
    });
  });

  describe('get - 子图作用域命名空间', () => {
    it('应该获取最后一个子图作用域的属性', () => {
      const threadContext = createMockThreadContext(
        {},
        {},
        {
          global: {},
          thread: {},
          subgraph: [{ var1: 'value1' }, { var2: 'value2' }],
          loop: []
        }
      );
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      const result = accessor.get('subgraph.var2');
      expect(result).toBe('value2');
    });

    it('应该获取子图作用域的属性', () => {
      const threadContext = createMockThreadContext(
        {},
        {},
        {
          global: {},
          thread: {},
          subgraph: [{ temp: 'value' }],
          loop: []
        }
      );
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      const result = accessor.get('subgraph.temp');
      expect(result).toBe('value');
    });

    it('应该在子图作用域为空时返回 undefined', () => {
      const threadContext = createMockThreadContext(
        {},
        {},
        { global: {}, thread: {}, subgraph: [], loop: [] }
      );
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      const result = accessor.get('subgraph.temp');
      expect(result).toBeUndefined();
    });

    it('应该对不存在的子图属性返回 undefined', () => {
      const threadContext = createMockThreadContext(
        {},
        {},
        {
          global: {},
          thread: {},
          subgraph: [{ temp: 'value' }],
          loop: []
        }
      );
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      const result = accessor.get('subgraph.nonExistent');
      expect(result).toBeUndefined();
    });
  });

  describe('get - 循环作用域命名空间', () => {
    it('应该获取最后一个循环作用域的属性', () => {
      const threadContext = createMockThreadContext(
        {},
        {},
        {
          global: {},
          thread: {},
          subgraph: [],
          loop: [{ item: 'item1' }, { item: 'item2' }]
        }
      );
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      const result = accessor.get('loop.item');
      expect(result).toBe('item2');
    });

    it('应该获取循环作用域的多个属性', () => {
      const threadContext = createMockThreadContext(
        {},
        {},
        {
          global: {},
          thread: {},
          subgraph: [],
          loop: [{ item: 'current', index: 0 }]
        }
      );
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      expect(accessor.get('loop.item')).toBe('current');
      expect(accessor.get('loop.index')).toBe(0);
    });

    it('应该在循环作用域为空时返回 undefined', () => {
      const threadContext = createMockThreadContext(
        {},
        {},
        { global: {}, thread: {}, subgraph: [], loop: [] }
      );
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      const result = accessor.get('loop.item');
      expect(result).toBeUndefined();
    });

    it('应该对不存在的循环属性返回 undefined', () => {
      const threadContext = createMockThreadContext(
        {},
        {},
        {
          global: {},
          thread: {},
          subgraph: [],
          loop: [{ item: 'value' }]
        }
      );
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      const result = accessor.get('loop.nonExistent');
      expect(result).toBeUndefined();
    });
  });

  describe('get - 嵌套路径', () => {
    it('应该解析复杂的嵌套路径', () => {
      const threadContext = createMockThreadContext(
        {},
        {},
        {
          global: {
            user: {
              profile: {
                address: {
                  city: 'Beijing'
                }
              }
            }
          },
          thread: {},
          subgraph: [],
          loop: []
        }
      );
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      const result = accessor.get('user.profile.address.city');
      expect(result).toBe('Beijing');
    });

    it('应该从输入中解析带有数组索引的路径', () => {
      const threadContext = createMockThreadContext({
        items: [
          { id: 1, name: 'item1' },
          { id: 2, name: 'item2' }
        ]
      });
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      const result = accessor.get('input.items[1].name');
      expect(result).toBe('item2');
    });

    it('应该在路径不完整时返回 undefined', () => {
      const threadContext = createMockThreadContext(
        {},
        {},
        {
          global: { user: { profile: null } },
          thread: {},
          subgraph: [],
          loop: []
        }
      );
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      const result = accessor.get('user.profile.address.city');
      expect(result).toBeUndefined();
    });
  });

  describe('has', () => {
    it('应该返回 true 对于存在的变量', () => {
      const threadContext = createMockThreadContext(
        {},
        {},
        { global: { name: 'alice' }, thread: {}, subgraph: [], loop: [] }
      );
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      expect(accessor.has('name')).toBe(true);
    });

    it('应该返回 true 对于存在的嵌套路径', () => {
      const threadContext = createMockThreadContext(
        {},
        {},
        { global: { user: { name: 'alice' } }, thread: {}, subgraph: [], loop: [] }
      );
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      expect(accessor.has('user.name')).toBe(true);
    });

    it('应该返回 false 对于不存在的变量', () => {
      const threadContext = createMockThreadContext(
        {},
        {},
        { global: {}, thread: {}, subgraph: [], loop: [] }
      );
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      expect(accessor.has('nonExistent')).toBe(false);
    });

    it('应该返回 false 对于空路径', () => {
      const threadContext = createMockThreadContext();
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      expect(accessor.has('')).toBe(false);
    });

    it('应该检查输入数据的存在性', () => {
      const threadContext = createMockThreadContext({ name: 'alice' });
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      expect(accessor.has('input.name')).toBe(true);
      expect(accessor.has('input.nonExistent')).toBe(false);
    });

    it('应该检查输出数据的存在性', () => {
      const threadContext = createMockThreadContext({}, { result: 'success' });
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      expect(accessor.has('output.result')).toBe(true);
      expect(accessor.has('output.nonExistent')).toBe(false);
    });
  });

  describe('VariableNamespace 枚举', () => {
    it('应该包含所有命名空间', () => {
      expect(VariableNamespace.INPUT).toBe('input');
      expect(VariableNamespace.OUTPUT).toBe('output');
      expect(VariableNamespace.GLOBAL).toBe('global');
      expect(VariableNamespace.THREAD).toBe('thread');
      expect(VariableNamespace.SUBGRAPH).toBe('subgraph');
      expect(VariableNamespace.LOOP).toBe('loop');
    });
  });

  describe('作用域优先级', () => {
    it('应该按优先级查找：loop > subgraph > thread > global', () => {
      const threadContext = createMockThreadContext(
        {},
        {},
        {
          global: { config: 'global_config' },
          thread: { config: 'thread_config' },
          subgraph: [{ config: 'subgraph_config' }],
          loop: [{ config: 'loop_config' }]
        }
      );
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      expect(accessor.get('config')).toBe('loop_config');
    });

    it('应该在更高优先级作用域未定义时查找更低优先级', () => {
      const threadContext = createMockThreadContext(
        {},
        {},
        {
          global: { var1: 'global_var1', var2: 'global_var2' },
          thread: { var1: 'thread_var1' },
          subgraph: [],
          loop: []
        }
      );
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      expect(accessor.get('var1')).toBe('thread_var1');
      expect(accessor.get('var2')).toBe('global_var2');
    });

    it('应该支持多层嵌套的作用域', () => {
      const threadContext = createMockThreadContext(
        {},
        {},
        {
          global: {},
          thread: {},
          subgraph: [{ layer1: {} }, { layer1: { layer2: { value: 'nested' } } }],
          loop: []
        }
      );
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      expect(accessor.get('layer1.layer2.value')).toBe('nested');
    });
  });

  describe('边界情况', () => {
    it('应该处理空对象', () => {
      const threadContext = createMockThreadContext(
        {},
        {}
      );
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      expect(accessor.get('any')).toBeUndefined();
      expect(accessor.has('any')).toBe(false);
    });

    it('应该处理 null 和 undefined 值', () => {
      const threadContext = createMockThreadContext(
        {},
        {},
        {
          global: { nullVar: null, undefinedVar: undefined },
          thread: {},
          subgraph: [],
          loop: []
        }
      );
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      expect(accessor.get('nullVar')).toBeNull();
      expect(accessor.get('undefinedVar')).toBeUndefined();
      expect(accessor.has('nullVar')).toBe(true);
      expect(accessor.has('undefinedVar')).toBe(false);
    });

    it('应该处理 0, false, 空字符串等假值', () => {
      const threadContext = createMockThreadContext(
        {},
        {},
        {
          global: { zero: 0, falsy: false, empty: '' },
          thread: {},
          subgraph: [],
          loop: []
        }
      );
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      expect(accessor.get('zero')).toBe(0);
      expect(accessor.get('falsy')).toBe(false);
      expect(accessor.get('empty')).toBe('');
      expect(accessor.has('zero')).toBe(true);
      expect(accessor.has('falsy')).toBe(true);
      expect(accessor.has('empty')).toBe(true);
    });

    it('应该处理带下划线的属性名', () => {
      const threadContext = createMockThreadContext(
        {},
        {},
        {
          global: { user_name: 'alice', obj_with_underscore: { nested_key: 'value' } },
          thread: {},
          subgraph: [],
          loop: []
        }
      );
      const accessor = new VariableAccessor(threadContext as ThreadContext);

      expect(accessor.get('user_name')).toBe('alice');
      expect(accessor.get('obj_with_underscore.nested_key')).toBe('value');
    });
  });
});
