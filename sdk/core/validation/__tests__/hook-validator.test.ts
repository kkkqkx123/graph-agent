/**
 * Hook验证器单元测试
 */

import { validateHook, validateHooks } from '../hook-validator';
import { HookType } from '@modular-agent/types/node';

describe('validateHook', () => {
  const nodeId = 'test-node-1';

  it('应该验证有效的Hook配置', () => {
    const validHook = {
      hookType: HookType.BEFORE_EXECUTE,
      eventName: 'test-event',
      enabled: true,
      weight: 10,
      condition: { expression: 'data.value > 0' },
      eventPayload: { key: 'value' }
    };

    const result = validateHook(validHook, nodeId);
    expect(result.isOk()).toBe(true);
  });

  it('应该验证只有必填字段的Hook配置', () => {
    const minimalHook = {
      hookType: HookType.AFTER_EXECUTE,
      eventName: 'test-event'
    };

    const result = validateHook(minimalHook, nodeId);
    expect(result.isOk()).toBe(true);
  });

  it('应该拒绝缺少eventName的Hook', () => {
    const invalidHook = {
      hookType: HookType.BEFORE_EXECUTE,
      eventName: ''
    };

    const result = validateHook(invalidHook, nodeId);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.length).toBeGreaterThan(0);
      expect(result.error[0]?.message).toContain('Event name is required');
    }
  });

  it('应该拒绝无效的hookType', () => {
    const invalidHook = {
      hookType: 'INVALID_TYPE' as any,
      eventName: 'test-event'
    };

    const result = validateHook(invalidHook, nodeId);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.length).toBeGreaterThan(0);
    }
  });

  it('应该接受BEFORE_EXECUTE类型的Hook', () => {
    const hook = {
      hookType: HookType.BEFORE_EXECUTE,
      eventName: 'before-event'
    };

    const result = validateHook(hook, nodeId);
    expect(result.isOk()).toBe(true);
  });

  it('应该接受AFTER_EXECUTE类型的Hook', () => {
    const hook = {
      hookType: HookType.AFTER_EXECUTE,
      eventName: 'after-event'
    };

    const result = validateHook(hook, nodeId);
    expect(result.isOk()).toBe(true);
  });

  it('应该接受enabled为false的Hook', () => {
    const hook = {
      hookType: HookType.BEFORE_EXECUTE,
      eventName: 'test-event',
      enabled: false
    };

    const result = validateHook(hook, nodeId);
    expect(result.isOk()).toBe(true);
  });

  it('应该接受负数weight', () => {
    const hook = {
      hookType: HookType.BEFORE_EXECUTE,
      eventName: 'test-event',
      weight: -5
    };

    const result = validateHook(hook, nodeId);
    expect(result.isOk()).toBe(true);
  });

  it('应该接受零weight', () => {
    const hook = {
      hookType: HookType.BEFORE_EXECUTE,
      eventName: 'test-event',
      weight: 0
    };

    const result = validateHook(hook, nodeId);
    expect(result.isOk()).toBe(true);
  });

  it('应该接受空condition', () => {
    const hook = {
      hookType: HookType.BEFORE_EXECUTE,
      eventName: 'test-event'
    };

    const result = validateHook(hook, nodeId);
    expect(result.isOk()).toBe(true);
  });

  it('应该接受空对象eventPayload', () => {
    const hook = {
      hookType: HookType.BEFORE_EXECUTE,
      eventName: 'test-event',
      eventPayload: {}
    };

    const result = validateHook(hook, nodeId);
    expect(result.isOk()).toBe(true);
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

    const result = validateHook(hook, nodeId);
    expect(result.isOk()).toBe(true);
  });

  it('应该在错误消息中包含正确的字段路径', () => {
    const invalidHook = {
      hookType: HookType.BEFORE_EXECUTE,
      eventName: ''
    };

    const result = validateHook(invalidHook, nodeId);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.length).toBeGreaterThan(0);
      expect(result.error[0]?.field).toBe(`node.${nodeId}.hooks.eventName`);
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

    const result = validateHooks(validHooks, nodeId);
    expect(result.isOk()).toBe(true);
  });

  it('应该验证空Hook数组', () => {
    const result = validateHooks([], nodeId);
    expect(result.isOk()).toBe(true);
  });

  it('应该拒绝非数组的hooks', () => {
    const result = validateHooks(null as any, nodeId);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.length).toBeGreaterThan(0);
      expect(result.error[0]?.message).toContain('Hooks must be an array');
    }
  });

  it('应该拒绝undefined的hooks', () => {
    const result = validateHooks(undefined as any, nodeId);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.length).toBeGreaterThan(0);
      expect(result.error[0]?.message).toContain('Hooks must be an array');
    }
  });

  it('应该拒绝对象类型的hooks', () => {
    const result = validateHooks({} as any, nodeId);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.length).toBeGreaterThan(0);
      expect(result.error[0]?.message).toContain('Hooks must be an array');
    }
  });

  it('应该拒绝字符串类型的hooks', () => {
    const result = validateHooks('invalid' as any, nodeId);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.length).toBeGreaterThan(0);
      expect(result.error[0]?.message).toContain('Hooks must be an array');
    }
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

    const result = validateHooks(hooksWithNull, nodeId);
    expect(result.isOk()).toBe(true);
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

    const result = validateHooks(hooksWithUndefined, nodeId);
    expect(result.isOk()).toBe(true);
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

    const result = validateHooks(invalidHooks, nodeId);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.length).toBeGreaterThan(0);
    }
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

    const result = validateHooks(multipleHooks, nodeId);
    expect(result.isOk()).toBe(true);
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

    const result = validateHooks(invalidHooks, nodeId);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.length).toBeGreaterThan(0);
      expect(result.error[0]?.field).toBe(`node.${nodeId}.hooks.eventName`);
    }
  });

  it('应该接受包含所有可选字段的Hook数组', () => {
    const completeHooks = [
      {
        hookType: HookType.BEFORE_EXECUTE,
        eventName: 'complete-event-1',
        enabled: true,
        weight: 100,
        condition: { expression: 'data.status === "ready"' },
        eventPayload: { action: 'start', timestamp: Date.now() }
      },
      {
        hookType: HookType.AFTER_EXECUTE,
        eventName: 'complete-event-2',
        enabled: false,
        weight: -50,
        condition: { expression: 'data.error != null' },
        eventPayload: { action: 'handle-error', error: '${data.error}' }
      }
    ];

    const result = validateHooks(completeHooks, nodeId);
    expect(result.isOk()).toBe(true);
  });
});
