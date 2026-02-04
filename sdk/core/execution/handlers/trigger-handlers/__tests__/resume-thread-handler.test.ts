/**
 * 恢复线程处理函数单元测试
 */

import { resumeThreadHandler } from '../resume-thread-handler';
import type { TriggerAction, TriggerExecutionResult } from '../../../../../types/trigger';
import { TriggerActionType } from '../../../../../types/trigger';
import { ValidationError } from '../../../../../types/errors';
import { ExecutionContext } from '../../../context/execution-context';

// Mock ExecutionContext
jest.mock('../../../context/execution-context');

describe('resume-thread-handler', () => {
  let mockAction: TriggerAction;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;
  const triggerId = 'trigger-123';
  const threadId = 'thread-456';

  beforeEach(() => {
    mockAction = {
      type: TriggerActionType.RESUME_THREAD,
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
    it('应该成功恢复线程', async () => {
      const mockLifecycleCoordinator = {
        resumeThread: jest.fn().mockResolvedValue(undefined)
      };

      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator);

      const result = await resumeThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(result).toMatchObject({
        triggerId,
        success: true,
        action: mockAction,
        result: {
          message: `Thread ${threadId} resumed successfully`
        }
      });
      expect(result.executionTime).toBeGreaterThan(0);

      // 验证生命周期协调器被调用
      expect(mockLifecycleCoordinator.resumeThread).toHaveBeenCalledWith(threadId);
    });

    it('应该使用默认执行上下文当未提供时', async () => {
      const mockLifecycleCoordinator = {
        resumeThread: jest.fn().mockResolvedValue(undefined)
      };

      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator);

      const result = await resumeThreadHandler(mockAction, triggerId);

      expect(ExecutionContext.createDefault).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('参数验证测试', () => {
    it('应该在缺少threadId参数时抛出ValidationError', async () => {
      mockAction.parameters = {};

      await expect(resumeThreadHandler(mockAction, triggerId, mockExecutionContext))
        .rejects
        .toThrow(ValidationError);

      await expect(resumeThreadHandler(mockAction, triggerId, mockExecutionContext))
        .rejects
        .toThrow('threadId is required for RESUME_THREAD action');
    });

    it('应该在threadId为空字符串时抛出ValidationError', async () => {
      mockAction.parameters = {
        threadId: ''
      };

      await expect(resumeThreadHandler(mockAction, triggerId, mockExecutionContext))
        .rejects
        .toThrow(ValidationError);
    });

    it('应该在threadId为null时抛出ValidationError', async () => {
      mockAction.parameters = {
        threadId: null
      };

      await expect(resumeThreadHandler(mockAction, triggerId, mockExecutionContext))
        .rejects
        .toThrow(ValidationError);
    });

    it('应该在threadId为undefined时抛出ValidationError', async () => {
      mockAction.parameters = {
        threadId: undefined
      };

      await expect(resumeThreadHandler(mockAction, triggerId, mockExecutionContext))
        .rejects
        .toThrow(ValidationError);
    });
  });

  describe('生命周期协调器测试', () => {
    it('应该正确调用生命周期协调器', async () => {
      const mockLifecycleCoordinator = {
        resumeThread: jest.fn().mockResolvedValue(undefined)
      };

      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator);

      await resumeThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(mockExecutionContext.getLifecycleCoordinator).toHaveBeenCalled();
      expect(mockLifecycleCoordinator.resumeThread).toHaveBeenCalledWith(threadId);
    });

    it('应该在生命周期协调器不可用时返回失败结果', async () => {
      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(null);

      const result = await resumeThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot read properties of null');
    });

    it('应该在生命周期协调器抛出错误时返回失败结果', async () => {
      const mockLifecycleCoordinator = {
        resumeThread: jest.fn().mockRejectedValue(new Error('Resume failed'))
      };

      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator);

      const result = await resumeThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Resume failed');
    });

    it('应该在生命周期协调器抛出非Error对象时返回失败结果', async () => {
      const mockLifecycleCoordinator = {
        resumeThread: jest.fn().mockRejectedValue('String error')
      };

      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator);

      const result = await resumeThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('String error');
    });
  });

  describe('错误处理测试', () => {
    it('应该在参数验证失败时返回失败结果', async () => {
      mockAction.parameters = {}; // 缺少threadId

      const result = await resumeThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('threadId is required');
    });

    it('应该记录执行时间即使验证失败', async () => {
      mockAction.parameters = {}; // 缺少threadId

      const result = await resumeThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('应该在获取生命周期协调器失败时返回失败结果', async () => {
      mockExecutionContext.getLifecycleCoordinator.mockImplementation(() => {
        throw new Error('Lifecycle coordinator unavailable');
      });

      const result = await resumeThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Lifecycle coordinator unavailable');
    });
  });

  describe('执行时间测试', () => {
    it('应该记录正确的执行时间', async () => {
      const mockLifecycleCoordinator = {
        resumeThread: jest.fn().mockResolvedValue(undefined)
      };

      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator);

      const startTime = Date.now();
      const result = await resumeThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.executionTime).toBeLessThanOrEqual(Date.now() - startTime + 10);
    });

    it('应该在恢复操作耗时较长时记录正确的执行时间', async () => {
      const mockLifecycleCoordinator = {
        resumeThread: jest.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 20));
        })
      };

      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator);

      const result = await resumeThreadHandler(mockAction, triggerId, mockExecutionContext);

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
          resumeThread: jest.fn().mockResolvedValue(undefined)
        };

        mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator);

        const result = await resumeThreadHandler(mockAction, triggerId, mockExecutionContext);

        expect(result.success).toBe(true);
        expect(mockLifecycleCoordinator.resumeThread).toHaveBeenCalledWith(testThreadId);
      }
    });

    it('应该处理不同的triggerId格式', async () => {
      const testTriggerIds = [
        'trigger-1',
        '12345',
        'resume-thread-trigger',
        ''
      ];

      for (const testTriggerId of testTriggerIds) {
        mockAction.parameters = {
          threadId
        };

        const mockLifecycleCoordinator = {
          resumeThread: jest.fn().mockResolvedValue(undefined)
        };

        mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator);

        const result = await resumeThreadHandler(mockAction, testTriggerId, mockExecutionContext);

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
        resumeThread: jest.fn().mockResolvedValue(undefined)
      };

      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator);

      const result = await resumeThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(true);
      // 额外的参数应该被忽略，只使用threadId
      expect(mockLifecycleCoordinator.resumeThread).toHaveBeenCalledWith(threadId);
    });
  });

  describe('异步操作测试', () => {
    it('应该正确处理异步恢复操作', async () => {
      let resolveResume: (value: unknown) => void;
      const resumePromise = new Promise(resolve => {
        resolveResume = resolve;
      });

      const mockLifecycleCoordinator = {
        resumeThread: jest.fn().mockReturnValue(resumePromise)
      };

      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator);

      const handlerPromise = resumeThreadHandler(mockAction, triggerId, mockExecutionContext);

      // 验证操作正在进行但未完成
      expect(mockLifecycleCoordinator.resumeThread).toHaveBeenCalled();

      // 完成恢复操作
      resolveResume!(undefined);
      const result = await handlerPromise;

      expect(result.success).toBe(true);
    });

    it('应该在异步恢复操作失败时返回失败结果', async () => {
      const mockLifecycleCoordinator = {
        resumeThread: jest.fn().mockRejectedValue(new Error('Async resume failed'))
      };

      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator);

      const result = await resumeThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Async resume failed');
    });
  });

  describe('与暂停处理器的对比测试', () => {
    it('应该与pauseThreadHandler使用相同的生命周期协调器', async () => {
      const mockLifecycleCoordinator = {
        pauseThread: jest.fn().mockResolvedValue(undefined),
        resumeThread: jest.fn().mockResolvedValue(undefined)
      };

      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator);

      // 测试恢复操作
      await resumeThreadHandler(mockAction, triggerId, mockExecutionContext);
      expect(mockLifecycleCoordinator.resumeThread).toHaveBeenCalledWith(threadId);

      // 测试暂停操作（使用相同的协调器）
      const pauseAction = {
        type: TriggerActionType.PAUSE_THREAD,
        parameters: { threadId },
        metadata: {}
      };

      await import('../pause-thread-handler').then(({ pauseThreadHandler }) => 
        pauseThreadHandler(pauseAction, triggerId, mockExecutionContext)
      );

      expect(mockLifecycleCoordinator.pauseThread).toHaveBeenCalledWith(threadId);
    });
  });
});