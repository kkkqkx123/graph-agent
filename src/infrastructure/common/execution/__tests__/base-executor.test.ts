import { AbstractBaseExecutor } from '../base-executor';
import { BaseExecutionContext } from '../execution-context';
import { ExecutionResult, ValidationResult } from '../base-executor.interface';

// 测试用的具体执行器实现
class TestExecutor extends AbstractBaseExecutor {
  readonly type = 'test';
  readonly name = 'Test Executor';
  readonly version = '1.0.0';
  readonly description = 'Test executor for unit testing';

  supports(executionType: string): boolean {
    return executionType === 'test';
  }

  protected async executeCore(context: BaseExecutionContext): Promise<unknown> {
    const { parameters } = context;
    
    if (parameters.shouldFail) {
      throw new Error('Test execution failed');
    }
    
    return parameters.result || 'success';
  }

  public async validate(context: BaseExecutionContext): Promise<ValidationResult> {
    const baseValidation = await super.validate(context);
    
    if (context.parameters.required && !context.parameters.value) {
      baseValidation.errors.push('required parameter is missing');
    }
    
    return baseValidation;
  }

  // 暴露受保护的方法用于测试
  public testResetMetrics() {
    this.resetMetrics();
  }

  public testClearExecutionHistory() {
    this.clearExecutionHistory();
  }

  public testGetCurrentMetrics() {
    return this.getCurrentMetrics();
  }
}

describe('AbstractBaseExecutor', () => {
  let executor: TestExecutor;

  beforeEach(() => {
    executor = new TestExecutor();
  });

  afterEach(() => {
    executor.testResetMetrics();
    executor.testClearExecutionHistory();
  });

  describe('execute', () => {
    it('should execute successfully with valid context', async () => {
      const context = new BaseExecutionContext(
        'test-execution-1',
        'test',
        { result: 'test-result' }
      );

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBe('test-result');
      expect(result.duration).toBeGreaterThan(0);
      expect(result.metrics).toBeDefined();
    });

    it('should handle execution failure', async () => {
      const context = new BaseExecutionContext(
        'test-execution-2',
        'test',
        { shouldFail: true }
      );

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Test execution failed');
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should handle validation failure', async () => {
      const context = new BaseExecutionContext(
        'test-execution-3',
        'test',
        { required: true }
      );

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('执行参数验证失败');
    });

    it('should collect metrics during execution', async () => {
      const context = new BaseExecutionContext(
        'test-execution-4',
        'test',
        { result: 'success' }
      );

      await executor.execute(context);
      const stats = await executor.getStatistics();

      expect(stats.totalExecutions).toBe(1);
      expect(stats.successfulExecutions).toBe(1);
      expect(stats.failedExecutions).toBe(0);
      expect(stats.successRate).toBe(100);
    });
  });

  describe('validate', () => {
    it('should validate basic context requirements', async () => {
      const validContext = new BaseExecutionContext('test', 'test');
      const result = await executor.validate(validContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject context without executionId', async () => {
      const invalidContext = new BaseExecutionContext('', 'test');
      const result = await executor.validate(invalidContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('执行ID不能为空');
    });

    it('should reject context without executionType', async () => {
      const invalidContext = new BaseExecutionContext('test', '');
      const result = await executor.validate(invalidContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('执行类型不能为空');
    });
  });

  describe('getStatus', () => {
    it('should return completed status for existing execution', async () => {
      const context = new BaseExecutionContext('test-execution-5', 'test');
      await executor.execute(context);

      const status = await executor.getStatus('test-execution-5');

      expect(status.status).toBe('completed');
      expect(status.progress).toBe(100);
    });

    it('should return completed status for non-existing execution', async () => {
      const status = await executor.getStatus('non-existing');

      expect(status.status).toBe('completed');
      expect(status.message).toBe('执行记录不存在');
    });
  });

  describe('cancel', () => {
    it('should cancel execution and record metrics', async () => {
      const result = await executor.cancel('test-execution-6', 'Test cancellation');

      expect(result).toBe(true);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const health = await executor.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.message).toBe('执行器运行正常');
      expect(health.latency).toBeGreaterThanOrEqual(0);
      expect(health.lastChecked).toBeInstanceOf(Date);
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics', async () => {
      // 执行一些测试
      const context1 = new BaseExecutionContext('test-1', 'test', { result: 'success' });
      const context2 = new BaseExecutionContext('test-2', 'test', { shouldFail: true });

      await executor.execute(context1);
      await executor.execute(context2);

      const stats = await executor.getStatistics();

      expect(stats.totalExecutions).toBe(2);
      expect(stats.successfulExecutions).toBe(1);
      expect(stats.failedExecutions).toBe(1);
      expect(stats.successRate).toBe(50);
      expect(stats.failureRate).toBe(50);
      expect(stats.averageExecutionTime).toBeGreaterThan(0);
    });

    it('should filter statistics by time range', async () => {
      const context = new BaseExecutionContext('test-3', 'test', { result: 'success' });
      await executor.execute(context);

      const now = new Date();
      const future = new Date(now.getTime() + 60000); // 1分钟后
      const stats = await executor.getStatistics(now, future);

      expect(stats.totalExecutions).toBe(0); // 应该没有记录在未来的时间范围内
    });
  });

  describe('supports', () => {
    it('should return true for supported execution type', () => {
      expect(executor.supports('test')).toBe(true);
    });

    it('should return false for unsupported execution type', () => {
      expect(executor.supports('unsupported')).toBe(false);
    });
  });

  describe('metrics collection', () => {
    it('should collect execution metrics', async () => {
      const context = new BaseExecutionContext('test-7', 'test', { result: 'success' });
      await executor.execute(context);

      const metrics = executor.testGetCurrentMetrics();
      expect(metrics['execution_success']).toBe(1);
      expect(metrics['execution_duration']).toBeGreaterThan(0);
    });

    it('should reset metrics', async () => {
      const context = new BaseExecutionContext('test-8', 'test', { result: 'success' });
      await executor.execute(context);

      executor.testResetMetrics();
      const metrics = executor.testGetCurrentMetrics();
      expect(Object.keys(metrics)).toHaveLength(0);
    });
  });
});