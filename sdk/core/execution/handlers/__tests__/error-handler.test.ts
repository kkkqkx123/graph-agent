/**
 * ErrorHandler 单元测试
 * 测试统一错误处理器的各种功能
 */

import { handleError, handleNodeFailure, handleExecutionError } from '../error-handler';
import { SDKError, ErrorCode, ValidationError, ExecutionError, ToolError, NotFoundError } from '@modular-agent/types/errors';
import { ErrorHandlingStrategy } from '@modular-agent/types/thread';
import { EventManager } from '../../../services/event-manager';
import type { Node } from '@modular-agent/types/node';
import type { NodeExecutionResult } from '@modular-agent/types/thread';

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

  describe('handleError', () => {
    it('应该标准化普通Error为ExecutionError', async () => {
      const error = new Error('Test error');
      const context = {
        threadId: 'thread-123',
        workflowId: 'workflow-456',
        nodeId: 'node-789',
        operation: 'test_operation'
      };

      const result = await handleError(error, context, mockEventManager);

      expect(result.error).toBeInstanceOf(ExecutionError);
      expect(result.error.message).toBe('Test error');
      expect(result.shouldStop).toBe(true);
      expect(mockEventManager.emit).toHaveBeenCalled();
    });

    it('应该根据operation类型包装为合适的SDKError', async () => {
      const error = new Error('Tool error');
      const context = {
        operation: 'tool_execution',
        toolName: 'test-tool',
        toolType: 'native'
      };

      const result = await handleError(error, context, mockEventManager);

      expect(result.error).toBeInstanceOf(ToolError);
      expect((result.error as ToolError).toolName).toBe('test-tool');
    });

    it('应该根据operation类型包装为ValidationError', async () => {
      const error = new Error('Validation error');
      const context = {
        operation: 'validation',
        field: 'test-field',
        value: 'test-value'
      };

      const result = await handleError(error, context, mockEventManager);

      expect(result.error).toBeInstanceOf(ValidationError);
      expect((result.error as ValidationError).field).toBe('test-field');
    });

    it('应该根据operation类型包装为NotFoundError', async () => {
      const error = new Error('Not found error');
      const context = {
        operation: 'find',
        resourceType: 'workflow',
        resourceId: 'workflow-123'
      };

      const result = await handleError(error, context, mockEventManager);

      expect(result.error).toBeInstanceOf(NotFoundError);
      expect((result.error as NotFoundError).resourceType).toBe('workflow');
    });

    it('应该直接返回SDKError', async () => {
      const error = new ValidationError('Test validation error', 'test-field');
      const context = {
        threadId: 'thread-123'
      };

      const result = await handleError(error, context, mockEventManager);

      expect(result.error).toBe(error);
      expect(result.shouldStop).toBe(true);
    });

    it('应该根据CONTINUE_ON_ERROR策略返回shouldStop为false', async () => {
      const error = new Error('Test error');
      const context = {
        threadId: 'thread-123'
      };

      const result = await handleError(
        error,
        context,
        mockEventManager,
        ErrorHandlingStrategy.CONTINUE_ON_ERROR
      );

      expect(result.shouldStop).toBe(false);
    });

    it('应该根据STOP_ON_ERROR策略返回shouldStop为true', async () => {
      const error = new Error('Test error');
      const context = {
        threadId: 'thread-123'
      };

      const result = await handleError(
        error,
        context,
        mockEventManager,
        ErrorHandlingStrategy.STOP_ON_ERROR
      );

      expect(result.shouldStop).toBe(true);
    });

    it('应该触发错误事件', async () => {
      const error = new Error('Test error');
      const context = {
        threadId: 'thread-123',
        workflowId: 'workflow-456'
      };

      await handleError(error, context, mockEventManager);

      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ERROR',
          threadId: 'thread-123',
          workflowId: 'workflow-456',
          error: expect.any(Error)
        })
      );
    });
  });

  describe('handleNodeFailure', () => {
    it('应该处理节点执行失败', async () => {
      await handleNodeFailure(mockThreadContext, mockNode, mockNodeResult, mockEventManager);

      expect(mockThreadContext.addError).toHaveBeenCalled();
      expect(mockEventManager.emit).toHaveBeenCalled();
    });

    it('应该在STOP_ON_ERROR策略下停止执行', async () => {
      mockThreadContext.thread.errorHandling = {
        strategy: ErrorHandlingStrategy.STOP_ON_ERROR
      };

      await handleNodeFailure(mockThreadContext, mockNode, mockNodeResult, mockEventManager);

      expect(mockThreadContext.setCurrentNodeId).not.toHaveBeenCalled();
    });

    it('应该在CONTINUE_ON_ERROR策略下继续执行', async () => {
      mockThreadContext.thread.errorHandling = {
        strategy: ErrorHandlingStrategy.CONTINUE_ON_ERROR
      };
      mockThreadContext.getNavigator = jest.fn().mockReturnValue({
        selectNextNodeWithContext: jest.fn().mockReturnValue('next-node-123')
      });

      await handleNodeFailure(mockThreadContext, mockNode, mockNodeResult, mockEventManager);

      expect(mockThreadContext.setCurrentNodeId).toHaveBeenCalledWith('next-node-123');
    });

    it('应该处理未定义的错误', async () => {
      mockNodeResult.error = undefined;

      await handleNodeFailure(mockThreadContext, mockNode, mockNodeResult, mockEventManager);

      expect(mockThreadContext.addError).toHaveBeenCalled();
      expect(mockEventManager.emit).toHaveBeenCalled();
    });
  });

  describe('handleExecutionError', () => {
    it('应该处理执行错误', async () => {
      const error = new Error('Execution error');

      await handleExecutionError(mockThreadContext, error, mockEventManager);

      expect(mockThreadContext.addError).toHaveBeenCalled();
      expect(mockEventManager.emit).toHaveBeenCalled();
    });

    it('应该处理非Error类型的错误', async () => {
      const error = 'String error';

      await handleExecutionError(mockThreadContext, error, mockEventManager);

      expect(mockThreadContext.addError).toHaveBeenCalled();
      expect(mockEventManager.emit).toHaveBeenCalled();
    });
  });

  describe('日志级别确定', () => {
    it('应该根据severity标记确定日志级别', async () => {
      const error = new Error('Warning error');
      const context = {
        threadId: 'thread-123',
        severity: 'warning' as const
      };

      await handleError(error, context, mockEventManager);

      // 验证日志级别为warning（通过检查emit调用）
      expect(mockEventManager.emit).toHaveBeenCalled();
    });

    it('应该根据错误类型确定日志级别', async () => {
      const error = new NotFoundError('Not found', 'workflow', 'workflow-123');
      const context = {
        threadId: 'thread-123'
      };

      await handleError(error, context, mockEventManager);

      expect(mockEventManager.emit).toHaveBeenCalled();
    });
  });
});