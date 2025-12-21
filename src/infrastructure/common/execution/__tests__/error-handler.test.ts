import { ErrorHandler, ErrorType, ErrorHandlerConfig } from '../error-handler';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = new ErrorHandler();
  });

  afterEach(() => {
    errorHandler.clearErrorHistory();
  });

  describe('handleError', () => {
    it('should handle validation errors correctly', () => {
      const error = new Error('Invalid input parameter');
      const result = errorHandler.handleError(error, 'test-execution-1');

      expect(result.handled).toBe(true);
      expect(result.shouldRetry).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.type).toBe(ErrorType.EXECUTION_ERROR);
      expect(result.error?.message).toBe('Invalid input parameter');
      expect(result.error?.executionId).toBe('test-execution-1');
    });

    it('should handle timeout errors correctly', () => {
      const error = new Error('Request timed out');
      const result = errorHandler.handleError(error);

      expect(result.handled).toBe(true);
      expect(result.shouldRetry).toBe(true);
      expect(result.error?.type).toBe(ErrorType.TIMEOUT_ERROR);
    });

    it('should handle network errors correctly', () => {
      const error = new Error('Network connection failed');
      const result = errorHandler.handleError(error);

      expect(result.handled).toBe(true);
      expect(result.shouldRetry).toBe(true);
      expect(result.error?.type).toBe(ErrorType.NETWORK_ERROR);
    });

    it('should handle validation errors without retry', () => {
      const error = new Error('Validation failed: missing required field');
      const result = errorHandler.handleError(error);

      expect(result.handled).toBe(true);
      expect(result.shouldRetry).toBe(false);
      expect(result.error?.type).toBe(ErrorType.VALIDATION_ERROR);
    });

    it('should handle configuration errors without retry', () => {
      const error = new Error('Configuration error: invalid settings');
      const result = errorHandler.handleError(error);

      expect(result.handled).toBe(true);
      expect(result.shouldRetry).toBe(false);
      expect(result.error?.type).toBe(ErrorType.CONFIGURATION_ERROR);
    });

    it('should handle unknown errors', () => {
      const error = 'Unknown error string';
      const result = errorHandler.handleError(error);

      expect(result.handled).toBe(true);
      expect(result.shouldRetry).toBe(true);
      expect(result.error?.type).toBe(ErrorType.EXECUTION_ERROR);
      expect(result.error?.message).toBe('Unknown error string');
    });

    it('should extract error code from error object', () => {
      const error = new Error('Test error') as any;
      error.code = 'E001';
      const result = errorHandler.handleError(error);

      expect(result.error?.code).toBe('E001');
    });

    it('should extract error details from error object', () => {
      const error = new Error('Test error') as any;
      error.detail = 'Additional error information';
      error.context = { userId: 123 };
      const result = errorHandler.handleError(error);

      expect(result.error?.details).toEqual({
        detail: 'Additional error information',
        context: { userId: 123 }
      });
    });
  });

  describe('retry logic', () => {
    it('should allow retry for retryable errors within limit', () => {
      const config: ErrorHandlerConfig = {
        maxRetries: 3,
        retryDelay: 100
      };
      const retryHandler = new ErrorHandler(config);

      const error = new Error('Network timeout');
      
      // 第一次错误
      const result1 = retryHandler.handleError(error, 'test-1');
      expect(result1.shouldRetry).toBe(true);

      // 第二次错误
      const result2 = retryHandler.handleError(error, 'test-1');
      expect(result2.shouldRetry).toBe(true);

      // 第三次错误
      const result3 = retryHandler.handleError(error, 'test-1');
      expect(result3.shouldRetry).toBe(true);

      // 第四次错误 - 超过重试限制
      const result4 = retryHandler.handleError(error, 'test-1');
      expect(result4.shouldRetry).toBe(false);
    });

    it('should not retry non-retryable errors', () => {
      const error = new Error('Validation failed');
      const result = errorHandler.handleError(error, 'test-2');

      expect(result.shouldRetry).toBe(false);
    });

    it('should reset retry count for different execution IDs', () => {
      const error = new Error('Network timeout');
      
      // 对不同执行ID的错误应该独立计算重试次数
      const result1 = errorHandler.handleError(error, 'test-3');
      const result2 = errorHandler.handleError(error, 'test-4');

      expect(result1.shouldRetry).toBe(true);
      expect(result2.shouldRetry).toBe(true);
    });
  });

  describe('getErrorStatistics', () => {
    it('should return correct error statistics', () => {
      // 添加一些错误
      errorHandler.handleError(new Error('Network error'));
      errorHandler.handleError(new Error('Validation error'));
      errorHandler.handleError(new Error('Timeout error'));
      errorHandler.handleError(new Error('Network error'));

      const stats = errorHandler.getErrorStatistics();

      expect(stats.totalErrors).toBe(4);
      expect(stats.byType[ErrorType.NETWORK_ERROR]).toBe(2);
      expect(stats.byType[ErrorType.VALIDATION_ERROR]).toBe(1);
      expect(stats.byType[ErrorType.TIMEOUT_ERROR]).toBe(1);
    });

    it('should filter errors by time window', async () => {
      // 添加一些错误
      errorHandler.handleError(new Error('Error 1'));
      
      // 等待一小段时间
      await new Promise(resolve => setTimeout(resolve, 10));
      
      errorHandler.handleError(new Error('Error 2'));

      // 获取最近10ms的统计
      const stats = errorHandler.getErrorStatistics(10);

      expect(stats.totalErrors).toBe(1); // 只有最近的错误
    });

    it('should calculate error rate correctly', () => {
      const config: ErrorHandlerConfig = {
        maxRetries: 3
      };
      const handler = new ErrorHandler(config);

      // 在短时间内添加多个错误
      for (let i = 0; i < 10; i++) {
        handler.handleError(new Error(`Error ${i}`));
      }

      const stats = handler.getErrorStatistics(60000); // 1分钟窗口
      expect(stats.errorRate).toBeGreaterThan(0);
    });
  });

  describe('configuration', () => {
    it('should use custom configuration', () => {
      const config: ErrorHandlerConfig = {
        maxRetries: 5,
        retryDelay: 2000,
        timeout: 60000,
        logErrors: false,
        notifyOnCritical: true
      };

      const customHandler = new ErrorHandler(config);
      const retrievedConfig = customHandler.getConfig();

      expect(retrievedConfig.maxRetries).toBe(5);
      expect(retrievedConfig.retryDelay).toBe(2000);
      expect(retrievedConfig.timeout).toBe(60000);
      expect(retrievedConfig.logErrors).toBe(false);
      expect(retrievedConfig.notifyOnCritical).toBe(true);
    });

    it('should update configuration', () => {
      errorHandler.updateConfig({ maxRetries: 10 });
      const config = errorHandler.getConfig();

      expect(config.maxRetries).toBe(10);
    });
  });

  describe('error history management', () => {
    it('should clear error history', () => {
      errorHandler.handleError(new Error('Test error'));
      expect(errorHandler.getErrorStatistics().totalErrors).toBe(1);

      errorHandler.clearErrorHistory();
      expect(errorHandler.getErrorStatistics().totalErrors).toBe(0);
    });

    it('should limit error history size', () => {
      // 添加大量错误，测试历史记录限制
      for (let i = 0; i < 1500; i++) {
        errorHandler.handleError(new Error(`Error ${i}`));
      }

      const stats = errorHandler.getErrorStatistics();
      expect(stats.totalErrors).toBeLessThanOrEqual(1000); // 应该被限制在1000以内
    });
  });

  describe('static factory methods', () => {
    it('should create handler with create method', () => {
      const handler = ErrorHandler.create({
        maxRetries: 5
      });

      expect(handler).toBeInstanceOf(ErrorHandler);
      expect(handler.getConfig().maxRetries).toBe(5);
    });

    it('should create quick handler with createQuickHandler method', () => {
      const quickHandler = ErrorHandler.createQuickHandler({
        maxRetries: 3
      });

      expect(typeof quickHandler).toBe('function');
      
      const result = quickHandler(new Error('Test error'));
      expect(result.handled).toBe(true);
    });
  });

  describe('error classification', () => {
    it('should classify errors correctly by message content', () => {
      const testCases = [
        { message: 'validation failed', expectedType: ErrorType.VALIDATION_ERROR },
        { message: 'request timed out', expectedType: ErrorType.TIMEOUT_ERROR },
        { message: 'network connection lost', expectedType: ErrorType.NETWORK_ERROR },
        { message: 'resource not available', expectedType: ErrorType.RESOURCE_ERROR },
        { message: 'configuration invalid', expectedType: ErrorType.CONFIGURATION_ERROR }
      ];

      testCases.forEach(({ message, expectedType }) => {
        const error = new Error(message);
        const result = errorHandler.handleError(error);
        expect(result.error?.type).toBe(expectedType);
      });
    });
  });
});