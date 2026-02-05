/**
 * HookValidatorAPI测试用例
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { HookValidatorAPI } from '../hook-validator-api';
import { HookType } from '../../../types/node';
import type { NodeHook } from '../../../types/node';

describe('HookValidatorAPI', () => {
  let validatorAPI: HookValidatorAPI;

  beforeEach(() => {
    validatorAPI = new HookValidatorAPI();
  });

  describe('validateHook', () => {
    it('应该验证有效的Hook配置', async () => {
      const validHook: NodeHook = {
        hookType: HookType.BEFORE_EXECUTE,
        enabled: true,
        weight: 1,
        condition: 'true',
        eventName: 'test-event',
        eventPayload: {
          key: 'value'
        }
      };

      const result = await validatorAPI.validateHook(validHook, 'test-node');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该拒绝缺少必需字段的Hook', async () => {
      const invalidHook = {
        hookType: HookType.BEFORE_EXECUTE
      } as any;

      const result = await validatorAPI.validateHook(invalidHook, 'test-node');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该拒绝无效的Hook类型', async () => {
      const invalidHook = {
        hookType: 'invalid-type',
        eventName: 'test-event'
      } as any;

      const result = await validatorAPI.validateHook(invalidHook, 'test-node');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateHooks', () => {
    it('应该验证有效的Hook数组', async () => {
      const validHooks: NodeHook[] = [
        {
          hookType: HookType.BEFORE_EXECUTE,
          eventName: 'event1'
        },
        {
          hookType: HookType.AFTER_EXECUTE,
          eventName: 'event2'
        }
      ];

      const result = await validatorAPI.validateHooks(validHooks, 'test-node');
      expect(result.valid).toBe(true);
    });

    it('应该验证空的Hook数组', async () => {
      const result = await validatorAPI.validateHooks([], 'test-node');
      expect(result.valid).toBe(true);
    });

    it('应该拒绝非数组的hooks', async () => {
      const result = await validatorAPI.validateHooks(null as any, 'test-node');
      expect(result.valid).toBe(false);
    });

    it('应该拒绝undefined的hooks', async () => {
      const result = await validatorAPI.validateHooks(undefined as any, 'test-node');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateHooksBatch', () => {
    it('应该验证有效的Hook数组', async () => {
      const validHooks: NodeHook[] = [
        {
          hookType: HookType.BEFORE_EXECUTE,
          eventName: 'event1'
        },
        {
          hookType: HookType.AFTER_EXECUTE,
          eventName: 'event2'
        }
      ];

      const result = await validatorAPI.validateHooksBatch(validHooks, 'test-node');
      expect(result.valid).toBe(true);
    });

    it('应该返回所有错误的Hook', async () => {
      const invalidHooks: any[] = [
        {
          hookType: HookType.BEFORE_EXECUTE,
          eventName: 'event1'
        },
        {
          hookType: 'invalid-type',
          eventName: 'event2'
        },
        {
          hookType: HookType.AFTER_EXECUTE
          // 缺少eventName
        }
      ];

      const result = await validatorAPI.validateHooksBatch(invalidHooks, 'test-node');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('应该跳过null的Hook', async () => {
      const hooksWithNull: NodeHook[] = [
        {
          hookType: HookType.BEFORE_EXECUTE,
          eventName: 'event1'
        },
        null as any,
        {
          hookType: HookType.AFTER_EXECUTE,
          eventName: 'event2'
        }
      ];

      const result = await validatorAPI.validateHooksBatch(hooksWithNull, 'test-node');
      expect(result.valid).toBe(true);
    });

    it('应该跳过undefined的Hook', async () => {
      const hooksWithUndefined: NodeHook[] = [
        {
          hookType: HookType.BEFORE_EXECUTE,
          eventName: 'event1'
        },
        undefined as any,
        {
          hookType: HookType.AFTER_EXECUTE,
          eventName: 'event2'
        }
      ];

      const result = await validatorAPI.validateHooksBatch(hooksWithUndefined, 'test-node');
      expect(result.valid).toBe(true);
    });

    it('应该拒绝非数组的hooks', async () => {
      const result = await validatorAPI.validateHooksBatch(null as any, 'test-node');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
    });
  });
});