/**
 * 设置变量处理函数单元测试
 */

import { setVariableHandler } from '../set-variable-handler';
import type { TriggerAction, TriggerExecutionResult } from '../../../../../types/trigger';
import { TriggerActionType } from '../../../../../types/trigger';
import { ValidationError, NotFoundError } from '../../../../../types/errors';
import { ExecutionContext } from '../../../context/execution-context';

// Mock ExecutionContext
jest.mock('../../../context/execution-context');

describe('set-variable-handler', () => {
  let mockAction: TriggerAction;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;
  const triggerId = 'trigger-123';
  const threadId = 'thread-456';

  beforeEach(() => {
    mockAction = {
      type: TriggerActionType.SET_VARIABLE,
      parameters: {
        threadId,
        variables: {
          counter: 42,
          message: 'Hello World',
          enabled: true
        }
      }
    };

    // Mock ExecutionContext
    mockExecutionContext = {
      getThreadRegistry: jest.fn(),
      getCurrentThreadId: jest.fn(),
      getWorkflowRegistry: jest.fn(),
      getEventManager: jest.fn(),
      getLifecycleCoordinator: jest.fn(),
      getCheckpointStateManager: jest.fn(),
      getThreadLifecycleManager: jest.fn(),
      getSingletonRegistry: jest.fn(),
      getGlobalMessageStorage: jest.fn(),
      setCurrentThreadId: jest.fn(),
      clearCurrentThreadId: jest.fn(),
      initialize: jest.fn(),
      dispose: jest.fn(),
      isInitialized: true
    } as any;

    // Mock default context creation
    (ExecutionContext.createDefault as jest.Mock) = jest.fn().mockReturnValue(mockExecutionContext);
  });

  describe('基本功能测试', () => {
    it('应该成功设置变量', async () => {
      const mockThreadContext = {
        updateVariable: jest.fn(),
        getAllVariables: jest.fn(),
        getOutput: jest.fn(),
        getInput: jest.fn(),
        getWorkflowId: jest.fn(),
        getThreadId: jest.fn(),
        thread: {}
      };

      const mockThreadRegistry = {
        register: jest.fn(),
        get: jest.fn().mockReturnValue(mockThreadContext),
        delete: jest.fn(),
        getAll: jest.fn(),
        clear: jest.fn(),
        has: jest.fn()
      };

      mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry as any);

      const result = await setVariableHandler(mockAction, triggerId, mockExecutionContext);

      expect(result).toMatchObject({
        triggerId,
        success: true,
        action: mockAction,
        result: {
          message: `Variables updated successfully in thread ${threadId}`,
          variables: {
            counter: 42,
            message: 'Hello World',
            enabled: true
          }
        }
      });
      expect(result.executionTime).toBeGreaterThanOrEqual(0);

      // 验证变量更新被调用
      expect(mockThreadContext.updateVariable).toHaveBeenCalledTimes(3);
      expect(mockThreadContext.updateVariable).toHaveBeenCalledWith('counter', 42);
      expect(mockThreadContext.updateVariable).toHaveBeenCalledWith('message', 'Hello World');
      expect(mockThreadContext.updateVariable).toHaveBeenCalledWith('enabled', true);
    });

    it('应该使用默认执行上下文当未提供时', async () => {
      const mockThreadContext = {
        updateVariable: jest.fn()
      };

      const mockThreadRegistry = {
        register: jest.fn(),
        get: jest.fn().mockReturnValue(mockThreadContext),
        delete: jest.fn(),
        getAll: jest.fn(),
        clear: jest.fn(),
        has: jest.fn()
      };

      mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry as any);

      const result = await setVariableHandler(mockAction, triggerId);

      expect(ExecutionContext.createDefault).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('应该正确处理单个变量', async () => {
      mockAction.parameters = {
        threadId,
        variables: {
          singleVar: 'test value'
        }
      };

      const mockThreadContext = {
        updateVariable: jest.fn()
      };

      const mockThreadRegistry = {
        register: jest.fn(),
        get: jest.fn().mockReturnValue(mockThreadContext),
        delete: jest.fn(),
        getAll: jest.fn(),
        clear: jest.fn(),
        has: jest.fn()
      };

      mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry as any);

      const result = await setVariableHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(true);
      expect(mockThreadContext.updateVariable).toHaveBeenCalledTimes(1);
      expect(mockThreadContext.updateVariable).toHaveBeenCalledWith('singleVar', 'test value');
    });

    it('应该正确处理空变量对象', async () => {
      mockAction.parameters = {
        threadId,
        variables: {}
      };

      const mockThreadContext = {
        updateVariable: jest.fn()
      };

      const mockThreadRegistry = {
        register: jest.fn(),
        get: jest.fn().mockReturnValue(mockThreadContext),
        delete: jest.fn(),
        getAll: jest.fn(),
        clear: jest.fn(),
        has: jest.fn()
      };

      mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry as any);

      const result = await setVariableHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(true);
      expect(mockThreadContext.updateVariable).not.toHaveBeenCalled();
    });
  });

  describe('参数验证测试', () => {
    it('应该在缺少threadId参数时抛出ValidationError', async () => {
      mockAction.parameters = {
        variables: { test: 'value' }
      };

      const result = await setVariableHandler(mockAction, triggerId, mockExecutionContext);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required parameters');

    });

    it('应该在缺少variables参数时抛出ValidationError', async () => {
      mockAction.parameters = {
        threadId
      };

      const result = await setVariableHandler(mockAction, triggerId, mockExecutionContext);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required parameters');
    });

    it('应该在threadId和variables都缺少时抛出ValidationError', async () => {
      mockAction.parameters = {};

      const result = await setVariableHandler(mockAction, triggerId, mockExecutionContext);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required parameters');
    });

    it('应该在threadId为空字符串时抛出ValidationError', async () => {
      mockAction.parameters = {
        threadId: '',
        variables: { test: 'value' }
      };

      const result = await setVariableHandler(mockAction, triggerId, mockExecutionContext);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required parameters');
    });

    it('应该在variables为null时抛出ValidationError', async () => {
      mockAction.parameters = {
        threadId,
        variables: null
      };

      const result = await setVariableHandler(mockAction, triggerId, mockExecutionContext);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required parameters');
    });

    it('应该在variables为undefined时抛出ValidationError', async () => {
      mockAction.parameters = {
        threadId,
        variables: undefined
      };

      const result = await setVariableHandler(mockAction, triggerId, mockExecutionContext);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required parameters');
    });
  });

  describe('线程上下文测试', () => {
    it('应该在找不到线程上下文时抛出NotFoundError', async () => {
      const mockThreadRegistry = {
        register: jest.fn(),
        get: jest.fn().mockReturnValue(null),
        delete: jest.fn(),
        getAll: jest.fn(),
        clear: jest.fn(),
        has: jest.fn()
      };

      mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry as any);

      const result = await setVariableHandler(mockAction, triggerId, mockExecutionContext);
      expect(result.success).toBe(false);
      expect(result.error).toContain('ThreadContext not found');

    });

    it('应该正确调用线程注册表', async () => {
      const mockThreadContext = {
        updateVariable: jest.fn()
      };

      const mockThreadRegistry = {
        register: jest.fn(),
        get: jest.fn().mockReturnValue(mockThreadContext),
        delete: jest.fn(),
        getAll: jest.fn(),
        clear: jest.fn(),
        has: jest.fn()
      };

      mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry as any);

      await setVariableHandler(mockAction, triggerId, mockExecutionContext);

      expect(mockThreadRegistry.get).toHaveBeenCalledWith(threadId);
    });
  });

  describe('变量类型测试', () => {
    it('应该处理各种类型的变量值', async () => {
      const testVariables = {
        stringVar: 'test string',
        numberVar: 123.45,
        booleanVar: true,
        nullVar: null,
        undefinedVar: undefined,
        arrayVar: [1, 2, 3],
        objectVar: { key: 'value' },
        dateVar: new Date('2023-01-01')
      };

      mockAction.parameters = {
        threadId,
        variables: testVariables
      };

      const mockThreadContext = {
        updateVariable: jest.fn()
      };

      const mockThreadRegistry = {
        register: jest.fn(),
        get: jest.fn().mockReturnValue(mockThreadContext),
        delete: jest.fn(),
        getAll: jest.fn(),
        clear: jest.fn(),
        has: jest.fn()
      };

      mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry as any);

      await setVariableHandler(mockAction, triggerId, mockExecutionContext);

      // 验证所有变量都被更新
      expect(mockThreadContext.updateVariable).toHaveBeenCalledTimes(Object.keys(testVariables).length);
      
      // 验证具体值
      expect(mockThreadContext.updateVariable).toHaveBeenCalledWith('stringVar', 'test string');
      expect(mockThreadContext.updateVariable).toHaveBeenCalledWith('numberVar', 123.45);
      expect(mockThreadContext.updateVariable).toHaveBeenCalledWith('booleanVar', true);
      expect(mockThreadContext.updateVariable).toHaveBeenCalledWith('nullVar', null);
      expect(mockThreadContext.updateVariable).toHaveBeenCalledWith('undefinedVar', undefined);
      expect(mockThreadContext.updateVariable).toHaveBeenCalledWith('arrayVar', [1, 2, 3]);
      expect(mockThreadContext.updateVariable).toHaveBeenCalledWith('objectVar', { key: 'value' });
      expect(mockThreadContext.updateVariable).toHaveBeenCalledWith('dateVar', expect.any(Date));
    });

    it('应该处理嵌套对象变量', async () => {
      mockAction.parameters = {
        threadId,
        variables: {
          user: {
            name: 'John Doe',
            age: 30,
            preferences: {
              theme: 'dark',
              language: 'en'
            }
          }
        }
      };

      const mockThreadContext = {
        updateVariable: jest.fn()
      };

      const mockThreadRegistry = {
        register: jest.fn(),
        get: jest.fn().mockReturnValue(mockThreadContext),
        delete: jest.fn(),
        getAll: jest.fn(),
        clear: jest.fn(),
        has: jest.fn()
      };

      mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry as any);

      await setVariableHandler(mockAction, triggerId, mockExecutionContext);

      expect(mockThreadContext.updateVariable).toHaveBeenCalledWith('user', {
        name: 'John Doe',
        age: 30,
        preferences: {
          theme: 'dark',
          language: 'en'
        }
      });
    });
  });

  describe('错误处理测试', () => {
    it('应该在变量更新失败时返回失败结果', async () => {
      const mockThreadContext = {
        updateVariable: jest.fn().mockImplementation(() => {
          throw new Error('Variable update failed');
        })
      };

      const mockThreadRegistry = {
        register: jest.fn(),
        get: jest.fn().mockReturnValue(mockThreadContext),
        delete: jest.fn(),
        getAll: jest.fn(),
        clear: jest.fn(),
        has: jest.fn()
      };

      mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry as any);

      const result = await setVariableHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Variable update failed');
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('应该在获取线程注册表失败时返回失败结果', async () => {
      mockExecutionContext.getThreadRegistry.mockImplementation(() => {
        throw new Error('Thread registry unavailable');
      });

      const result = await setVariableHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Thread registry unavailable');
    });
  });

  describe('执行时间测试', () => {
    it('应该记录正确的执行时间', async () => {
      const mockThreadContext = {
        updateVariable: jest.fn()
      };

      const mockThreadRegistry = {
        register: jest.fn(),
        get: jest.fn().mockReturnValue(mockThreadContext),
        delete: jest.fn(),
        getAll: jest.fn(),
        clear: jest.fn(),
        has: jest.fn()
      };

      mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry as any);

      const startTime = Date.now();
      const result = await setVariableHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.executionTime).toBeLessThanOrEqual(Date.now() - startTime + 10);
    });

    it('应该在变量更新耗时较长时记录正确的执行时间', async () => {
      const mockThreadContext = {
        updateVariable: jest.fn().mockImplementation(() => {
          // 模拟耗时操作
          const start = Date.now();
          while (Date.now() - start < 10) {
            // 空循环，模拟耗时
          }
        })
      };

      const mockThreadRegistry = {
        register: jest.fn(),
        get: jest.fn().mockReturnValue(mockThreadContext),
        delete: jest.fn(),
        getAll: jest.fn(),
        clear: jest.fn(),
        has: jest.fn()
      };

      mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry as any);

      const result = await setVariableHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.executionTime).toBeGreaterThanOrEqual(10);
    });
  });

  describe('边界情况测试', () => {
    it('应该处理不同的threadId格式', async () => {
      const testThreadIds = [
        'thread-1',
        '12345',
        'custom-thread-id',
        'thread_with_underscores'
      ];

      for (const testThreadId of testThreadIds) {
        mockAction.parameters = {
          threadId: testThreadId,
          variables: { test: 'value' }
        };

        const mockThreadContext = {
          updateVariable: jest.fn()
        };

        const mockThreadRegistry = {
          register: jest.fn(),
          get: jest.fn().mockReturnValue(mockThreadContext),
          delete: jest.fn(),
          getAll: jest.fn(),
          clear: jest.fn(),
          has: jest.fn()
        };

        mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry as any);

        const result = await setVariableHandler(mockAction, triggerId, mockExecutionContext);

        expect(result.success).toBe(true);
        expect(mockThreadRegistry.get).toHaveBeenCalledWith(testThreadId);
      }
    });

    it('应该处理不同的triggerId格式', async () => {
      const testTriggerIds = [
        'trigger-1',
        '12345',
        'set-variable-trigger',
        ''
      ];

      for (const testTriggerId of testTriggerIds) {
        mockAction.parameters = {
          threadId,
          variables: { test: 'value' }
        };

        const mockThreadContext = {
          updateVariable: jest.fn()
        };

        const mockThreadRegistry = {
          threadContexts: new Map(),
          register: jest.fn(),
          get: jest.fn().mockReturnValue(mockThreadContext),
          delete: jest.fn(),
          getAll: jest.fn(),
          clear: jest.fn(),
          has: jest.fn()
        };

        mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry as any);

        const result = await setVariableHandler(mockAction, testTriggerId, mockExecutionContext);

        expect(result.triggerId).toBe(testTriggerId);
        expect(result.success).toBe(true);
      }
    });
  });
});