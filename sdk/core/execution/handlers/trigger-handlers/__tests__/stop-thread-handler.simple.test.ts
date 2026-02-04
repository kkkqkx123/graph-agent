/**
 * 停止线程处理函数简化单元测试
 */

import { stopThreadHandler } from '../stop-thread-handler';
import type { TriggerAction, TriggerExecutionResult } from '../../../../../types/trigger';
import { TriggerActionType } from '../../../../../types/trigger';
import { ValidationError, NotFoundError } from '../../../../../types/errors';
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
    it('应该成功停止线程', async () => {
      const mockLifecycleCoordinator = {
        stopThread: jest.fn()
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
      expect(result.executionTime).toBeGreaterThanOrEqual(0);

      // 验证线程停止被调用
      expect(mockLifecycleCoordinator.stopThread).toHaveBeenCalledWith(threadId);
    });
  });

  describe('参数验证测试', () => {
    it('应该在缺少threadId参数时返回失败结果', async () => {
      mockAction.parameters = {};

      const result = await stopThreadHandler(mockAction, triggerId, mockExecutionContext);
      expect(result.success).toBe(false);
      expect(result.error).toContain('threadId is required');
    });

    it('应该在threadId为空字符串时返回失败结果', async () => {
      mockAction.parameters = {
        threadId: ''
      };

      const result = await stopThreadHandler(mockAction, triggerId, mockExecutionContext);
      expect(result.success).toBe(false);
      expect(result.error).toContain('threadId is required');
    });
  });

  describe('错误处理测试', () => {
    it('应该在生命周期协调器不可用时返回失败结果', async () => {
      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(null as any);

      const result = await stopThreadHandler(mockAction, triggerId, mockExecutionContext);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot read properties of null');
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
        stopThread: jest.fn()
      };

      mockExecutionContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator as any);

      const result = await stopThreadHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });
  });
});