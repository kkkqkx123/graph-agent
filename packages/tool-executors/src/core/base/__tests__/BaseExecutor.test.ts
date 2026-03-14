/**
 * BaseExecutor 单元测试
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { BaseExecutor } from '../BaseExecutor.js';
import { ParameterValidator } from '../ParameterValidator.js';
import { RetryStrategy } from '../RetryStrategy.js';
import { TimeoutController } from '../TimeoutController.js';
import type { Tool, ToolExecutionResult } from '@modular-agent/types';
import { RuntimeValidationError, TimeoutError, NetworkError } from '@modular-agent/types';

// 创建具体的执行器实现用于测试
class TestExecutor extends BaseExecutor {
  private mockExecute: Mock;

  constructor(
    mockExecute: Mock,
    validator?: ParameterValidator,
    retryStrategy?: RetryStrategy,
    timeoutController?: TimeoutController
  ) {
    super(validator, retryStrategy, timeoutController);
    this.mockExecute = mockExecute;
  }

  protected async doExecute(
    tool: Tool,
    parameters: Record<string, any>,
    threadId?: string
  ): Promise<any> {
    return this.mockExecute(tool, parameters, threadId);
  }

  getExecutorType(): string {
    return 'test-executor';
  }
}

// 创建测试工具的辅助函数
const createTool = (params: {
  properties: Record<string, any>;
  required?: string[];
}): Tool => ({
  id: 'test-tool',
  name: 'Test Tool',
  type: 'builtin',
  description: 'A test tool',
  parameters: {
    type: 'object',
    properties: params.properties,
    required: params.required || []
  }
});

describe('BaseExecutor', () => {
  let mockExecute: Mock;
  let executor: TestExecutor;
  let tool: Tool;

  beforeEach(() => {
    mockExecute = vi.fn().mockResolvedValue({ data: 'success' });
    executor = new TestExecutor(mockExecute);
    tool = createTool({
      properties: {
        input: { type: 'string' }
      },
      required: ['input']
    });
  });

  describe('constructor', () => {
    it('应该使用默认组件创建实例', () => {
      const defaultExecutor = new TestExecutor(mockExecute);
      expect(defaultExecutor).toBeInstanceOf(BaseExecutor);
    });

    it('应该使用自定义组件创建实例', () => {
      const validator = new ParameterValidator();
      const retryStrategy = RetryStrategy.createNoRetry();
      const timeoutController = new TimeoutController(5000);

      const customExecutor = new TestExecutor(
        mockExecute,
        validator,
        retryStrategy,
        timeoutController
      );

      expect(customExecutor).toBeInstanceOf(BaseExecutor);
    });
  });

  describe('execute', () => {
    describe('成功执行', () => {
      it('应该成功执行并返回结果', async () => {
        mockExecute.mockResolvedValue({ data: 'result' });

        const result = await executor.execute(tool, { input: 'test' });

        expect(result.success).toBe(true);
        expect(result.result).toEqual({ data: 'result' });
        expect(result.retryCount).toBe(0);
        expect(result.executionTime).toBeGreaterThanOrEqual(0);
      });

      it('应该传递正确的参数给 doExecute', async () => {
        mockExecute.mockResolvedValue('success');

        await executor.execute(tool, { input: 'test-value' }, {}, 'thread-123');

        expect(mockExecute).toHaveBeenCalledWith(tool, { input: 'test-value' }, 'thread-123');
      });
    });

    describe('参数验证', () => {
      it('应该在参数验证失败时抛出错误', async () => {
        // 缺少必需参数
        try {
          await executor.execute(tool, {});
          expect.fail('Should have thrown RuntimeValidationError');
        } catch (error) {
          expect(error).toBeInstanceOf(RuntimeValidationError);
        }
      });

      it('应该在参数类型错误时抛出错误', async () => {
        // 类型错误
        try {
          await executor.execute(tool, { input: 123 });
          expect.fail('Should have thrown RuntimeValidationError');
        } catch (error) {
          expect(error).toBeInstanceOf(RuntimeValidationError);
        }
      });
    });

    describe('超时处理', () => {
      it('应该在超时后返回失败结果', async () => {
        mockExecute.mockImplementation(() =>
          new Promise(resolve => setTimeout(resolve, 10000))
        );

        const result = await executor.execute(
          tool,
          { input: 'test' },
          { timeout: 50 }
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('timeout');
      });

      it('应该使用选项中的超时时间', async () => {
        mockExecute.mockImplementation(() =>
          new Promise(resolve => setTimeout(resolve, 10000))
        );

        const result = await executor.execute(
          tool,
          { input: 'test' },
          { timeout: 50 }
        );

        expect(result.success).toBe(false);
      });
    });

    describe('重试机制', () => {
      it('应该在失败后重试', async () => {
        mockExecute
          .mockRejectedValueOnce(new NetworkError('Failed 1'))
          .mockRejectedValueOnce(new NetworkError('Failed 2'))
          .mockResolvedValue({ data: 'success' });

        const result = await executor.execute(
          tool,
          { input: 'test' },
          { retries: 3, retryDelay: 10, exponentialBackoff: false }
        );

        expect(result.success).toBe(true);
        // retryCount 表示最后一次失败时的迭代索引
        // 第一次失败 (i=0), 第二次失败 (i=1), 第三次成功 (i=2)
        // 成功时返回的是上一次失败时更新的 retryCount = 1
        expect(result.retryCount).toBe(1);
        expect(mockExecute).toHaveBeenCalledTimes(3);
      });

      it('应该在重试次数用尽后返回失败', async () => {
        mockExecute.mockRejectedValue(new NetworkError('Always fails'));

        const result = await executor.execute(
          tool,
          { input: 'test' },
          { retries: 2, retryDelay: 10, exponentialBackoff: false }
        );

        expect(result.success).toBe(false);
        expect(result.retryCount).toBe(2);
        expect(mockExecute).toHaveBeenCalledTimes(3); // 初始 + 2 次重试
      });

      it('应该使用指数退避', async () => {
        mockExecute
          .mockRejectedValueOnce(new NetworkError('Failed 1'))
          .mockRejectedValueOnce(new NetworkError('Failed 2'))
          .mockResolvedValue({ data: 'success' });

        const result = await executor.execute(
          tool,
          { input: 'test' },
          { retries: 3, retryDelay: 10, exponentialBackoff: true }
        );

        expect(result.success).toBe(true);
      });

      it('应该对不可重试的错误立即失败', async () => {
        const nonRetryableError = new Error('Non-retryable error');
        mockExecute.mockRejectedValue(nonRetryableError);

        const result = await executor.execute(
          tool,
          { input: 'test' },
          { retries: 3, retryDelay: 10 }
        );

        expect(result.success).toBe(false);
        expect(mockExecute).toHaveBeenCalledTimes(1); // 不重试
      });
    });

    describe('中止信号', () => {
      it('应该支持中止信号', async () => {
        const abortController = new AbortController();

        mockExecute.mockImplementation(() =>
          new Promise(resolve => setTimeout(resolve, 10000))
        );

        const promise = executor.execute(
          tool,
          { input: 'test' },
          { signal: abortController.signal, timeout: 5000 }
        );

        // 中止执行
        abortController.abort();

        const result = await promise;

        expect(result.success).toBe(false);
        expect(result.error).toContain('aborted');
      });
    });

    describe('执行选项', () => {
      it('应该使用默认选项', async () => {
        mockExecute.mockResolvedValue('success');

        const result = await executor.execute(tool, { input: 'test' });

        expect(result.success).toBe(true);
      });

      it('应该覆盖默认选项', async () => {
        mockExecute.mockResolvedValue('success');

        const result = await executor.execute(
          tool,
          { input: 'test' },
          {
            timeout: 60000,
            retries: 5,
            retryDelay: 2000,
            exponentialBackoff: false
          }
        );

        expect(result.success).toBe(true);
      });
    });

    describe('错误处理', () => {
      it('应该正确处理非 Error 类型的错误', async () => {
        mockExecute.mockRejectedValue('string error');

        const result = await executor.execute(
          tool,
          { input: 'test' },
          { retries: 0 }
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('string error');
      });

      it('应该包含执行时间', async () => {
        mockExecute.mockImplementation(() =>
          new Promise(resolve => setTimeout(() => resolve('done'), 10))
        );

        const result = await executor.execute(tool, { input: 'test' });

        expect(result.executionTime).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('validateParameters', () => {
    it('应该验证有效参数', () => {
      expect(() => executor.validateParameters(tool, { input: 'test' })).not.toThrow();
    });

    it('应该在无效参数时抛出错误', () => {
      expect(() => executor.validateParameters(tool, {})).toThrow(RuntimeValidationError);
    });
  });

  describe('getExecutorType', () => {
    it('应该返回执行器类型', () => {
      expect(executor.getExecutorType()).toBe('test-executor');
    });
  });
});
