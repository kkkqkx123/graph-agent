/**
 * ThreadStateValidator 单元测试
 * 测试线程状态转换验证工具函数
 */

import { describe, it, expect } from 'vitest';
import {
  isValidTransition,
  validateTransition,
  getAllowedTransitions,
  isTerminalStatus,
  isActiveStatus
} from '../thread-state-validator.js';
import { RuntimeValidationError } from '@modular-agent/types';
import type { ThreadStatus } from '@modular-agent/types';

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

  it('应该不允许 CREATED -> COMPLETED 转换', () => {
    expect(isValidTransition('CREATED', 'COMPLETED')).toBe(false);
  });

  it('应该不允许 COMPLETED -> RUNNING 转换', () => {
    expect(isValidTransition('COMPLETED', 'RUNNING')).toBe(false);
  });

  it('应该不允许 FAILED -> RUNNING 转换', () => {
    expect(isValidTransition('FAILED', 'RUNNING')).toBe(false);
  });

  it('应该不允许 CANCELLED -> RUNNING 转换', () => {
    expect(isValidTransition('CANCELLED', 'RUNNING')).toBe(false);
  });

  it('应该不允许 TIMEOUT -> RUNNING 转换', () => {
    expect(isValidTransition('TIMEOUT', 'RUNNING')).toBe(false);
  });

  it('应该不允许 CREATED -> PAUSED 转换', () => {
    expect(isValidTransition('CREATED', 'PAUSED')).toBe(false);
  });

  it('对于无效当前状态返回 false', () => {
    expect(isValidTransition('INVALID' as any, 'RUNNING')).toBe(false);
  });
});

describe('validateTransition', () => {
  it('当状态转换合法时不抛出错误', () => {
    expect(() => validateTransition('thread-1', 'CREATED', 'RUNNING')).not.toThrow();
    expect(() => validateTransition('thread-1', 'RUNNING', 'COMPLETED')).not.toThrow();
    expect(() => validateTransition('thread-1', 'PAUSED', 'RUNNING')).not.toThrow();
  });

  it('当状态转换不合法时抛出 RuntimeValidationError', () => {
    expect(() => validateTransition('thread-1', 'CREATED', 'COMPLETED'))
      .toThrow(RuntimeValidationError);

    expect(() => validateTransition('thread-1', 'CREATED', 'COMPLETED'))
      .toThrow('Invalid state transition: CREATED -> COMPLETED');
  });

  it('错误信息包含当前状态和目标状态', () => {
    try {
      validateTransition('thread-1', 'COMPLETED', 'RUNNING');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(RuntimeValidationError);
      expect((error as RuntimeValidationError).message).toContain('COMPLETED');
      expect((error as RuntimeValidationError).message).toContain('RUNNING');
    }
  });

  it('错误信息包含操作和字段信息', () => {
    try {
      validateTransition('thread-1', 'FAILED', 'RUNNING');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(RuntimeValidationError);
      const validationError = error as RuntimeValidationError;
      expect(validationError.context?.operation).toBe('validateStateTransition');
      expect(validationError.context?.field).toBe('thread.status');
    }
  });
});

