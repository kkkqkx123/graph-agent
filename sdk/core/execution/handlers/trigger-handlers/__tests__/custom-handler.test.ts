/**
 * 自定义动作处理函数单元测试
 */

import { customHandler } from '../custom-handler';
import type { TriggerAction, TriggerExecutionResult } from '@modular-agent/types/trigger';
import { TriggerActionType } from '@modular-agent/types/trigger';
import { ValidationError } from '@modular-agent/types/errors';

describe('custom-handler', () => {
  let mockAction: TriggerAction;
  const triggerId = 'trigger-123';

  beforeEach(() => {
    mockAction = {
      type: TriggerActionType.CUSTOM,
      parameters: {
        handler: jest.fn()
      }
    };
  });

  describe('基本功能测试', () => {
    it('应该成功执行自定义处理函数', async () => {
      const mockResult = { success: true, data: 'test result' };
      (mockAction.parameters['handler'] as jest.Mock).mockResolvedValue(mockResult);

      const result = await customHandler(mockAction, triggerId);

      expect(result).toMatchObject({
        triggerId,
        success: true,
        action: mockAction,
        result: {
          message: 'Custom action executed successfully',
          result: mockResult
        }
      });
      expect(result.executionTime).toBeGreaterThan(0);
      expect(mockAction.parameters['handler']).toHaveBeenCalledWith(mockAction.parameters);
    });

    it('应该正确处理自定义处理函数返回的同步结果', async () => {
      const mockResult = 'sync result';
      (mockAction.parameters['handler'] as jest.Mock).mockReturnValue(mockResult);

      const result = await customHandler(mockAction, triggerId);

      expect(result.success).toBe(true);
      expect(result.result).toMatchObject({
        message: 'Custom action executed successfully',
        result: mockResult
      });
    });

    it('应该正确处理自定义处理函数返回的null值', async () => {
      (mockAction.parameters['handler'] as jest.Mock).mockResolvedValue(null);

      const result = await customHandler(mockAction, triggerId);

      expect(result.success).toBe(true);
      expect(result.result).toMatchObject({
        message: 'Custom action executed successfully',
        result: null
      });
    });
  });

  describe('参数验证测试', () => {
    it('应该在缺少handler参数时返回失败结果', async () => {
      mockAction.parameters = {};

      const result = await customHandler(mockAction, triggerId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('handler is required and must be a function for CUSTOM action');
    });

    it('应该在handler参数不是函数时返回失败结果', async () => {
      mockAction.parameters = {
        handler: 'not a function'
      };

      const result = await customHandler(mockAction, triggerId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('handler is required and must be a function for CUSTOM action');
    });

    it('应该在handler参数为null时返回失败结果', async () => {
      mockAction.parameters = {
        handler: null
      };

      const result = await customHandler(mockAction, triggerId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('handler is required and must be a function for CUSTOM action');
    });

    it('应该在handler参数为undefined时返回失败结果', async () => {
      mockAction.parameters = {
        handler: undefined
      };

      const result = await customHandler(mockAction, triggerId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('handler is required and must be a function for CUSTOM action');
    });
  });

  describe('错误处理测试', () => {
    it('应该在自定义处理函数抛出错误时返回失败结果', async () => {
      const mockError = new Error('Custom handler failed');
      (mockAction.parameters['handler'] as jest.Mock).mockRejectedValue(mockError);

      const result = await customHandler(mockAction, triggerId);

      expect(result).toMatchObject({
        triggerId,
        success: false,
        action: mockAction,
        error: 'Custom handler failed'
      });
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('应该在自定义处理函数抛出非Error对象时返回失败结果', async () => {
      (mockAction.parameters['handler'] as jest.Mock).mockRejectedValue('String error');

      const result = await customHandler(mockAction, triggerId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('String error');
    });

    it('应该在自定义处理函数抛出null时返回失败结果', async () => {
      (mockAction.parameters['handler'] as jest.Mock).mockRejectedValue(null);

      const result = await customHandler(mockAction, triggerId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('null');
    });

    it('应该在自定义处理函数抛出undefined时返回失败结果', async () => {
      (mockAction.parameters['handler'] as jest.Mock).mockRejectedValue(undefined);

      const result = await customHandler(mockAction, triggerId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('undefined');
    });
  });

  describe('执行时间测试', () => {
    it('应该记录正确的执行时间', async () => {
      const startTime = Date.now();
      (mockAction.parameters['handler'] as jest.Mock).mockResolvedValue('test');

      const result = await customHandler(mockAction, triggerId);

      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      // 不检查上限，因为执行时间可能因系统负载而异
    });

    it('应该在异步处理时记录正确的执行时间', async () => {
      const delay = 50;
      (mockAction.parameters['handler'] as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('delayed'), delay))
      );

      const result = await customHandler(mockAction, triggerId);

      expect(result.executionTime).toBeGreaterThanOrEqual(delay);
      expect(result.executionTime).toBeGreaterThanOrEqual(delay);
      // 不检查上限，因为执行时间可能因系统负载而异
    });
  });

  describe('边界情况测试', () => {
    it('应该正确处理空的parameters对象', async () => {
      mockAction.parameters = {
        handler: jest.fn().mockResolvedValue('test')
      };

      const result = await customHandler(mockAction, triggerId);

      expect(result.success).toBe(true);
      expect(mockAction.parameters['handler']).toHaveBeenCalledWith(mockAction.parameters);
    });

    it('应该正确处理包含额外参数的parameters对象', async () => {
      mockAction.parameters = {
        handler: jest.fn().mockResolvedValue('test'),
        extraParam1: 'value1',
        extraParam2: 42
      };

      const result = await customHandler(mockAction, triggerId);

      expect(result.success).toBe(true);
      expect(mockAction.parameters['handler']).toHaveBeenCalledWith(mockAction.parameters);
    });

    it('应该正确处理不同的triggerId格式', async () => {
      const testTriggerIds = [
        'trigger-1',
        '12345',
        'custom-trigger-id-with-special-chars',
        ''
      ];

      for (const testTriggerId of testTriggerIds) {
        (mockAction.parameters['handler'] as jest.Mock).mockResolvedValue('test');

        const result = await customHandler(mockAction, testTriggerId);

        expect(result.triggerId).toBe(testTriggerId);
        expect(result.success).toBe(true);
      }
    });
  });
});