/**
 * Hook验证器单元测试
 */

import { describe, it, expect } from '@jest/globals';
import { validateHook, validateHooks } from '../hook-validator';
import { HookType } from '../../../types/node';
import { ValidationError } from '../../../types/errors';

describe('validateHook', () => {
  const nodeId = 'test-node-1';

  it('应该验证有效的Hook配置', () => {
    const validHook = {
      hookType: HookType.BEFORE_EXECUTE,
      eventName: 'test-event',
      enabled: true,
      weight: 10,
      condition: 'data.value > 0',
      eventPayload: { key: 'value' }
    };

    expect(() => validateHook(validHook, nodeId)).not.toThrow();
  });

  it('应该验证只有必填字段的Hook配置', () => {
    const minimalHook = {
      hookType: HookType.AFTER_EXECUTE,
      eventName: 'test-event'
    };

    expect(() => validateHook(minimalHook, nodeId)).not.toThrow();
  });

  it('应该拒绝缺少eventName的Hook', () => {
    const invalidHook = {
      hookType: HookType.BEFORE_EXECUTE,
      eventName: ''
    };

    expect(() => validateHook(invalidHook, nodeId)).toThrow(ValidationError);
    expect(() => validateHook(invalidHook, nodeId)).toThrow('Event name is required');
  });

  it('应该拒绝无效的hookType', () => {
    const invalidHook = {
      hookType: 'INVALID_TYPE' as any,
      eventName: 'test-event'
    };

    expect(() => validateHook(invalidHook, nodeId)).toThrow(ValidationError);
  });

  it('应该接受BEFORE_EXECUTE类型的Hook', () => {
    const hook = {
      hookType: HookType.BEFORE_EXECUTE,
      eventName: 'before-event'
    };

    expect(() => validateHook(hook, nodeId)).not.toThrow();
  });

  it('应该接受AFTER_EXECUTE类型的Hook', () => {
    const hook = {
      hookType: HookType.AFTER_EXECUTE,
      eventName: 'after-event'
    };

    expect(() => validateHook(hook, nodeId)).not.toThrow();
  });

  it('应该接受enabled为false的Hook', () => {
    const hook = {
      hookType: HookType.BEFORE_EXECUTE,
      eventName: 'test-event',
      enabled: false
    };

    expect(() => validateHook(hook, nodeId)).not.toThrow();
  });

  it('应该接受负数weight', () => {
    const hook = {
      hookType: HookType.BEFORE_EXECUTE,
      eventName: 'test-event',
      weight: -5
    };

    expect(() => validateHook(hook, nodeId)).not.toThrow();
  });

  it('应该接受零weight', () => {
    const hook = {
      hookType: HookType.BEFORE_EXECUTE,
      eventName: 'test-event',
      weight: 0
    };

    expect(() => validateHook(hook, nodeId)).not.toThrow();
  });

  it('应该接受空字符串condition', () => {
    const hook = {
      hookType: HookType.BEFORE_EXECUTE,
      eventName: 'test-event',
      condition: ''
    };

    expect(() => validateHook(hook, nodeId)).not.toThrow();
  });

  it('应该接受空对象eventPayload', () => {
    const hook = {
      hookType: HookType.BEFORE_EXECUTE,
      eventName: 'test-event',
      eventPayload: {}
    };

    expect(() => validateHook(hook, nodeId)).not.toThrow();
  });

  it('应该接受复杂eventPayload', () => {
    const hook = {
      hookType: HookType.BEFORE_EXECUTE,
      eventName: 'test-event',
      eventPayload: {
        nested: {
          array: [1, 2, 3],
          string: 'value',
          boolean: true,
          null: null
        }
      }
    };

    expect(() => validateHook(hook, nodeId)).not.toThrow();
  });

  it('应该在错误消息中包含正确的字段路径', () => {
    const invalidHook = {
      hookType: HookType.BEFORE_EXECUTE,
      eventName: ''
    };

    try {
      validateHook(invalidHook, nodeId);
      fail('应该抛出ValidationError');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).field).toBe(`node.${nodeId}.hooks.eventName`);
    }
  });
});

