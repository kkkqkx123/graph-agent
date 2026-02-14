/**
 * 停止线程处理函数单元测试
 */

import { stopThreadHandler } from '../stop-thread-handler';
import type { TriggerAction, TriggerExecutionResult } from '@modular-agent/types';
import { TriggerActionType } from '@modular-agent/types';
import { ValidationError } from '@modular-agent/types';
import { ExecutionContext } from '../../../context/execution-context';

// Mock ExecutionContext
jest.mock('../../../context/execution-context');

describe('stop-thread-handler', () => {
  let mockAction: TriggerAction;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;
  const triggerId = 'trigger-123';
  const threadId = 'thread-456';

  beforeEach(() => {
    mockAction = {
      type: TriggerActionType.STOP_THREAD,
      parameters: {
        threadId
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
    it('应该成功停止线程', async () => {
      const mockLifecycleCoordinator = {
        stopThread: jest.fn().mockResolvedValue(undefined)
      };

      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator as any);

      const result = await stopThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(result).toMatchObject({
        triggerId,
        success: true,
        action: mockAction,
        result: {
          message: `Thread ${threadId} stopped successfully`
        }
      });
      expect(result.executionTime).toBeGreaterThan(0);

      // 验证生命周期协调器被调用
      expect(mockLifecycleCoordinator.stopThread).toHaveBeenCalledWith(threadId);
    });

    it('应该使用默认执行上下文当未提供时', async () => {
      const mockLifecycleCoordinator = {
        stopThread: jest.fn().mockResolvedValue(undefined)
      };

      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator as any);

      const result = await stopThreadHandler(mockAction, triggerId);

      expect(ExecutionContext.createDefault).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('参数验证测试', () => {
    it('应该在缺少threadId参数时返回失败结果', async () => {
      mockAction.parameters = {};

      const result = await stopThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('threadId is required for STOP_THREAD action');
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('应该在threadId为空字符串时返回失败结果', async () => {
      mockAction.parameters = {
        threadId: ''
      };

      const result = await stopThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('threadId is required for STOP_THREAD action');
    });

    it('应该在threadId为null时返回失败结果', async () => {
      mockAction.parameters = {
        threadId: null
      };

      const result = await stopThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('threadId is required for STOP_THREAD action');
    });

    it('应该在threadId为undefined时返回失败结果', async () => {
      mockAction.parameters = {
        threadId: undefined
      };

      const result = await stopThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('threadId is required for STOP_THREAD action');
    });
  });

  describe('生命周期协调器测试', () => {
    it('应该正确调用生命周期协调器', async () => {
      const mockLifecycleCoordinator = {
        stopThread: jest.fn().mockResolvedValue(undefined)
      };

      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator as any);

      await stopThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(mockExecutionContext.getLifecycleCoordinator).toHaveBeenCalled();
      expect(mockLifecycleCoordinator.stopThread).toHaveBeenCalledWith(threadId);
    });

    it('应该在生命周期协调器不可用时返回失败结果', async () => {
      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(null as any);

      const result = await stopThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot read properties of null');
    });

    it('应该在生命周期协调器抛出错误时返回失败结果', async () => {
      const mockLifecycleCoordinator = {
        stopThread: jest.fn().mockRejectedValue(new Error('Stop failed'))
      };

      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator as any);

      const result = await stopThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Stop failed');
    });

    it('应该在生命周期协调器抛出非Error对象时返回失败结果', async () => {
      const mockLifecycleCoordinator = {
        stopThread: jest.fn().mockRejectedValue('String error')
      };

      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator as any);

      const result = await stopThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('String error');
    });
  });

  describe('错误处理测试', () => {
    it('应该在参数验证失败时返回失败结果', async () => {
      mockAction.parameters = {}; // 缺少threadId

      const result = await stopThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('threadId is required');
    });

    it('应该记录执行时间即使验证失败', async () => {
      mockAction.parameters = {}; // 缺少threadId

      const result = await stopThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('应该在获取生命周期协调器失败时返回失败结果', async () => {
      mockExecutionContext.getLifecycleCoordinator.mockImplementation(() => {
        throw new Error('Lifecycle coordinator unavailable');
      });

      const result = await stopThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Lifecycle coordinator unavailable');
    });
  });

  describe('执行时间测试', () => {
    it('应该记录正确的执行时间', async () => {
      const mockLifecycleCoordinator = {
        stopThread: jest.fn().mockResolvedValue(undefined)
      };

      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator as any);

      const beforeTime = Date.now();
      const result = await stopThreadHandler(mockAction, triggerId, mockExecutionContext);
      const afterTime = Date.now();

      expect(result.executionTime).toBeGreaterThanOrEqual(beforeTime);
      expect(result.executionTime).toBeLessThanOrEqual(afterTime);
    });

    it('应该在停止操作耗时较长时记录正确的执行时间', async () => {
      const mockLifecycleCoordinator = {
        stopThread: jest.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 20));
        })
      };

      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator as any);

      const beforeTime = Date.now();
      const result = await stopThreadHandler(mockAction, triggerId, mockExecutionContext);
      const afterTime = Date.now();

      expect(result.executionTime).toBeGreaterThanOrEqual(beforeTime);
      expect(result.executionTime).toBeLessThanOrEqual(afterTime);
      expect(afterTime - beforeTime).toBeGreaterThanOrEqual(20);
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
          stopThread: jest.fn().mockResolvedValue(undefined)
        };

        mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator as any);

        const result = await stopThreadHandler(mockAction, triggerId, mockExecutionContext);

        expect(result.success).toBe(true);
        expect(mockLifecycleCoordinator.stopThread).toHaveBeenCalledWith(testThreadId);
      }
    });

    it('应该处理不同的triggerId格式', async () => {
      const testTriggerIds = [
        'trigger-1',
        '12345',
        'stop-thread-trigger',
        ''
      ];

      for (const testTriggerId of testTriggerIds) {
        mockAction.parameters = {
          threadId
        };

        const mockLifecycleCoordinator = {
          stopThread: jest.fn().mockResolvedValue(undefined)
        };

        mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator as any);

        const result = await stopThreadHandler(mockAction, testTriggerId, mockExecutionContext);

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
        stopThread: jest.fn().mockResolvedValue(undefined)
      };

      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator as any);

      const result = await stopThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(true);
      // 额外的参数应该被忽略，只使用threadId
      expect(mockLifecycleCoordinator.stopThread).toHaveBeenCalledWith(threadId);
    });
  });

  describe('异步操作测试', () => {
    it('应该正确处理异步停止操作', async () => {
      let resolveStop: (value: unknown) => void;
      const stopPromise = new Promise(resolve => {
        resolveStop = resolve;
      });

      const mockLifecycleCoordinator = {
        stopThread: jest.fn().mockReturnValue(stopPromise)
      };

      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator as any);

      const handlerPromise = stopThreadHandler(mockAction, triggerId, mockExecutionContext);

      // 验证操作正在进行但未完成
      expect(mockLifecycleCoordinator.stopThread).toHaveBeenCalled();

      // 完成停止操作
      resolveStop!(undefined);
      const result = await handlerPromise;

      expect(result.success).toBe(true);
    });

    it('应该在异步停止操作失败时返回失败结果', async () => {
      const mockLifecycleCoordinator = {
        stopThread: jest.fn().mockRejectedValue(new Error('Async stop failed'))
      };

      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator as any);

      const result = await stopThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Async stop failed');
    });
  });

  describe('与其他线程操作处理器的对比测试', () => {
    it('应该与pauseThreadHandler和resumeThreadHandler使用相同的生命周期协调器', async () => {
      const mockLifecycleCoordinator = {
        pauseThread: jest.fn().mockResolvedValue(undefined),
        resumeThread: jest.fn().mockResolvedValue(undefined),
        stopThread: jest.fn().mockResolvedValue(undefined)
      };

      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator as any);

      // 测试停止操作
      await stopThreadHandler(mockAction, triggerId, mockExecutionContext);
      expect(mockLifecycleCoordinator.stopThread).toHaveBeenCalledWith(threadId);

      // 测试暂停操作（使用相同的协调器）
      const pauseAction = {
        type: TriggerActionType.PAUSE_THREAD,
        parameters: { threadId }
      };

      await import('../pause-thread-handler').then(({ pauseThreadHandler }) => 
        pauseThreadHandler(pauseAction, triggerId, mockExecutionContext)
      );

      expect(mockLifecycleCoordinator.pauseThread).toHaveBeenCalledWith(threadId);

      // 测试恢复操作（使用相同的协调器）
      const resumeAction = {
        type: TriggerActionType.RESUME_THREAD,
        parameters: { threadId }
      };

      await import('../resume-thread-handler').then(({ resumeThreadHandler }) => 
        resumeThreadHandler(resumeAction, triggerId, mockExecutionContext)
      );

      expect(mockLifecycleCoordinator.resumeThread).toHaveBeenCalledWith(threadId);
    });
  });

  describe('级联停止测试', () => {
    it('应该支持级联停止子线程', async () => {
      const mockLifecycleCoordinator = {
        stopThread: jest.fn().mockResolvedValue(undefined)
      };

      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator as any);

      await stopThreadHandler(mockAction, triggerId, mockExecutionContext);

      // 验证stopThread被调用，生命周期协调器负责级联停止逻辑
      expect(mockLifecycleCoordinator.stopThread).toHaveBeenCalledWith(threadId);
    });

    it('应该在级联停止失败时返回失败结果', async () => {
      const mockLifecycleCoordinator = {
        stopThread: jest.fn().mockRejectedValue(new Error('Cascade stop failed'))
      };

      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator as any);

      const result = await stopThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cascade stop failed');
    });
  });
});