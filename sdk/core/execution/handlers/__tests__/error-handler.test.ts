/**
 * ErrorHandler 单元测试
 * 测试工作流内部错误处理器的各种功能
 */

import { handleNodeFailure, handleExecutionError } from '../error-handler';
import { ValidationError, ExecutionError, ToolError, NotFoundError } from '@modular-agent/types/errors';
import { ErrorHandlingStrategy } from '@modular-agent/types/thread';
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
      thread: {
        id: 'thread-123',
        workflowId: 'workflow-456',
        errorHandling: {
          strategy: ErrorHandlingStrategy.STOP_ON_ERROR
        }
      },
      getNavigator: jest.fn(),
      setCurrentNodeId: jest.fn(),
      getNodeResults: jest.fn().mockReturnValue([])
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
    });

    it('应该在STOP_ON_ERROR策略下停止执行', async () => {
      mockThreadContext.thread.errorHandling = {
        strategy: ErrorHandlingStrategy.STOP_ON_ERROR
      };

      await handleNodeFailure(mockThreadContext, mockNode, mockNodeResult);

      expect(mockThreadContext.setCurrentNodeId).not.toHaveBeenCalled();
    });

    it('应该在CONTINUE_ON_ERROR策略下继续执行', async () => {
      mockThreadContext.thread.errorHandling = {
        strategy: ErrorHandlingStrategy.CONTINUE_ON_ERROR
      };
      mockThreadContext.getNavigator = jest.fn().mockReturnValue({
        selectNextNodeWithContext: jest.fn().mockReturnValue('next-node-123')
      });

      await handleNodeFailure(mockThreadContext, mockNode, mockNodeResult);

      expect(mockThreadContext.setCurrentNodeId).toHaveBeenCalledWith('next-node-123');
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
    });

    it('应该处理非Error类型的错误', async () => {
      const error = 'String error';

      await handleExecutionError(mockThreadContext, error);

      expect(mockThreadContext.addError).toHaveBeenCalled();
      expect(mockEventManager.emit).toHaveBeenCalled();
    });
  });
});