/**
 * Error Utils 单元测试
 * 测试错误处理工具函数
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  logError,
  emitErrorEvent,
  handleError
} from '../error-utils.js';
import { SDKError } from '@modular-agent/types';
import type { EventManager } from '../../managers/event-manager.js';

// Mock logger
vi.mock('../../../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  }
}));

// Mock event builders
vi.mock('../event/builders/index.js', () => ({
  buildErrorEvent: vi.fn((params) => ({
    type: 'ERROR',
    ...params
  }))
}));

// Mock event emitter
vi.mock('../event/event-emitter.js', () => ({
  safeEmit: vi.fn()
}));

describe('Error Utils', () => {
  let mockEventManager: EventManager;
  let mockSDKError: SDKError;
  let mockLogger: any;
  let mockSafeEmit: any;

  beforeEach(async () => {
    // 重置 mocks
    vi.clearAllMocks();

    // 获取 mocked modules
    const { logger } = await import('../../../utils/logger.js');
    const { safeEmit } = await import('../event/event-emitter.js');

    mockLogger = logger;
    mockSafeEmit = safeEmit;

    // Mock event manager
    mockEventManager = {
      emit: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      off: vi.fn(),
      waitFor: vi.fn()
    } as unknown as EventManager;

    // 创建测试用的 SDKError
    mockSDKError = new SDKError(
      'Test error message',
      'error',
      { threadId: 'test-thread', workflowId: 'test-workflow', nodeId: 'test-node' },
      new Error('Original error')
    );
  });

  describe('logError', () => {
    it('应该使用 logger.error 记录 error 级别的错误', () => {
      const error = new SDKError('Test error', 'error', {});
      const context = { threadId: 'test-thread' };

      logError(error, context);

      expect(mockLogger.error).toHaveBeenCalledWith('Test error', {
        errorType: 'SDKError',
        errorMessage: 'Test error',
        severity: 'error',
        threadId: 'test-thread'
      });
    });

    it('应该使用 logger.warn 记录 warning 级别的错误', () => {
      const error = new SDKError('Test warning', 'warning', {});
      const context = { threadId: 'test-thread' };

      logError(error, context);

      expect(mockLogger.warn).toHaveBeenCalledWith('Test warning', {
        errorType: 'SDKError',
        errorMessage: 'Test warning',
        severity: 'warning',
        threadId: 'test-thread'
      });
    });

    it('应该使用 logger.info 记录 info 级别的错误', () => {
      const error = new SDKError('Test info', 'info', {});
      const context = { threadId: 'test-thread' };

      logError(error, context);

      expect(mockLogger.info).toHaveBeenCalledWith('Test info', {
        errorType: 'SDKError',
        errorMessage: 'Test info',
        severity: 'info',
        threadId: 'test-thread'
      });
    });

    it('应该不提供 context 也能正常工作', () => {
      const error = new SDKError('Test error', 'error', {});

      logError(error);

      expect(mockLogger.error).toHaveBeenCalledWith('Test error', {
        errorType: 'SDKError',
        errorMessage: 'Test error',
        severity: 'error'
      });
    });

    it('应该包含所有提供的 context 字段', () => {
      const error = new SDKError('Test error', 'error', {});
      const context = {
        threadId: 'test-thread',
        workflowId: 'test-workflow',
        nodeId: 'test-node',
        additionalField: 'additional-value'
      };

      logError(error, context);

      expect(mockLogger.error).toHaveBeenCalledWith('Test error', expect.objectContaining({
        threadId: 'test-thread',
        workflowId: 'test-workflow',
        nodeId: 'test-node',
        additionalField: 'additional-value'
      }));
    });
  });

  describe('emitErrorEvent', () => {
    it('应该使用 safeEmit 触发错误事件', async () => {
      await emitErrorEvent(mockEventManager, {
        threadId: 'test-thread',
        workflowId: 'test-workflow',
        nodeId: 'test-node',
        error: mockSDKError
      });

      expect(mockSafeEmit).toHaveBeenCalledWith(
        mockEventManager,
        expect.objectContaining({
          type: 'ERROR',
          threadId: 'test-thread',
          workflowId: 'test-workflow',
          nodeId: 'test-node',
          error: mockSDKError
        })
      );
    });

    it('应该能处理可选的 nodeId 参数', async () => {
      await emitErrorEvent(mockEventManager, {
        threadId: 'test-thread',
        workflowId: 'test-workflow',
        error: mockSDKError
      });

      expect(mockSafeEmit).toHaveBeenCalledWith(
        mockEventManager,
        expect.objectContaining({
          type: 'ERROR',
          threadId: 'test-thread',
          workflowId: 'test-workflow',
          error: mockSDKError
        })
      );
    });

    it('应该能处理 undefined eventManager', async () => {
      await emitErrorEvent(undefined, {
        threadId: 'test-thread',
        workflowId: 'test-workflow',
        error: mockSDKError
      });

      expect(mockSafeEmit).toHaveBeenCalledWith(
        undefined,
        expect.any(Object)
      );
    });
  });

  describe('handleError', () => {
    it('应该同时记录日志和触发事件', async () => {
      await handleError(mockEventManager, mockSDKError, {
        threadId: 'test-thread',
        workflowId: 'test-workflow',
        nodeId: 'test-node'
      });

      // 验证日志记录
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Test error message',
        expect.objectContaining({
          threadId: 'test-thread',
          workflowId: 'test-workflow',
          nodeId: 'test-node'
        })
      );

      // 验证事件触发
      expect(mockSafeEmit).toHaveBeenCalledWith(
        mockEventManager,
        expect.objectContaining({
          type: 'ERROR',
          threadId: 'test-thread',
          workflowId: 'test-workflow',
          nodeId: 'test-node'
        })
      );
    });

    it('应该正确处理 warning 级别的错误', async () => {
      const warningError = new SDKError('Warning message', 'warning', {});

      await handleError(mockEventManager, warningError, {
        threadId: 'test-thread',
        workflowId: 'test-workflow'
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Warning message',
        expect.any(Object)
      );
    });

    it('应该正确处理 info 级别的错误', async () => {
      const infoError = new SDKError('Info message', 'info', {});

      await handleError(mockEventManager, infoError, {
        threadId: 'test-thread',
        workflowId: 'test-workflow'
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Info message',
        expect.any(Object)
      );
    });

    it('应该能处理可选的 nodeId 参数', async () => {
      await handleError(mockEventManager, mockSDKError, {
        threadId: 'test-thread',
        workflowId: 'test-workflow'
      });

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockSafeEmit).toHaveBeenCalled();
    });

    it('应该能处理 undefined eventManager', async () => {
      await handleError(undefined, mockSDKError, {
        threadId: 'test-thread',
        workflowId: 'test-workflow'
      });

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockSafeEmit).toHaveBeenCalledWith(
        undefined,
        expect.any(Object)
      );
    });
  });

  describe('边界情况', () => {
    it('应该处理空字符串的 context 字段', () => {
      const error = new SDKError('Test error', 'error', {});
      const context = { threadId: '', workflowId: '', nodeId: '' };

      logError(error, context);

      expect(mockLogger.error).toHaveBeenCalledWith('Test error', expect.objectContaining({
        threadId: '',
        workflowId: '',
        nodeId: ''
      }));
    });

    it('应该处理复杂的 context 对象', () => {
      const error = new SDKError('Test error', 'error', {});
      const context = {
        threadId: 'test-thread',
        nested: {
          field1: 'value1',
          field2: 'value2'
        },
        array: [1, 2, 3]
      };

      logError(error, context);

      expect(mockLogger.error).toHaveBeenCalledWith('Test error', expect.objectContaining({
        threadId: 'test-thread',
        nested: expect.any(Object),
        array: expect.any(Array)
      }));
    });

    it('应该处理 Error 对象作为 cause', () => {
      const cause = new Error('Cause error');
      const error = new SDKError('Test error', 'error', {}, cause);

      logError(error, { threadId: 'test-thread' });

      expect(mockLogger.error).toHaveBeenCalledWith('Test error', expect.any(Object));
    });
  });
});