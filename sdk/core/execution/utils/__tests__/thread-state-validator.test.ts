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
      expect(isValidTransition('CREATED', 'RUNNING')).toBe(true);
    });

    it('应该允许 RUNNING -> PAUSED 转换', () => {
      expect(isValidTransition('RUNNING', 'PAUSED')).toBe(true);
    });

    it('应该允许 RUNNING -> COMPLETED 转换', () => {
      expect(isValidTransition('RUNNING', 'COMPLETED')).toBe(true);
    });

    it('应该允许 RUNNING -> FAILED 转换', () => {
      expect(isValidTransition('RUNNING', 'FAILED')).toBe(true);
    });

    it('应该允许 RUNNING -> CANCELLED 转换', () => {
      expect(isValidTransition('RUNNING', 'CANCELLED')).toBe(true);
    });

    it('应该允许 RUNNING -> TIMEOUT 转换', () => {
      expect(isValidTransition('RUNNING', 'TIMEOUT')).toBe(true);
    });

    it('应该允许 PAUSED -> RUNNING 转换', () => {
      expect(isValidTransition('PAUSED', 'RUNNING')).toBe(true);
    });

    it('应该允许 PAUSED -> CANCELLED 转换', () => {
      expect(isValidTransition('PAUSED', 'CANCELLED')).toBe(true);
    });

    it('应该允许 PAUSED -> TIMEOUT 转换', () => {
      expect(isValidTransition('PAUSED', 'TIMEOUT')).toBe(true);
    });

    it('不应该允许 CREATED -> COMPLETED 转换', () => {
      expect(isValidTransition('CREATED', 'COMPLETED')).toBe(false);
    });

    it('不应该允许 CREATED -> PAUSED 转换', () => {
      expect(isValidTransition('CREATED', 'PAUSED')).toBe(false);
    });

    it('不应该允许 RUNNING -> CREATED 转换', () => {
      expect(isValidTransition('RUNNING', 'CREATED')).toBe(false);
    });

    it('不应该允许 COMPLETED -> RUNNING 转换', () => {
      expect(isValidTransition('COMPLETED', 'RUNNING')).toBe(false);
    });

    it('不应该允许 FAILED -> RUNNING 转换', () => {
      expect(isValidTransition('FAILED', 'RUNNING')).toBe(false);
    });

    it('不应该允许 CANCELLED -> RUNNING 转换', () => {
      expect(isValidTransition('CANCELLED', 'RUNNING')).toBe(false);
    });

    it('不应该允许 TIMEOUT -> RUNNING 转换', () => {
      expect(isValidTransition('TIMEOUT', 'RUNNING')).toBe(false);
    });

    it('不应该允许相同状态转换', () => {
      expect(isValidTransition('RUNNING', 'RUNNING')).toBe(false);
      expect(isValidTransition('COMPLETED', 'COMPLETED')).toBe(false);
    });
  });

  describe('validateTransition', () => {
    it('应该验证合法的状态转换', () => {
      expect(() => validateTransition('thread-1', 'CREATED', 'RUNNING')).not.toThrow();
      expect(() => validateTransition('thread-1', 'RUNNING', 'PAUSED')).not.toThrow();
      expect(() => validateTransition('thread-1', 'RUNNING', 'COMPLETED')).not.toThrow();
    });

    it('应该拒绝非法的状态转换并抛出 ValidationError', () => {
      expect(() => validateTransition('thread-1', 'CREATED', 'COMPLETED')).toThrow(ValidationError);
      expect(() => validateTransition('thread-1', 'RUNNING', 'CREATED')).toThrow(ValidationError);
      expect(() => validateTransition('thread-1', 'COMPLETED', 'RUNNING')).toThrow(ValidationError);
    });

    it('应该在错误信息中包含转换详情', () => {
      try {
        validateTransition('thread-123', 'CREATED', 'COMPLETED');
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
      const transitions = getAllowedTransitions('CREATED');
      expect(transitions).toEqual(['RUNNING']);
    });

    it('应该返回 RUNNING 状态的允许转换', () => {
      const transitions = getAllowedTransitions('RUNNING');
      expect(transitions).toEqual(['PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT']);
    });

    it('应该返回 PAUSED 状态的允许转换', () => {
      const transitions = getAllowedTransitions('PAUSED');
      expect(transitions).toEqual(['RUNNING', 'CANCELLED', 'TIMEOUT']);
    });

    it('应该返回终止状态的空转换列表', () => {
      expect(getAllowedTransitions('COMPLETED')).toEqual([]);
      expect(getAllowedTransitions('FAILED')).toEqual([]);
      expect(getAllowedTransitions('CANCELLED')).toEqual([]);
      expect(getAllowedTransitions('TIMEOUT')).toEqual([]);
    });
  });

  describe('isTerminalStatus', () => {
    it('应该识别 COMPLETED 为终止状态', () => {
      expect(isTerminalStatus('COMPLETED')).toBe(true);
    });

    it('应该识别 FAILED 为终止状态', () => {
      expect(isTerminalStatus('FAILED')).toBe(true);
    });

    it('应该识别 CANCELLED 为终止状态', () => {
      expect(isTerminalStatus('CANCELLED')).toBe(true);
    });

    it('应该识别 TIMEOUT 为终止状态', () => {
      expect(isTerminalStatus('TIMEOUT')).toBe(true);
    });

    it('不应该识别 CREATED 为终止状态', () => {
      expect(isTerminalStatus('CREATED')).toBe(false);
    });

    it('不应该识别 RUNNING 为终止状态', () => {
      expect(isTerminalStatus('RUNNING')).toBe(false);
    });

    it('不应该识别 PAUSED 为终止状态', () => {
      expect(isTerminalStatus('PAUSED')).toBe(false);
    });
  });

  describe('isActiveStatus', () => {
    it('应该识别 RUNNING 为活跃状态', () => {
      expect(isActiveStatus('RUNNING')).toBe(true);
    });

    it('应该识别 PAUSED 为活跃状态', () => {
      expect(isActiveStatus('PAUSED')).toBe(true);
    });

    it('不应该识别 CREATED 为活跃状态', () => {
      expect(isActiveStatus('CREATED')).toBe(false);
    });

    it('不应该识别 COMPLETED 为活跃状态', () => {
      expect(isActiveStatus('COMPLETED')).toBe(false);
    });

    it('不应该识别 FAILED 为活跃状态', () => {
      expect(isActiveStatus('FAILED')).toBe(false);
    });

    it('不应该识别 CANCELLED 为活跃状态', () => {
      expect(isActiveStatus('CANCELLED')).toBe(false);
    });

    it('不应该识别 TIMEOUT 为活跃状态', () => {
      expect(isActiveStatus('TIMEOUT')).toBe(false);
    });
  });
});