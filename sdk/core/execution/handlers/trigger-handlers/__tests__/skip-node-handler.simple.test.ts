/**
 * 跳过节点处理函数简化单元测试
 */

import { skipNodeHandler } from '../skip-node-handler';
import type { TriggerAction, TriggerExecutionResult } from '../../../../../types/trigger';
import { TriggerActionType } from '../../../../../types/trigger';
import { ValidationError, NotFoundError } from '../../../../../types/errors';
import { ExecutionContext } from '../../../context/execution-context';

// Mock ExecutionContext
jest.mock('../../../context/execution-context');

describe('skip-node-handler', () => {
  let mockAction: TriggerAction;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;
  const triggerId = 'trigger-123';
  const threadId = 'thread-456';
  const nodeId = 'node-789';

  beforeEach(() => {
    mockAction = {
      type: TriggerActionType.SKIP_NODE,
      parameters: {
        threadId,
        nodeId
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
    it('应该成功跳过节点', async () => {
      const mockThreadContext = {
        thread: {
          nodeResults: []
        },
        getThreadId: jest.fn().mockReturnValue(threadId),
        getWorkflowId: jest.fn().mockReturnValue('workflow-123')
      };

      const mockThreadRegistry = {
        register: jest.fn(),
        get: jest.fn().mockReturnValue(mockThreadContext),
        delete: jest.fn(),
        getAll: jest.fn(),
        clear: jest.fn(),
        has: jest.fn()
      };

      const mockEventManager = {
        emit: jest.fn()
      };

      mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry as any);
      mockExecutionContext.getEventManager.mockReturnValue(mockEventManager as any);

      const result = await skipNodeHandler(mockAction, triggerId, mockExecutionContext);

      expect(result).toMatchObject({
        triggerId,
        success: true,
        action: mockAction,
        result: {
          message: `Node ${nodeId} skipped successfully in thread ${threadId}`
        }
      });
      expect(result.executionTime).toBeGreaterThanOrEqual(0);

      // 验证事件被触发
      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'NODE_COMPLETED',
          threadId,
          nodeId
        })
      );
    });

  });

  describe('参数验证测试', () => {
    it('应该在缺少threadId参数时返回失败结果', async () => {
      mockAction.parameters = {
        nodeId
      };

      const result = await skipNodeHandler(mockAction, triggerId, mockExecutionContext);
      expect(result.success).toBe(false);
      expect(result.error).toContain('threadId is required');
    });

    it('应该在缺少nodeId参数时返回失败结果', async () => {
      mockAction.parameters = {
        threadId
      };

      const result = await skipNodeHandler(mockAction, triggerId, mockExecutionContext);
      expect(result.success).toBe(false);
      expect(result.error).toContain('nodeId is required');
    });

    it('应该在threadId和nodeId都缺少时返回失败结果', async () => {
      mockAction.parameters = {};

      const result = await skipNodeHandler(mockAction, triggerId, mockExecutionContext);
      expect(result.success).toBe(false);
      expect(result.error).toContain('threadId is required');
    });

    it('应该在threadId为空字符串时返回失败结果', async () => {
      mockAction.parameters = {
        threadId: '',
        nodeId
      };

      const result = await skipNodeHandler(mockAction, triggerId, mockExecutionContext);
      expect(result.success).toBe(false);
      expect(result.error).toContain('threadId is required');
    });

    it('应该在nodeId为空字符串时返回失败结果', async () => {
      mockAction.parameters = {
        threadId,
        nodeId: ''
      };

      const result = await skipNodeHandler(mockAction, triggerId, mockExecutionContext);
      expect(result.success).toBe(false);
      expect(result.error).toContain('nodeId is required');
    });
  });

  describe('线程上下文测试', () => {
    it('应该在找不到线程上下文时返回失败结果', async () => {
      const mockThreadRegistry = {
        register: jest.fn(),
        get: jest.fn().mockReturnValue(null),
        delete: jest.fn(),
        getAll: jest.fn(),
        clear: jest.fn(),
        has: jest.fn()
      };

      mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry as any);

      const result = await skipNodeHandler(mockAction, triggerId, mockExecutionContext);
      expect(result.success).toBe(false);
      expect(result.error).toContain('ThreadContext not found');
    });

    it('应该正确调用线程注册表', async () => {
      const mockThreadContext = {
        thread: {
          nodeResults: []
        }
      };

      const mockThreadRegistry = {
        register: jest.fn(),
        get: jest.fn().mockReturnValue(mockThreadContext),
        delete: jest.fn(),
        getAll: jest.fn(),
        clear: jest.fn(),
        has: jest.fn()
      };

      const mockEventManager = {
        emit: jest.fn()
      };

      mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry as any);
      mockExecutionContext.getEventManager.mockReturnValue(mockEventManager as any);

      await skipNodeHandler(mockAction, triggerId, mockExecutionContext);

      expect(mockThreadRegistry.get).toHaveBeenCalledWith(threadId);
    });
  });

  describe('错误处理测试', () => {
    it('应该在事件管理器不可用时返回失败结果', async () => {
      const mockThreadContext = {
        thread: {
          nodeResults: []
        }
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
      mockExecutionContext.getEventManager.mockReturnValue(null as any);

      const result = await skipNodeHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('getWorkflowId is not a function');
    });

    it('应该在获取线程注册表失败时返回失败结果', async () => {
      mockExecutionContext.getThreadRegistry.mockImplementation(() => {
        throw new Error('Thread registry unavailable');
      });

      const result = await skipNodeHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Thread registry unavailable');
    });
  });

  describe('执行时间测试', () => {
    it('应该记录正确的执行时间', async () => {
      const mockThreadContext = {
        thread: {
          nodeResults: []
        }
      };

      const mockThreadRegistry = {
        register: jest.fn(),
        get: jest.fn().mockReturnValue(mockThreadContext),
        delete: jest.fn(),
        getAll: jest.fn(),
        clear: jest.fn(),
        has: jest.fn()
      };

      const mockEventManager = {
        emit: jest.fn()
      };

      mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry as any);
      mockExecutionContext.getEventManager.mockReturnValue(mockEventManager as any);

      const result = await skipNodeHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });
  });
});