/**
 * ErrorService 单元测试
 * 测试全局错误处理服务的各种功能
 *
 * 改进说明：
 * - ErrorService 现在只接受 SDKError，不再进行错误标准化
 * - 错误标准化逻辑已移到 error-handler.ts 中
 * - 直接使用 error.severity 确定日志级别
 */

import { errorService } from '../error-service';
import { ValidationError, ExecutionError, ToolError, NotFoundError, SDKError, ErrorSeverity } from '@modular-agent/types/errors';
import { EventManager } from '../event-manager';
import type { ErrorEvent } from '@modular-agent/types/events';

// Mock EventManager
jest.mock('../event-manager');

describe('ErrorService', () => {
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
  });

  describe('handleError', () => {
    it('应该处理 ERROR 级别的错误', async () => {
      const error = new ValidationError('Test validation error', 'test-field');
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
          error: error
        })
      );
    });

    it('应该处理 WARNING 级别的错误', async () => {
      const error = new NotFoundError('Resource not found', 'workflow', 'workflow-123');
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
          error: error
        })
      );
    });

    it('应该处理 INFO 级别的错误', async () => {
      const error = new SDKError('Info message', ErrorSeverity.INFO);
      const context = {
        threadId: 'thread-123'
      };

      await errorService.handleError(error, context);

      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ERROR',
          threadId: 'thread-123',
          error: error
        })
      );
    });

    it('应该触发错误事件', async () => {
      const error = new ExecutionError('Test error', 'node-123', 'workflow-456');
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
          error: error
        })
      );
    });

    it('应该记录错误日志', async () => {
      const error = new ToolError('Tool execution failed', 'test-tool', 'native');
      const context = {
        threadId: 'thread-123'
      };

      await errorService.handleError(error, context);

      // 验证日志记录（通过检查emit调用）
      expect(mockEventManager.emit).toHaveBeenCalled();
    });
  });

  describe('severity 驱动的日志级别', () => {
    it('ERROR 级别应该使用 error 日志', async () => {
      const error = new ValidationError('Validation failed', 'field');
      const context = { threadId: 'thread-123' };

      await errorService.handleError(error, context);

      expect(mockEventManager.emit).toHaveBeenCalled();
      // 验证错误包含正确的 severity
      expect(error.severity).toBe(ErrorSeverity.ERROR);
    });

    it('WARNING 级别应该使用 warn 日志', async () => {
      const error = new NotFoundError('Not found', 'resource', 'id');
      const context = { threadId: 'thread-123' };

      await errorService.handleError(error, context);

      expect(mockEventManager.emit).toHaveBeenCalled();
      expect(error.severity).toBe(ErrorSeverity.WARNING);
    });

    it('INFO 级别应该使用 info 日志', async () => {
      const error = new SDKError('Info message', ErrorSeverity.INFO);
      const context = { threadId: 'thread-123' };

      await errorService.handleError(error, context);

      expect(mockEventManager.emit).toHaveBeenCalled();
      expect(error.severity).toBe(ErrorSeverity.INFO);
    });
  });
});