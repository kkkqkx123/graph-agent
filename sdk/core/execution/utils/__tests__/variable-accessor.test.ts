/**
 * VariableAccessor 单元测试
 * 测试统一变量访问器
 */

import { describe, it, expect, vi } from 'vitest';
import { VariableAccessor } from '../variable-accessor.js';
import type { ThreadContext } from '../context/thread-context.js';
import type { Thread } from '@modular-agent/types';

/**
 * 创建模拟 ThreadContext
 */
function createMockThreadContext(overrides?: {
  input?: Record<string, any>;
  output?: Record<string, any>;
  variableScopes?: Thread['variableScopes'];
  getVariable?: (name: string) => any;
}): ThreadContext {
  const mockInput = overrides?.input || {};
  const mockOutput = overrides?.output || {};
  const mockVariableScopes = overrides?.variableScopes || {
    global: {},
    thread: {},
    local: [],
    loop: []
  };

  const mockGetVariable = overrides?.getVariable || vi.fn();

  return {
    getThreadId: vi.fn().mockReturnValue('test-thread'),
    getWorkflowId: vi.fn().mockReturnValue('test-workflow'),
    getInput: vi.fn().mockReturnValue(mockInput),
    getOutput: vi.fn().mockReturnValue(mockOutput),
    getVariable: mockGetVariable,
    thread: {
      id: 'test-thread',
      workflowId: 'test-workflow',
      status: 'RUNNING',
      currentNodeId: 'test-node',
      input: mockInput,
      output: mockOutput,
      nodeResults: [],
      errors: [],
      startTime: Date.now(),
      graph: {} as any,
      variables: [],
      threadType: 'MAIN',
      variableScopes: mockVariableScopes
    }
  } as unknown as ThreadContext;
}

