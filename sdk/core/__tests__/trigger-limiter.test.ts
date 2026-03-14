/**
 * Trigger Limiter 集成测试
 *
 * 测试场景：
 * - 触发能力检查
 * - 状态获取
 * - 计数管理
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  canTrigger,
  getTriggerStatus,
  incrementTriggerCount,
  resetTriggerCount,
  isTriggerExpired,
  getRemainingTriggers
} from '../triggers/limiter.js';
import type { BaseTriggerDefinition } from '../triggers/types.js';

describe('Trigger Limiter - 触发器限制器', () => {
  describe('触发能力检查', () => {
    it('测试启用状态触发器：enabled为true或未设置时应可触发', () => {
      const trigger1: BaseTriggerDefinition = {
        id: 'trigger-1',
        name: 'Trigger 1',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'pause_thread', parameters: {} },
        enabled: true
      };

      const trigger2: BaseTriggerDefinition = {
        id: 'trigger-2',
        name: 'Trigger 2',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'pause_thread', parameters: {} }
        // enabled 未设置
      };

      expect(canTrigger(trigger1)).toBe(true);
      expect(canTrigger(trigger2)).toBe(true);
    });

    it('测试禁用状态触发器：enabled为false时应不可触发', () => {
      const trigger: BaseTriggerDefinition = {
        id: 'trigger-1',
        name: 'Trigger 1',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'pause_thread', parameters: {} },
        enabled: false
      };

      expect(canTrigger(trigger)).toBe(false);
    });

    it('测试未达到最大次数：未达到maxTriggers时应可触发', () => {
      const trigger: BaseTriggerDefinition = {
        id: 'trigger-1',
        name: 'Trigger 1',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'pause_thread', parameters: {} },
        enabled: true,
        maxTriggers: 5,
        triggerCount: 2
      };

      expect(canTrigger(trigger)).toBe(true);
    });

    it('测试达到最大次数：达到maxTriggers时应不可触发', () => {
      const trigger: BaseTriggerDefinition = {
        id: 'trigger-1',
        name: 'Trigger 1',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'pause_thread', parameters: {} },
        enabled: true,
        maxTriggers: 5,
        triggerCount: 5
      };

      expect(canTrigger(trigger)).toBe(false);
    });

    it('测试超过最大次数：超过maxTriggers时应不可触发', () => {
      const trigger: BaseTriggerDefinition = {
        id: 'trigger-1',
        name: 'Trigger 1',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'pause_thread', parameters: {} },
        enabled: true,
        maxTriggers: 5,
        triggerCount: 6
      };

      expect(canTrigger(trigger)).toBe(false);
    });

    it('测试无限制触发：maxTriggers为0或未设置时应可触发', () => {
      const trigger1: BaseTriggerDefinition = {
        id: 'trigger-1',
        name: 'Trigger 1',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'pause_thread', parameters: {} },
        enabled: true,
        maxTriggers: 0,
        triggerCount: 1000
      };

      const trigger2: BaseTriggerDefinition = {
        id: 'trigger-2',
        name: 'Trigger 2',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'pause_thread', parameters: {} },
        enabled: true,
        triggerCount: 1000
        // maxTriggers 未设置
      };

      expect(canTrigger(trigger1)).toBe(true);
      expect(canTrigger(trigger2)).toBe(true);
    });

    it('测试触发次数为0时：未触发过的触发器应可触发', () => {
      const trigger: BaseTriggerDefinition = {
        id: 'trigger-1',
        name: 'Trigger 1',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'pause_thread', parameters: {} },
        enabled: true,
        maxTriggers: 3
        // triggerCount 未设置，默认为 0
      };

      expect(canTrigger(trigger)).toBe(true);
    });
  });

  describe('状态获取', () => {
    it('测试空闲状态：未触发过的触发器状态应为idle', () => {
      const trigger: BaseTriggerDefinition = {
        id: 'trigger-1',
        name: 'Trigger 1',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'pause_thread', parameters: {} },
        enabled: true
        // triggerCount 未设置，默认为 0
      };

      expect(getTriggerStatus(trigger)).toBe('idle');
    });

    it('测试已触发状态：触发过的触发器状态应为triggered', () => {
      const trigger: BaseTriggerDefinition = {
        id: 'trigger-1',
        name: 'Trigger 1',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'pause_thread', parameters: {} },
        enabled: true,
        triggerCount: 1
      };

      expect(getTriggerStatus(trigger)).toBe('triggered');
    });

    it('测试禁用状态：enabled为false的触发器状态应为disabled', () => {
      const trigger: BaseTriggerDefinition = {
        id: 'trigger-1',
        name: 'Trigger 1',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'pause_thread', parameters: {} },
        enabled: false,
        triggerCount: 0
      };

      expect(getTriggerStatus(trigger)).toBe('disabled');
    });

    it('测试禁用状态优先级：enabled为false时即使触发过也应为disabled', () => {
      const trigger: BaseTriggerDefinition = {
        id: 'trigger-1',
        name: 'Trigger 1',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'pause_thread', parameters: {} },
        enabled: false,
        triggerCount: 5
      };

      expect(getTriggerStatus(trigger)).toBe('disabled');
    });

    it('测试过期状态：达到maxTriggers的触发器状态应为expired', () => {
      const trigger: BaseTriggerDefinition = {
        id: 'trigger-1',
        name: 'Trigger 1',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'pause_thread', parameters: {} },
        enabled: true,
        maxTriggers: 5,
        triggerCount: 5
      };

      expect(getTriggerStatus(trigger)).toBe('expired');
    });

    it('测试过期状态优先级：过期状态优先于triggered状态', () => {
      const trigger: BaseTriggerDefinition = {
        id: 'trigger-1',
        name: 'Trigger 1',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'pause_thread', parameters: {} },
        enabled: true,
        maxTriggers: 5,
        triggerCount: 5
      };

      expect(getTriggerStatus(trigger)).toBe('expired');
    });

    it('测试超过最大次数时：超过maxTriggers的触发器状态应为expired', () => {
      const trigger: BaseTriggerDefinition = {
        id: 'trigger-1',
        name: 'Trigger 1',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'pause_thread', parameters: {} },
        enabled: true,
        maxTriggers: 5,
        triggerCount: 6
      };

      expect(getTriggerStatus(trigger)).toBe('expired');
    });
  });

  describe('计数管理', () => {
    it('测试增加触发计数：触发计数应正确递增', () => {
      const trigger: BaseTriggerDefinition = {
        id: 'trigger-1',
        name: 'Trigger 1',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'pause_thread', parameters: {} },
        enabled: true,
        triggerCount: 2
      };

      const newCount = incrementTriggerCount(trigger);

      expect(newCount).toBe(3);
      expect(trigger.triggerCount).toBe(3);
    });

    it('测试从0开始增加触发计数', () => {
      const trigger: BaseTriggerDefinition = {
        id: 'trigger-1',
        name: 'Trigger 1',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'pause_thread', parameters: {} },
        enabled: true
        // triggerCount 未设置，默认为 undefined
      };

      const newCount = incrementTriggerCount(trigger);

      expect(newCount).toBe(1);
      expect(trigger.triggerCount).toBe(1);
    });

    it('测试重置触发计数：重置后计数应归零', () => {
      const trigger: BaseTriggerDefinition = {
        id: 'trigger-1',
        name: 'Trigger 1',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'pause_thread', parameters: {} },
        enabled: true,
        triggerCount: 10
      };

      resetTriggerCount(trigger);

      expect(trigger.triggerCount).toBe(0);
    });

    it('测试多次增加触发计数', () => {
      const trigger: BaseTriggerDefinition = {
        id: 'trigger-1',
        name: 'Trigger 1',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'pause_thread', parameters: {} },
        enabled: true
      };

      incrementTriggerCount(trigger);
      incrementTriggerCount(trigger);
      incrementTriggerCount(trigger);

      expect(trigger.triggerCount).toBe(3);
    });

    it('测试剩余次数计算：正确计算剩余触发次数', () => {
      const trigger: BaseTriggerDefinition = {
        id: 'trigger-1',
        name: 'Trigger 1',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'pause_thread', parameters: {} },
        enabled: true,
        maxTriggers: 5,
        triggerCount: 2
      };

      const remaining = getRemainingTriggers(trigger);

      expect(remaining).toBe(3);
    });

    it('测试剩余次数为0：达到最大次数时剩余次数为0', () => {
      const trigger: BaseTriggerDefinition = {
        id: 'trigger-1',
        name: 'Trigger 1',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'pause_thread', parameters: {} },
        enabled: true,
        maxTriggers: 5,
        triggerCount: 5
      };

      const remaining = getRemainingTriggers(trigger);

      expect(remaining).toBe(0);
    });

    it('测试无限制剩余次数：maxTriggers为0时应返回-1', () => {
      const trigger: BaseTriggerDefinition = {
        id: 'trigger-1',
        name: 'Trigger 1',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'pause_thread', parameters: {} },
        enabled: true,
        maxTriggers: 0,
        triggerCount: 100
      };

      const remaining = getRemainingTriggers(trigger);

      expect(remaining).toBe(-1);
    });

    it('测试未设置maxTriggers时剩余次数：应返回-1', () => {
      const trigger: BaseTriggerDefinition = {
        id: 'trigger-1',
        name: 'Trigger 1',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'pause_thread', parameters: {} },
        enabled: true,
        triggerCount: 100
        // maxTriggers 未设置
      };

      const remaining = getRemainingTriggers(trigger);

      expect(remaining).toBe(-1);
    });

    it('测试超过最大次数时剩余次数：应返回0而不是负数', () => {
      const trigger: BaseTriggerDefinition = {
        id: 'trigger-1',
        name: 'Trigger 1',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'pause_thread', parameters: {} },
        enabled: true,
        maxTriggers: 5,
        triggerCount: 7
      };

      const remaining = getRemainingTriggers(trigger);

      expect(remaining).toBe(0);
    });

    it('测试触发计数和剩余次数的关联', () => {
      const trigger: BaseTriggerDefinition = {
        id: 'trigger-1',
        name: 'Trigger 1',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'pause_thread', parameters: {} },
        enabled: true,
        maxTriggers: 3
      };

      // 初始状态
      expect(trigger.triggerCount).toBeUndefined();
      expect(getRemainingTriggers(trigger)).toBe(3);

      // 第一次触发
      incrementTriggerCount(trigger);
      expect(trigger.triggerCount).toBe(1);
      expect(getRemainingTriggers(trigger)).toBe(2);

      // 第二次触发
      incrementTriggerCount(trigger);
      expect(trigger.triggerCount).toBe(2);
      expect(getRemainingTriggers(trigger)).toBe(1);

      // 第三次触发
      incrementTriggerCount(trigger);
      expect(trigger.triggerCount).toBe(3);
      expect(getRemainingTriggers(trigger)).toBe(0);

      // 重置
      resetTriggerCount(trigger);
      expect(trigger.triggerCount).toBe(0);
      expect(getRemainingTriggers(trigger)).toBe(3);
    });
  });

  describe('过期检查', () => {
    it('测试检查触发器是否已过期：未达到最大次数时应不过期', () => {
      const trigger: BaseTriggerDefinition = {
        id: 'trigger-1',
        name: 'Trigger 1',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'pause_thread', parameters: {} },
        enabled: true,
        maxTriggers: 5,
        triggerCount: 2
      };

      expect(isTriggerExpired(trigger)).toBe(false);
    });

    it('测试检查触发器是否已过期：达到最大次数时应过期', () => {
      const trigger: BaseTriggerDefinition = {
        id: 'trigger-1',
        name: 'Trigger 1',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'pause_thread', parameters: {} },
        enabled: true,
        maxTriggers: 5,
        triggerCount: 5
      };

      expect(isTriggerExpired(trigger)).toBe(true);
    });

    it('测试检查触发器是否已过期：超过最大次数时应过期', () => {
      const trigger: BaseTriggerDefinition = {
        id: 'trigger-1',
        name: 'Trigger 1',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'pause_thread', parameters: {} },
        enabled: true,
        maxTriggers: 5,
        triggerCount: 6
      };

      expect(isTriggerExpired(trigger)).toBe(true);
    });

    it('测试无限制触发器不过期：maxTriggers为0或未设置时应不过期', () => {
      const trigger1: BaseTriggerDefinition = {
        id: 'trigger-1',
        name: 'Trigger 1',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'pause_thread', parameters: {} },
        enabled: true,
        maxTriggers: 0,
        triggerCount: 1000
      };

      const trigger2: BaseTriggerDefinition = {
        id: 'trigger-2',
        name: 'Trigger 2',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'pause_thread', parameters: {} },
        enabled: true,
        triggerCount: 1000
        // maxTriggers 未设置
      };

      expect(isTriggerExpired(trigger1)).toBe(false);
      expect(isTriggerExpired(trigger2)).toBe(false);
    });

    it('测试一次性触发器：maxTriggers为1时触发一次后应过期', () => {
      const trigger: BaseTriggerDefinition = {
        id: 'trigger-1',
        name: 'Trigger 1',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'pause_thread', parameters: {} },
        enabled: true,
        maxTriggers: 1
      };

      expect(isTriggerExpired(trigger)).toBe(false);

      incrementTriggerCount(trigger);

      expect(isTriggerExpired(trigger)).toBe(true);
    });
  });

  describe('边界情况', () => {
    it('测试负数maxTriggers：应视为无限制', () => {
      const trigger: BaseTriggerDefinition = {
        id: 'trigger-1',
        name: 'Trigger 1',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'pause_thread', parameters: {} },
        enabled: true,
        maxTriggers: -1,
        triggerCount: 100
      };

      expect(canTrigger(trigger)).toBe(true);
      expect(isTriggerExpired(trigger)).toBe(false);
      expect(getRemainingTriggers(trigger)).toBe(-1);
    });

    it('测试maxTriggers为1且triggerCount为0：应可触发', () => {
      const trigger: BaseTriggerDefinition = {
        id: 'trigger-1',
        name: 'Trigger 1',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'pause_thread', parameters: {} },
        enabled: true,
        maxTriggers: 1
      };

      expect(canTrigger(trigger)).toBe(true);
      expect(getTriggerStatus(trigger)).toBe('idle');
    });

    it('测试同时达到最大次数和禁用状态：禁用状态优先', () => {
      const trigger: BaseTriggerDefinition = {
        id: 'trigger-1',
        name: 'Trigger 1',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'pause_thread', parameters: {} },
        enabled: false,
        maxTriggers: 5,
        triggerCount: 5
      };

      expect(canTrigger(trigger)).toBe(false);
      expect(getTriggerStatus(trigger)).toBe('disabled');
    });
  });
});
