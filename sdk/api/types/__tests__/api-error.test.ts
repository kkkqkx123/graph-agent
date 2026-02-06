/**
 * APIError单元测试
 */

import { describe, it, expect } from '@jest/globals';
import {
  APIError,
  APIErrorCode,
  DefaultErrorHandler,
  ErrorHandlerRegistry
} from '../api-error';

describe('APIError', () => {
  describe('构造函数', () => {
    it('应该创建基本的APIError实例', () => {
      const error = new APIError(
        APIErrorCode.RESOURCE_NOT_FOUND,
        'Resource not found'
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('APIError');
      expect(error.code).toBe(APIErrorCode.RESOURCE_NOT_FOUND);
      expect(error.message).toBe('Resource not found');
      expect(error.timestamp).toBeDefined();
    });

    it('应该支持详细信息', () => {
      const details = { resourceId: '123', resourceType: 'Workflow' };
      const error = new APIError(
        APIErrorCode.RESOURCE_NOT_FOUND,
        'Resource not found',
        details
      );

      expect(error.details).toEqual(details);
    });

    it('应该支持原始错误', () => {
      const originalError = new Error('Original error');
      const error = new APIError(
        APIErrorCode.INTERNAL_ERROR,
        'Wrapped error',
        undefined,
        originalError
      );

      expect(error.cause).toBe(originalError);
    });
  });

  describe('静态工厂方法', () => {
    it('应该创建资源未找到错误', () => {
      const error = APIError.resourceNotFound('Workflow', 'wf-123');

      expect(error.code).toBe(APIErrorCode.RESOURCE_NOT_FOUND);
      expect(error.message).toContain('Workflow');
      expect(error.message).toContain('wf-123');
      expect(error.details?.resourceType).toBe('Workflow');
      expect(error.details?.resourceId).toBe('wf-123');
    });

    it('应该创建资源已存在错误', () => {
      const error = APIError.resourceAlreadyExists('Tool', 'tool-456');

      expect(error.code).toBe(APIErrorCode.RESOURCE_ALREADY_EXISTS);
      expect(error.message).toContain('Tool');
      expect(error.message).toContain('tool-456');
    });

    it('应该创建验证失败错误', () => {
      const errors = ['Name is required', 'Type is invalid'];
      const error = APIError.validationFailed(errors);

      expect(error.code).toBe(APIErrorCode.RESOURCE_VALIDATION_FAILED);
      expect(error.message).toContain('Name is required');
      expect(error.message).toContain('Type is invalid');
      expect(error.details?.errors).toEqual(errors);
    });

    it('应该创建未授权错误', () => {
      const error = APIError.unauthorized('Access denied');

      expect(error.code).toBe(APIErrorCode.UNAUTHORIZED);
      expect(error.message).toBe('Access denied');
    });

    it('应该创建禁止访问错误', () => {
      const error = APIError.forbidden('Forbidden');

      expect(error.code).toBe(APIErrorCode.FORBIDDEN);
      expect(error.message).toBe('Forbidden');
    });

    it('应该创建内部错误', () => {
      const originalError = new Error('Database error');
      const error = APIError.internal('Internal server error', originalError);

      expect(error.code).toBe(APIErrorCode.INTERNAL_ERROR);
      expect(error.message).toBe('Internal server error');
      expect(error.cause).toBe(originalError);
    });

    it('应该创建无效参数错误', () => {
      const error = APIError.invalidParameter('limit', 'must be positive');

      expect(error.code).toBe(APIErrorCode.INVALID_PARAMETER);
      expect(error.message).toContain('limit');
      expect(error.message).toContain('must be positive');
      expect(error.details?.parameterName).toBe('limit');
      expect(error.details?.reason).toBe('must be positive');
    });

    it('应该创建缺失参数错误', () => {
      const error = APIError.missingParameter('apiKey');

      expect(error.code).toBe(APIErrorCode.MISSING_PARAMETER);
      expect(error.message).toContain('apiKey');
      expect(error.details?.parameterName).toBe('apiKey');
    });

    it('应该创建操作失败错误', () => {
      const error = APIError.operationFailed('create', 'validation failed');

      expect(error.code).toBe(APIErrorCode.OPERATION_FAILED);
      expect(error.message).toContain('create');
      expect(error.message).toContain('validation failed');
      expect(error.details?.operation).toBe('create');
      expect(error.details?.reason).toBe('validation failed');
    });

    it('应该创建冲突错误', () => {
      const details = { version: 2, currentVersion: 1 };
      const error = APIError.conflict('Version conflict', details);

      expect(error.code).toBe(APIErrorCode.CONFLICT);
      expect(error.message).toBe('Version conflict');
      expect(error.details).toEqual(details);
    });

    it('应该创建超时错误', () => {
      const error = APIError.timeout('query', 5000);

      expect(error.code).toBe(APIErrorCode.TIMEOUT);
      expect(error.message).toContain('query');
      expect(error.message).toContain('5000');
      expect(error.details?.operation).toBe('query');
      expect(error.details?.timeoutMs).toBe(5000);
    });
  });

  describe('toJSON', () => {
    it('应该转换为JSON对象', () => {
      const error = new APIError(
        APIErrorCode.RESOURCE_NOT_FOUND,
        'Not found',
        { id: '123' }
      );

      const json = error.toJSON();

      expect(json).toEqual({
        code: APIErrorCode.RESOURCE_NOT_FOUND,
        message: 'Not found',
        details: { id: '123' },
        timestamp: error.timestamp,
        requestId: undefined
      });
    });
  });

  describe('toString', () => {
    it('应该转换为字符串', () => {
      const error = new APIError(
        APIErrorCode.RESOURCE_NOT_FOUND,
        'Not found'
      );

      const str = error.toString();

      expect(str).toContain('[RESOURCE_NOT_FOUND]');
      expect(str).toContain('Not found');
    });

    it('应该包含详细信息', () => {
      const error = new APIError(
        APIErrorCode.RESOURCE_NOT_FOUND,
        'Not found',
        { id: '123' }
      );

      const str = error.toString();

      expect(str).toContain('Details:');
    });
  });

  describe('setRequestId', () => {
    it('应该设置请求ID', () => {
      const error = new APIError(
        APIErrorCode.RESOURCE_NOT_FOUND,
        'Not found'
      );

      error.setRequestId('req-123');

      expect((error as any).requestId).toBe('req-123');
    });
  });
});

describe('DefaultErrorHandler', () => {
  let handler: DefaultErrorHandler;

  beforeEach(() => {
    handler = new DefaultErrorHandler();
  });

  it('应该处理APIError', () => {
    const apiError = new APIError(
      APIErrorCode.RESOURCE_NOT_FOUND,
      'Not found'
    );

    const result = handler.handle(apiError);

    expect(result).toBe(apiError);
  });

  it('应该处理标准Error', () => {
    const error = new Error('Standard error');

    const result = handler.handle(error);

    expect(result).toBeInstanceOf(APIError);
    expect(result.code).toBe(APIErrorCode.INTERNAL_ERROR);
    expect(result.message).toBe('Standard error');
    expect(result.cause).toBe(error);
  });

  it('应该根据错误消息判断错误类型', () => {
    const error = new Error('Resource not found');

    const result = handler.handle(error);

    expect(result.code).toBe(APIErrorCode.RESOURCE_NOT_FOUND);
  });

  it('应该处理非Error对象', () => {
    const error = 'String error';

    const result = handler.handle(error);

    expect(result).toBeInstanceOf(APIError);
    expect(result.code).toBe(APIErrorCode.INTERNAL_ERROR);
    expect(result.message).toBe('String error');
  });

  it('应该支持错误上下文', () => {
    const error = new Error('Not found');
    const context = {
      operation: 'get',
      resourceType: 'Workflow',
      resourceId: 'wf-123'
    };

    const result = handler.handle(error, context);

    expect(result.details).toEqual(context);
  });
});

describe('ErrorHandlerRegistry', () => {
  let registry: ErrorHandlerRegistry;

  beforeEach(() => {
    registry = ErrorHandlerRegistry.getInstance();
    registry.reset();
  });

  it('应该是单例', () => {
    const instance1 = ErrorHandlerRegistry.getInstance();
    const instance2 = ErrorHandlerRegistry.getInstance();

    expect(instance1).toBe(instance2);
  });

  it('应该注册和获取错误处理器', () => {
    const customHandler = {
      handle: (error: unknown) => new APIError(
        APIErrorCode.INTERNAL_ERROR,
        'Custom handler'
      )
    };

    registry.register('CUSTOM', customHandler);

    const handler = registry.get('CUSTOM');

    expect(handler).toBe(customHandler);
  });

  it('应该返回默认处理器', () => {
    const handler = registry.get('NON_EXISTENT');

    expect(handler).toBeInstanceOf(DefaultErrorHandler);
  });

  it('应该设置默认处理器', () => {
    const customHandler = {
      handle: (error: unknown) => new APIError(
        APIErrorCode.INTERNAL_ERROR,
        'New default'
      )
    };

    registry.setDefaultHandler(customHandler);

    const handler = registry.get('ANY');

    expect(handler).toBe(customHandler);
  });
});