describe('validateHooks', () => {
  const nodeId = 'test-node-2';

  it('应该验证有效的Hook数组', () => {
    const validHooks = [
      {
        hookType: HookType.BEFORE_EXECUTE,
        eventName: 'before-event'
      },
      {
        hookType: HookType.AFTER_EXECUTE,
        eventName: 'after-event',
        enabled: true,
        weight: 5
      }
    ];

    expect(() => validateHooks(validHooks, nodeId)).not.toThrow();
  });

  it('应该验证空Hook数组', () => {
    expect(() => validateHooks([], nodeId)).not.toThrow();
  });

  it('应该拒绝非数组的hooks', () => {
    expect(() => validateHooks(null as any, nodeId)).toThrow(ValidationError);
    expect(() => validateHooks(null as any, nodeId)).toThrow('Hooks must be an array');
  });

  it('应该拒绝undefined的hooks', () => {
    expect(() => validateHooks(undefined as any, nodeId)).toThrow(ValidationError);
    expect(() => validateHooks(undefined as any, nodeId)).toThrow('Hooks must be an array');
  });

  it('应该拒绝对象类型的hooks', () => {
    expect(() => validateHooks({} as any, nodeId)).toThrow(ValidationError);
    expect(() => validateHooks({} as any, nodeId)).toThrow('Hooks must be an array');
  });

  it('应该拒绝字符串类型的hooks', () => {
    expect(() => validateHooks('invalid' as any, nodeId)).toThrow(ValidationError);
    expect(() => validateHooks('invalid' as any, nodeId)).toThrow('Hooks must be an array');
  });

  it('应该跳过数组中的null元素', () => {
    const hooksWithNull = [
      {
        hookType: HookType.BEFORE_EXECUTE,
        eventName: 'valid-event'
      },
      null as any,
      {
        hookType: HookType.AFTER_EXECUTE,
        eventName: 'another-event'
      }
    ];

    expect(() => validateHooks(hooksWithNull, nodeId)).not.toThrow();
  });

  it('应该跳过数组中的undefined元素', () => {
    const hooksWithUndefined = [
      {
        hookType: HookType.BEFORE_EXECUTE,
        eventName: 'valid-event'
      },
      undefined as any,
      {
        hookType: HookType.AFTER_EXECUTE,
        eventName: 'another-event'
      }
    ];

    expect(() => validateHooks(hooksWithUndefined, nodeId)).not.toThrow();
  });

  it('应该拒绝数组中包含无效的Hook', () => {
    const invalidHooks = [
      {
        hookType: HookType.BEFORE_EXECUTE,
        eventName: 'valid-event'
      },
      {
        hookType: HookType.AFTER_EXECUTE,
        eventName: '' // 无效：eventName为空
      }
    ];

    expect(() => validateHooks(invalidHooks, nodeId)).toThrow(ValidationError);
  });

  it('应该验证包含多个Hook的数组', () => {
    const multipleHooks = [
      {
        hookType: HookType.BEFORE_EXECUTE,
        eventName: 'event-1',
        weight: 10
      },
      {
        hookType: HookType.BEFORE_EXECUTE,
        eventName: 'event-2',
        weight: 5
      },
      {
        hookType: HookType.AFTER_EXECUTE,
        eventName: 'event-3',
        weight: 15
      }
    ];

    expect(() => validateHooks(multipleHooks, nodeId)).not.toThrow();
  });

  it('应该在错误消息中包含正确的字段路径', () => {
    const invalidHooks = [
      {
        hookType: HookType.BEFORE_EXECUTE,
        eventName: 'valid-event'
      },
      {
        hookType: HookType.AFTER_EXECUTE,
        eventName: ''
      }
    ];

    try {
      validateHooks(invalidHooks, nodeId);
      fail('应该抛出ValidationError');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).field).toBe(`node.${nodeId}.hooks.eventName`);
    }
  });

  it('应该接受包含所有可选字段的Hook数组', () => {
    const completeHooks = [
      {
        hookType: HookType.BEFORE_EXECUTE,
        eventName: 'complete-event-1',
        enabled: true,
        weight: 100,
        condition: 'data.status === "ready"',
        eventPayload: { action: 'start', timestamp: Date.now() }
      },
      {
        hookType: HookType.AFTER_EXECUTE,
        eventName: 'complete-event-2',
        enabled: false,
        weight: -50,
        condition: 'data.error != null',
        eventPayload: { action: 'handle-error', error: '${data.error}' }
      }
    ];

    expect(() => validateHooks(completeHooks, nodeId)).not.toThrow();
  });
});