describe('VariableAccessor', () => {
  describe('constructor', () => {
    it('应该正确初始化 VariableAccessor', () => {
      const context = createMockThreadContext();
      const accessor = new VariableAccessor(context);

      expect(accessor).toBeDefined();
    });
  });

  describe('get - 命名空间访问', () => {
    describe('input 命名空间', () => {
      it('应该从输入数据中获取值', () => {
        const context = createMockThreadContext({
          input: { userName: 'Alice', age: 30 }
        });
        const accessor = new VariableAccessor(context);

        expect(accessor.get('input.userName')).toBe('Alice');
        expect(accessor.get('input.age')).toBe(30);
      });

      it('应该支持嵌套路径', () => {
        const context = createMockThreadContext({
          input: {
            user: {
              profile: {
                name: 'Alice',
                email: 'alice@example.com'
              }
            }
          }
        });
        const accessor = new VariableAccessor(context);

        expect(accessor.get('input.user.profile.name')).toBe('Alice');
        expect(accessor.get('input.user.profile.email')).toBe('alice@example.com');
      });

      it('应该支持数组索引', () => {
        const context = createMockThreadContext({
          input: {
            items: ['first', 'second', 'third']
          }
        });
        const accessor = new VariableAccessor(context);

        expect(accessor.get('input.items[0]')).toBe('first');
        expect(accessor.get('input.items[1]')).toBe('second');
      });

      it('当路径不存在时返回 undefined', () => {
        const context = createMockThreadContext({
          input: { userName: 'Alice' }
        });
        const accessor = new VariableAccessor(context);

        expect(accessor.get('input.nonExistent')).toBeUndefined();
      });

      it('当 input 为空对象时返回 undefined', () => {
        const context = createMockThreadContext({
          input: {}
        });
        const accessor = new VariableAccessor(context);

        expect(accessor.get('input.userName')).toBeUndefined();
      });
    });

    describe('output 命名空间', () => {
      it('应该从输出数据中获取值', () => {
        const context = createMockThreadContext({
          output: { result: 'success', count: 42 }
        });
        const accessor = new VariableAccessor(context);

        expect(accessor.get('output.result')).toBe('success');
        expect(accessor.get('output.count')).toBe(42);
      });

      it('应该支持嵌套路径', () => {
        const context = createMockThreadContext({
          output: {
            data: {
              items: [1, 2, 3]
            }
          }
        });
        const accessor = new VariableAccessor(context);

        expect(accessor.get('output.data.items')).toEqual([1, 2, 3]);
      });

      it('当路径不存在时返回 undefined', () => {
        const context = createMockThreadContext({
          output: {}
        });
        const accessor = new VariableAccessor(context);

        expect(accessor.get('output.result')).toBeUndefined();
      });
    });

    describe('global 命名空间', () => {
      it('应该从全局作用域获取值', () => {
        const context = createMockThreadContext({
          variableScopes: {
            global: { config: { apiKey: 'secret' } },
            thread: {},
            local: [],
            loop: []
          }
        });
        const accessor = new VariableAccessor(context);

        expect(accessor.get('global.config')).toEqual({ apiKey: 'secret' });
      });

      it('应该支持嵌套路径', () => {
        const context = createMockThreadContext({
          variableScopes: {
            global: {
              settings: {
                theme: {
                  color: 'blue'
                }
              }
            },
            thread: {},
            local: [],
            loop: []
          }
        });
        const accessor = new VariableAccessor(context);

        expect(accessor.get('global.settings.theme.color')).toBe('blue');
      });

      it('当全局变量不存在时返回 undefined', () => {
        const context = createMockThreadContext({
          variableScopes: {
            global: {},
            thread: {},
            local: [],
            loop: []
          }
        });
        const accessor = new VariableAccessor(context);

        expect(accessor.get('global.config')).toBeUndefined();
      });
    });

    describe('thread 命名空间', () => {
      it('应该从线程作用域获取值', () => {
        const context = createMockThreadContext({
          variableScopes: {
            global: {},
            thread: { state: 'running', count: 10 },
            local: [],
            loop: []
          }
        });
        const accessor = new VariableAccessor(context);

        expect(accessor.get('thread.state')).toBe('running');
        expect(accessor.get('thread.count')).toBe(10);
      });

      it('应该支持嵌套路径', () => {
        const context = createMockThreadContext({
          variableScopes: {
            global: {},
            thread: {
              data: {
                nested: 'value'
              }
            },
            local: [],
            loop: []
          }
        });
        const accessor = new VariableAccessor(context);

        expect(accessor.get('thread.data.nested')).toBe('value');
      });

      it('当线程变量不存在时返回 undefined', () => {
        const context = createMockThreadContext({
          variableScopes: {
            global: {},
            thread: {},
            local: [],
            loop: []
          }
        });
        const accessor = new VariableAccessor(context);

        expect(accessor.get('thread.state')).toBeUndefined();
      });
    });

    describe('local 命名空间', () => {
      it('应该从本地作用域获取值', () => {
        const context = createMockThreadContext({
          variableScopes: {
            global: {},
            thread: {},
            local: [{ localVar: 'value' }],
            loop: []
          }
        });
        const accessor = new VariableAccessor(context);

        expect(accessor.get('local.localVar')).toBe('value');
      });

      it('应该从最后一个本地作用域获取值', () => {
        const context = createMockThreadContext({
          variableScopes: {
            global: {},
            thread: {},
            local: [
              { localVar: 'first' },
              { localVar: 'second', extra: 'data' }
            ],
            loop: []
          }
        });
        const accessor = new VariableAccessor(context);

        expect(accessor.get('local.localVar')).toBe('second');
        expect(accessor.get('local.extra')).toBe('data');
      });

      it('当没有本地作用域时返回 undefined', () => {
        const context = createMockThreadContext({
          variableScopes: {
            global: {},
            thread: {},
            local: [],
            loop: []
          }
        });
        const accessor = new VariableAccessor(context);

        expect(accessor.get('local.localVar')).toBeUndefined();
      });
    });

    describe('loop 命名空间', () => {
      it('应该从循环作用域获取值', () => {
        const context = createMockThreadContext({
          variableScopes: {
            global: {},
            thread: {},
            local: [],
            loop: [{ item: 'loop-item', index: 0 }]
          }
        });
        const accessor = new VariableAccessor(context);

        expect(accessor.get('loop.item')).toBe('loop-item');
        expect(accessor.get('loop.index')).toBe(0);
      });

      it('应该从最后一个循环作用域获取值', () => {
        const context = createMockThreadContext({
          variableScopes: {
            global: {},
            thread: {},
            local: [],
            loop: [
              { item: 'first' },
              { item: 'second' }
            ]
          }
        });
        const accessor = new VariableAccessor(context);

        expect(accessor.get('loop.item')).toBe('second');
      });

      it('当没有循环作用域时返回 undefined', () => {
        const context = createMockThreadContext({
          variableScopes: {
            global: {},
            thread: {},
            local: [],
            loop: []
          }
        });
        const accessor = new VariableAccessor(context);

        expect(accessor.get('loop.item')).toBeUndefined();
      });
    });

    describe('无命名空间（作用域优先级查找）', () => {
      it('应该按作用域优先级查找变量', () => {
        const getVariableMock = vi.fn().mockReturnValue('thread-value');

        const context = createMockThreadContext({
          variableScopes: {
            global: { userName: 'global-value' },
            thread: { userName: 'thread-value' },
            local: [],
            loop: []
          },
          getVariable: getVariableMock
        });
        const accessor = new VariableAccessor(context);

        expect(accessor.get('userName')).toBe('thread-value');
      });

      it('当变量在所有作用域都不存在时返回 undefined', () => {
        const context = createMockThreadContext({
          variableScopes: {
            global: {},
            thread: {},
            local: [],
            loop: []
          },
          getVariable: vi.fn().mockReturnValue(undefined)
        });
        const accessor = new VariableAccessor(context);

        expect(accessor.get('nonExistent')).toBeUndefined();
      });

      it('应该支持嵌套路径', () => {
        const context = createMockThreadContext({
          variableScopes: {
            global: {},
            thread: {
              user: {
                profile: {
                  name: 'Alice'
                }
              }
            },
            local: [],
            loop: []
          },
          getVariable: vi.fn().mockImplementation((name: string) => {
            if (name === 'user') {
              return { profile: { name: 'Alice' } };
            }
            return undefined;
          })
        });
        const accessor = new VariableAccessor(context);

        expect(accessor.get('user.profile.name')).toBe('Alice');
      });
    });
  });

  describe('has', () => {
    it('当变量存在时返回 true', () => {
      const context = createMockThreadContext({
        input: { userName: 'Alice' }
      });
      const accessor = new VariableAccessor(context);

      expect(accessor.has('input.userName')).toBe(true);
    });

    it('当变量不存在时返回 false', () => {
      const context = createMockThreadContext({
        input: {}
      });
      const accessor = new VariableAccessor(context);

      expect(accessor.has('input.userName')).toBe(false);
    });

    it('当值为 undefined 时返回 false', () => {
      const context = createMockThreadContext({
        input: { userName: undefined }
      });
      const accessor = new VariableAccessor(context);

      expect(accessor.has('input.userName')).toBe(false);
    });

    it('当值为 null 时返回 true（因为 null !== undefined）', () => {
      const context = createMockThreadContext({
        input: { userName: null }
      });
      const accessor = new VariableAccessor(context);

      // 注意：null 值会被 get 返回，但 has 检查的是 !== undefined
      // 因为 null !== undefined，所以 has 返回 true
      expect(accessor.has('input.userName')).toBe(true);
    });
  });

  describe('边界情况', () => {
    it('空路径返回 undefined', () => {
      const context = createMockThreadContext({
        input: { userName: 'Alice' }
      });
      const accessor = new VariableAccessor(context);

      expect(accessor.get('')).toBeUndefined();
    });

    it('复杂嵌套路径', () => {
      const context = createMockThreadContext({
        input: {
          data: {
            items: [
              { id: 1, name: 'Item 1' },
              { id: 2, name: 'Item 2' }
            ]
          }
        }
      });
      const accessor = new VariableAccessor(context);

      expect(accessor.get('input.data.items[0].name')).toBe('Item 1');
      expect(accessor.get('input.data.items[1].id')).toBe(2);
    });

    it('特殊字符路径', () => {
      const context = createMockThreadContext({
        input: {
          'key-with-dash': 'value'
        }
      });
      const accessor = new VariableAccessor(context);

      // 当前实现不支持带连字符的路径，会抛出 RuntimeValidationError
      expect(() => accessor.get('input.key-with-dash')).toThrow('Path contains invalid characters');
    });
  });
});
