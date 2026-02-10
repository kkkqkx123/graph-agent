/**
 * 跳过节点处理函数单元测试
 */

import { skipNodeHandler } from '../skip-node-handler';
import type { TriggerAction, TriggerExecutionResult } from '../../../../../types/trigger';
import { TriggerActionType } from '../../../../../types/trigger';
import { ValidationError, NotFoundError } from '../../../../../types/errors';
import { EventType } from '../../../../../types/events';
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
    it('应该成功跳过节点', async () => {
      const mockThreadContext = {
        thread: {
          nodeResults: []
        },
        getWorkflowId: jest.fn().mockReturnValue('workflow-123'),
        getThreadId: jest.fn().mockReturnValue(threadId)
      };

      const mockThreadRegistry = {
        get: jest.fn().mockReturnValue(mockThreadContext)
      };

      const mockEventManager = {
        emit: jest.fn().mockResolvedValue(undefined)
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
      expect(result.executionTime).toBeGreaterThan(0);

      // 验证节点结果被添加
      expect(mockThreadContext.thread.nodeResults).toHaveLength(1);
      expect(mockThreadContext.thread.nodeResults[0]).toMatchObject({
        nodeId,
        nodeType: 'UNKNOWN',
        status: 'SKIPPED',
        step: 1,
        executionTime: 0
      });

      // 验证事件被触发
      expect(mockEventManager.emit).toHaveBeenCalledWith({
        type: EventType.NODE_COMPLETED,
        timestamp: expect.any(Number),
        workflowId: 'workflow-123',
        threadId,
        nodeId,
        output: null,
        executionTime: 0
      });
    });

    it('应该使用默认执行上下文当未提供时', async () => {
      const mockThreadContext = {
        thread: {
          nodeResults: []
        },
        getWorkflowId: jest.fn().mockReturnValue('workflow-123'),
        getThreadId: jest.fn().mockReturnValue(threadId)
      };

      const mockThreadRegistry = {
        get: jest.fn().mockReturnValue(mockThreadContext)
      };

      const mockEventManager = {
        emit: jest.fn().mockResolvedValue(undefined)
      };

      mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry as any);
      mockExecutionContext.getEventManager.mockReturnValue(mockEventManager as any);

      const result = await skipNodeHandler(mockAction, triggerId);

      expect(ExecutionContext.createDefault).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('应该正确处理非空的nodeResults数组', async () => {
      const mockThreadContext = {
        thread: {
          nodeResults: [
            { step: 1, nodeId: 'prev-node', nodeType: 'START', status: 'COMPLETED', timestamp: 123456 }
          ]
        },
        getWorkflowId: jest.fn().mockReturnValue('workflow-123'),
        getThreadId: jest.fn().mockReturnValue(threadId)
      };

      const mockThreadRegistry = {
        get: jest.fn().mockReturnValue(mockThreadContext)
      };

      const mockEventManager = {
        emit: jest.fn().mockResolvedValue(undefined)
      };

      mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry as any);
      mockExecutionContext.getEventManager.mockReturnValue(mockEventManager as any);

      await skipNodeHandler(mockAction, triggerId, mockExecutionContext);

      expect(mockThreadContext.thread.nodeResults).toHaveLength(2);
      expect((mockThreadContext.thread.nodeResults[1] as any).step).toBe(2);
    });
  });

  describe('参数验证测试', () => {
    it('应该在缺少threadId参数时返回失败结果', async () => {
      mockAction.parameters = {
        nodeId
      };

      const result = await skipNodeHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('threadId is required for SKIP_NODE action');
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('应该在缺少nodeId参数时返回失败结果', async () => {
      mockAction.parameters = {
        threadId
      };

      const result = await skipNodeHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('nodeId is required for SKIP_NODE action');
    });

    it('应该在threadId和nodeId都缺少时返回失败结果', async () => {
      mockAction.parameters = {};

      const result = await skipNodeHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('threadId is required for SKIP_NODE action');
    });

    it('应该在threadId为空字符串时返回失败结果', async () => {
      mockAction.parameters = {
        threadId: '',
        nodeId
      };

      const result = await skipNodeHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('threadId is required for SKIP_NODE action');
    });

    it('应该在nodeId为空字符串时返回失败结果', async () => {
      mockAction.parameters = {
        threadId,
        nodeId: ''
      };

      const result = await skipNodeHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('nodeId is required for SKIP_NODE action');
    });
  });

  describe('线程上下文测试', () => {
    it('应该在找不到线程上下文时返回失败结果', async () => {
      const mockThreadRegistry = {
        get: jest.fn().mockReturnValue(null)
      };

      mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry as any);

      const result = await skipNodeHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain(`ThreadContext not found: ${threadId}`);
    });

    it('应该正确调用线程注册表', async () => {
      const mockThreadContext = {
        thread: {
          nodeResults: []
        },
        getWorkflowId: jest.fn().mockReturnValue('workflow-123'),
        getThreadId: jest.fn().mockReturnValue(threadId)
      };

      const mockThreadRegistry = {
        get: jest.fn().mockReturnValue(mockThreadContext)
      };

      const mockEventManager = {
        emit: jest.fn().mockResolvedValue(undefined)
      };

      mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry as any);
      mockExecutionContext.getEventManager.mockReturnValue(mockEventManager as any);

      await skipNodeHandler(mockAction, triggerId, mockExecutionContext);

      expect(mockThreadRegistry.get).toHaveBeenCalledWith(threadId);
    });
  });

  describe('事件管理测试', () => {
    it('应该触发NODE_COMPLETED事件', async () => {
      const mockThreadContext = {
        thread: {
          nodeResults: []
        },
        getWorkflowId: jest.fn().mockReturnValue('workflow-123'),
        getThreadId: jest.fn().mockReturnValue(threadId)
      };

      const mockThreadRegistry = {
        get: jest.fn().mockReturnValue(mockThreadContext)
      };

      const mockEventManager = {
        emit: jest.fn().mockResolvedValue(undefined)
      };

      mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry as any);
      mockExecutionContext.getEventManager.mockReturnValue(mockEventManager as any);

      await skipNodeHandler(mockAction, triggerId, mockExecutionContext);

      expect(mockEventManager.emit).toHaveBeenCalledWith({
        type: EventType.NODE_COMPLETED,
        timestamp: expect.any(Number),
        workflowId: 'workflow-123',
        threadId,
        nodeId,
        output: null,
        executionTime: 0
      });
    });

    it('应该在事件管理器不可用时返回失败结果', async () => {
      const mockThreadContext = {
        thread: {
          nodeResults: []
        },
        getWorkflowId: jest.fn().mockReturnValue('workflow-123'),
        getThreadId: jest.fn().mockReturnValue(threadId)
      };

      const mockThreadRegistry = {
        get: jest.fn().mockReturnValue(mockThreadContext)
      };

      mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry as any);
      mockExecutionContext.getEventManager.mockReturnValue(null as any);

      const result = await skipNodeHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot read properties of null');
    });

    it('应该在事件触发失败时返回失败结果', async () => {
      const mockThreadContext = {
        thread: {
          nodeResults: []
        },
        getWorkflowId: jest.fn().mockReturnValue('workflow-123'),
        getThreadId: jest.fn().mockReturnValue(threadId)
      };

      const mockThreadRegistry = {
        get: jest.fn().mockReturnValue(mockThreadContext)
      };

      const mockEventManager = {
        emit: jest.fn().mockRejectedValue(new Error('Event emission failed'))
      };

      mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry as any);
      mockExecutionContext.getEventManager.mockReturnValue(mockEventManager as any);

      const result = await skipNodeHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Event emission failed');
    });
  });

  describe('错误处理测试', () => {
    it('应该在参数验证失败时返回失败结果', async () => {
      mockAction.parameters = {}; // 缺少threadId和nodeId

      const result = await skipNodeHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('threadId is required');
    });

    it('应该记录执行时间即使验证失败', async () => {
      mockAction.parameters = {}; // 缺少threadId和nodeId

      const result = await skipNodeHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.executionTime).toBeGreaterThan(0);
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
        },
        getWorkflowId: jest.fn().mockReturnValue('workflow-123'),
        getThreadId: jest.fn().mockReturnValue(threadId)
      };

      const mockThreadRegistry = {
        get: jest.fn().mockReturnValue(mockThreadContext)
      };

      const mockEventManager = {
        emit: jest.fn().mockResolvedValue(undefined)
      };

      mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry as any);
      mockExecutionContext.getEventManager.mockReturnValue(mockEventManager as any);

      const beforeTime = Date.now();
      const result = await skipNodeHandler(mockAction, triggerId, mockExecutionContext);
      const afterTime = Date.now();

      expect(result.executionTime).toBeGreaterThanOrEqual(beforeTime);
      expect(result.executionTime).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('边界情况测试', () => {
    it('应该处理不同的threadId和nodeId格式', async () => {
      const testIds = [
        { threadId: 'thread-1', nodeId: 'node-1' },
        { threadId: '12345', nodeId: '67890' },
        { threadId: 'custom-thread-id', nodeId: 'custom-node-id' },
        { threadId: 'thread_with_underscores', nodeId: 'node_with_underscores' }
      ];

      for (const { threadId: testThreadId, nodeId: testNodeId } of testIds) {
        mockAction.parameters = {
          threadId: testThreadId,
          nodeId: testNodeId
        };

        const mockThreadContext = {
          thread: {
            nodeResults: [] as any[]
          },
          getWorkflowId: jest.fn().mockReturnValue('workflow-123'),
          getThreadId: jest.fn().mockReturnValue(testThreadId)
        };

        const mockThreadRegistry = {
          get: jest.fn().mockReturnValue(mockThreadContext)
        };

        const mockEventManager = {
          emit: jest.fn().mockResolvedValue(undefined)
        };

        mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry as any);
        mockExecutionContext.getEventManager.mockReturnValue(mockEventManager as any);

        const result = await skipNodeHandler(mockAction, triggerId, mockExecutionContext);

        expect(result.success).toBe(true);
        expect(mockThreadRegistry.get).toHaveBeenCalledWith(testThreadId);
        expect((mockThreadContext.thread.nodeResults[0] as any).nodeId).toBe(testNodeId);
      }
    });

    it('应该处理不同的triggerId格式', async () => {
      const testTriggerIds = [
        'trigger-1',
        '12345',
        'skip-node-trigger',
        ''
      ];

      for (const testTriggerId of testTriggerIds) {
        mockAction.parameters = {
          threadId,
          nodeId
        };

        const mockThreadContext = {
          thread: {
            nodeResults: []
          },
          getWorkflowId: jest.fn().mockReturnValue('workflow-123'),
          getThreadId: jest.fn().mockReturnValue(threadId)
        };

        const mockThreadRegistry = {
          get: jest.fn().mockReturnValue(mockThreadContext)
        };

        const mockEventManager = {
          emit: jest.fn().mockResolvedValue(undefined)
        };

        mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry as any);
        mockExecutionContext.getEventManager.mockReturnValue(mockEventManager as any);

        const result = await skipNodeHandler(mockAction, testTriggerId, mockExecutionContext);

        expect(result.triggerId).toBe(testTriggerId);
        expect(result.success).toBe(true);
      }
    });

    it('应该处理额外的参数', async () => {
      mockAction.parameters = {
        threadId,
        nodeId,
        extraParam1: 'value1',
        extraParam2: 42
      };

      const mockThreadContext = {
        thread: {
          nodeResults: [] as any[]
        },
        getWorkflowId: jest.fn().mockReturnValue('workflow-123'),
        getThreadId: jest.fn().mockReturnValue(threadId)
      };

      const mockThreadRegistry = {
        get: jest.fn().mockReturnValue(mockThreadContext)
      };

      const mockEventManager = {
        emit: jest.fn().mockResolvedValue(undefined)
      };

      mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry as any);
      mockExecutionContext.getEventManager.mockReturnValue(mockEventManager as any);

      const result = await skipNodeHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(true);
      // 额外的参数应该被忽略，只使用threadId和nodeId
      expect(mockThreadRegistry.get).toHaveBeenCalledWith(threadId);
      expect((mockThreadContext.thread.nodeResults[0] as any).nodeId).toBe(nodeId);
    });
  });
});
