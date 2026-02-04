/**
 * 暂停线程处理函数简化单元测试
 * 使用any类型避免复杂的类型匹配问题
 */

import { pauseThreadHandler } from '../pause-thread-handler';
import type { TriggerAction, TriggerExecutionResult } from '../../../../../types/trigger';
import { TriggerActionType } from '../../../../../types/trigger';
import { ValidationError } from '../../../../../types/errors';

// 简化mock，避免复杂的类型检查
jest.mock('../../../context/execution-context', () => ({
  ExecutionContext: {
    createDefault: jest.fn()
  }
}));

describe('pause-thread-handler (简化版本)', () => {
  let mockAction: TriggerAction;
  const triggerId = 'trigger-123';
  const threadId = 'thread-456';

  beforeEach(() => {
    mockAction = {
      type: TriggerActionType.PAUSE_THREAD,
      parameters: {
        threadId
      },
      metadata: {}
    };

    // 简化mock ExecutionContext
    const mockExecutionContext = {
      getLifecycleCoordinator: jest.fn()
    };

    const { ExecutionContext } = require('../../../context/execution-context');
    ExecutionContext.createDefault.mockReturnValue(mockExecutionContext);
  });

  describe('基本功能测试', () => {
    it('应该成功暂停线程', async () => {
      const mockLifecycleCoordinator = {
        pauseThread: jest.fn().mockResolvedValue(undefined)
      };

      const { ExecutionContext } = require('../../../context/execution-context');
      const mockContext = ExecutionContext.createDefault();
      mockContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator);

      const result = await pauseThreadHandler(mockAction, triggerId);

      expect(result).toMatchObject({
        triggerId,
        success: true,
        action: mockAction,
        result: {
          message: `Thread ${threadId} paused successfully`
        }
      });
      expect(result.executionTime).toBeGreaterThan(0);

      // 验证生命周期协调器被调用
      expect(mockLifecycleCoordinator.pauseThread).toHaveBeenCalledWith(threadId);
    });
  });

  describe('参数验证测试', () => {
    it('应该在缺少threadId参数时返回失败结果', async () => {
      mockAction.parameters = {};

      const result = await pauseThreadHandler(mockAction, triggerId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('threadId is required');
    });

    it('应该在threadId为空字符串时返回失败结果', async () => {
      mockAction.parameters = {
        threadId: ''
      };

      const result = await pauseThreadHandler(mockAction, triggerId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('threadId is required');
    });
  });

  describe('错误处理测试', () => {
    it('应该在生命周期协调器抛出错误时返回失败结果', async () => {
      const mockLifecycleCoordinator = {
        pauseThread: jest.fn().mockRejectedValue(new Error('Pause failed'))
      };

      const { ExecutionContext } = require('../../../context/execution-context');
      const mockContext = ExecutionContext.createDefault();
      mockContext.getLifecycleCoordinator.mockReturnValue(mockLifecycleCoordinator);

      const result = await pauseThreadHandler(mockAction, triggerId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Pause failed');
    });
  });
});