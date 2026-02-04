/**
 * 暂停线程处理函数单元测试
 */

import { pauseThreadHandler } from '../pause-thread-handler';
import type { TriggerAction, TriggerExecutionResult } from '../../../../../types/trigger';
import { TriggerActionType } from '../../../../../types/trigger';
import { ValidationError } from '../../../../../types/errors';
import { ExecutionContext } from '../../../context/execution-context';

// Mock ExecutionContext
jest.mock('../../../context/execution-context');

describe('pause-thread-handler', () => {
  let mockAction: TriggerAction;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;
  const triggerId = 'trigger-123';
  const threadId = 'thread-456';

  beforeEach(() => {
    mockAction = {
      type: TriggerActionType.PAUSE_THREAD,
      parameters: {
        threadId
      },
      metadata: {}
    };

    // Mock ExecutionContext
    mockExecutionContext = {
      getThreadRegistry: jest.fn(),
      getCurrentThreadId: jest.fn(),
      getWorkflowRegistry: jest.fn(),
      getEventManager: jest.fn(),
      getLifecycleCoordinator: jest.fn(),
      getCheckpointStateManager: jest.fn(),
      getCheckpointCoordinator: jest.fn(),
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
    it('应该成功暂停线程', async () => {
      const mockLifecycleCoordinator = {
        pauseThread: jest.fn().mockResolvedValue(undefined)
      };

      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator);

      const result = await pauseThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(result).toMatchObject({
        triggerId,
        success: true,
        action: mockAction,
        result: {
          message: `Thread ${threadId} paused successfully`
        }
      });
      expect(result.executionTime).toBeGreaterThan(0);

      // 验证生命周期协调器被调用
      expect(mockLifecycleCoordinator.pauseThread).toHaveBeenCalledWith(threadId);
    });

    it('应该使用默认执行上下文当未提供时', async () => {
      const mockLifecycleCoordinator = {
        pauseThread: jest.fn().mockResolvedValue(undefined)
      };

      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator);

      const result = await pauseThreadHandler(mockAction, triggerId);

      expect(ExecutionContext.createDefault).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('参数验证测试', () => {
    it('应该在缺少threadId参数时抛出ValidationError', async () => {
      mockAction.parameters = {};

      await expect(pauseThreadHandler(mockAction, triggerId, mockExecutionContext))
        .rejects
        .toThrow(ValidationError);

      await expect(pauseThreadHandler(mockAction, triggerId, mockExecutionContext))
        .rejects
        .toThrow('threadId is required for PAUSE_THREAD action');
    });

    it('应该在threadId为空字符串时抛出ValidationError', async () => {
      mockAction.parameters = {
        threadId: ''
      };

      await expect(pauseThreadHandler(mockAction, triggerId, mockExecutionContext))
        .rejects
        .toThrow(ValidationError);
    });

    it('应该在threadId为null时抛出ValidationError', async () => {
      mockAction.parameters = {
        threadId: null
      };

      await expect(pauseThreadHandler(mockAction, triggerId, mockExecutionContext))
        .rejects
        .toThrow(ValidationError);
    });

    it('应该在threadId为undefined时抛出ValidationError', async () => {
      mockAction.parameters = {
        threadId: undefined
      };

      await expect(pauseThreadHandler(mockAction, triggerId, mockExecutionContext))
        .rejects
        .toThrow(ValidationError);
    });
  });

  describe('生命周期协调器测试', () => {
    it('应该正确调用生命周期协调器', async () => {
      const mockLifecycleCoordinator = {
        pauseThread: jest.fn().mockResolvedValue(undefined)
      };

      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator);

      await pauseThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(mockExecutionContext.getLifecycleCoordinator).toHaveBeenCalled();
      expect(mockLifecycleCoordinator.pauseThread).toHaveBeenCalledWith(threadId);
    });

    it('应该在生命周期协调器不可用时返回失败结果', async () => {
      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(null);

      const result = await pauseThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot read properties of null');
    });

    it('应该在生命周期协调器抛出错误时返回失败结果', async () => {
      const mockLifecycleCoordinator = {
        pauseThread: jest.fn().mockRejectedValue(new Error('Pause failed'))
      };

      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator);

      const result = await pauseThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Pause failed');
    });

    it('应该在生命周期协调器抛出非Error对象时返回失败结果', async () => {
      const mockLifecycleCoordinator = {
        pauseThread: jest.fn().mockRejectedValue('String error')
      };

      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator);

      const result = await pauseThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('String error');
    });
  });

  describe('错误处理测试', () => {
    it('应该在参数验证失败时返回失败结果', async () => {
      mockAction.parameters = {}; // 缺少threadId

      const result = await pauseThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('threadId is required');
    });

    it('应该记录执行时间即使验证失败', async () => {
      mockAction.parameters = {}; // 缺少threadId

      const result = await pauseThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('应该在获取生命周期协调器失败时返回失败结果', async () => {
      mockExecutionContext.getLifecycleCoordinator.mockImplementation(() => {
        throw new Error('Lifecycle coordinator unavailable');
      });

      const result = await pauseThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Lifecycle coordinator unavailable');
    });
  });

  describe('执行时间测试', () => {
    it('应该记录正确的执行时间', async () => {
      const mockLifecycleCoordinator = {
        pauseThread: jest.fn().mockResolvedValue(undefined)
      };

      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator);

      const startTime = Date.now();
      const result = await pauseThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.executionTime).toBeLessThanOrEqual(Date.now() - startTime + 10);
    });

    it('应该在暂停操作耗时较长时记录正确的执行时间', async () => {
      const mockLifecycleCoordinator = {
        pauseThread: jest.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 20));
        })
      };

      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator);

      const result = await pauseThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.executionTime).toBeGreaterThanOrEqual(20);
    });
  });

  describe('边界情况测试', () => {
    it('应该处理不同的threadId格式', async () => {
      const testThreadIds = [
        'thread-1',
        '12345',
        'custom-thread-id',
        'thread_with_underscores',
        'thread-with-dashes'
      ];

      for (const testThreadId of testThreadIds) {
        mockAction.parameters = {
          threadId: testThreadId
        };

        const mockLifecycleCoordinator = {
          pauseThread: jest.fn().mockResolvedValue(undefined)
        };

        mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator);

        const result = await pauseThreadHandler(mockAction, triggerId, mockExecutionContext);

        expect(result.success).toBe(true);
        expect(mockLifecycleCoordinator.pauseThread).toHaveBeenCalledWith(testThreadId);
      }
    });

    it('应该处理不同的triggerId格式', async () => {
      const testTriggerIds = [
        'trigger-1',
        '12345',
        'pause-thread-trigger',
        ''
      ];

      for (const testTriggerId of testTriggerIds) {
        mockAction.parameters = {
          threadId
        };

        const mockLifecycleCoordinator = {
          pauseThread: jest.fn().mockResolvedValue(undefined)
        };

        mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator);

        const result = await pauseThreadHandler(mockAction, testTriggerId, mockExecutionContext);

        expect(result.triggerId).toBe(testTriggerId);
        expect(result.success).toBe(true);
      }
    });

    it('应该处理额外的参数', async () => {
      mockAction.parameters = {
        threadId,
        extraParam1: 'value1',
        extraParam2: 42
      };

      const mockLifecycleCoordinator = {
        pauseThread: jest.fn().mockResolvedValue(undefined)
      };

      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator);

      const result = await pauseThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(true);
      // 额外的参数应该被忽略，只使用threadId
      expect(mockLifecycleCoordinator.pauseThread).toHaveBeenCalledWith(threadId);
    });
  });

  describe('异步操作测试', () => {
    it('应该正确处理异步暂停操作', async () => {
      let resolvePause: (value: unknown) => void;
      const pausePromise = new Promise(resolve => {
        resolvePause = resolve;
      });

      const mockLifecycleCoordinator = {
        pauseThread: jest.fn().mockReturnValue(pausePromise)
      };

      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator);

      const handlerPromise = pauseThreadHandler(mockAction, triggerId, mockExecutionContext);

      // 验证操作正在进行但未完成
      expect(mockLifecycleCoordinator.pauseThread).toHaveBeenCalled();

      // 完成暂停操作
      resolvePause!(undefined);
      const result = await handlerPromise;

      expect(result.success).toBe(true);
    });

    it('应该在异步暂停操作失败时返回失败结果', async () => {
      const mockLifecycleCoordinator = {
        pauseThread: jest.fn().mockRejectedValue(new Error('Async pause failed'))
      };

      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator);

      const result = await pauseThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Async pause failed');
    });
  });
});