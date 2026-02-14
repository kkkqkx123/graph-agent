/**
 * Thread状态转换验证工具函数单元测试
 */

import {
  isValidTransition,
  validateTransition,
  getAllowedTransitions,
  isTerminalStatus,
  isActiveStatus
} from '../thread-state-validator';
import { ValidationError } from '@modular-agent/types';
import { ThreadStatus } from '@modular-agent/types';

describe('thread-state-validator', () => {
  describe('isValidTransition', () => {
    it('应该允许 CREATED -> RUNNING 转换', () => {
      expect(isValidTransition(ThreadStatus.CREATED, ThreadStatus.RUNNING)).toBe(true);
    });

    it('应该允许 RUNNING -> PAUSED 转换', () => {
      expect(isValidTransition(ThreadStatus.RUNNING, ThreadStatus.PAUSED)).toBe(true);
    });

    it('应该允许 RUNNING -> COMPLETED 转换', () => {
      expect(isValidTransition(ThreadStatus.RUNNING, ThreadStatus.COMPLETED)).toBe(true);
    });

    it('应该允许 RUNNING -> FAILED 转换', () => {
      expect(isValidTransition(ThreadStatus.RUNNING, ThreadStatus.FAILED)).toBe(true);
    });

    it('应该允许 RUNNING -> CANCELLED 转换', () => {
      expect(isValidTransition(ThreadStatus.RUNNING, ThreadStatus.CANCELLED)).toBe(true);
    });

    it('应该允许 RUNNING -> TIMEOUT 转换', () => {
      expect(isValidTransition(ThreadStatus.RUNNING, ThreadStatus.TIMEOUT)).toBe(true);
    });

    it('应该允许 PAUSED -> RUNNING 转换', () => {
      expect(isValidTransition(ThreadStatus.PAUSED, ThreadStatus.RUNNING)).toBe(true);
    });

    it('应该允许 PAUSED -> CANCELLED 转换', () => {
      expect(isValidTransition(ThreadStatus.PAUSED, ThreadStatus.CANCELLED)).toBe(true);
    });

    it('应该允许 PAUSED -> TIMEOUT 转换', () => {
      expect(isValidTransition(ThreadStatus.PAUSED, ThreadStatus.TIMEOUT)).toBe(true);
    });

    it('不应该允许 CREATED -> COMPLETED 转换', () => {
      expect(isValidTransition(ThreadStatus.CREATED, ThreadStatus.COMPLETED)).toBe(false);
    });

    it('不应该允许 CREATED -> PAUSED 转换', () => {
      expect(isValidTransition(ThreadStatus.CREATED, ThreadStatus.PAUSED)).toBe(false);
    });

    it('不应该允许 RUNNING -> CREATED 转换', () => {
      expect(isValidTransition(ThreadStatus.RUNNING, ThreadStatus.CREATED)).toBe(false);
    });

    it('不应该允许 COMPLETED -> RUNNING 转换', () => {
      expect(isValidTransition(ThreadStatus.COMPLETED, ThreadStatus.RUNNING)).toBe(false);
    });

    it('不应该允许 FAILED -> RUNNING 转换', () => {
      expect(isValidTransition(ThreadStatus.FAILED, ThreadStatus.RUNNING)).toBe(false);
    });

    it('不应该允许 CANCELLED -> RUNNING 转换', () => {
      expect(isValidTransition(ThreadStatus.CANCELLED, ThreadStatus.RUNNING)).toBe(false);
    });

    it('不应该允许 TIMEOUT -> RUNNING 转换', () => {
      expect(isValidTransition(ThreadStatus.TIMEOUT, ThreadStatus.RUNNING)).toBe(false);
    });

    it('不应该允许相同状态转换', () => {
      expect(isValidTransition(ThreadStatus.RUNNING, ThreadStatus.RUNNING)).toBe(false);
      expect(isValidTransition(ThreadStatus.COMPLETED, ThreadStatus.COMPLETED)).toBe(false);
    });
  });

  describe('validateTransition', () => {
    it('应该验证合法的状态转换', () => {
      expect(() => validateTransition('thread-1', ThreadStatus.CREATED, ThreadStatus.RUNNING)).not.toThrow();
      expect(() => validateTransition('thread-1', ThreadStatus.RUNNING, ThreadStatus.PAUSED)).not.toThrow();
      expect(() => validateTransition('thread-1', ThreadStatus.RUNNING, ThreadStatus.COMPLETED)).not.toThrow();
    });

    it('应该拒绝非法的状态转换并抛出 ValidationError', () => {
      expect(() => validateTransition('thread-1', ThreadStatus.CREATED, ThreadStatus.COMPLETED)).toThrow(ValidationError);
      expect(() => validateTransition('thread-1', ThreadStatus.RUNNING, ThreadStatus.CREATED)).toThrow(ValidationError);
      expect(() => validateTransition('thread-1', ThreadStatus.COMPLETED, ThreadStatus.RUNNING)).toThrow(ValidationError);
    });

    it('应该在错误信息中包含转换详情', () => {
      try {
        validateTransition('thread-123', ThreadStatus.CREATED, ThreadStatus.COMPLETED);
        fail('应该抛出 ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.message).toContain('CREATED -> COMPLETED');
        expect(validationError.field).toBe('thread.status');
        expect(validationError.value).toBe('CREATED');
        expect(validationError.context).toEqual({
          threadId: 'thread-123',
          currentStatus: 'CREATED',
          targetStatus: 'COMPLETED'
        });
      }
    });
  });

  describe('getAllowedTransitions', () => {
    it('应该返回 CREATED 状态的允许转换', () => {
      const transitions = getAllowedTransitions(ThreadStatus.CREATED);
      expect(transitions).toEqual([ThreadStatus.RUNNING]);
    });

    it('应该返回 RUNNING 状态的允许转换', () => {
      const transitions = getAllowedTransitions(ThreadStatus.RUNNING);
      expect(transitions).toEqual([ThreadStatus.PAUSED, ThreadStatus.COMPLETED, ThreadStatus.FAILED, ThreadStatus.CANCELLED, ThreadStatus.TIMEOUT]);
    });

    it('应该返回 PAUSED 状态的允许转换', () => {
      const transitions = getAllowedTransitions(ThreadStatus.PAUSED);
      expect(transitions).toEqual([ThreadStatus.RUNNING, ThreadStatus.CANCELLED, ThreadStatus.TIMEOUT]);
    });

    it('应该返回终止状态的空转换列表', () => {
      expect(getAllowedTransitions(ThreadStatus.COMPLETED)).toEqual([]);
      expect(getAllowedTransitions(ThreadStatus.FAILED)).toEqual([]);
      expect(getAllowedTransitions(ThreadStatus.CANCELLED)).toEqual([]);
      expect(getAllowedTransitions(ThreadStatus.TIMEOUT)).toEqual([]);
    });
  });

  describe('isTerminalStatus', () => {
    it('应该识别 COMPLETED 为终止状态', () => {
      expect(isTerminalStatus(ThreadStatus.COMPLETED)).toBe(true);
    });

    it('应该识别 FAILED 为终止状态', () => {
      expect(isTerminalStatus(ThreadStatus.FAILED)).toBe(true);
    });

    it('应该识别 CANCELLED 为终止状态', () => {
      expect(isTerminalStatus(ThreadStatus.CANCELLED)).toBe(true);
    });

    it('应该识别 TIMEOUT 为终止状态', () => {
      expect(isTerminalStatus(ThreadStatus.TIMEOUT)).toBe(true);
    });

    it('不应该识别 CREATED 为终止状态', () => {
      expect(isTerminalStatus(ThreadStatus.CREATED)).toBe(false);
    });

    it('不应该识别 RUNNING 为终止状态', () => {
      expect(isTerminalStatus(ThreadStatus.RUNNING)).toBe(false);
    });

    it('不应该识别 PAUSED 为终止状态', () => {
      expect(isTerminalStatus(ThreadStatus.PAUSED)).toBe(false);
    });
  });

  describe('isActiveStatus', () => {
    it('应该识别 RUNNING 为活跃状态', () => {
      expect(isActiveStatus(ThreadStatus.RUNNING)).toBe(true);
    });

    it('应该识别 PAUSED 为活跃状态', () => {
      expect(isActiveStatus(ThreadStatus.PAUSED)).toBe(true);
    });

    it('不应该识别 CREATED 为活跃状态', () => {
      expect(isActiveStatus(ThreadStatus.CREATED)).toBe(false);
    });

    it('不应该识别 COMPLETED 为活跃状态', () => {
      expect(isActiveStatus(ThreadStatus.COMPLETED)).toBe(false);
    });

    it('不应该识别 FAILED 为活跃状态', () => {
      expect(isActiveStatus(ThreadStatus.FAILED)).toBe(false);
    });

    it('不应该识别 CANCELLED 为活跃状态', () => {
      expect(isActiveStatus(ThreadStatus.CANCELLED)).toBe(false);
    });

    it('不应该识别 TIMEOUT 为活跃状态', () => {
      expect(isActiveStatus(ThreadStatus.TIMEOUT)).toBe(false);
    });
  });
});