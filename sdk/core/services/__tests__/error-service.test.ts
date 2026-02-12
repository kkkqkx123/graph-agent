/**
 * ErrorService 单元测试
 * 测试全局错误处理服务的各种功能
 */

import { ErrorService } from '../error-service';
import { ValidationError, ExecutionError, ToolError, NotFoundError } from '@modular-agent/types/errors';
import { EventManager } from '../event-manager';
import type { ErrorEvent } from '@modular-agent/types/events';

// Mock EventManager
jest.mock('../event-manager');

describe('ErrorService', () => {
  let errorService: ErrorService;
  let mockEventManager: jest.Mocked<EventManager>;

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

    // 创建 ErrorService 实例
    errorService = new ErrorService(mockEventManager);
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

      await errorService.handleError(error, context);

      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ERROR',
          threadId: 'thread-123',
          workflowId: 'workflow-456',
          nodeId: 'node-789',
          error: expect.any(ExecutionError)
        })
      );
    });

    it('应该根据operation类型包装为合适的SDKError', async () => {
      const error = new Error('Tool error');
      const context = {
        operation: 'tool_execution',
        toolName: 'test-tool',
        toolType: 'native'
      };

      await errorService.handleError(error, context);

      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(ToolError)
        })
      );
    });

    it('应该根据operation类型包装为ValidationError', async () => {
      const error = new Error('Validation error');
      const context = {
        operation: 'validation',
        field: 'test-field',
        value: 'test-value'
      };

      await errorService.handleError(error, context);

      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(ValidationError)
        })
      );
    });

    it('应该根据operation类型包装为NotFoundError', async () => {
      const error = new Error('Not found error');
      const context = {
        operation: 'find',
        resourceType: 'workflow',
        resourceId: 'workflow-123'
      };

      await errorService.handleError(error, context);

      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(NotFoundError)
        })
      );
    });

    it('应该直接返回SDKError', async () => {
      const error = new ValidationError('Test validation error', 'test-field');
      const context = {
        threadId: 'thread-123'
      };

      await errorService.handleError(error, context);

      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          error: error
        })
      );
    });

    it('应该触发错误事件', async () => {
      const error = new Error('Test error');
      const context = {
        threadId: 'thread-123',
        workflowId: 'workflow-456'
      };

      await errorService.handleError(error, context);

      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ERROR',
          threadId: 'thread-123',
          workflowId: 'workflow-456',
          error: expect.any(Error)
        })
      );
    });

    it('应该记录错误日志', async () => {
      const error = new Error('Test error');
      const context = {
        threadId: 'thread-123'
      };

      await errorService.handleError(error, context);

      // 验证日志记录（通过检查emit调用）
      expect(mockEventManager.emit).toHaveBeenCalled();
    });
  });

  describe('错误标准化', () => {
    it('应该根据operation包含tool包装为ToolError', async () => {
      const error = new Error('Tool execution failed');
      const context = {
        operation: 'tool_execution',
        toolName: 'my-tool',
        toolType: 'native'
      };

      await errorService.handleError(error, context);

      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(ToolError)
        })
      );
    });

    it('应该根据operation包含validation包装为ValidationError', async () => {
      const error = new Error('Invalid input');
      const context = {
        operation: 'validation',
        field: 'email',
        value: 'invalid-email'
      };

      await errorService.handleError(error, context);

      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(ValidationError)
        })
      );
    });

    it('应该根据operation包含find或get包装为NotFoundError', async () => {
      const error = new Error('Resource not found');
      const context = {
        operation: 'find',
        resourceType: 'user',
        resourceId: 'user-123'
      };

      await errorService.handleError(error, context);

      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(NotFoundError)
        })
      );
    });

    it('应该默认包装为ExecutionError', async () => {
      const error = new Error('General error');
      const context = {
        operation: 'unknown_operation',
        nodeId: 'node-123',
        workflowId: 'workflow-123'
      };

      await errorService.handleError(error, context);

      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(ExecutionError)
        })
      );
    });
  });
});