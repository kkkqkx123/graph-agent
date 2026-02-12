/**
 * ErrorHandler 单元测试
 * 测试工作流内部错误处理器的各种功能
 */

import { handleNodeFailure, handleExecutionError } from '../error-handler';
import { ValidationError, ExecutionError, ToolError, NotFoundError } from '@modular-agent/types/errors';
import { EventManager } from '../../../services/event-manager';
import type { Node } from '@modular-agent/types/node';
import type { NodeExecutionResult } from '@modular-agent/types/thread';
import { SingletonRegistry } from '../../context/singleton-registry';

// Mock EventManager
jest.mock('../../../services/event-manager');

describe('ErrorHandler', () => {
  let mockEventManager: jest.Mocked<EventManager>;
  let mockThreadContext: any;
  let mockNode: Node;
  let mockNodeResult: NodeExecutionResult;

  beforeEach(() => {
    // 重置所有 mock
    jest.clearAllMocks();

    // 初始化 SingletonRegistry
    SingletonRegistry.initialize();

    // 创建 mock EventManager
    mockEventManager = {
      emit: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      off: jest.fn(),
      once: jest.fn(),
      clear: jest.fn(),
      waitFor: jest.fn(),
      getListenerCount: jest.fn(),
      stopPropagation: jest.fn(),
      isPropagationStopped: jest.fn()
    } as any;

    // 注册 mock EventManager 到 SingletonRegistry
    SingletonRegistry.register('eventManager', mockEventManager);

    // 创建 mock ThreadContext
    mockThreadContext = {
      getThreadId: jest.fn().mockReturnValue('thread-123'),
      getWorkflowId: jest.fn().mockReturnValue('workflow-456'),
      addError: jest.fn(),
      setStatus: jest.fn(),
      setShouldStop: jest.fn(),
      thread: {
        id: 'thread-123',
        workflowId: 'workflow-456'
      }
    };

    // 创建 mock Node
    mockNode = {
      id: 'node-789',
      type: 'LLM',
      name: 'Test Node'
    } as any;

    // 创建 mock NodeExecutionResult
    mockNodeResult = {
      nodeId: 'node-789',
      status: 'FAILED',
      error: new Error('Test error')
    } as any;
  });

  describe('handleNodeFailure', () => {
    it('应该处理节点执行失败', async () => {
      await handleNodeFailure(mockThreadContext, mockNode, mockNodeResult);

      expect(mockThreadContext.addError).toHaveBeenCalled();
      expect(mockEventManager.emit).toHaveBeenCalled();
      expect(mockThreadContext.setStatus).toHaveBeenCalledWith('FAILED');
      expect(mockThreadContext.setShouldStop).toHaveBeenCalledWith(true);
      expect(mockThreadContext.thread.endTime).toBeDefined();
    });

    it('应该处理未定义的错误', async () => {
      mockNodeResult.error = undefined;

      await handleNodeFailure(mockThreadContext, mockNode, mockNodeResult);

      expect(mockThreadContext.addError).toHaveBeenCalled();
      expect(mockEventManager.emit).toHaveBeenCalled();
    });
  });

  describe('handleExecutionError', () => {
    it('应该处理执行错误', async () => {
      const error = new Error('Execution error');

      await handleExecutionError(mockThreadContext, error);

      expect(mockThreadContext.addError).toHaveBeenCalled();
      expect(mockEventManager.emit).toHaveBeenCalled();
      expect(mockThreadContext.setStatus).toHaveBeenCalledWith('FAILED');
      expect(mockThreadContext.setShouldStop).toHaveBeenCalledWith(true);
    });

    it('应该处理非Error类型的错误', async () => {
      const error = 'String error';

      await handleExecutionError(mockThreadContext, error);

      expect(mockThreadContext.addError).toHaveBeenCalled();
      expect(mockEventManager.emit).toHaveBeenCalled();
    });
  });
});