describe('getAllowedTransitions', () => {
  it('返回 CREATED 状态允许的所有转换', () => {
    const transitions = getAllowedTransitions('CREATED');
    expect(transitions).toEqual(['RUNNING']);
    expect(transitions).toHaveLength(1);
  });

  it('返回 RUNNING 状态允许的所有转换', () => {
    const transitions = getAllowedTransitions('RUNNING');
    expect(transitions).toEqual(['PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT']);
    expect(transitions).toHaveLength(5);
  });

  it('返回 PAUSED 状态允许的所有转换', () => {
    const transitions = getAllowedTransitions('PAUSED');
    expect(transitions).toEqual(['RUNNING', 'CANCELLED', 'TIMEOUT']);
    expect(transitions).toHaveLength(3);
  });

  it('返回 COMPLETED 状态允许的所有转换（空数组）', () => {
    const transitions = getAllowedTransitions('COMPLETED');
    expect(transitions).toEqual([]);
    expect(transitions).toHaveLength(0);
  });

  it('返回 FAILED 状态允许的所有转换（空数组）', () => {
    const transitions = getAllowedTransitions('FAILED');
    expect(transitions).toEqual([]);
    expect(transitions).toHaveLength(0);
  });

  it('返回 CANCELLED 状态允许的所有转换（空数组）', () => {
    const transitions = getAllowedTransitions('CANCELLED');
    expect(transitions).toEqual([]);
    expect(transitions).toHaveLength(0);
  });

  it('返回 TIMEOUT 状态允许的所有转换（空数组）', () => {
    const transitions = getAllowedTransitions('TIMEOUT');
    expect(transitions).toEqual([]);
    expect(transitions).toHaveLength(0);
  });

  it('对于无效状态返回空数组', () => {
    const transitions = getAllowedTransitions('INVALID' as any);
    expect(transitions).toEqual([]);
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

  it('应该不识别 CREATED 为终止状态', () => {
    expect(isTerminalStatus('CREATED')).toBe(false);
  });

  it('应该不识别 RUNNING 为终止状态', () => {
    expect(isTerminalStatus('RUNNING')).toBe(false);
  });

  it('应该不识别 PAUSED 为终止状态', () => {
    expect(isTerminalStatus('PAUSED')).toBe(false);
  });

  it('对于无效状态返回 false', () => {
    expect(isTerminalStatus('INVALID' as any)).toBe(false);
  });
});

describe('isActiveStatus', () => {
  it('应该识别 RUNNING 为活跃状态', () => {
    expect(isActiveStatus('RUNNING')).toBe(true);
  });

  it('应该识别 PAUSED 为活跃状态', () => {
    expect(isActiveStatus('PAUSED')).toBe(true);
  });

  it('应该不识别 CREATED 为活跃状态', () => {
    expect(isActiveStatus('CREATED')).toBe(false);
  });

  it('应该不识别 COMPLETED 为活跃状态', () => {
    expect(isActiveStatus('COMPLETED')).toBe(false);
  });

  it('应该不识别 FAILED 为活跃状态', () => {
    expect(isActiveStatus('FAILED')).toBe(false);
  });

  it('应该不识别 CANCELLED 为活跃状态', () => {
    expect(isActiveStatus('CANCELLED')).toBe(false);
  });

  it('应该不识别 TIMEOUT 为活跃状态', () => {
    expect(isActiveStatus('TIMEOUT')).toBe(false);
  });

  it('对于无效状态返回 false', () => {
    expect(isActiveStatus('INVALID' as any)).toBe(false);
  });
});

describe('状态转换规则完整性', () => {
  const allStatuses: ThreadStatus[] = ['CREATED', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT'];

  it('所有状态都有定义的转换规则', () => {
    for (const status of allStatuses) {
      const transitions = getAllowedTransitions(status);
      expect(Array.isArray(transitions)).toBe(true);
    }
  });

  it('终止状态不允许任何转换', () => {
    const terminalStatuses: ThreadStatus[] = ['COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT'];
    for (const status of terminalStatuses) {
      const transitions = getAllowedTransitions(status);
      expect(transitions).toHaveLength(0);
    }
  });

  it('所有状态转换都可以通过 isValidTransition 验证', () => {
    for (const fromStatus of allStatuses) {
      const allowedTransitions = getAllowedTransitions(fromStatus);
      for (const toStatus of allowedTransitions) {
        expect(isValidTransition(fromStatus, toStatus)).toBe(true);
      }

      // 验证不允许的转换
      for (const toStatus of allStatuses) {
        if (!allowedTransitions.includes(toStatus)) {
          expect(isValidTransition(fromStatus, toStatus)).toBe(false);
        }
      }
    }
  });
});
